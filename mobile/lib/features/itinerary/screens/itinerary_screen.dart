import 'package:flutter/material.dart';
import '../services/itinerary_service.dart';

class LocalItineraryDay {
  final int dayNumber;
  final String title;
  final String description;

  const LocalItineraryDay({
    required this.dayNumber,
    required this.title,
    required this.description,
  });
}

class ItineraryScreen extends StatefulWidget {
  final String tripRequestId;
  final ItineraryService service;

  const ItineraryScreen({
    super.key,
    required this.tripRequestId,
    required this.service,
  });

  @override
  State<ItineraryScreen> createState() => _ItineraryScreenState();
}

class _ItineraryScreenState extends State<ItineraryScreen> {
  late Future<dynamic> _itinerariesFuture;
  late Future<dynamic> _bookingFuture;
  bool _isBooking = false;

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  void _loadData() {
    _itinerariesFuture = widget.service.getItinerariesByTrip(widget.tripRequestId);
    _bookingFuture = widget.service.getBookingByTrip(widget.tripRequestId);
  }

  Future<void> _handleConfirmBooking(dynamic itinerary) async {
    setState(() {
      _isBooking = true;
    });

    try {
      final itineraryId = (itinerary is Map)
          ? itinerary['id']
          : (itinerary as dynamic).id;

      await widget.service.createBooking(
        tripRequestId: widget.tripRequestId,
        itineraryId: itineraryId,
        totalAmount: 0.0,
      );

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Booking confirmed successfully!')),
        );
        setState(() {
          _bookingFuture = widget.service.getBookingByTrip(widget.tripRequestId);
        });
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to confirm booking: $e')),
        );
      }
    } finally {
      if (mounted) {
        setState(() {
          _isBooking = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Itinerary & Booking'),
      ),
      body: FutureBuilder<dynamic>(
        future: _itinerariesFuture,
        builder: (context, itinerarySnapshot) {
          if (itinerarySnapshot.connectionState == ConnectionState.waiting) {
            return const Center(child: CircularProgressIndicator());
          }

          if (itinerarySnapshot.hasError) {
            return Center(
              child: Text('Error loading itinerary: ${itinerarySnapshot.error}'),
            );
          }

          final data = itinerarySnapshot.data;
          dynamic itinerary;

          if (data is List && data.isNotEmpty) {
            itinerary = data.first;
          } else if (data != null && data is! List) {
            itinerary = data;
          }

          if (itinerary == null) {
            return const Center(
              child: Text('No itineraries available for this trip.'),
            );
          }

          final title = (itinerary is Map)
              ? (itinerary['title'] ?? 'Itinerary Details')
              : (itinerary as dynamic).title ?? 'Itinerary Details';

          final status = (itinerary is Map)
              ? (itinerary['status'] ?? 'PENDING')
              : (itinerary as dynamic).status ?? 'PENDING';

          final rawDays = (itinerary is Map)
              ? (itinerary['days'] as List?)
              : (itinerary as dynamic).days as List?;

          final displayDays = (rawDays != null && rawDays.isNotEmpty)
              ? rawDays.map((d) => LocalItineraryDay(
                    dayNumber: (d is Map ? d['dayNumber'] : (d as dynamic).dayNumber) ?? 1,
                    title: (d is Map ? d['title'] : (d as dynamic).title) ?? '',
                    description: (d is Map ? d['description'] : (d as dynamic).description) ?? '',
                  )).toList()
              : const [
                  LocalItineraryDay(
                    dayNumber: 1,
                    title: 'Day 1: Sigiriya Rock Fortress',
                    description: 'Climb the ancient rock fortress, view frescoes, and tour the water gardens.',
                  ),
                  LocalItineraryDay(
                    dayNumber: 2,
                    title: 'Day 2: Dambulla Cave Temple',
                    description: 'Explore the golden cave temple complex and ancient Buddhist statues.',
                  ),
                ];

          return ListView(
            padding: const EdgeInsets.all(16.0),
            children: [
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(16.0),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        title.toString(),
                        style: Theme.of(context).textTheme.titleLarge,
                      ),
                      const SizedBox(height: 8),
                      Text('Status: $status'),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 16),
              Text(
                'Schedule',
                style: Theme.of(context).textTheme.titleMedium,
              ),
              const SizedBox(height: 8),
              ...displayDays.map(
                (day) => Card(
                  margin: const EdgeInsets.only(bottom: 8),
                  child: ListTile(
                    leading: CircleAvatar(
                      child: Text('${day.dayNumber}'),
                    ),
                    title: Text(day.title),
                    subtitle: Text(day.description),
                  ),
                ),
              ),
              const SizedBox(height: 16),
              FutureBuilder<dynamic>(
                future: _bookingFuture,
                builder: (context, bookingSnapshot) {
                  if (bookingSnapshot.connectionState == ConnectionState.waiting) {
                    return const Center(child: CircularProgressIndicator());
                  }

                  final booking = bookingSnapshot.data;

                  if (booking != null) {
                    final bookingStatus = (booking is Map)
                        ? (booking['status'] ?? 'CONFIRMED')
                        : (booking as dynamic).status ?? 'CONFIRMED';
                    final bookingAmount = (booking is Map)
                        ? (booking['totalAmount'] ?? 0.0)
                        : (booking as dynamic).totalAmount ?? 0.0;

                    return Container(
                      width: double.infinity,
                      padding: const EdgeInsets.all(16.0),
                      decoration: BoxDecoration(
                        color: Colors.green.shade100,
                        borderRadius: BorderRadius.circular(8.0),
                      ),
                      child: Text(
                        'Booking Status: $bookingStatus (USD ${(bookingAmount as num).toStringAsFixed(2)})',
                        style: TextStyle(
                          color: Colors.green.shade900,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    );
                  }

                  return SizedBox(
                    width: double.infinity,
                    child: ElevatedButton(
                      onPressed: _isBooking ? null : () => _handleConfirmBooking(itinerary),
                      child: _isBooking
                          ? const SizedBox(
                              height: 20,
                              width: 20,
                              child: CircularProgressIndicator(strokeWidth: 2),
                            )
                          : const Text('Confirm Booking'),
                    ),
                  );
                },
              ),
            ],
          );
        },
      ),
    );
  }
}