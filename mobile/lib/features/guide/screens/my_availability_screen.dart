import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../models/guide_availability_slot.dart';
import '../services/guide_availability_service.dart';
import 'add_edit_availability_screen.dart';

class MyAvailabilityScreen extends StatefulWidget {
  final String guideId;
  final GuideAvailabilityService? service;

  const MyAvailabilityScreen({
    super.key,
    required this.guideId,
    this.service,
  });

  @override
  State<MyAvailabilityScreen> createState() => _MyAvailabilityScreenState();
}

class _MyAvailabilityScreenState extends State<MyAvailabilityScreen> {
  late final GuideAvailabilityService _service;
  late DateTime _selectedMonth;

  List<GuideAvailabilitySlot> _allSlots = [];
  bool _isLoading = true;
  String? _errorMessage;
  String _selectedFilter = 'All';

  final List<String> _filters = ['All', 'Available', 'Reserved', 'Booked', 'Blocked'];

  @override
  void initState() {
    super.initState();
    _service = widget.service ?? GuideAvailabilityService();
    _selectedMonth = DateTime.now();
    _loadAvailability();
  }

  Future<void> _loadAvailability() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final slots = await _service.fetchAvailability(
        widget.guideId,
        month: _selectedMonth,
      );
      setState(() {
        _allSlots = slots;
        _isLoading = false;
      });
    } catch (e) {
      setState(() {
        _errorMessage = e.toString().replaceAll('Exception: ', '');
        _isLoading = false;
      });
    }
  }

  List<GuideAvailabilitySlot> get _filteredSlots {
    if (_selectedFilter == 'All') return _allSlots;
    final upperFilter = _selectedFilter.toUpperCase();
    return _allSlots.where((slot) => slot.status.toUpperCase() == upperFilter).toList();
  }

  void _changeMonth(int offset) {
    setState(() {
      _selectedMonth = DateTime(_selectedMonth.year, _selectedMonth.month + offset, 1);
    });
    _loadAvailability();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final monthFormat = DateFormat('MMMM yyyy');

    return Scaffold(
      appBar: AppBar(
        title: const Text('My Guide Availability'),
        elevation: 1,
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _loadAvailability,
            tooltip: 'Refresh Availability',
          ),
        ],
      ),
      body: Column(
        children: [
          // Month Selector Header
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            color: theme.colorScheme.surfaceContainerLow,
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                IconButton(
                  icon: const Icon(Icons.chevron_left),
                  onPressed: () => _changeMonth(-1),
                  tooltip: 'Previous Month',
                ),
                Row(
                  children: [
                    const Icon(Icons.calendar_month, color: Colors.teal),
                    const SizedBox(width: 8),
                    Text(
                      monthFormat.format(_selectedMonth),
                      style: theme.textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ],
                ),
                IconButton(
                  icon: const Icon(Icons.chevron_right),
                  onPressed: () => _changeMonth(1),
                  tooltip: 'Next Month',
                ),
              ],
            ),
          ),

          // Status Filter Chips
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
            child: Row(
              children: _filters.map((filter) {
                final isSelected = _selectedFilter == filter;
                return Padding(
                  padding: const EdgeInsets.only(right: 6),
                  child: FilterChip(
                    label: Text(filter),
                    selected: isSelected,
                    onSelected: (selected) {
                      if (selected) {
                        setState(() => _selectedFilter = filter);
                      }
                    },
                    selectedColor: theme.colorScheme.primaryContainer,
                    checkmarkColor: theme.colorScheme.primary,
                  ),
                );
              }).toList(),
            ),
          ),

          const Divider(height: 1),

          // Main Slot List
          Expanded(
            child: _buildContent(theme),
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () async {
          final result = await Navigator.push<bool>(
            context,
            MaterialPageRoute(
              builder: (context) => AddEditAvailabilityScreen(
                guideId: widget.guideId,
                service: _service,
              ),
            ),
          );
          if (result == true) {
            _loadAvailability();
          }
        },
        icon: const Icon(Icons.add),
        label: const Text('Add Slot'),
        backgroundColor: Colors.teal,
        foregroundColor: Colors.white,
      ),
    );
  }

  Widget _buildContent(ThemeData theme) {
    if (_isLoading) {
      return const Center(child: CircularProgressIndicator());
    }

    if (_errorMessage != null) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(24.0),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(Icons.error_outline, color: theme.colorScheme.error, size: 48),
              const SizedBox(height: 12),
              Text(
                'Could not load slots',
                style: theme.textTheme.titleMedium,
              ),
              const SizedBox(height: 6),
              Text(
                _errorMessage!,
                textAlign: TextAlign.center,
                style: theme.textTheme.bodySmall?.copyWith(color: Colors.grey),
              ),
              const SizedBox(height: 16),
              ElevatedButton.icon(
                onPressed: _loadAvailability,
                icon: const Icon(Icons.refresh),
                label: const Text('Try Again'),
              ),
            ],
          ),
        ),
      );
    }

    final slots = _filteredSlots;

    if (slots.isEmpty) {
      return RefreshIndicator(
        onRefresh: _loadAvailability,
        child: ListView(
          physics: const AlwaysScrollableScrollPhysics(),
          children: [
            const SizedBox(height: 80),
            Center(
              child: Column(
                children: [
                  Icon(Icons.event_busy, size: 64, color: Colors.grey.shade400),
                  const SizedBox(height: 16),
                  Text(
                    'No availability slots found',
                    style: theme.textTheme.titleMedium?.copyWith(color: Colors.grey.shade700),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'Tap "+ Add Slot" below to publish your guide availability.',
                    style: theme.textTheme.bodySmall?.copyWith(color: Colors.grey.shade600),
                  ),
                ],
              ),
            ),
          ],
        ),
      );
    }

    final dateFormat = DateFormat('EEE, MMM d, yyyy');
    final timeFormat = DateFormat('hh:mm a');

    return RefreshIndicator(
      onRefresh: _loadAvailability,
      child: ListView.builder(
        padding: const EdgeInsets.all(12),
        itemCount: slots.length,
        itemBuilder: (context, index) {
          final slot = slots[index];
          return Card(
            margin: const EdgeInsets.only(bottom: 10),
            elevation: 1.5,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            child: Padding(
              padding: const EdgeInsets.all(14.0),
              child: Row(
                children: [
                  // Left Date Badge
                  Container(
                    width: 56,
                    height: 56,
                    decoration: BoxDecoration(
                      color: _getStatusColor(slot.status).withValues(alpha: 0.12),
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(color: _getStatusColor(slot.status).withValues(alpha: 0.4)),
                    ),
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Text(
                          DateFormat('dd').format(slot.startTime),
                          style: TextStyle(
                            fontWeight: FontWeight.bold,
                            fontSize: 18,
                            color: _getStatusColor(slot.status),
                          ),
                        ),
                        Text(
                          DateFormat('MMM').format(slot.startTime).toUpperCase(),
                          style: TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.w600,
                            color: _getStatusColor(slot.status),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: 14),

                  // Slot Info
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Text(
                              dateFormat.format(slot.startTime),
                              style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                            ),
                            const Spacer(),
                            _buildStatusBadge(slot.status),
                          ],
                        ),
                        const SizedBox(height: 4),
                        Text(
                          '${timeFormat.format(slot.startTime)} - ${timeFormat.format(slot.endTime)}',
                          style: TextStyle(color: Colors.grey.shade700, fontSize: 13),
                        ),
                        const SizedBox(height: 6),
                        Row(
                          children: [
                            Icon(Icons.badge, size: 14, color: Colors.teal.shade700),
                            const SizedBox(width: 4),
                            Text(
                              _formatSlotType(slot.slotType),
                              style: TextStyle(fontSize: 12, color: Colors.teal.shade800),
                            ),
                            const SizedBox(width: 12),
                            Icon(Icons.attach_money, size: 14, color: Colors.green.shade700),
                            Text(
                              '${slot.currency} ${slot.priceAmount.toStringAsFixed(0)}',
                              style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: Colors.green.shade900),
                            ),
                          ],
                        ),
                        if (slot.notes != null && slot.notes!.isNotEmpty) ...[
                          const SizedBox(height: 4),
                          Text(
                            slot.notes!,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: TextStyle(fontSize: 12, fontStyle: FontStyle.italic, color: Colors.grey.shade600),
                          ),
                        ],
                      ],
                    ),
                  ),
                ],
              ),
            ),
          );
        },
      ),
    );
  }

  Color _getStatusColor(String status) {
    switch (status.toUpperCase()) {
      case 'AVAILABLE':
        return Colors.green.shade700;
      case 'RESERVED':
        return Colors.orange.shade800;
      case 'BOOKED':
        return Colors.blue.shade800;
      case 'BLOCKED':
        return Colors.red.shade700;
      default:
        return Colors.grey;
    }
  }

  Widget _buildStatusBadge(String status) {
    final color = _getStatusColor(status);
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: color.withValues(alpha: 0.3)),
      ),
      child: Text(
        status.toUpperCase(),
        style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: color),
      ),
    );
  }

  String _formatSlotType(String slotType) {
    switch (slotType.toUpperCase()) {
      case 'FULL_DAY':
        return 'Full Day';
      case 'HALF_DAY_MORNING':
        return 'Morning (Half Day)';
      case 'HALF_DAY_AFTERNOON':
        return 'Afternoon (Half Day)';
      case 'EVENING':
        return 'Evening';
      case 'HOURLY':
        return 'Hourly';
      default:
        return slotType;
    }
  }
}
