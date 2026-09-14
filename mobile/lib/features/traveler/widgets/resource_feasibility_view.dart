import 'package:flutter/material.dart';

enum FeasibilityStatus {
  confirmed,
  pending,
  unavailable,
}

class ResourceFeasibilityView extends StatelessWidget {
  final String itineraryTitle;
  final DateTime date;
  final String guideName;
  final FeasibilityStatus guideStatus;
  final String vehicleName;
  final FeasibilityStatus vehicleStatus;
  final String attractionName;
  final FeasibilityStatus attractionStatus;
  final VoidCallback? onRefreshCheck;

  const ResourceFeasibilityView({
    super.key,
    required this.itineraryTitle,
    required this.date,
    this.guideName = 'Local Tour Guide',
    this.guideStatus = FeasibilityStatus.confirmed,
    this.vehicleName = 'Private Van (Air-conditioned)',
    this.vehicleStatus = FeasibilityStatus.confirmed,
    this.attractionName = 'Sigiriya Fortress Entry',
    this.attractionStatus = FeasibilityStatus.pending,
    this.onRefreshCheck,
  });

  bool get isOverallFeasible =>
      guideStatus == FeasibilityStatus.confirmed &&
      vehicleStatus == FeasibilityStatus.confirmed &&
      attractionStatus == FeasibilityStatus.confirmed;

  bool get hasConflict =>
      guideStatus == FeasibilityStatus.unavailable ||
      vehicleStatus == FeasibilityStatus.unavailable ||
      attractionStatus == FeasibilityStatus.unavailable;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Card(
      elevation: 2.5,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      clipBehavior: Clip.antiAlias,
      child: Container(
        decoration: BoxDecoration(
          border: Border(
            top: BorderSide(
              color: _getOverallHeaderColor(),
              width: 5,
            ),
          ),
        ),
        padding: const EdgeInsets.all(18.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Header Row
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        itineraryTitle,
                        style: theme.textTheme.titleMedium?.copyWith(
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        'Resource Feasibility Summary',
                        style: theme.textTheme.bodySmall?.copyWith(
                          color: Colors.grey.shade600,
                        ),
                      ),
                    ],
                  ),
                ),
                _buildOverallBadge(),
              ],
            ),
            const SizedBox(height: 16),
            const Divider(height: 1),
            const SizedBox(height: 14),

            // Resource 1: Local Guide
            _buildResourceRow(
              icon: Icons.person_pin,
              title: 'Guide Allocation',
              subtitle: guideName,
              status: guideStatus,
            ),
            const SizedBox(height: 12),

            // Resource 2: Transport Vehicle
            _buildResourceRow(
              icon: Icons.directions_car,
              title: 'Transport Capacity',
              subtitle: vehicleName,
              status: vehicleStatus,
            ),
            const SizedBox(height: 12),

            // Resource 3: Attraction Entry
            _buildResourceRow(
              icon: Icons.local_activity,
              title: 'Attraction Slot',
              subtitle: attractionName,
              status: attractionStatus,
            ),

            if (onRefreshCheck != null) ...[
              const SizedBox(height: 16),
              const Divider(height: 1),
              const SizedBox(height: 10),
              Align(
                alignment: Alignment.centerRight,
                child: TextButton.icon(
                  onPressed: onRefreshCheck,
                  icon: const Icon(Icons.sync, size: 16),
                  label: const Text('Re-check AI Feasibility'),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildOverallBadge() {
    String label;
    Color bg;
    Color text;
    IconData icon;

    if (isOverallFeasible) {
      label = 'FEASIBLE';
      bg = Colors.green.shade50;
      text = Colors.green.shade800;
      icon = Icons.check_circle;
    } else if (hasConflict) {
      label = 'CONFLICT';
      bg = Colors.red.shade50;
      text = Colors.red.shade800;
      icon = Icons.cancel;
    } else {
      label = 'PENDING';
      bg = Colors.amber.shade50;
      text = Colors.amber.shade900;
      icon = Icons.hourglass_top;
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: text.withValues(alpha: 0.4)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 14, color: text),
          const SizedBox(width: 4),
          Text(
            label,
            style: TextStyle(
              fontSize: 11,
              fontWeight: FontWeight.bold,
              color: text,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildResourceRow({
    required IconData icon,
    required String title,
    required String subtitle,
    required FeasibilityStatus status,
  }) {
    return Row(
      children: [
        Container(
          padding: const EdgeInsets.all(8),
          decoration: BoxDecoration(
            color: Colors.teal.shade50,
            borderRadius: BorderRadius.circular(8),
          ),
          child: Icon(icon, size: 20, color: Colors.teal.shade800),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                title,
                style: const TextStyle(
                  fontWeight: FontWeight.w600,
                  fontSize: 13,
                ),
              ),
              Text(
                subtitle,
                style: TextStyle(
                  color: Colors.grey.shade600,
                  fontSize: 12,
                ),
              ),
            ],
          ),
        ),
        _buildChip(status),
      ],
    );
  }

  Widget _buildChip(FeasibilityStatus status) {
    Color bg;
    Color fg;
    String text;
    IconData icon;

    switch (status) {
      case FeasibilityStatus.confirmed:
        bg = Colors.green.shade100;
        fg = Colors.green.shade900;
        text = 'Confirmed';
        icon = Icons.check;
        break;
      case FeasibilityStatus.pending:
        bg = Colors.amber.shade100;
        fg = Colors.amber.shade900;
        text = 'Pending';
        icon = Icons.access_time;
        break;
      case FeasibilityStatus.unavailable:
        bg = Colors.red.shade100;
        fg = Colors.red.shade900;
        text = 'Unavailable';
        icon = Icons.error_outline;
        break;
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 12, color: fg),
          const SizedBox(width: 4),
          Text(
            text,
            style: TextStyle(
              fontSize: 11,
              fontWeight: FontWeight.bold,
              color: fg,
            ),
          ),
        ],
      ),
    );
  }

  Color _getOverallHeaderColor() {
    if (isOverallFeasible) return Colors.green;
    if (hasConflict) return Colors.red;
    return Colors.amber;
  }
}
