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
    _budget = TextEditingController(text: trip?.budget.toString());
    _currency = TextEditingController(text: trip?.currency ?? 'LKR');
    _partySize = TextEditingController(text: trip?.partySize.toString() ?? '1');
    _latitude = TextEditingController(text: trip?.startingLatitude?.toString());
    _longitude = TextEditingController(text: trip?.startingLongitude?.toString());
    _accessibility = TextEditingController(text: trip?.accessibilityNeeds);
    _interests = TextEditingController();
    _visitorCategory = TextEditingController();
    _startDate = trip?.startDate;
    _endDate = trip?.endDate;
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
        _error = '${tripError(error)} You can still edit the trip fields.';
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
      firstDate: DateTime(2020),
      lastDate: DateTime(2100),
      initialDate: initial,
    );
    if (picked == null || !mounted) return;
    setState(() {
      if (start) {
        _startDate = picked;
        if (_endDate != null && _endDate!.isBefore(picked)) _endDate = null;
      } else {
        _endDate = picked;
      }
    });
  }

  Future<void> _captureLocation() async {
    setState(() { _capturingLocation = true; _error = null; });
    try {
      if (!await Geolocator.isLocationServiceEnabled()) {
        throw StateError('Location services are disabled. Enable them or enter coordinates manually.');
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
        locationSettings: const LocationSettings(accuracy: LocationAccuracy.high,
            timeLimit: Duration(seconds: 15)),
      );
      if (!mounted) return;
      _latitude.text = position.latitude.toStringAsFixed(6);
      _longitude.text = position.longitude.toStringAsFixed(6);
    } catch (error) {
      if (mounted) setState(() => _error = error.toString().replaceFirst('Bad state: ', ''));
    } finally {
      if (mounted) setState(() => _capturingLocation = false);
    }
  }

  Future<void> _save() async {
    setState(() => _error = null);
    if (!_formKey.currentState!.validate()) return;
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
            ? null : _accessibility.text.trim(),
      };
      final saved = widget.trip == null
          ? await widget.service.createTrip(payload)
          : await widget.service.updateTrip(widget.trip!.id, payload);
      // Interests are reusable profile preferences; the trip API has no interest field.
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

  String? _required(String? value) => value == null || value.trim().isEmpty
      ? 'Required' : null;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text(widget.trip == null ? 'Create Trip Request' : 'Edit Draft Trip')),
      body: _loadingPreferences
          ? const Center(child: CircularProgressIndicator())
          : Form(
              key: _formKey,
              child: ListView(
                padding: const EdgeInsets.all(16),
                children: [
                  if (_error != null) ...[
                    Text(_error!, style: TextStyle(color: Theme.of(context).colorScheme.error)),
                    const SizedBox(height: 12),
                  ],
                  TextFormField(controller: _objective,
                    decoration: const InputDecoration(labelText: 'Trip objective'),
                    maxLength: 1000, maxLines: 3, validator: _required),
                  Row(children: [
                    Expanded(child: OutlinedButton(
                      onPressed: () => _pickDate(start: true),
                      child: Text(_startDate == null ? 'Start date' : DateFormat.yMMMd().format(_startDate!)),
                    )),
                    const SizedBox(width: 8),
                    Expanded(child: OutlinedButton(
                      onPressed: () => _pickDate(start: false),
                      child: Text(_endDate == null ? 'End date' : DateFormat.yMMMd().format(_endDate!)),
                    )),
                  ]),
                  TextFormField(controller: _budget,
                    decoration: const InputDecoration(labelText: 'Budget'),
                    keyboardType: const TextInputType.numberWithOptions(decimal: true),
                    inputFormatters: [FilteringTextInputFormatter.allow(RegExp(r'[0-9.]'))],
                    validator: (value) => (double.tryParse(value ?? '') ?? 0) > 0
                        ? null : 'Enter a positive budget'),
                  TextFormField(controller: _currency,
                    decoration: const InputDecoration(labelText: 'Currency (ISO code)'),
                    maxLength: 3, textCapitalization: TextCapitalization.characters,
                    validator: (value) => RegExp(r'^[A-Za-z]{3}$').hasMatch(value?.trim() ?? '')
                        ? null : 'Enter a 3-letter currency code'),
                  TextFormField(controller: _partySize,
                    decoration: const InputDecoration(labelText: 'Party size'),
                    keyboardType: TextInputType.number,
                    validator: (value) => (int.tryParse(value ?? '') ?? 0) > 0
                        ? null : 'Enter a positive whole number'),
                  const SizedBox(height: 12),
                  Text('Reusable traveler preferences', style: Theme.of(context).textTheme.titleMedium),
                  TextFormField(controller: _visitorCategory,
                    decoration: const InputDecoration(labelText: 'Visitor category'), maxLength: 64),
                  TextFormField(controller: _interests,
                    decoration: const InputDecoration(
                      labelText: 'Interests', hintText: 'Wildlife, culture, hiking',
                      helperText: 'Saved to your profile for future trips',
                    ), maxLength: 2000),
                  const SizedBox(height: 12),
                  Text('Starting location', style: Theme.of(context).textTheme.titleMedium),
                  OutlinedButton.icon(
                    onPressed: _capturingLocation ? null : _captureLocation,
                    icon: const Icon(Icons.my_location),
                    label: Text(_capturingLocation ? 'Finding location…' : 'Use current location'),
                  ),
                  TextFormField(controller: _latitude,
                    decoration: const InputDecoration(labelText: 'Latitude (optional)'),
                    keyboardType: const TextInputType.numberWithOptions(decimal: true, signed: true),
                    validator: (value) {
                      if (value == null || value.trim().isEmpty) return null;
                      final n = double.tryParse(value);
                      return n == null || n < -90 || n > 90 ? 'Latitude must be -90 to 90' : null;
                    }),
                  TextFormField(controller: _longitude,
                    decoration: const InputDecoration(labelText: 'Longitude (optional)'),
                    keyboardType: const TextInputType.numberWithOptions(decimal: true, signed: true),
                    validator: (value) {
                      if (value == null || value.trim().isEmpty) return null;
                      final n = double.tryParse(value);
                      return n == null || n < -180 || n > 180 ? 'Longitude must be -180 to 180' : null;
                    }),
                  TextFormField(controller: _accessibility,
                    decoration: const InputDecoration(labelText: 'Accessibility needs (optional)'),
                    maxLines: 2, maxLength: 2000),
                  const SizedBox(height: 20),
                  FilledButton(
                    onPressed: _saving ? null : _save,
                    child: Text(_saving ? 'Saving…' : 'Save draft'),
                  ),
                ],
              ),
            ),
    );
  }
}
