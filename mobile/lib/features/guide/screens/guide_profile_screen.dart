import 'package:flutter/material.dart';
import '../../../core/network/api_client.dart';

class GuideProfileScreen extends StatefulWidget {
  final ApiClient apiClient;

  const GuideProfileScreen({super.key, required this.apiClient});

  @override
  State<GuideProfileScreen> createState() => _GuideProfileScreenState();
}

class _GuideProfileScreenState extends State<GuideProfileScreen> {
  final _formKey = GlobalKey<FormState>();

  late final TextEditingController _fullNameController;
  late final TextEditingController _bioController;
  late final TextEditingController _licenseNumberController;
  late final TextEditingController _licenseTypeController;
  late final TextEditingController _languagesController;
  late final TextEditingController _specialtiesController;
  late final TextEditingController _dailyRateController;
  late final TextEditingController _photoUrlController;

  bool _isChauffeur = false;
  bool _isLoading = true;
  bool _isSaving = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _fullNameController = TextEditingController();
    _bioController = TextEditingController();
    _licenseNumberController = TextEditingController();
    _licenseTypeController = TextEditingController(text: 'National Tourist Guide Lecturer');
    _languagesController = TextEditingController();
    _specialtiesController = TextEditingController();
    _dailyRateController = TextEditingController(text: '18000');
    _photoUrlController = TextEditingController();
    _loadProfile();
  }

  @override
  void dispose() {
    _fullNameController.dispose();
    _bioController.dispose();
    _licenseNumberController.dispose();
    _licenseTypeController.dispose();
    _languagesController.dispose();
    _specialtiesController.dispose();
    _dailyRateController.dispose();
    _photoUrlController.dispose();
    super.dispose();
  }

  Future<void> _loadProfile() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      final res = await widget.apiClient.dio.get('/api/guide/me/profile');
      final data = Map<String, dynamic>.from(res.data as Map);

      if (mounted) {
        setState(() {
          _fullNameController.text = (data['fullName'] as String?) ?? '';
          _bioController.text = (data['bio'] as String?) ?? '';
          _licenseNumberController.text = (data['licenseNumber'] as String?) ?? 'SLTDA-CG-0491';
          _licenseTypeController.text = (data['licenseType'] as String?) ?? 'National Tourist Guide Lecturer';
          _languagesController.text = (data['languagesSpoken'] as String?) ?? 'English, Sinhala';
          _specialtiesController.text = (data['specialties'] as String?) ?? 'Cultural Heritage & Wildlife';
          _dailyRateController.text = (data['defaultDailyRateLkr']?.toString()) ?? '18000';
          _photoUrlController.text = (data['photoUrl'] as String?) ?? '';
          _isChauffeur = (data['isChauffeur'] as bool?) ?? false;
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _error = 'Failed to load guide profile: $e';
          _isLoading = false;
        });
      }
    }
  }

  Future<void> _saveProfile() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() {
      _isSaving = true;
      _error = null;
    });

    try {
      final dailyRate = double.tryParse(_dailyRateController.text.trim()) ?? 18000.0;

      final payload = {
        'fullName': _fullNameController.text.trim(),
        'bio': _bioController.text.trim(),
        'languagesSpoken': _languagesController.text.trim(),
        'specialties': _specialtiesController.text.trim(),
        'licenseNumber': _licenseNumberController.text.trim(),
        'licenseType': _licenseTypeController.text.trim(),
        'isChauffeur': _isChauffeur,
        'drivingLicenseClass': _isChauffeur ? 'Class B / Dual Passenger' : null,
        'photoUrl': _photoUrlController.text.trim().isNotEmpty ? _photoUrlController.text.trim() : null,
        'defaultDailyRateLkr': dailyRate,
        'currency': 'LKR',
      };

      await widget.apiClient.dio.put('/api/guide/me/profile', data: payload);

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('✅ Guide Profile updated successfully!'),
            backgroundColor: Colors.green,
          ),
        );
        Navigator.pop(context, true);
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _error = 'Failed to update profile: $e';
          _isSaving = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Guide Profile Setup'),
        elevation: 1,
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : SingleChildScrollView(
              padding: const EdgeInsets.all(20),
              child: Form(
                key: _formKey,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    if (_error != null)
                      Container(
                        padding: const EdgeInsets.all(12),
                        margin: const EdgeInsets.only(bottom: 16),
                        decoration: BoxDecoration(
                          color: Colors.red.shade50,
                          borderRadius: BorderRadius.circular(8),
                          border: Border.all(color: Colors.red.shade200),
                        ),
                        child: Text(_error!, style: TextStyle(color: Colors.red.shade800)),
                      ),

                    // Header Avatar Card
                    Center(
                      child: Column(
                        children: [
                          CircleAvatar(
                            radius: 46,
                            backgroundColor: Colors.teal.shade100,
                            backgroundImage: _photoUrlController.text.trim().isNotEmpty
                                ? NetworkImage(_photoUrlController.text.trim())
                                : null,
                            child: _photoUrlController.text.trim().isEmpty
                                ? const Icon(Icons.person, size: 50, color: Colors.teal)
                                : null,
                          ),
                          const SizedBox(height: 8),
                          Text(
                            'SLTDA Certified Guide Profile',
                            style: Theme.of(context).textTheme.titleMedium?.copyWith(
                                  fontWeight: FontWeight.bold,
                                  color: Colors.teal.shade800,
                                ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 24),

                    // Full Name (Letters only)
                    TextFormField(
                      controller: _fullNameController,
                      decoration: const InputDecoration(
                        labelText: 'Full Name *',
                        prefixIcon: Icon(Icons.badge),
                        border: OutlineInputBorder(),
                        helperText: 'Letters only',
                      ),
                      validator: (value) {
                        final trimmed = value?.trim() ?? '';
                        if (trimmed.isEmpty) return 'Full Name is required';
                        if (RegExp(r'\d').hasMatch(trimmed)) {
                          return 'Full Name must contain letters only';
                        }
                        return null;
                      },
                    ),
                    const SizedBox(height: 16),

                    // License Number & Type
                    Row(
                      children: [
                        Expanded(
                          child: TextFormField(
                            controller: _licenseNumberController,
                            decoration: const InputDecoration(
                              labelText: 'SLTDA License # *',
                              prefixIcon: Icon(Icons.card_membership),
                              border: OutlineInputBorder(),
                            ),
                            validator: (value) =>
                                value == null || value.trim().isEmpty ? 'License number required' : null,
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: TextFormField(
                            controller: _licenseTypeController,
                            decoration: const InputDecoration(
                              labelText: 'License Category',
                              prefixIcon: Icon(Icons.verified),
                              border: OutlineInputBorder(),
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 16),

                    // Bio / Overview (Character limits: 10 - 500)
                    TextFormField(
                      controller: _bioController,
                      maxLines: 3,
                      maxLength: 500,
                      decoration: const InputDecoration(
                        labelText: 'Bio & Experience Summary *',
                        hintText: 'e.g. Senior SLTDA Chauffeur Guide with 15+ years experience in the Cultural Triangle.',
                        prefixIcon: Icon(Icons.description),
                        border: OutlineInputBorder(),
                      ),
                      validator: (value) {
                        final trimmed = value?.trim() ?? '';
                        if (trimmed.isEmpty) return 'Bio is required';
                        if (trimmed.length < 10) return 'Bio must be at least 10 characters';
                        if (trimmed.length > 500) return 'Bio must not exceed 500 characters';
                        return null;
                      },
                    ),
                    const SizedBox(height: 16),

                    // Languages Spoken & Specialties
                    TextFormField(
                      controller: _languagesController,
                      decoration: const InputDecoration(
                        labelText: 'Languages Spoken *',
                        hintText: 'e.g. English, German, Sinhala',
                        prefixIcon: Icon(Icons.translate),
                        border: OutlineInputBorder(),
                      ),
                      validator: (value) =>
                          value == null || value.trim().isEmpty ? 'Languages spoken required' : null,
                    ),
                    const SizedBox(height: 16),

                    TextFormField(
                      controller: _specialtiesController,
                      decoration: const InputDecoration(
                        labelText: 'Tour Specialties *',
                        hintText: 'e.g. Cultural Heritage, Ancient Ruins, Wildlife Safaris',
                        prefixIcon: Icon(Icons.star),
                        border: OutlineInputBorder(),
                      ),
                      validator: (value) =>
                          value == null || value.trim().isEmpty ? 'Tour specialties required' : null,
                    ),
                    const SizedBox(height: 16),

                    // Default Daily Rate (Price > 0)
                    TextFormField(
                      controller: _dailyRateController,
                      keyboardType: const TextInputType.numberWithOptions(decimal: true),
                      decoration: const InputDecoration(
                        labelText: 'Default Daily Rate (LKR) *',
                        prefixIcon: Icon(Icons.payments),
                        border: OutlineInputBorder(),
                      ),
                      validator: (value) {
                        if (value == null || value.trim().isEmpty) return 'Daily rate required';
                        final rate = double.tryParse(value.trim());
                        if (rate == null) return 'Enter a valid number';
                        if (rate <= 0) return 'Daily rate must be greater than 0';
                        return null;
                      },
                    ),
                    const SizedBox(height: 16),

                    // Chauffeur Switch
                    SwitchListTile(
                      title: const Text('Authorized Chauffeur Guide'),
                      subtitle: const Text('Can escort travelers with certified tourist vehicle'),
                      value: _isChauffeur,
                      onChanged: (val) => setState(() => _isChauffeur = val),
                    ),
                    const SizedBox(height: 24),

                    // Submit Button
                    SizedBox(
                      height: 52,
                      child: ElevatedButton(
                        onPressed: _isSaving ? null : _saveProfile,
                        style: ElevatedButton.styleFrom(
                          backgroundColor: Colors.teal,
                          foregroundColor: Colors.white,
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                        ),
                        child: _isSaving
                            ? const CircularProgressIndicator(color: Colors.white, strokeWidth: 2)
                            : const Text('Save Guide Profile', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                      ),
                    ),
                  ],
                ),
              ),
            ),
    );
  }
}
