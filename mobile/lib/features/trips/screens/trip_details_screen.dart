import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../models/trip.dart';
import '../services/trip_service.dart';
import 'trip_form_screen.dart';
import '../../itinerary/screens/itinerary_screen.dart';
import '../../itinerary/services/itinerary_service.dart';
class TripDetailsScreen extends StatefulWidget {
  final TripService service;
  final String tripId;

  const TripDetailsScreen({super.key, required this.service, required this.tripId});

  @override
  State<TripDetailsScreen> createState() => _TripDetailsScreenState();
}

class _TripDetailsScreenState extends State<TripDetailsScreen> {
  Trip? _trip;
  TravelerPreferences? _preferences;
  bool _loading = true;
  bool _working = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() { _loading = true; _error = null; });
    try {
      final trip = await widget.service.getTrip(widget.tripId);
      TravelerPreferences? preferences;
      try { preferences = await widget.service.getPreferences(); } catch (_) { /* Optional profile. */ }
      if (mounted) setState(() { _trip = trip; _preferences = preferences; });
    } catch (error) {
      if (mounted) setState(() => _error = tripError(error));
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _edit() async {
    final saved = await Navigator.push<Trip>(context, MaterialPageRoute(
      builder: (_) => TripFormScreen(service: widget.service, trip: _trip)));
    if (saved != null) _load();
  }

  Future<void> _transition({required bool planning}) async {
    setState(() { _working = true; _error = null; });
    try {
      final updated = planning
          ? await widget.service.startPlanning(widget.tripId)
          : await widget.service.submitTrip(widget.tripId);
      if (mounted) setState(() => _trip = updated);
    } catch (error) {
      if (mounted) setState(() => _error = tripError(error));
    } finally {
      if (mounted) setState(() => _working = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final trip = _trip;
    return Scaffold(
      appBar: AppBar(title: const Text('Trip Details'), actions: [
        IconButton(onPressed: _load, icon: const Icon(Icons.refresh),
          tooltip: 'Refresh status'),
      ]),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : trip == null
              ? Center(child: Column(mainAxisSize: MainAxisSize.min, children: [
                  Text(_error ?? 'Trip not found'),
                  TextButton(onPressed: _load, child: const Text('Retry')),
                ]))
              : ListView(padding: const EdgeInsets.all(16), children: [
                  if (_error != null) Text(_error!,
                    style: TextStyle(color: Theme.of(context).colorScheme.error)),
                  Text(trip.objective, style: Theme.of(context).textTheme.headlineSmall),
                  const SizedBox(height: 12),
                  Card(child: Padding(padding: const EdgeInsets.all(16),
                    child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                      Text('Workflow status', style: Theme.of(context).textTheme.titleMedium),
                      const SizedBox(height: 8),
                      Chip(label: Text(trip.status.replaceAll('_', ' '))),
                      Text(_statusDescription(trip.status)),
                      const SizedBox(height: 8),
                      Text('Updated ${DateFormat.yMMMd().add_jm().format(trip.updatedAtUtc.toLocal())}'),
                    ]))),
                  _line('Dates', '${DateFormat.yMMMd().format(trip.startDate)} – '
                      '${DateFormat.yMMMd().format(trip.endDate)}'),
                  _line('Budget', '${trip.currency} ${trip.budget.toStringAsFixed(2)}'),
                  _line('Party size', '${trip.partySize}'),
                  _line('Interests (reusable profile)',
                      _preferences?.interests?.isNotEmpty == true ? _preferences!.interests! : 'Not set'),
                  _line('Visitor category', _preferences?.visitorCategory ?? 'Not set'),
                  _line('Starting location', trip.startingLatitude == null
                      ? 'Not set' : '${trip.startingLatitude}, ${trip.startingLongitude}'),
                  _line('Accessibility needs', trip.accessibilityNeeds ?? 'None specified'),
                  const SizedBox(height: 20),
                  if (trip.status == 'DRAFT' || trip.status == 'REVISION_REQUIRED') ...[
                    OutlinedButton.icon(onPressed: _working ? null : _edit,
                      icon: const Icon(Icons.edit), label: const Text('Edit draft')),
                    FilledButton(onPressed: _working ? null : () => _transition(planning: false),
                      child: Text(_working ? 'Submitting…' : 'Submit trip')),
                  ],
                  if (trip.status == 'SUBMITTED' && widget.service.isStaff)
                    FilledButton(onPressed: _working ? null : () => _transition(planning: true),
                      child: Text(_working ? 'Starting…' : 'Start planning')),
                  FilledButton.icon(
                  icon: const Icon(Icons.map_outlined),
                  label: const Text('View Itinerary & Booking'),
                  onPressed: () {
                  final intId = int.tryParse(widget.tripId) ?? 0;
                  Navigator.of(context).push(
                    MaterialPageRoute(
                      builder: (_) => ItineraryScreen(
                        tripRequestId: intId,
                        service: ItineraryService(widget.service.client),
                      ),
                    ),
                  );
                },
              ),
                ]),
    );
  }

  Widget _line(String label, String value) => Padding(
    padding: const EdgeInsets.symmetric(vertical: 8),
    child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Text(label, style: const TextStyle(fontWeight: FontWeight.bold)),
      Text(value),
    ]),
  );

  String _statusDescription(String status) => switch (status) {
    'DRAFT' => 'Not submitted yet.',
    'SUBMITTED' => 'Waiting for staff to start planning.',
    'PLANNING' => 'Planning has been queued. Refresh for updates.',
    'PROPOSED' => 'A proposal is ready for review.',
    'PENDING_APPROVAL' => 'Waiting for approval.',
    'APPROVED' => 'The proposal was approved.',
    'REVISION_REQUIRED' => 'Changes are needed before resubmission.',
    'BOOKED' => 'Booking completed.',
    'CANCELLED' => 'This trip was cancelled.',
    'FAILED' => 'Planning failed. Contact support.',
    _ => 'Current trip status: $status',
  };
}
