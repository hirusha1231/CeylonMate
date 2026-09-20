import 'package:flutter/material.dart';
import '../services/report_service.dart';

class AddConditionReportScreen extends StatefulWidget {
  final ReportService service;

  const AddConditionReportScreen({super.key, required this.service});

  @override
  State<AddConditionReportScreen> createState() => _AddConditionReportScreenState();
}

class _AddConditionReportScreenState extends State<AddConditionReportScreen> {
  final _formKey = GlobalKey<FormState>();
  final _messageController = TextEditingController();
  final _photoUrlController = TextEditingController(text: 'https://photos.ceylonmate.local/trail-report.jpg');

  List<Map<String, dynamic>> _destinations = [];
  String? _selectedDestinationId;
  String _reportType = 'CLOSURE';
  double _latitude = 6.8667;
  double _longitude = 81.0466;
  bool _loading = true;
  bool _submitting = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _loadDestinations();
  }

  @override
  void dispose() {
    _messageController.dispose();
    _photoUrlController.dispose();
    super.dispose();
  }

  Future<void> _loadDestinations() async {
    try {
      final list = await widget.service.getDestinations();
      setState(() {
        _destinations = list;
        if (list.isNotEmpty) _selectedDestinationId = list.first['id'] as String?;
        _loading = false;
      });
    } catch (e) {
      setState(() {
        _error = 'Failed to load destinations: $e';
        _loading = false;
      });
    }
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate() || _selectedDestinationId == null) return;
    setState(() {
      _submitting = true;
      _error = null;
    });

    try {
      await widget.service.submitConditionReport(
        destinationId: _selectedDestinationId!,
        reportType: _reportType,
        message: _messageController.text.trim(),
        photoUrl: _photoUrlController.text.trim().isNotEmpty ? _photoUrlController.text.trim() : null,
        latitude: _latitude,
        longitude: _longitude,
      );
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('✅ Condition report submitted successfully!')),
        );
        Navigator.pop(context, true);
      }
    } catch (e) {
      setState(() {
        _error = 'Failed to submit report: $e';
        _submitting = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Submit Destination Condition Report')),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : SingleChildScrollView(
              padding: const EdgeInsets.all(16),
              child: Form(
                key: _formKey,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    if (_error != null)
                      Padding(
                        padding: const EdgeInsets.only(bottom: 12),
                        child: Text(_error!, style: const TextStyle(color: Colors.red)),
                      ),
                    DropdownButtonFormField<String>(
                      decoration: const InputDecoration(labelText: 'Select Destination'),
                      value: _selectedDestinationId,
                      items: _destinations.map((d) {
                        return DropdownMenuItem<String>(
                          value: d['id'] as String?,
                          child: Text(d['name'] as String? ?? 'Unknown'),
                        );
                      }).toList(),
                      onChanged: (val) => setState(() => _selectedDestinationId = val),
                      validator: (val) => val == null ? 'Select a destination' : null,
                    ),
                    const SizedBox(height: 12),
                    DropdownButtonFormField<String>(
                      decoration: const InputDecoration(labelText: 'Report Type'),
                      value: _reportType,
                      items: const [
                        DropdownMenuItem(value: 'CLOSURE', child: Text('⛔ Closure / Road Block')),
                        DropdownMenuItem(value: 'WEATHER', child: Text('🌧️ Severe Weather')),
                        DropdownMenuItem(value: 'CROWD', child: Text('👥 Overcrowding / High Wait')),
                        DropdownMenuItem(value: 'SAFETY', child: Text('⚠️ Safety Notice')),
                      ],
                      onChanged: (val) => setState(() => _reportType = val ?? 'CLOSURE'),
                    ),
                    const SizedBox(height: 12),
                    TextFormField(
                      controller: _messageController,
                      maxLines: 3,
                      decoration: const InputDecoration(
                        labelText: 'Condition Details',
                        hintText: 'e.g. Heavy mudslide closed the main walking trail today.',
                      ),
                      validator: (val) => val == null || val.trim().isEmpty ? 'Please enter report details' : null,
                    ),
                    const SizedBox(height: 12),
                    TextFormField(
                      controller: _photoUrlController,
                      decoration: const InputDecoration(
                        labelText: 'Evidence Photo URL (or Camera Image)',
                      ),
                    ),
                    const SizedBox(height: 16),
                    Card(
                      child: Padding(
                        padding: const EdgeInsets.all(12),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text('📍 Location Evidence (GPS)', style: TextStyle(fontWeight: FontWeight.bold)),
                            const SizedBox(height: 4),
                            Text('Lat: $_latitude, Lng: $_longitude (Captured via Device Location)'),
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(height: 24),
                    FilledButton(
                      onPressed: _submitting ? null : _submit,
                      child: _submitting
                          ? const CircularProgressIndicator(color: Colors.white)
                          : const Text('Submit Report'),
                    ),
                  ],
                ),
              ),
            ),
    );
  }
}
