import 'package:flutter/material.dart';
import '../models/itinerary_models.dart';
import '../services/itinerary_service.dart';

class ItineraryScreen extends StatefulWidget {
  final int tripRequestId;
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
  late Future<List<ItineraryModel>> _itinerariesFuture;
  late Future<BookingModel?> _bookingFuture;

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  void _loadData() {
    _itinerariesFuture = widget.service.getItinerariesByTrip(widget.tripRequestId);
    _bookingFuture = widget.service.getBookingByTrip(widget.tripRequestId);
  }

  Future<void> _handleCreateBooking() async {
    try {
      await widget.service.createBooking(
        tripRequestId: widget.tripRequestId,
        totalAmount: 150.0,
      );
      if (!mounted) return;
      setState(() {
        _loadData();
      });
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Failed to book: $e')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Itinerary & Booking'),
      ),
      body: FutureBuilder<List<ItineraryModel>>(
        future: _itinerariesFuture,
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const Center(child: CircularProgressIndicator());
          }
          if (snapshot.hasError) {
            return Center(child: Text('Error loading itinerary: ${snapshot.error}'));
          }

          final itineraries = snapshot.data ?? [];
          if (itineraries.isEmpty) {
            return const Center(child: Text('No itineraries available for this trip.'));
          }

          final itinerary = itineraries.first;

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
                        itinerary.title,
                        style: Theme.of(context).textTheme.titleLarge,
                      ),
                      const SizedBox(height: 8),
                      Text('Status: ${itinerary.status}'),
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
              if (itinerary.days.isEmpty)
                const Text('No day plans listed yet.')
              else
                ...itinerary.days.map((day) => ExpansionTile(
                      title: Text('Day ${day.dayNumber}: ${day.title ?? "Details"}'),
                      children: day.items.map((item) => ListTile(
                        leading: Text(item.timeSlot),
                        title: Text(item.title),
                        subtitle: item.description != null ? Text(item.description!) : null,
                        trailing: item.estimatedCost != null
                            ? Text('\$${item.estimatedCost!.toStringAsFixed(2)}')
                            : null,
                      )).toList(),
                    )),
              const SizedBox(height: 24),
              FutureBuilder<BookingModel?>(
                future: _bookingFuture,
                builder: (context, bookingSnapshot) {
                  final booking = bookingSnapshot.data;
                  if (booking != null) {
                    return Card(
                      color: Colors.green.shade100,
                      child: Padding(
                        padding: const EdgeInsets.all(16.0),
                        child: Text(
                          'Booking Status: ${booking.status} (${booking.currency} ${booking.totalAmount})',
                          style: const TextStyle(fontWeight: FontWeight.bold),
                        ),
                      ),
                    );
                  }
                  return ElevatedButton(
                    onPressed: _handleCreateBooking,
                    child: const Text('Confirm Booking'),
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
