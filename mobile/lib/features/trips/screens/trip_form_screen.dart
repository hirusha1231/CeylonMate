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
  late String _currency;
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

  final List<String> _currencies = ['LKR', 'USD', 'EUR', 'GBP', 'AUD'];

  @override
  void initState() {
    super.initState();
    final trip = widget.trip;
    _objective = TextEditingController(text: trip?.objective);
    _budget = TextEditingController(text: trip?.budget.toString());
    _currency = (trip?.currency != null && _currencies.contains(trip!.currency.toUpperCase()))
        ? trip.currency.toUpperCase()
        : 'LKR';
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
        _error = '${tripError(error)} You can still edit trip fields.';
      });
    }
  }

  @override
  void dispose() {
    for (final controller in [
      _objective, _budget, _partySize, _latitude, _longitude,
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
        throw StateError('Location permission denied. Enter manually if needed.');
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
    if (_startDate == null || _endDate == null) {
      setState(() => _error = 'Please select both travel start and end dates.');
      return;
    }
    if (widget.trip == null && _startDate!.isBefore(today)) {
      setState(() => _error = 'Start date cannot be in the past.');
      return;
    }
    if (_endDate!.isBefore(_startDate!)) {
      setState(() => _error = 'End date must be on or after start date.');
      return;
    }

    final lat = _latitude.text.trim();
    final lon = _longitude.text.trim();
    if (lat.isEmpty != lon.isEmpty) {
      setState(() => _error = 'Please enter both coordinates or clear both.');
      return;
    }

    setState(() => _saving = true);
    try {
      final payload = <String, dynamic>{
        'objective': _objective.text.trim(),
        'startDate': DateFormat('yyyy-MM-dd').format(_startDate!),
        'endDate': DateFormat('yyyy-MM-dd').format(_endDate!),
        'budget': double.parse(_budget.text.trim()),
        'currency': _currency,
        'partySize': int.parse(_partySize.text.trim()),
        'startingLatitude': lat.isEmpty ? null : double.parse(lat),
        'startingLongitude': lon.isEmpty ? null : double.parse(lon),
        'accessibilityNeeds': _accessibility.text.trim().isEmpty ? null : _accessibility.text.trim(),
      };

      final saved = widget.trip == null
          ? await widget.service.createTrip(payload)
          : await widget.service.updateTrip(widget.trip!.id, payload);

      try {
        await widget.service.savePreferences(TravelerPreferences(
          visitorCategory: _visitorCategory.text.trim(),
          interests: _interests.text.trim(),
        ));
      } catch (_) {}

      if (mounted) Navigator.pop(context, saved);
    } catch (error) {
      if (mounted) setState(() => _error = tripError(error));
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  Widget _buildCard({required String title, required IconData icon, required List<Widget> children}) {
    return Card(
      elevation: 0,
      color: Colors.white,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: BorderSide(color: Colors.grey.shade200),
      ),
      margin: const EdgeInsets.only(bottom: 16),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(icon, size: 20, color: const Color(0xFF0F766E)),
                const SizedBox(width: 8),
                Text(
                  title,
                  style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
                ),
              ],
            ),
            const Divider(height: 20),
            ...children,
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final dateFormat = DateFormat.yMMMd();

    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        title: Text(widget.trip == null ? 'Create Trip Request' : 'Edit Draft Trip'),
        backgroundColor: Colors.white,
        foregroundColor: Colors.black87,
        elevation: 0,
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
                            child: Text(_error!, style: TextStyle(color: Colors.red.shade900, fontSize: 13)),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 16),
                  ],

                  // Card 1: Objective
                  _buildCard(
                    title: 'Trip Details',
                    icon: Icons.explore_outlined,
                    children: [
                      TextFormField(
                        controller: _objective,
                        decoration: const InputDecoration(
                          labelText: 'Trip Objective / Title *',
                          hintText: 'e.g., Cultural and wildlife tour in Ella and Yala',
                          border: OutlineInputBorder(),
                        ),
                        maxLength: 1000,
                        maxLines: 3,
                        validator: (v) => v == null || v.trim().isEmpty ? 'Trip objective is required' : null,
                      ),
                    ],
                  ),

                  // Card 2: Dates, Budget & Group
                  _buildCard(
                    title: 'Schedule & Budget',
                    icon: Icons.calendar_month_outlined,
                    children: [
                      Row(
                        children: [
                          Expanded(
                            child: OutlinedButton.icon(
                              onPressed: () => _pickDate(start: true),
                              icon: const Icon(Icons.calendar_today, size: 16),
                              label: Text(
                                _startDate == null ? 'Start Date *' : dateFormat.format(_startDate!),
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
                                _endDate == null ? 'End Date *' : dateFormat.format(_endDate!),
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
                                labelText: 'Budget *',
                                border: OutlineInputBorder(),
                              ),
                              keyboardType: const TextInputType.numberWithOptions(decimal: true),
                              inputFormatters: [FilteringTextInputFormatter.allow(RegExp(r'[0-9.]'))],
                              validator: (v) => (double.tryParse(v ?? '') ?? 0) > 0 ? null : 'Enter valid budget',
                            ),
                          ),
                          const SizedBox(width: 8),
                          Expanded(
                            flex: 3,
                            child: DropdownButtonFormField<String>(
                              value: _currency,
                              decoration: const InputDecoration(
                                labelText: 'Currency',
                                border: OutlineInputBorder(),
                              ),
                              items: _currencies.map((c) => DropdownMenuItem(value: c, child: Text(c))).toList(),
                              onChanged: (v) => setState(() => _currency = v ?? 'LKR'),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 16),
                      TextFormField(
                        controller: _partySize,
                        decoration: const InputDecoration(
                          labelText: 'Party Size (Travelers) *',
                          hintText: 'Number of people',
                          border: OutlineInputBorder(),
                          prefixIcon: Icon(Icons.group_outlined),
                        ),
                        keyboardType: TextInputType.number,
                        inputFormatters: [FilteringTextInputFormatter.digitsOnly],
                        validator: (v) => (int.tryParse(v ?? '') ?? 0) >= 1 ? null : 'Minimum 1 person required',
                      ),
                    ],
                  ),

                  // Card 3: Location
                  _buildCard(
                    title: 'Starting Location',
                    icon: Icons.my_location_outlined,
                    children: [
                      OutlinedButton.icon(
                        onPressed: _capturingLocation ? null : _captureLocation,
                        icon: const Icon(Icons.gps_fixed),
                        label: Text(_capturingLocation ? 'Locating device...' : 'Capture My GPS Location'),
                        style: OutlinedButton.styleFrom(
                          minimumSize: const Size.fromHeight(44),
                        ),
                      ),
                      const SizedBox(height: 12),
                      Row(
                        children: [
                          Expanded(
                            child: TextFormField(
                              controller: _latitude,
                              decoration: const InputDecoration(labelText: 'Latitude', border: OutlineInputBorder()),
                              keyboardType: const TextInputType.numberWithOptions(decimal: true, signed: true),
                            ),
                          ),
                          const SizedBox(width: 8),
                          Expanded(
                            child: TextFormField(
                              controller: _longitude,
                              decoration: const InputDecoration(labelText: 'Longitude', border: OutlineInputBorder()),
                              keyboardType: const TextInputType.numberWithOptions(decimal: true, signed: true),
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),

                  // Card 4: Additional Requirements
                  _buildCard(
                    title: 'Preferences & Accessibility',
                    icon: Icons.tune_outlined,
                    children: [
                      TextFormField(
                        controller: _interests,
                        decoration: const InputDecoration(
                          labelText: 'Travel Interests',
                          hintText: 'Culture, Wildlife, Hiking, Surfing',
                          border: OutlineInputBorder(),
                        ),
                        maxLength: 500,
                      ),
                      const SizedBox(height: 12),
                      TextFormField(
                        controller: _accessibility,
                        decoration: const InputDecoration(
                          labelText: 'Special / Accessibility Needs (Optional)',
                          hintText: 'e.g., Wheelchair access, vegetarian food',
                          border: OutlineInputBorder(),
                        ),
                        maxLines: 2,
                        maxLength: 500,
                      ),
                    ],
                  ),

                  const SizedBox(height: 8),
                  ElevatedButton(
                    onPressed: _saving ? null : _save,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF0F766E),
                      foregroundColor: Colors.white,
                      minimumSize: const Size.fromHeight(50),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                    ),
                    child: _saving
                        ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                        : Text(
                            widget.trip == null ? 'Save Trip Request (Draft)' : 'Save Changes',
                            style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                          ),
                  ),
                  const SizedBox(height: 30),
                ],
              ),
            ),
    );
  }
}