import 'package:flutter/material.dart';
import '../../../core/network/api_client.dart';
import '../../itinerary/screens/itinerary_screen.dart';
import '../../itinerary/services/itinerary_service.dart';

class TripDetailsScreen extends StatefulWidget {
  final String tripId;
  final ApiClient? client;
  final dynamic service;

  const TripDetailsScreen({
    super.key,
    required this.tripId,
    this.client,
    this.service,
  });

  @override
  State<TripDetailsScreen> createState() => _TripDetailsScreenState();
}

class _TripDetailsScreenState extends State<TripDetailsScreen> {
  late Future<Map<String, dynamic>> _tripFuture;
  late final ApiClient _apiClient;
  bool _isSubmitting = false;

  @override
  void initState() {
    super.initState();
    if (widget.client != null) {
      _apiClient = widget.client!;
    } else if (widget.service != null && widget.service.client is ApiClient) {
      _apiClient = widget.service.client as ApiClient;
    } else {
      _apiClient = ApiClient();
    }
    _loadTrip();
  }

  void _loadTrip() {
    setState(() {
      _tripFuture = _fetchTripDetails();
    });
  }

  Future<Map<String, dynamic>> _fetchTripDetails() async {
    final response = await _apiClient.dio.get('/api/trips/${widget.tripId}');
    return Map<String, dynamic>.from(response.data as Map);
  }

  Future<void> _submitTrip() async {
    setState(() {
      _isSubmitting = true;
    });

    try {
      await _apiClient.dio.post('/api/trips/${widget.tripId}/submit');
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Trip submitted successfully!')),
      );
      _loadTrip();
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Failed to submit trip: $e')),
      );
    } finally {
      if (mounted) {
        setState(() {
          _isSubmitting = false;
        });
      }
    }
  }

  String _formatDate(dynamic dateStr) {
    if (dateStr == null) return 'Not set';
    try {
      final parsed = DateTime.parse(dateStr.toString());
      return '${parsed.year}-${parsed.month.toString().padLeft(2, '0')}-${parsed.day.toString().padLeft(2, '0')}';
    } catch (_) {
      return dateStr.toString();
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Trip Details'),
      ),
      body: FutureBuilder<Map<String, dynamic>>(
        future: _tripFuture,
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const Center(child: CircularProgressIndicator());
          }

          if (snapshot.hasError) {
            return Center(
              child: Padding(
                padding: const EdgeInsets.all(16.0),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      'Error loading trip: ${snapshot.error}',
                      textAlign: TextAlign.center,
                    ),
                    const SizedBox(height: 12),
                    ElevatedButton(
                      onPressed: _loadTrip,
                      child: const Text('Retry'),
                    ),
                  ],
                ),
              ),
            );
          }

          final trip = snapshot.data ?? {};
          final title = trip['title'] ?? 'Trip Overview';
          final status = trip['status'] ?? 'DRAFT';
          final startDate = _formatDate(trip['startDate']);
          final endDate = _formatDate(trip['endDate']);
          final budget = trip['budget']?.toString() ?? '0.00';
          final partySize = trip['partySize']?.toString() ?? '1';
          final interests = trip['interests'] ?? 'Not set';
          final visitorCategory = trip['visitorCategory'] ?? 'Not set';
          final startLocation = trip['startingLocation'] ?? '6.9271, 79.8612';
          final accessibility = trip['accessibilityNeeds'] ?? 'None';

          return SingleChildScrollView(
            padding: const EdgeInsets.all(16.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title.toString(),
                  style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                        fontWeight: FontWeight.bold,
                      ),
                ),
                const SizedBox(height: 16),
                Card(
                  elevation: 0,
                  color: Colors.grey.shade100,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Padding(
                    padding: const EdgeInsets.all(16.0),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'Workflow status',
                          style: TextStyle(fontWeight: FontWeight.w500),
                        ),
                        const SizedBox(height: 8),
                        Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 12,
                            vertical: 4,
                          ),
                          decoration: BoxDecoration(
                            border: Border.all(color: Colors.grey.shade400),
                            borderRadius: BorderRadius.circular(6),
                          ),
                          child: Text(
                            status.toString().toUpperCase(),
                            style: const TextStyle(fontWeight: FontWeight.bold),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 16),
                _buildInfoTile('Dates', '$startDate – $endDate'),
                _buildInfoTile('Budget', 'LKR $budget'),
                _buildInfoTile('Party size', partySize),
                _buildInfoTile('Interests (reusable profile)', interests.toString()),
                _buildInfoTile('Visitor category', visitorCategory.toString()),
                _buildInfoTile('Starting location', startLocation.toString()),
                _buildInfoTile('Accessibility needs', accessibility.toString()),
                const SizedBox(height: 24),
                OutlinedButton.icon(
                  onPressed: () {},
                  icon: const Icon(Icons.edit, size: 18),
                  label: const Text('Edit draft'),
                  style: OutlinedButton.styleFrom(
                    minimumSize: const Size.fromHeight(48),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(24),
                    ),
                  ),
                ),
                const SizedBox(height: 12),
                ElevatedButton(
                  onPressed: _isSubmitting ? null : _submitTrip,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF00695C),
                    foregroundColor: Colors.white,
                    minimumSize: const Size.fromHeight(48),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(24),
                    ),
                  ),
                  child: _isSubmitting
                      ? const SizedBox(
                          height: 20,
                          width: 20,
                          child: CircularProgressIndicator(
                            strokeWidth: 2,
                            color: Colors.white,
                          ),
                        )
                      : const Text('Submit trip'),
                ),
                const SizedBox(height: 12),
                ElevatedButton.icon(
                  onPressed: () {
                    Navigator.push(
                      context,
                      MaterialPageRoute(
                        builder: (_) => ItineraryScreen(
                          tripRequestId: int.tryParse(widget.tripId.toString()) != null 
    ? widget.tripId.toString() 
    : '1',
                          service: ItineraryService(_apiClient),
                        ),
                      ),
                    );
                  },
                  icon: const Icon(Icons.map_outlined, size: 18),
                  label: const Text('View Itinerary & Booking'),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF00695C),
                    foregroundColor: Colors.white,
                    minimumSize: const Size.fromHeight(48),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(24),
                    ),
                  ),
                ),
              ],
            ),
          );
        },
      ),
    );
  }

  Widget _buildInfoTile(String title, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            title,
            style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
          ),
          const SizedBox(height: 2),
          Text(
            value,
            style: TextStyle(color: Colors.grey.shade800, fontSize: 14),
          ),
        ],
      ),
    );
  }
}