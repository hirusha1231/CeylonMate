import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:geolocator/geolocator.dart';
import 'package:intl/intl.dart';
import '../models/guide_availability_slot.dart';
import '../services/guide_availability_service.dart';

class AddEditAvailabilityScreen extends StatefulWidget {
  final String guideId;
  final GuideAvailabilityService? service;
  final GuideAvailabilitySlot? existingSlot;

  const AddEditAvailabilityScreen({
    super.key,
    required this.guideId,
    this.service,
    this.existingSlot,
  });

  @override
  State<AddEditAvailabilityScreen> createState() => _AddEditAvailabilityScreenState();
}

class _AddEditAvailabilityScreenState extends State<AddEditAvailabilityScreen> {
  final _formKey = GlobalKey<FormState>();
  late final GuideAvailabilityService _service;

  DateTime _selectedDate = DateTime.now();
  TimeOfDay _startTime = const TimeOfDay(hour: 8, minute: 0);
  TimeOfDay _endTime = const TimeOfDay(hour: 17, minute: 0);

  String _selectedSlotType = 'FULL_DAY';
  String _selectedStatus = 'AVAILABLE';
  String _selectedCurrency = 'LKR';
  final List<String> _currencies = ['LKR', 'USD', 'EUR', 'GBP', 'AUD'];

  late final TextEditingController _titleController;
  late final TextEditingController _priceController;
  late final TextEditingController _capacityController;
  late final TextEditingController _notesController;
  late final TextEditingController _latController;
  late final TextEditingController _lngController;

  bool _isSubmitting = false;
  bool _capturingLocation = false;

  @override
  void initState() {
    super.initState();
    _service = widget.service ?? GuideAvailabilityService();

    final slot = widget.existingSlot;
    if (slot != null) {
      _selectedDate = slot.startTime;
      _startTime = TimeOfDay.fromDateTime(slot.startTime);
      _endTime = TimeOfDay.fromDateTime(slot.endTime);
      _selectedSlotType = slot.slotType;
      _selectedStatus = slot.status.toUpperCase();
      _selectedCurrency = _currencies.contains(slot.currency.toUpperCase())
          ? slot.currency.toUpperCase()
          : 'LKR';
      _titleController = TextEditingController(text: slot.notes?.split(' | ').first ?? '');
      _priceController = TextEditingController(text: slot.priceAmount > 0 ? slot.priceAmount.toStringAsFixed(0) : '');
      _capacityController = TextEditingController(text: slot.maxCapacity.toString());
      _notesController = TextEditingController(text: slot.notes ?? '');
    } else {
      _selectedStatus = 'AVAILABLE';
      _titleController = TextEditingController();
      _priceController = TextEditingController();
      _capacityController = TextEditingController(text: '1');
      _notesController = TextEditingController();
    }
    _latController = TextEditingController();
    _lngController = TextEditingController();
  }

  @override
  void dispose() {
    _titleController.dispose();
    _priceController.dispose();
    _capacityController.dispose();
    _notesController.dispose();
    _latController.dispose();
    _lngController.dispose();
    super.dispose();
  }

  void _onSlotTypeChanged(String newType) {
    setState(() {
      _selectedSlotType = newType;
      switch (newType) {
        case 'FULL_DAY':
          _startTime = const TimeOfDay(hour: 8, minute: 0);
          _endTime = const TimeOfDay(hour: 17, minute: 0);
          break;
        case 'HALF_DAY_MORNING':
          _startTime = const TimeOfDay(hour: 8, minute: 0);
          _endTime = const TimeOfDay(hour: 12, minute: 30);
          break;
        case 'HALF_DAY_AFTERNOON':
          _startTime = const TimeOfDay(hour: 13, minute: 0);
          _endTime = const TimeOfDay(hour: 17, minute: 30);
          break;
        case 'HOURLY':
          _startTime = const TimeOfDay(hour: 9, minute: 0);
          _endTime = const TimeOfDay(hour: 11, minute: 0);
          break;
      }
    });
  }

  Future<void> _pickDate() async {
    final today = DateUtils.dateOnly(DateTime.now());
    final picked = await showDatePicker(
      context: context,
      initialDate: _selectedDate.isBefore(today) ? today : _selectedDate,
      firstDate: today,
      lastDate: today.add(const Duration(days: 365)),
    );
    if (picked != null) {
      setState(() => _selectedDate = picked);
    }
  }

  Future<void> _pickStartTime() async {
    final picked = await showTimePicker(
      context: context,
      initialTime: _startTime,
    );
    if (picked != null) {
      setState(() => _startTime = picked);
    }
  }

  Future<void> _pickEndTime() async {
    final picked = await showTimePicker(
      context: context,
      initialTime: _endTime,
    );
    if (picked != null) {
      setState(() => _endTime = picked);
    }
  }

  Future<void> _captureLocation() async {
    setState(() => _capturingLocation = true);
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
        throw StateError('Location permission denied.');
      }
      final position = await Geolocator.getCurrentPosition(
        locationSettings: const LocationSettings(
          accuracy: LocationAccuracy.high,
          timeLimit: Duration(seconds: 15),
        ),
      );
      if (!mounted) return;
      _latController.text = position.latitude.toStringAsFixed(6);
      _lngController.text = position.longitude.toStringAsFixed(6);
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('📍 Tour starting location GPS captured!')),
      );
    } catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(error.toString().replaceFirst('Bad state: ', ''))),
        );
      }
    } finally {
      if (mounted) setState(() => _capturingLocation = false);
    }
  }

  Future<void> _submitForm() async {
    if (!_formKey.currentState!.validate()) return;

    final startDateTime = DateTime(
      _selectedDate.year,
      _selectedDate.month,
      _selectedDate.day,
      _startTime.hour,
      _startTime.minute,
    );

    final endDateTime = DateTime(
      _selectedDate.year,
      _selectedDate.month,
      _selectedDate.day,
      _endTime.hour,
      _endTime.minute,
    );

    if (endDateTime.isBefore(startDateTime) || endDateTime.isAtSameMomentAs(startDateTime)) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('End time must be after start time.'),
          backgroundColor: Colors.red,
        ),
      );
      return;
    }

    setState(() => _isSubmitting = true);

    try {
      final slot = GuideAvailabilitySlot(
        id: widget.existingSlot?.id ?? '',
        localGuideUserId: widget.guideId,
        startTime: startDateTime,
        endTime: endDateTime,
        slotType: _selectedSlotType,
        status: _selectedStatus,
        maxCapacity: int.tryParse(_capacityController.text.trim()) ?? 1,
        priceAmount: double.tryParse(_priceController.text.trim()) ?? 0.0,
        currency: _selectedCurrency,
        notes: _notesController.text.trim().isNotEmpty ? _notesController.text.trim() : null,
      );

      if (widget.existingSlot != null) {
        await _service.updateAvailabilitySlot(widget.existingSlot!.id, slot);
      } else {
        await _service.saveAvailability(widget.guideId, slot);
      }

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(widget.existingSlot != null
                ? 'Availability slot updated successfully!'
                : 'Availability slot created successfully!'),
            backgroundColor: const Color(0xFF0F766E),
          ),
        );
        Navigator.pop(context, true);
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(e.toString().replaceAll('Exception: ', '')),
            backgroundColor: Colors.red,
          ),
        );
      }
    } finally {
      if (mounted) {
        setState(() => _isSubmitting = false);
      }
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
    final dateFormat = DateFormat('EEEE, MMMM d, yyyy');

    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        title: Text(widget.existingSlot != null ? 'Edit Availability Slot' : 'Add Availability Slot'),
        backgroundColor: Colors.white,
        foregroundColor: Colors.black87,
        elevation: 0,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16.0),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // Card 1: Schedule, Slot Type & Status
              _buildCard(
                title: 'Schedule & Slot Type',
                icon: Icons.calendar_month_outlined,
                children: [
                  OutlinedButton.icon(
                    onPressed: _pickDate,
                    icon: const Icon(Icons.calendar_today, size: 18),
                    label: Text(dateFormat.format(_selectedDate)),
                    style: OutlinedButton.styleFrom(
                      minimumSize: const Size.fromHeight(48),
                      alignment: Alignment.centerLeft,
                    ),
                  ),
                  const SizedBox(height: 16),
                  SingleChildScrollView(
                    scrollDirection: Axis.horizontal,
                    child: SegmentedButton<String>(
                      segments: const [
                        ButtonSegment(value: 'FULL_DAY', label: Text('Full Day'), icon: Icon(Icons.wb_sunny_outlined)),
                        ButtonSegment(value: 'HALF_DAY_MORNING', label: Text('Morning'), icon: Icon(Icons.wb_twilight)),
                        ButtonSegment(value: 'HALF_DAY_AFTERNOON', label: Text('Afternoon'), icon: Icon(Icons.wb_cloudy_outlined)),
                        ButtonSegment(value: 'HOURLY', label: Text('Hourly'), icon: Icon(Icons.access_time)),
                      ],
                      selected: {_selectedSlotType},
                      onSelectionChanged: (set) {
                        if (set.isNotEmpty) _onSlotTypeChanged(set.first);
                      },
                    ),
                  ),
                  const SizedBox(height: 16),
                  DropdownButtonFormField<String>(
                    value: _selectedStatus,
                    isExpanded: true,
                    decoration: const InputDecoration(
                      labelText: 'Slot Status *',
                      prefixIcon: Icon(Icons.shield_outlined),
                      border: OutlineInputBorder(),
                    ),
                    items: const [
                      DropdownMenuItem(value: 'AVAILABLE', child: Text('🟢 AVAILABLE (Open for Bookings)')),
                      DropdownMenuItem(value: 'BLOCKED', child: Text('🔴 BLOCKED (Personal Off / Unavailable)')),
                      DropdownMenuItem(value: 'RESERVED', child: Text('🟠 RESERVED (Pending Confirmation)')),
                      DropdownMenuItem(value: 'BOOKED', child: Text('🔵 BOOKED (Confirmed Tour)')),
                    ],
                    onChanged: (val) => setState(() => _selectedStatus = val ?? 'AVAILABLE'),
                  ),
                  const SizedBox(height: 16),
                  Row(
                    children: [
                      Expanded(
                        child: OutlinedButton.icon(
                          onPressed: _pickStartTime,
                          icon: const Icon(Icons.schedule, size: 18),
                          label: Text('Start: ${_startTime.format(context)}'),
                          style: OutlinedButton.styleFrom(padding: const EdgeInsets.symmetric(vertical: 12)),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: OutlinedButton.icon(
                          onPressed: _pickEndTime,
                          icon: const Icon(Icons.schedule, size: 18),
                          label: Text('End: ${_endTime.format(context)}'),
                          style: OutlinedButton.styleFrom(padding: const EdgeInsets.symmetric(vertical: 12)),
                        ),
                      ),
                    ],
                  ),
                ],
              ),

              // Card 2: Experience & Pricing
              _buildCard(
                title: 'Experience & Pricing',
                icon: Icons.tour_outlined,
                children: [
                  TextFormField(
                    controller: _titleController,
                    maxLength: 100,
                    decoration: const InputDecoration(
                      labelText: 'Experience Title *',
                      hintText: 'e.g. Cultural Heritage Walking Tour',
                      border: OutlineInputBorder(),
                    ),
                    validator: (value) {
                      if (value == null || value.trim().isEmpty) return 'Tour title is required';
                      if (value.trim().length < 3) return 'Title must be at least 3 characters';
                      return null;
                    },
                  ),
                  const SizedBox(height: 12),
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Expanded(
                        flex: 3,
                        child: TextFormField(
                          controller: _priceController,
                          keyboardType: const TextInputType.numberWithOptions(decimal: true),
                          inputFormatters: [FilteringTextInputFormatter.allow(RegExp(r'[0-9.]'))],
                          decoration: const InputDecoration(
                            labelText: 'Price *',
                            hintText: 'e.g. 12000',
                            prefixIcon: Icon(Icons.payments_outlined),
                            border: OutlineInputBorder(),
                          ),
                          validator: (value) {
                            if (value == null || value.trim().isEmpty) return 'Enter price';
                            final num = double.tryParse(value.trim());
                            if (num == null || num <= 0) return 'Price must be > 0';
                            return null;
                          },
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        flex: 2,
                        child: DropdownButtonFormField<String>(
                          value: _selectedCurrency,
                          decoration: const InputDecoration(
                            labelText: 'Currency',
                            border: OutlineInputBorder(),
                          ),
                          items: _currencies.map((c) => DropdownMenuItem(value: c, child: Text(c))).toList(),
                          onChanged: (v) => setState(() => _selectedCurrency = v ?? 'LKR'),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        flex: 2,
                        child: TextFormField(
                          controller: _capacityController,
                          keyboardType: TextInputType.number,
                          inputFormatters: [FilteringTextInputFormatter.digitsOnly],
                          decoration: const InputDecoration(
                            labelText: 'Max Group *',
                            hintText: '1',
                            prefixIcon: Icon(Icons.groups_outlined),
                            border: OutlineInputBorder(),
                          ),
                          validator: (value) {
                            if (value == null || value.trim().isEmpty) return 'Required';
                            final val = int.tryParse(value.trim());
                            if (val == null || val <= 0) return '> 0';
                            return null;
                          },
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  TextFormField(
                    controller: _notesController,
                    maxLines: 3,
                    maxLength: 500,
                    decoration: const InputDecoration(
                      labelText: 'Experience Description & Inclusions',
                      hintText: 'Describe inclusions (e.g. Guided tour, tickets, refreshments, safety gear)',
                      border: OutlineInputBorder(),
                    ),
                    validator: (value) {
                      final trimmed = value?.trim() ?? '';
                      if (trimmed.isNotEmpty && trimmed.length < 10) {
                        return 'Description must be at least 10 characters';
                      }
                      return null;
                    },
                  ),
                ],
              ),

              // Card 3: Meeting Location Coordinates
              _buildCard(
                title: 'Meeting Location Coordinates',
                icon: Icons.place_outlined,
                children: [
                  OutlinedButton.icon(
                    onPressed: _capturingLocation ? null : _captureLocation,
                    icon: const Icon(Icons.gps_fixed),
                    label: Text(_capturingLocation ? 'Locating...' : 'Capture Current Location GPS'),
                    style: OutlinedButton.styleFrom(minimumSize: const Size.fromHeight(44)),
                  ),
                  const SizedBox(height: 12),
                  Row(
                    children: [
                      Expanded(
                        child: TextFormField(
                          controller: _latController,
                          keyboardType: const TextInputType.numberWithOptions(decimal: true, signed: true),
                          decoration: const InputDecoration(
                            labelText: 'Latitude (Optional)',
                            hintText: '6.9271',
                            border: OutlineInputBorder(),
                          ),
                          validator: (val) {
                            if (val == null || val.trim().isEmpty) return null;
                            final n = double.tryParse(val.trim());
                            if (n == null || n < -90 || n > 90) return 'Between -90 and 90';
                            return null;
                          },
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: TextFormField(
                          controller: _lngController,
                          keyboardType: const TextInputType.numberWithOptions(decimal: true, signed: true),
                          decoration: const InputDecoration(
                            labelText: 'Longitude (Optional)',
                            hintText: '79.8612',
                            border: OutlineInputBorder(),
                          ),
                          validator: (val) {
                            if (val == null || val.trim().isEmpty) return null;
                            final n = double.tryParse(val.trim());
                            if (n == null || n < -180 || n > 180) return 'Between -180 and 180';
                            return null;
                          },
                        ),
                      ),
                    ],
                  ),
                ],
              ),

              const SizedBox(height: 8),
              ElevatedButton(
                onPressed: _isSubmitting ? null : _submitForm,
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF0F766E),
                  foregroundColor: Colors.white,
                  minimumSize: const Size.fromHeight(50),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                ),
                child: _isSubmitting
                    ? const SizedBox(width: 22, height: 22, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                    : Text(
                        widget.existingSlot != null ? 'Save Changes' : 'Publish Availability Slot',
                        style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                      ),
              ),
              const SizedBox(height: 30),
            ],
          ),
        ),
      ),
    );
  }
}