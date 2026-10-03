import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:geolocator/geolocator.dart';
import 'package:intl/intl.dart';
import '../models/trip.dart';
import '../services/trip_service.dart';

class TripFormScreen extends StatefulWidget {
  final TripService service;
  final Trip? trip;

  const TripFormScreen({super.key, required this.service, this.trip});

  @override
  State<TripFormScreen> createState() => _TripFormScreenState();
}

class _TripFormScreenState extends State<TripFormScreen> {
  final _formKey = GlobalKey<FormState>();
  late final TextEditingController _objective;
  late final TextEditingController _budget;
  late final TextEditingController _currency;
  late final TextEditingController _partySize;
  late final TextEditingController _latitude;
  late final TextEditingController _longitude;
  late final TextEditingController _accessibility;
  late final TextEditingController _interests;
  late final TextEditingController _visitorCategory;

  DateTime? _startDate;
  DateTime? _endDate;
  bool _loadingPreferences = true;
  bool _saving = false;
  bool _capturingLocation = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    final trip = widget.trip;
    _objective = TextEditingController(text: trip?.objective);
    _startDate = trip?.startDate;
    _endDate = trip?.endDate;
    _budget = TextEditingController(text: trip == null ? '' : trip.budget.toString());
    _currency = TextEditingController(text: trip?.currency ?? 'LKR');
    _partySize = TextEditingController(
        text: trip?.partySize == null ? '' : trip!.partySize.toString());
    _latitude = TextEditingController(
        text: trip?.startingLatitude == null ? '' : trip!.startingLatitude.toString());
    _longitude = TextEditingController(
        text: trip?.startingLongitude == null ? '' : trip!.startingLongitude.toString());
    _accessibility = TextEditingController(text: trip?.accessibilityNeeds);
    _interests = TextEditingController();
    _visitorCategory = TextEditingController();
    _loadPreferences();
  }

  Future<void> _loadPreferences() async {
    try {
      final preferences = await widget.service.getPreferences();
      if (!mounted) return;
      _interests.text = preferences.interests ?? '';
      _visitorCategory.text = preferences.visitorCategory ?? '';
      setState(() => _loadingPreferences = false);
    } catch (error) {
      if (!mounted) return;
      setState(() {
        _loadingPreferences = false;
        _error = '${tripError(error)} You can still edit trip fields.';
      });
    }
  }

  @override
  void dispose() {
    for (final controller in [
      _objective, _budget, _currency, _partySize, _latitude, _longitude,
      _accessibility, _interests, _visitorCategory
    ]) {
      controller.dispose();
    }
    super.dispose();
  }

  Future<void> _pickDate({required bool start}) async {
    final today = DateUtils.dateOnly(DateTime.now());
    final initial = start ? (_startDate ?? today) : (_endDate ?? _startDate ?? today);
    final picked = await showDatePicker(
      context: context,
      firstDate: widget.trip == null ? today : DateTime(2020),
      lastDate: DateTime(2100),
      initialDate: initial.isBefore(today) && widget.trip == null ? today : initial,
    );
    if (picked == null || !mounted) return;
    setState(() {
      if (start) {
        _startDate = picked;
        if (_endDate != null && _endDate!.isBefore(picked)) {
          _endDate = null;
        }
      } else {
        _endDate = picked;
      }
    });
  }

  Future<void> _captureLocation() async {
    setState(() { _capturingLocation = true; _error = null; });
    try {
      if (!await Geolocator.isLocationServiceEnabled()) {
        throw StateError('Location services are disabled on your phone.');
      }
      var permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        permission = await Geolocator.requestPermission();
      }
      if (permission == LocationPermission.denied ||
          permission == LocationPermission.deniedForever) {
        throw StateError('Location permission was denied. Enter coordinates manually.');
      }
      final position = await Geolocator.getCurrentPosition(
        locationSettings: const LocationSettings(
          accuracy: LocationAccuracy.high,
          timeLimit: Duration(seconds: 15),
        ),
      );
      if (!mounted) return;
      _latitude.text = position.latitude.toStringAsFixed(6);
      _longitude.text = position.longitude.toStringAsFixed(6);
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('📍 Starting GPS coordinates captured!')),
      );
    } catch (error) {
      if (mounted) setState(() => _error = error.toString().replaceFirst('Bad state: ', ''));
    } finally {
      if (mounted) setState(() => _capturingLocation = false);
    }
  }

  Future<void> _save() async {
    setState(() => _error = null);
    if (!_formKey.currentState!.validate()) return;
    final today = DateUtils.dateOnly(DateTime.now());
    if (widget.trip == null && _startDate != null && _startDate!.isBefore(today)) {
      setState(() => _error = 'Start date cannot be in the past.');
      return;
    }
    if (_startDate == null || _endDate == null || _endDate!.isBefore(_startDate!)) {
      setState(() => _error = 'Choose a valid date range.');
      return;
    }
    final lat = _latitude.text.trim();
    final lon = _longitude.text.trim();
    if (lat.isEmpty != lon.isEmpty) {
      setState(() => _error = 'Enter both coordinates or leave both blank.');
      return;
    }
    setState(() => _saving = true);
    try {
      final payload = <String, dynamic>{
        'objective': _objective.text.trim(),
        'startDate': DateFormat('yyyy-MM-dd').format(_startDate!),
        'endDate': DateFormat('yyyy-MM-dd').format(_endDate!),
        'budget': double.parse(_budget.text.trim()),
        'currency': _currency.text.trim().toUpperCase(),
        'partySize': int.parse(_partySize.text.trim()),
        'startingLatitude': lat.isEmpty ? null : double.parse(lat),
        'startingLongitude': lon.isEmpty ? null : double.parse(lon),
        'accessibilityNeeds': _accessibility.text.trim().isEmpty
            ? null
            : _accessibility.text.trim(),
      };
      final saved = widget.trip == null
          ? await widget.service.createTrip(payload)
          : await widget.service.updateTrip(widget.trip!.id, payload);
      try {
        await widget.service.savePreferences(TravelerPreferences(
          visitorCategory: _visitorCategory.text.trim(),
          interests: _interests.text.trim(),
        ));
      } catch (error) {
        if (!mounted) return;
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(
          content: Text('Trip saved, but preferences were not: ${tripError(error)}'),
        ));
      }
      if (mounted) Navigator.pop(context, saved);
    } catch (error) {
      if (mounted) setState(() => _error = tripError(error));
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  String? _required(String? value) =>
      value == null || value.trim().isEmpty ? 'Required' : null;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(widget.trip == null ? 'Create Trip Request' : 'Edit Draft Trip'),
      ),
      body: _loadingPreferences
          ? const Center(child: CircularProgressIndicator())
          : Form(
              key: _formKey,
              child: ListView(
                padding: const EdgeInsets.all(16),
                children: [
                  if (_error != null) ...[
                    Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: Colors.red.shade50,
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(color: Colors.red.shade200),
                      ),
                      child: Row(
                        children: [
                          const Icon(Icons.error_outline, color: Colors.red, size: 20),
                          const SizedBox(width: 8),
                          Expanded(
                            child: Text(
                              _error!,
                              style: TextStyle(color: Colors.red.shade900, fontSize: 13),
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 12),
                  ],
                  TextFormField(
                    controller: _objective,
                    decoration: const InputDecoration(
                      labelText: 'Trip objective',
                      hintText: 'e.g., Cultural and wildlife tour in Ella and Yala',
                      border: OutlineInputBorder(),
                    ),
                    maxLength: 1000,
                    maxLines: 3,
                    validator: _required,
                  ),
                  const SizedBox(height: 12),
                  Row(
                    children: [
                      Expanded(
                        child: OutlinedButton.icon(
                          onPressed: () => _pickDate(start: true),
                          icon: const Icon(Icons.calendar_today, size: 16),
                          label: Text(
                            _startDate == null
                                ? 'Start date'
                                : DateFormat.yMMMd().format(_startDate!),
                            style: const TextStyle(fontSize: 13),
                          ),
                          style: OutlinedButton.styleFrom(
                            padding: const EdgeInsets.symmetric(vertical: 12),
                          ),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: OutlinedButton.icon(
                          onPressed: () => _pickDate(start: false),
                          icon: const Icon(Icons.event, size: 16),
                          label: Text(
                            _endDate == null
                                ? 'End date'
                                : DateFormat.yMMMd().format(_endDate!),
                            style: const TextStyle(fontSize: 13),
                          ),
                          style: OutlinedButton.styleFrom(
                            padding: const EdgeInsets.symmetric(vertical: 12),
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Expanded(
                        flex: 5,
                        child: TextFormField(
                          controller: _budget,
                          decoration: const InputDecoration(
                            labelText: 'Budget',
                            border: OutlineInputBorder(),
                          ),
                          keyboardType: const TextInputType.numberWithOptions(decimal: true),
                          inputFormatters: [FilteringTextInputFormatter.allow(RegExp(r'[0-9.]'))],
                          validator: (value) => (double.tryParse(value ?? '') ?? 0) > 0
                              ? null
                              : 'Enter a positive budget',
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        flex: 3,
                        child: TextFormField(
                          controller: _currency,
                          decoration: const InputDecoration(
                            labelText: 'Currency (ISO code)',
                            border: OutlineInputBorder(),
                          ),
                          maxLength: 3,
                          textCapitalization: TextCapitalization.characters,
                          validator: (value) => RegExp(r'^[A-Za-z]{3}$').hasMatch(value?.trim() ?? '')
                              ? null
                              : 'Enter a 3-letter currency code',
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  TextFormField(
                    controller: _partySize,
                    decoration: const InputDecoration(
                      labelText: 'Party size',
                      hintText: 'Number of people',
                      border: OutlineInputBorder(),
                      prefixIcon: Icon(Icons.group_outlined),
                    ),
                    keyboardType: TextInputType.number,
                    inputFormatters: [FilteringTextInputFormatter.digitsOnly],
                    validator: (value) => (int.tryParse(value ?? '') ?? 0) > 0
                        ? null
                        : 'Enter a positive whole number',
                  ),
                  const SizedBox(height: 20),
                  Text('Reusable Traveler Preferences',
                      style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold)),
                  const SizedBox(height: 8),
                  TextFormField(
                    controller: _visitorCategory,
                    decoration: const InputDecoration(
                      labelText: 'Visitor category',
                      hintText: 'e.g., Solo Backpacker, Family, Couple',
                      border: OutlineInputBorder(),
                    ),
                    maxLength: 64,
                  ),
                  const SizedBox(height: 12),
                  TextFormField(
                    controller: _interests,
                    decoration: const InputDecoration(
                      labelText: 'Interests',
                      hintText: 'Wildlife, culture, hiking, surfing',
                      helperText: 'Saved to your profile for future trips',
                      border: OutlineInputBorder(),
                    ),
                    maxLength: 2000,
                  ),
                  const SizedBox(height: 20),
                  Text('Starting Location (GPS)',
                      style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold)),
                  const SizedBox(height: 8),
                  OutlinedButton.icon(
                    onPressed: _capturingLocation ? null : _captureLocation,
                    icon: const Icon(Icons.my_location),
                    label: Text(_capturingLocation ? 'Finding location…' : 'Use current location'),
                    style: OutlinedButton.styleFrom(minimumSize: const Size.fromHeight(44)),
                  ),
                  const SizedBox(height: 12),
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Expanded(
                        child: TextFormField(
                          controller: _latitude,
                          decoration: const InputDecoration(
                            labelText: 'Latitude (optional)',
                            hintText: '6.9271',
                            border: OutlineInputBorder(),
                          ),
                          keyboardType: const TextInputType.numberWithOptions(decimal: true, signed: true),
                          validator: (value) {
                            if (value == null || value.trim().isEmpty) return null;
                            final n = double.tryParse(value);
                            return n == null || n < -90 || n > 90
                                ? 'Latitude must be -90 to 90'
                                : null;
                          },
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: TextFormField(
                          controller: _longitude,
                          decoration: const InputDecoration(
                            labelText: 'Longitude (optional)',
                            hintText: '79.8612',
                            border: OutlineInputBorder(),
                          ),
                          keyboardType: const TextInputType.numberWithOptions(decimal: true, signed: true),
                          validator: (value) {
                            if (value == null || value.trim().isEmpty) return null;
                            final n = double.tryParse(value);
                            return n == null || n < -180 || n > 180
                                ? 'Longitude must be -180 to 180'
                                : null;
                          },
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),
                  TextFormField(
                    controller: _accessibility,
                    decoration: const InputDecoration(
                      labelText: 'Accessibility needs (optional)',
                      hintText: 'Wheelchair access, ground-floor room, etc.',
                      border: OutlineInputBorder(),
                    ),
                    maxLines: 2,
                    maxLength: 2000,
                  ),
                  const SizedBox(height: 24),
                  FilledButton(
                    onPressed: _saving ? null : _save,
                    style: FilledButton.styleFrom(
                      minimumSize: const Size.fromHeight(50),
                    ),
                    child: Text(_saving ? 'Saving…' : 'Save draft'),
                  ),
                  const SizedBox(height: 30),
                ],
              ),
            ),
    );
  }
}