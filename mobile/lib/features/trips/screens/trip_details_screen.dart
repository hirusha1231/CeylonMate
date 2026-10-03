import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../models/trip.dart';
import '../services/trip_service.dart';
import 'trip_form_screen.dart';
import '../../itinerary/screens/itinerary_screen.dart';
import '../../itinerary/services/itinerary_service.dart';

class TripDetailsScreen extends StatefulWidget {
  final String tripId;
  final TripService service;

  const TripDetailsScreen({
    super.key,
    required this.tripId,
    required this.service,
  });

  @override
  State<TripDetailsScreen> createState() => _TripDetailsScreenState();
}

class _TripDetailsScreenState extends State<TripDetailsScreen> {
  late Future<Trip> _tripFuture;
  TravelerPreferences? _preferences;
  bool _isSubmitting = false;
  bool _isPlanning = false;
  bool _isCancelling = false;

  @override
  void initState() {
    super.initState();
    _loadTrip();
    _loadPreferences();
  }

  void _loadTrip() {
    setState(() {
      // 100% Dynamic: Calls backend GET /api/trips/{id}
      _tripFuture = widget.service.getTrip(widget.tripId);
    });
  }

  Future<void> _loadPreferences() async {
    try {
      final prefs = await widget.service.getPreferences();
      if (mounted) setState(() => _preferences = prefs);
    } catch (_) {
      // Non-blocking preference read
    }
  }

  // Dynamic Submit Action (DRAFT / REVISION_REQUIRED -> SUBMITTED)
  Future<void> _submitTrip() async {
    setState(() => _isSubmitting = true);
    try {
      await widget.service.submitTrip(widget.tripId);
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('✅ Trip submitted successfully!')),
      );
      _loadTrip();
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(tripError(e))),
      );
    } finally {
      if (mounted) setState(() => _isSubmitting = false);
    }
  }

  // Dynamic Start Planning Action (SUBMITTED -> PLANNING)
  Future<void> _startPlanning() async {
    setState(() => _isPlanning = true);
    try {
      await widget.service.startPlanning(widget.tripId);
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('🚀 AI Planning workflow started!')),
      );
      _loadTrip();
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(tripError(e))),
      );
    } finally {
      if (mounted) setState(() => _isPlanning = false);
    }
  }

  // Dynamic Cancel Action (Soft delete -> CANCELLED)
  Future<void> _cancelTrip() async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Cancel Trip Request'),
        content: const Text('Are you sure you want to cancel this trip request?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('No'),
          ),
          FilledButton(
            style: FilledButton.styleFrom(backgroundColor: Colors.red),
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Yes, Cancel'),
          ),
        ],
      ),
    );

    if (confirm != true || !mounted) return;

    setState(() => _isCancelling = true);
    try {
      await widget.service.cancelTrip(widget.tripId);
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Trip request cancelled.')),
      );
      Navigator.of(context).pop();
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(tripError(e))),
      );
    } finally {
      if (mounted) setState(() => _isCancelling = false);
    }
  }

  // Dynamic Edit Draft Navigation
  Future<void> _editDraft(Trip trip) async {
    final updated = await Navigator.push<Trip>(
      context,
      MaterialPageRoute(
        builder: (_) => TripFormScreen(
          service: widget.service,
          trip: trip,
        ),
      ),
    );

    if (updated != null) {
      _loadTrip();
    }
  }

  Color _getStatusColor(String status) {
    switch (status.toUpperCase()) {
      case 'DRAFT':
        return Colors.blueGrey;
      case 'SUBMITTED':
        return Colors.amber.shade800;
      case 'PLANNING':
        return Colors.blue.shade700;
      case 'APPROVED':
      case 'BOOKED':
        return Colors.teal.shade700;
      case 'REVISION_REQUIRED':
        return Colors.deepOrange;
      case 'CANCELLED':
        return Colors.red.shade700;
      default:
        return Colors.grey.shade700;
    }
  }

  @override
  Widget build(BuildContext context) {
    final dateFormat = DateFormat.yMMMd();

    return Scaffold(
      appBar: AppBar(
        title: const Text('Trip Request Details'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _loadTrip,
            tooltip: 'Refresh',
          ),
        ],
      ),
      body: FutureBuilder<Trip>(
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
                      tripError(snapshot.error!),
                      textAlign: TextAlign.center,
                      style: const TextStyle(color: Colors.red),
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

          final trip = snapshot.data!;
          final isEditable = trip.status == 'DRAFT' || trip.status == 'REVISION_REQUIRED';
          final canSubmit = trip.status == 'DRAFT' || trip.status == 'REVISION_REQUIRED';
          final canStartPlanning = trip.status == 'SUBMITTED';
          final canCancel = trip.status == 'DRAFT' || trip.status == 'SUBMITTED' || trip.status == 'REVISION_REQUIRED';

          final locationText = (trip.startingLatitude != null && trip.startingLongitude != null)
              ? '${trip.startingLatitude!.toStringAsFixed(4)}, ${trip.startingLongitude!.toStringAsFixed(4)}'
              : 'Not specified';

          return SingleChildScrollView(
            padding: const EdgeInsets.all(16.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Header with Objective
                Text(
                  trip.objective,
                  style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                        fontWeight: FontWeight.bold,
                      ),
                ),
                const SizedBox(height: 16),

                // Status Badge Card
                Card(
                  elevation: 0,
                  color: Colors.grey.shade100,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                    side: BorderSide(color: Colors.grey.shade300),
                  ),
                  child: Padding(
                    padding: const EdgeInsets.all(16.0),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text(
                          'Lifecycle Status',
                          style: TextStyle(fontWeight: FontWeight.w600),
                        ),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                          decoration: BoxDecoration(
                            color: _getStatusColor(trip.status).withValues(alpha: 0.15),
                            borderRadius: BorderRadius.circular(20),
                            border: Border.all(color: _getStatusColor(trip.status)),
                          ),
                          child: Text(
                            trip.status.replaceAll('_', ' '),
                            style: TextStyle(
                              color: _getStatusColor(trip.status),
                              fontWeight: FontWeight.bold,
                              fontSize: 12,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 16),

                // Dynamic Details Grid
                _buildInfoTile('Travel Window', '${dateFormat.format(trip.startDate)} – ${dateFormat.format(trip.endDate)}'),
                _buildInfoTile('Target Budget', '${trip.currency} ${trip.budget.toStringAsFixed(2)}'),
                _buildInfoTile('Party Size', '${trip.partySize} ${trip.partySize == 1 ? 'Person' : 'People'}'),
                _buildInfoTile('Starting Coordinates', locationText),
                _buildInfoTile('Accessibility Needs', trip.accessibilityNeeds ?? 'None declared'),
                if (_preferences != null) ...[
                  _buildInfoTile('Profile Interests', _preferences!.interests ?? 'Not set'),
                  _buildInfoTile('Visitor Category', _preferences!.visitorCategory ?? 'Not set'),
                ],
                const SizedBox(height: 24),

                // Action 1: Edit Draft (Only active for DRAFT / REVISION_REQUIRED)
                if (isEditable) ...[
                  OutlinedButton.icon(
                    onPressed: () => _editDraft(trip),
                    icon: const Icon(Icons.edit, size: 18),
                    label: const Text('Edit Draft Trip'),
                    style: OutlinedButton.styleFrom(
                      minimumSize: const Size.fromHeight(48),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                  ),
                  const SizedBox(height: 12),
                ],

                // Action 2: Submit Trip (DRAFT -> SUBMITTED)
                if (canSubmit) ...[
                  ElevatedButton.icon(
                    onPressed: _isSubmitting ? null : _submitTrip,
                    icon: const Icon(Icons.send, size: 18),
                    label: _isSubmitting
                        ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                        : const Text('Submit Trip Request'),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF0F766E),
                      foregroundColor: Colors.white,
                      minimumSize: const Size.fromHeight(48),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                  ),
                  const SizedBox(height: 12),
                ],

                // Action 3: Start Planning (SUBMITTED -> PLANNING)
                if (canStartPlanning) ...[
                  ElevatedButton.icon(
                    onPressed: _isPlanning ? null : _startPlanning,
                    icon: const Icon(Icons.psychology, size: 20),
                    label: _isPlanning
                        ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                        : const Text('Initiate AI Itinerary Planning'),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.indigo,
                      foregroundColor: Colors.white,
                      minimumSize: const Size.fromHeight(48),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                  ),
                  const SizedBox(height: 12),
                ],

                // Action 4: View Itinerary & Bookings (Dynamic tripId UUID)
                ElevatedButton.icon(
                  onPressed: () {
                    Navigator.push(
                      context,
                      MaterialPageRoute(
                        builder: (_) => ItineraryScreen(
                          tripRequestId: trip.id, // Pure Dynamic UUID, NO hardcoded '1'
                          service: ItineraryService(widget.service.client),
                        ),
                      ),
                    );
                  },
                  icon: const Icon(Icons.map_outlined, size: 18),
                  label: const Text('View Associated Itinerary'),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.grey.shade800,
                    foregroundColor: Colors.white,
                    minimumSize: const Size.fromHeight(48),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                ),
                const SizedBox(height: 12),

                // Action 5: Cancel Trip Request
                if (canCancel) ...[
                  OutlinedButton.icon(
                    onPressed: _isCancelling ? null : _cancelTrip,
                    icon: const Icon(Icons.delete_outline, color: Colors.red, size: 18),
                    label: _isCancelling
                        ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.red))
                        : const Text('Cancel Trip Request', style: TextStyle(color: Colors.red)),
                    style: OutlinedButton.styleFrom(
                      side: const BorderSide(color: Colors.red),
                      minimumSize: const Size.fromHeight(48),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                  ),
                ],
              ],
            ),
          );
        },
      ),
    );
  }

  Widget _buildInfoTile(String title, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6.0),
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: Colors.grey.shade50,
          borderRadius: BorderRadius.circular(8),
          border: Border.all(color: Colors.grey.shade200),
        ),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Expanded(
              flex: 4,
              child: Text(
                title,
                style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13, color: Colors.black87),
              ),
            ),
            const SizedBox(width: 8),
            Expanded(
              flex: 6,
              child: Text(
                value,
                textAlign: TextAlign.right,
                style: TextStyle(color: Colors.grey.shade800, fontSize: 13),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
