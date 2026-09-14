import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../models/guide_availability_slot.dart';
import '../services/guide_availability_service.dart';

class AddEditAvailabilityScreen extends StatefulWidget {
  final String guideId;
  final GuideAvailabilityService? service;

  const AddEditAvailabilityScreen({
    super.key,
    required this.guideId,
    this.service,
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
  final TextEditingController _priceController = TextEditingController(text: '15000');
  final TextEditingController _capacityController = TextEditingController(text: '1');
  final TextEditingController _notesController = TextEditingController();

  bool _isSubmitting = false;

  @override
  void initState() {
    super.initState();
    _service = widget.service ?? GuideAvailabilityService();
  }

  @override
  void dispose() {
    _priceController.dispose();
    _capacityController.dispose();
    _notesController.dispose();
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
    final picked = await showDatePicker(
      context: context,
      initialDate: _selectedDate,
      firstDate: DateTime.now(),
      lastDate: DateTime.now().add(const Duration(days: 365)),
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
        id: '',
        localGuideUserId: widget.guideId,
        startTime: startDateTime,
        endTime: endDateTime,
        slotType: _selectedSlotType,
        status: 'AVAILABLE',
        maxCapacity: int.tryParse(_capacityController.text.trim()) ?? 1,
        priceAmount: double.tryParse(_priceController.text.trim()) ?? 0.0,
        currency: 'LKR',
        notes: _notesController.text.trim().isNotEmpty ? _notesController.text.trim() : null,
      );

      await _service.saveAvailability(widget.guideId, slot);

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Availability slot created successfully!'),
            backgroundColor: Colors.green,
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

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final dateFormat = DateFormat('EEEE, MMMM d, yyyy');

    return Scaffold(
      appBar: AppBar(
        title: const Text('Add Availability Slot'),
        elevation: 1,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20.0),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Date Selection Card
              Text('Date Selection', style: theme.textTheme.titleSmall?.copyWith(fontWeight: FontWeight.bold)),
              const SizedBox(height: 8),
              InkWell(
                onTap: _pickDate,
                borderRadius: BorderRadius.circular(10),
                child: Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    border: Border.all(color: Colors.teal.shade300),
                    borderRadius: BorderRadius.circular(10),
                    color: Colors.teal.shade50,
                  ),
                  child: Row(
                    children: [
                      const Icon(Icons.calendar_today, color: Colors.teal),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Text(
                          dateFormat.format(_selectedDate),
                          style: theme.textTheme.bodyMedium?.copyWith(fontWeight: FontWeight.w600),
                        ),
                      ),
                      const Icon(Icons.edit, size: 18, color: Colors.teal),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 24),

              // Slot Type Segmented Toggle
              Text('Slot Type', style: theme.textTheme.titleSmall?.copyWith(fontWeight: FontWeight.bold)),
              const SizedBox(height: 8),
              SegmentedButton<String>(
                segments: const [
                  ButtonSegment(value: 'FULL_DAY', label: Text('Full Day'), icon: Icon(Icons.wb_sunny)),
                  ButtonSegment(value: 'HALF_DAY_MORNING', label: Text('Morning'), icon: Icon(Icons.wb_twilight)),
                  ButtonSegment(value: 'HALF_DAY_AFTERNOON', label: Text('Afternoon'), icon: Icon(Icons.wb_cloudy)),
                  ButtonSegment(value: 'HOURLY', label: Text('Hourly'), icon: Icon(Icons.access_time)),
                ],
                selected: {_selectedSlotType},
                onSelectionChanged: (set) {
                  if (set.isNotEmpty) _onSlotTypeChanged(set.first);
                },
              ),
              const SizedBox(height: 24),

              // Time Pickers Row
              Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('Start Time', style: theme.textTheme.titleSmall?.copyWith(fontWeight: FontWeight.bold)),
                        const SizedBox(height: 8),
                        InkWell(
                          onTap: _pickStartTime,
                          borderRadius: BorderRadius.circular(10),
                          child: Container(
                            padding: const EdgeInsets.all(14),
                            decoration: BoxDecoration(
                              border: Border.all(color: Colors.grey.shade400),
                              borderRadius: BorderRadius.circular(10),
                            ),
                            child: Row(
                              children: [
                                const Icon(Icons.schedule, size: 20, color: Colors.teal),
                                const SizedBox(width: 8),
                                Text(_startTime.format(context), style: const TextStyle(fontWeight: FontWeight.bold)),
                              ],
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('End Time', style: theme.textTheme.titleSmall?.copyWith(fontWeight: FontWeight.bold)),
                        const SizedBox(height: 8),
                        InkWell(
                          onTap: _pickEndTime,
                          borderRadius: BorderRadius.circular(10),
                          child: Container(
                            padding: const EdgeInsets.all(14),
                            decoration: BoxDecoration(
                              border: Border.all(color: Colors.grey.shade400),
                              borderRadius: BorderRadius.circular(10),
                            ),
                            child: Row(
                              children: [
                                const Icon(Icons.schedule, size: 20, color: Colors.teal),
                                const SizedBox(width: 8),
                                Text(_endTime.format(context), style: const TextStyle(fontWeight: FontWeight.bold)),
                              ],
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 24),

              // Pricing and Capacity Fields
              Row(
                children: [
                  Expanded(
                    flex: 2,
                    child: TextFormField(
                      controller: _priceController,
                      keyboardType: const TextInputType.numberWithOptions(decimal: true),
                      decoration: const InputDecoration(
                        labelText: 'Price (LKR)',
                        prefixIcon: Icon(Icons.payments),
                        border: OutlineInputBorder(),
                      ),
                      validator: (value) {
                        if (value == null || value.trim().isEmpty) return 'Enter price';
                        if (double.tryParse(value.trim()) == null) return 'Invalid number';
                        return null;
                      },
                    ),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    flex: 1,
                    child: TextFormField(
                      controller: _capacityController,
                      keyboardType: TextInputType.number,
                      decoration: const InputDecoration(
                        labelText: 'Max Group',
                        prefixIcon: Icon(Icons.groups),
                        border: OutlineInputBorder(),
                      ),
                      validator: (value) {
                        if (value == null || value.trim().isEmpty) return 'Capacity required';
                        final val = int.tryParse(value.trim());
                        if (val == null || val <= 0) return '> 0';
                        return null;
                      },
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 24),

              // Notes Field
              TextFormField(
                controller: _notesController,
                maxLines: 2,
                decoration: const InputDecoration(
                  labelText: 'Notes / Inclusions (Optional)',
                  hintText: 'e.g. Includes English guided tour of Sigiriya',
                  prefixIcon: Icon(Icons.note_alt),
                  border: OutlineInputBorder(),
                ),
              ),
              const SizedBox(height: 32),

              // Save Button
              SizedBox(
                width: double.infinity,
                height: 52,
                child: ElevatedButton(
                  onPressed: _isSubmitting ? null : _submitForm,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.teal,
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                  ),
                  child: _isSubmitting
                      ? const SizedBox(
                          width: 24,
                          height: 24,
                          child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2.5),
                        )
                      : const Text(
                          'Publish Slot',
                          style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                        ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
