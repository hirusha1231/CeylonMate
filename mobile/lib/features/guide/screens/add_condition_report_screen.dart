import 'package:flutter/material.dart';
import 'package:geolocator/geolocator.dart';
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

  final _latController = TextEditingController(text: '6.8667');
  final _lngController = TextEditingController(text: '81.0466');

  List<Map<String, dynamic>> _destinations = [];
  String? _selectedDestinationId;
  String _reportType = 'CLOSURE';
  bool _loading = true;
  bool _submitting = false;
  bool _capturingLocation = false;
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
    _latController.dispose();
    _lngController.dispose();
    super.dispose();
  }

  Future<void> _loadDestinations() async {
    try {
      final list = await widget.service.getDestinations();
      if (!mounted) return;
      setState(() {
        _destinations = list;
        if (list.isNotEmpty) _selectedDestinationId = list.first['id'] as String?;
        _loading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = 'Failed to load destinations: $e';
        _loading = false;
      });
    }
  }

  Future<void> _captureLocation() async {
    setState(() {
      _capturingLocation = true;
      _error = null;
    });
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
        throw StateError('Location permission was denied. Enter manually.');
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
        const SnackBar(content: Text('📍 Current hazard coordinates captured!')),
      );
    } catch (error) {
      if (mounted) setState(() => _error = error.toString().replaceFirst('Bad state: ', ''));
    } finally {
      if (mounted) setState(() => _capturingLocation = false);
    }
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate() || _selectedDestinationId == null) return;
    setState(() {
      _submitting = true;
      _error = null;
    });

    try {
      final lat = double.tryParse(_latController.text.trim()) ?? 6.8667;
      final lng = double.tryParse(_lngController.text.trim()) ?? 81.0466;

      await widget.service.submitConditionReport(
        destinationId: _selectedDestinationId!,
        reportType: _reportType,
        message: _messageController.text.trim(),
        photoUrl: _photoUrlController.text.trim().isNotEmpty ? _photoUrlController.text.trim() : null,
        latitude: lat,
        longitude: lng,
      );
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('✅ Condition report submitted successfully!')),
        );
        Navigator.pop(context, true);
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _error = 'Failed to submit report: $e';
          _submitting = false;
        });
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
    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        title: const Text('Submit Condition Report'),
        backgroundColor: Colors.white,
        foregroundColor: Colors.black87,
        elevation: 0,
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : SingleChildScrollView(
              padding: const EdgeInsets.all(16),
              child: Form(
                key: _formKey,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    if (_error != null) ...[
                      Container(
                        padding: const EdgeInsets.all(12),
                        margin: const EdgeInsets.only(bottom: 16),
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
                    ],

                    // Card 1: Destination & Hazard Classification
                    _buildCard(
                      title: 'Location & Classification',
                      icon: Icons.place_outlined,
                      children: [
                        DropdownButtonFormField<String>(
                          decoration: const InputDecoration(
                            labelText: 'Destination *',
                            border: OutlineInputBorder(),
                          ),
                          initialValue: _selectedDestinationId,
                          items: _destinations.map((d) {
                            return DropdownMenuItem<String>(
                              value: d['id'] as String?,
                              child: Text(d['name'] as String? ?? 'Unknown'),
                            );
                          }).toList(),
                          onChanged: (val) => setState(() => _selectedDestinationId = val),
                          validator: (val) => val == null ? 'Please select a destination' : null,
                        ),
                        const SizedBox(height: 16),
                        DropdownButtonFormField<String>(
                          decoration: const InputDecoration(
                            labelText: 'Condition / Hazard Type *',
                            border: OutlineInputBorder(),
                          ),
                          initialValue: _reportType,
                          items: const [
                            DropdownMenuItem(value: 'CLOSURE', child: Text('⛔ Closure / Road Block')),
                            DropdownMenuItem(value: 'WEATHER', child: Text('🌧️ Severe Weather')),
                            DropdownMenuItem(value: 'CROWD', child: Text('👥 High Wait / Overcrowded')),
                            DropdownMenuItem(value: 'SAFETY', child: Text('⚠️ Safety Hazard Notice')),
                          ],
                          onChanged: (val) => setState(() => _reportType = val ?? 'CLOSURE'),
                        ),
                      ],
                    ),

                    // Card 2: Field Observations
                    _buildCard(
                      title: 'Observation Details',
                      icon: Icons.description_outlined,
                      children: [
                        TextFormField(
                          controller: _messageController,
                          maxLines: 4,
                          maxLength: 1000,
                          decoration: const InputDecoration(
                            labelText: 'Condition Details *',
                            hintText: 'Describe the situation (e.g. Mudslide closed bridge; alternate detour required)',
                            border: OutlineInputBorder(),
                          ),
                          validator: (val) {
                            final trimmed = val?.trim() ?? '';
                            if (trimmed.isEmpty) return 'Please describe the field condition';
                            if (trimmed.length < 10) return 'Description must be at least 10 characters';
                            return null;
                          },
                        ),
                        const SizedBox(height: 12),
                        TextFormField(
                          controller: _photoUrlController,
                          decoration: const InputDecoration(
                            labelText: 'Evidence Photo URL (Optional)',
                            hintText: 'https://...',
                            border: OutlineInputBorder(),
                            prefixIcon: Icon(Icons.add_photo_alternate_outlined),
                          ),
                        ),
                      ],
                    ),

                    // Card 3: Exact Coordinates
                    _buildCard(
                      title: 'Hazard Coordinates',
                      icon: Icons.my_location_outlined,
                      children: [
                        OutlinedButton.icon(
                          onPressed: _capturingLocation ? null : _captureLocation,
                          icon: const Icon(Icons.gps_fixed),
                          label: Text(_capturingLocation ? 'Fetching GPS...' : 'Capture Hazard Location GPS'),
                          style: OutlinedButton.styleFrom(minimumSize: const Size.fromHeight(44)),
                        ),
                        const SizedBox(height: 12),
                        Row(
                          children: [
                            Expanded(
                              child: TextFormField(
                                controller: _latController,
                                keyboardType: const TextInputType.numberWithOptions(decimal: true, signed: true),
                                decoration: const InputDecoration(labelText: 'Latitude *', border: OutlineInputBorder()),
                                validator: (val) {
                                  if (val == null || val.trim().isEmpty) return 'Required';
                                  final n = double.tryParse(val.trim());
                                  if (n == null || n < -90 || n > 90) return 'Must be -90 to 90';
                                  return null;
                                },
                              ),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: TextFormField(
                                controller: _lngController,
                                keyboardType: const TextInputType.numberWithOptions(decimal: true, signed: true),
                                decoration: const InputDecoration(labelText: 'Longitude *', border: OutlineInputBorder()),
                                validator: (val) {
                                  if (val == null || val.trim().isEmpty) return 'Required';
                                  final n = double.tryParse(val.trim());
                                  if (n == null || n < -180 || n > 180) return 'Must be -180 to 180';
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
                      onPressed: _submitting ? null : _submit,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF0F766E),
                        foregroundColor: Colors.white,
                        minimumSize: const Size.fromHeight(50),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                      ),
                      child: _submitting
                          ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                          : const Text(
                              'Submit Hazard Report',
                              style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
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