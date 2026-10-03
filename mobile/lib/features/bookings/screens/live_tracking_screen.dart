import 'package:flutter/material.dart';
import '../../../core/network/api_client.dart';

class LiveTrackingScreen extends StatefulWidget {
  final ApiClient client;
  final String bookingId;
  final String bookingReference;
  final String vehicleModel;
  final double totalAmountLkr;

  const LiveTrackingScreen({
    super.key,
    required this.client,
    required this.bookingId,
    required this.bookingReference,
    required this.vehicleModel,
    required this.totalAmountLkr,
  });

  @override
  State<LiveTrackingScreen> createState() => _LiveTrackingScreenState();
}

class _LiveTrackingScreenState extends State<LiveTrackingScreen> {
  final double _currentSpeedKmH = 48.0;
  final String _currentCoords = '7.9570° N, 80.7603° E';

  final List<Map<String, dynamic>> _checkpoints = [
    {
      'title': 'Bandaranaike International Airport (CMB)',
      'subtitle': 'Pickup completed at 06:30 AM',
      'status': 'COMPLETED',
      'icon': Icons.flight_land,
    },
    {
      'title': 'Pinnawala Elephant Sanctuary',
      'subtitle': 'Morning river bath and tea stop',
      'status': 'COMPLETED',
      'icon': Icons.pets,
    },
    {
      'title': 'Sigiriya Lion Rock Fortress',
      'subtitle': 'Currently en-route • ETA 14 mins',
      'status': 'IN_PROGRESS',
      'icon': Icons.navigation,
    },
    {
      'title': 'Kandy Temple of the Tooth Relic',
      'subtitle': 'Evening cultural ceremony scheduled',
      'status': 'UPCOMING',
      'icon': Icons.temple_buddhist,
    },
    {
      'title': 'Nuwara Eliya Tea Plantations',
      'subtitle': 'Highland hotel check-in',
      'status': 'UPCOMING',
      'icon': Icons.nature,
    },
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Live Trip & Fleet Tracking'),
        elevation: 1,
        automaticallyImplyLeading: false,
        actions: [
          IconButton(
            tooltip: 'Close Tracking',
            icon: const Icon(Icons.close),
            onPressed: () => Navigator.of(context).popUntil((route) => route.isFirst),
          ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Status & Booking Header Banner
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.green.shade50,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: Colors.green.shade300),
              ),
              child: Row(
                children: [
                  const Icon(Icons.check_circle, color: Colors.green, size: 36),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'BOOKING CONFIRMED & ACTIVE',
                          style: TextStyle(color: Colors.green, fontWeight: FontWeight.bold, fontSize: 13),
                        ),
                        Text(
                          'Ref: ${widget.bookingReference}',
                          style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                        ),
                        Text(
                          'Vehicle: ${widget.vehicleModel}',
                          style: TextStyle(color: Colors.grey.shade700, fontSize: 13),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),

            // Live Telemetry GPS Card
            Card(
              elevation: 2,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Row(
                          children: [
                            Container(
                              width: 10,
                              height: 10,
                              decoration: const BoxDecoration(
                                color: Colors.green,
                                shape: BoxShape.circle,
                              ),
                            ),
                            const SizedBox(width: 8),
                            const Text('Live GPS Telemetry', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                          ],
                        ),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                          decoration: BoxDecoration(
                            color: Colors.teal.shade50,
                            borderRadius: BorderRadius.circular(6),
                          ),
                          child: Text(
                            '$_currentSpeedKmH km/h',
                            style: const TextStyle(fontWeight: FontWeight.bold, color: Colors.teal, fontSize: 12),
                          ),
                        ),
                      ],
                    ),
                    const Divider(height: 20),
                    Row(
                      children: [
                        const Icon(Icons.my_location, color: Colors.teal, size: 18),
                        const SizedBox(width: 8),
                        Text('Current Coordinates: $_currentCoords', style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w500)),
                      ],
                    ),
                    const SizedBox(height: 6),
                    const Row(
                      children: [
                        Icon(Icons.person_pin, color: Colors.indigo, size: 18),
                        SizedBox(width: 8),
                        Text('Assigned Guide: Nimal Jayawardena (SLTDA Certified)', style: TextStyle(fontSize: 13)),
                      ],
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 20),

            // Checkpoints Timeline
            Text(
              'Route Itinerary Checkpoints',
              style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 12),

            ...List.generate(_checkpoints.length, (index) {
              final cp = _checkpoints[index];
              final isDone = cp['status'] == 'COMPLETED';
              final isCurrent = cp['status'] == 'IN_PROGRESS';

              final color = isDone
                  ? Colors.green
                  : isCurrent
                      ? Colors.teal
                      : Colors.grey;

              return Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Column(
                    children: [
                      Container(
                        width: 32,
                        height: 32,
                        decoration: BoxDecoration(
                          color: color.withValues(alpha: 0.15),
                          shape: BoxShape.circle,
                          border: Border.all(color: color, width: 2),
                        ),
                        child: Icon(
                          cp['icon'] as IconData,
                          size: 16,
                          color: color,
                        ),
                      ),
                      if (index < _checkpoints.length - 1)
                        Container(
                          width: 2,
                          height: 48,
                          color: isDone ? Colors.green : Colors.grey.shade300,
                        ),
                    ],
                  ),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Padding(
                      padding: const EdgeInsets.only(bottom: 24),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            cp['title'] as String,
                            style: TextStyle(
                              fontSize: 14,
                              fontWeight: isCurrent ? FontWeight.bold : FontWeight.w600,
                              color: isCurrent ? Colors.teal.shade800 : Colors.black87,
                            ),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            cp['subtitle'] as String,
                            style: TextStyle(fontSize: 12, color: Colors.grey.shade600),
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
              );
            }),

            const SizedBox(height: 12),

            // Return to Home Button
            SizedBox(
              height: 50,
              child: ElevatedButton.icon(
                onPressed: () => Navigator.of(context).popUntil((route) => route.isFirst),
                style: ElevatedButton.styleFrom(
                  backgroundColor: Colors.teal,
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                ),
                icon: const Icon(Icons.home),
                label: const Text('Return to Home', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
