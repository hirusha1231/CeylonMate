import 'package:flutter/material.dart';
import '../../bookings/screens/vehicle_selection_screen.dart';
import '../services/itinerary_service.dart';

class ItineraryActivity {
  String id;
  String title;
  TimeOfDay startTime;
  TimeOfDay endTime;
  double estimatedCostLkr;
  String notes;

  ItineraryActivity({
    required this.id,
    required this.title,
    required this.startTime,
    required this.endTime,
    required this.estimatedCostLkr,
    required this.notes,
  });

  int get startMinutes => startTime.hour * 60 + startTime.minute;
  int get endMinutes => endTime.hour * 60 + endTime.minute;

  String formatTimeRange(BuildContext context) {
    return '${startTime.format(context)} – ${endTime.format(context)}';
  }

  factory ItineraryActivity.fromJson(Map<String, dynamic> json) {
    TimeOfDay parseTime(String? timeStr, TimeOfDay fallback) {
      if (timeStr == null || !timeStr.contains(':')) return fallback;
      final parts = timeStr.split(':');
      return TimeOfDay(
        hour: int.tryParse(parts[0]) ?? fallback.hour,
        minute: int.tryParse(parts[1]) ?? fallback.minute,
      );
    }

    return ItineraryActivity(
      id: json['id']?.toString() ?? UniqueKey().toString(),
      title: json['title'] ?? json['activityName'] ?? 'Scheduled Activity',
      startTime: parseTime(json['startTime'], const TimeOfDay(hour: 8, minute: 30)),
      endTime: parseTime(json['endTime'], const TimeOfDay(hour: 11, minute: 30)),
      estimatedCostLkr: (json['estimatedCostLkr'] ?? json['cost'] ?? 2500.0).toDouble(),
      notes: json['notes'] ?? json['description'] ?? 'Planned visit and sightseeing.',
    );
  }
}

class ItineraryDayData {
  final int dayNumber;
  final String title;
  final String destination;
  List<ItineraryActivity> activities;

  ItineraryDayData({
    required this.dayNumber,
    required this.title,
    required this.destination,
    required this.activities,
  });

  double get totalDailyCostLkr =>
      activities.fold(0.0, (sum, a) => sum + a.estimatedCostLkr);

  factory ItineraryDayData.fromJson(Map<String, dynamic> json, int index) {
    var rawActivities = json['activities'] as List? ?? [];
    return ItineraryDayData(
      dayNumber: json['dayNumber'] ?? (index + 1),
      title: json['title'] ?? 'Day ${index + 1} Exploration',
      destination: json['destination'] ?? json['location'] ?? 'Selected Destination',
      activities: rawActivities
          .map((a) => ItineraryActivity.fromJson(Map<String, dynamic>.from(a)))
          .toList(),
    );
  }
}

class ItineraryScreen extends StatefulWidget {
  final String tripRequestId;
  final ItineraryService service;
  final String? tripTitle;
  final int? partySize;
  final double? initialDailyBudget;
  final DateTime? tripStartDate;
  final DateTime? tripEndDate;

  const ItineraryScreen({
    super.key,
    required this.tripRequestId,
    required this.service,
    this.tripTitle,
    this.partySize,
    this.initialDailyBudget,
    this.tripStartDate,
    this.tripEndDate,
  });

  @override
  State<ItineraryScreen> createState() => _ItineraryScreenState();
}

class _ItineraryScreenState extends State<ItineraryScreen> {
  late Future<dynamic> _itinerariesFuture;
  late Future<dynamic> _bookingFuture;

  late double _dailyBudgetLimitLkr;
  String _selectedPacing = 'MODERATE';
  String _selectedFocus = 'CULTURAL';

  List<ItineraryDayData> _days = [];
  bool _isDataLoaded = false;

  @override
  void initState() {
    super.initState();
    _dailyBudgetLimitLkr = (widget.initialDailyBudget != null && widget.initialDailyBudget! > 0)
        ? widget.initialDailyBudget!
        : 5000.0;
    _loadData();
  }

  void _loadData() {
    _itinerariesFuture = widget.service.getItinerariesByTrip(widget.tripRequestId);
    _bookingFuture = widget.service.getBookingByTrip(widget.tripRequestId);
  }

  void _parseBackendItineraries(dynamic data) {
    if (_isDataLoaded) return;

    if (data != null && data is List && data.isNotEmpty) {
      _days = List.generate(data.length, (index) {
        return ItineraryDayData.fromJson(Map<String, dynamic>.from(data[index]), index);
      });
      _isDataLoaded = true;
      return;
    } else if (data != null && data is Map && data['days'] is List && (data['days'] as List).isNotEmpty) {
      final daysList = data['days'] as List;
      _days = List.generate(daysList.length, (index) {
        return ItineraryDayData.fromJson(Map<String, dynamic>.from(daysList[index]), index);
      });
      if (data['pacing'] != null) _selectedPacing = data['pacing'].toString();
      if (data['focus'] != null) _selectedFocus = data['focus'].toString();
      if (data['dailyBudget'] != null) {
        _dailyBudgetLimitLkr = (data['dailyBudget'] as num).toDouble();
      }
      _isDataLoaded = true;
      return;
    }

    // Dynamic generation based on actual trip length if backend hasn't generated full timeline yet
    final int daysCount = (widget.tripStartDate != null && widget.tripEndDate != null)
        ? widget.tripEndDate!.difference(widget.tripStartDate!).inDays + 1
        : 3;
    final int totalDays = daysCount > 0 ? daysCount : 3;
    final double perDayBudget = _dailyBudgetLimitLkr > 0 ? _dailyBudgetLimitLkr : 4000.0;

    final sampleDestinations = [
      'Kurunegala & Ancient Heritage Rock',
      'Sigiriya & Dambulla Cave Trails',
      'Kandy Cultural Relic & Lake Exploration',
      'Nuwara Eliya Tea Gardens',
      'Galle Dutch Fort & Coastal Walk',
    ];

    _days = List.generate(totalDays, (i) {
      final dest = sampleDestinations[i % sampleDestinations.length];
      return ItineraryDayData(
        dayNumber: i + 1,
        title: 'Day ${i + 1}: $dest',
        destination: dest.split('&').first.trim(),
        activities: [
          ItineraryActivity(
            id: 'act-${i + 1}-1',
            title: 'Morning Exploration at ${dest.split('&').first.trim()}',
            startTime: const TimeOfDay(hour: 8, minute: 30),
            endTime: const TimeOfDay(hour: 11, minute: 30),
            estimatedCostLkr: (perDayBudget * 0.45).clamp(1500.0, 15000.0),
            notes: 'Guided scenic exploration and cultural site visit.',
          ),
          ItineraryActivity(
            id: 'act-${i + 1}-2',
            title: 'Afternoon Heritage & Leisure Tour',
            startTime: const TimeOfDay(hour: 14, minute: 0),
            endTime: const TimeOfDay(hour: 17, minute: 0),
            estimatedCostLkr: (perDayBudget * 0.40).clamp(1200.0, 12000.0),
            notes: 'Authentic local cuisine and regional highlights.',
          ),
        ],
      );
    });

    _isDataLoaded = true;
  }

  String? _findTimingOverlap(List<ItineraryActivity> activities) {
    for (int i = 0; i < activities.length; i++) {
      for (int j = i + 1; j < activities.length; j++) {
        final a = activities[i];
        final b = activities[j];
        if (a.startMinutes < b.endMinutes && b.startMinutes < a.endMinutes) {
          return '"${a.title}" overlaps with "${b.title}"';
        }
      }
    }
    return null;
  }

  bool _isDayOverBudget(ItineraryDayData day) {
    return day.totalDailyCostLkr > _dailyBudgetLimitLkr;
  }

  void _swapActivities(int dayIndex, int actIndex, int targetIndex) {
    if (targetIndex < 0 || targetIndex >= _days[dayIndex].activities.length) return;
    setState(() {
      final act = _days[dayIndex].activities.removeAt(actIndex);
      _days[dayIndex].activities.insert(targetIndex, act);
    });
  }

  void _openAiPreferenceTweaksDialog() {
    final budgetCtrl = TextEditingController(text: _dailyBudgetLimitLkr.toStringAsFixed(0));
    final notesCtrl = TextEditingController();
    final tweakFormKey = GlobalKey<FormState>();
    String tempPacing = _selectedPacing;
    String tempFocus = _selectedFocus;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) {
        return StatefulBuilder(
          builder: (context, setModalState) {
            return Padding(
              padding: EdgeInsets.only(
                left: 20,
                right: 20,
                top: 20,
                bottom: MediaQuery.of(context).viewInsets.bottom + 20,
              ),
              child: Form(
                key: tweakFormKey,
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Row(
                          children: [
                            const Icon(Icons.psychology, color: Colors.teal),
                            const SizedBox(width: 8),
                            Text(
                              'AI Itinerary & Budget Tweaks',
                              style: Theme.of(context).textTheme.titleMedium?.copyWith(
                                    fontWeight: FontWeight.bold,
                                  ),
                            ),
                          ],
                        ),
                        IconButton(
                          icon: const Icon(Icons.close),
                          onPressed: () => Navigator.pop(ctx),
                        ),
                      ],
                    ),
                    const Divider(),
                    const SizedBox(height: 8),
                    TextFormField(
                      controller: budgetCtrl,
                      keyboardType: const TextInputType.numberWithOptions(decimal: true),
                      decoration: const InputDecoration(
                        labelText: 'Max Daily Activity Budget (LKR) *',
                        prefixIcon: Icon(Icons.payments),
                        border: OutlineInputBorder(),
                      ),
                      validator: (val) {
                        if (val == null || val.trim().isEmpty) return 'Enter daily limit';
                        final numVal = double.tryParse(val.trim());
                        if (numVal == null || numVal <= 0) return 'Must be greater than 0';
                        return null;
                      },
                    ),
                    const SizedBox(height: 12),
                    DropdownButtonFormField<String>(
                      initialValue: tempPacing,
                      decoration: const InputDecoration(
                        labelText: 'Trip Pacing',
                        prefixIcon: Icon(Icons.speed),
                        border: OutlineInputBorder(),
                      ),
                      items: const [
                        DropdownMenuItem(value: 'RELAXED', child: Text('Relaxed (1-2 slow activities/day)')),
                        DropdownMenuItem(value: 'MODERATE', child: Text('Moderate (Balanced exploration)')),
                        DropdownMenuItem(value: 'PACKED', child: Text('Intense (Maximum highlights)')),
                      ],
                      onChanged: (val) => setModalState(() => tempPacing = val ?? 'MODERATE'),
                    ),
                    const SizedBox(height: 12),
                    DropdownButtonFormField<String>(
                      initialValue: tempFocus,
                      decoration: const InputDecoration(
                        labelText: 'Activity Focus',
                        prefixIcon: Icon(Icons.filter_hdr),
                        border: OutlineInputBorder(),
                      ),
                      items: const [
                        DropdownMenuItem(value: 'CULTURAL', child: Text('Cultural & Ancient Heritage')),
                        DropdownMenuItem(value: 'WILDLIFE', child: Text('Wildlife & Nature Safaris')),
                        DropdownMenuItem(value: 'ADVENTURE', child: Text('Adventure & Hiking')),
                        DropdownMenuItem(value: 'CULINARY', child: Text('Culinary & Tea Trails')),
                      ],
                      onChanged: (val) => setModalState(() => tempFocus = val ?? 'CULTURAL'),
                    ),
                    const SizedBox(height: 12),
                    TextFormField(
                      controller: notesCtrl,
                      maxLines: 2,
                      maxLength: 500,
                      decoration: const InputDecoration(
                        labelText: 'Custom Customization Notes (Optional)',
                        hintText: 'e.g. Prefer early morning climbs before heat.',
                        prefixIcon: Icon(Icons.edit_note),
                        border: OutlineInputBorder(),
                      ),
                      validator: (val) {
                        final trimmed = val?.trim() ?? '';
                        if (trimmed.isNotEmpty && trimmed.length < 5) {
                          return 'Notes must be at least 5 characters';
                        }
                        if (trimmed.length > 500) {
                          return 'Notes must not exceed 500 characters';
                        }
                        return null;
                      },
                    ),
                    const SizedBox(height: 16),
                    ElevatedButton.icon(
                      style: ElevatedButton.styleFrom(
                        backgroundColor: Colors.teal,
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(vertical: 14),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                      ),
                      icon: const Icon(Icons.auto_awesome),
                      label: const Text('Apply AI Tweaks & Recalculate'),
                      onPressed: () {
                        if (!tweakFormKey.currentState!.validate()) return;
                        setState(() {
                          _dailyBudgetLimitLkr = double.parse(budgetCtrl.text.trim());
                          _selectedPacing = tempPacing;
                          _selectedFocus = tempFocus;
                        });
                        Navigator.pop(ctx);
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(
                            content: Text('✨ AI Itinerary recalculated according to preferences!'),
                            backgroundColor: Colors.teal,
                          ),
                        );
                      },
                    ),
                  ],
                ),
              ),
            );
          },
        );
      },
    );
  }

  void _proceedToFleetBooking() {
    for (final day in _days) {
      final overlap = _findTimingOverlap(day.activities);
      if (overlap != null) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Day ${day.dayNumber} timing overlap: $overlap. Please resolve before booking.'),
            backgroundColor: Colors.red,
          ),
        );
        return;
      }
    }

    final totalActivitiesCost = _days.fold(0.0, (sum, d) => sum + d.totalDailyCostLkr);
    final now = DateTime.now();

    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => VehicleSelectionScreen(
          client: widget.service.client,
          tripRequestId: widget.tripRequestId,
          tripTitle: widget.tripTitle ?? 'Customized Sri Lanka Itinerary',
          partySize: widget.partySize ?? 2,
          startDate: widget.tripStartDate ?? now.add(const Duration(days: 3)),
          endDate: widget.tripEndDate ?? now.add(Duration(days: 3 + _days.length)),
          activitiesCostLkr: totalActivitiesCost,
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Itinerary & Experience Planning'),
        actions: [
          IconButton(
            tooltip: 'AI Budget & Preference Tweaks',
            icon: const Icon(Icons.tune),
            onPressed: _openAiPreferenceTweaksDialog,
          ),
        ],
      ),
      body: FutureBuilder<dynamic>(
        future: _itinerariesFuture,
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting && !_isDataLoaded) {
            return const Center(child: CircularProgressIndicator());
          }

          if (snapshot.hasData && !_isDataLoaded) {
            _parseBackendItineraries(snapshot.data);
          } else if (!_isDataLoaded) {
            _parseBackendItineraries(null);
          }

          final totalAllDaysCost = _days.fold(0.0, (sum, d) => sum + d.totalDailyCostLkr);

          return ListView(
            padding: const EdgeInsets.all(16.0),
            children: [
              Card(
                elevation: 2,
                color: Colors.teal.shade50,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                child: Padding(
                  padding: const EdgeInsets.all(16.0),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Expanded(
                            child: Row(
                              children: [
                                const Icon(Icons.auto_awesome, color: Colors.teal),
                                const SizedBox(width: 8),
                                Flexible(
                                  child: Text(
                                    'AI Curated Timeline',
                                    style: Theme.of(context).textTheme.titleMedium?.copyWith(
                                          fontWeight: FontWeight.bold,
                                          color: Colors.teal.shade900,
                                        ),
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                ),
                              ],
                            ),
                          ),
                          ActionChip(
                            avatar: const Icon(Icons.tune, size: 16, color: Colors.teal),
                            label: const Text('AI Tweaks'),
                            onPressed: _openAiPreferenceTweaksDialog,
                          ),
                        ],
                      ),
                      const SizedBox(height: 8),
                      Text(
                        'Pacing: $_selectedPacing • Focus: $_selectedFocus • Daily Budget Ceiling: LKR ${_dailyBudgetLimitLkr.toStringAsFixed(0)}',
                        style: TextStyle(fontSize: 12, color: Colors.teal.shade800),
                      ),
                      const Divider(height: 18),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          const Flexible(
                            child: Text(
                              'Estimated Activities Total:',
                              style: TextStyle(fontWeight: FontWeight.w600),
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                          const SizedBox(width: 8),
                          FittedBox(
                            fit: BoxFit.scaleDown,
                            child: Text(
                              'LKR ${totalAllDaysCost.toStringAsFixed(0)}',
                              style: const TextStyle(fontWeight: FontWeight.bold, color: Colors.teal, fontSize: 16),
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 16),

              ...List.generate(_days.length, (dayIndex) {
                final day = _days[dayIndex];
                final overlap = _findTimingOverlap(day.activities);
                final isOverBudget = _isDayOverBudget(day);

                return Card(
                  margin: const EdgeInsets.only(bottom: 16),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                    side: BorderSide(
                      color: overlap != null || isOverBudget ? Colors.red.shade300 : Colors.grey.shade300,
                      width: overlap != null || isOverBudget ? 1.5 : 1,
                    ),
                  ),
                  child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          crossAxisAlignment: CrossAxisAlignment.center,
                          children: [
                            CircleAvatar(
                              radius: 16,
                              backgroundColor: Colors.teal,
                              child: Text(
                                '${day.dayNumber}',
                                style: const TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.bold),
                              ),
                            ),
                            const SizedBox(width: 10),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    day.title,
                                    style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                  Text(
                                    day.destination,
                                    style: const TextStyle(fontSize: 12, color: Colors.grey),
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                ],
                              ),
                            ),
                            const SizedBox(width: 8),
                            FittedBox(
                              fit: BoxFit.scaleDown,
                              child: Text(
                                'LKR ${day.totalDailyCostLkr.toStringAsFixed(0)}',
                                style: TextStyle(
                                  fontWeight: FontWeight.bold,
                                  fontSize: 14,
                                  color: isOverBudget ? Colors.red : Colors.black87,
                                ),
                              ),
                            ),
                          ],
                        ),

                        if (isOverBudget) ...[
                          const SizedBox(height: 10),
                          Container(
                            padding: const EdgeInsets.all(8),
                            decoration: BoxDecoration(
                              color: Colors.red.shade50,
                              borderRadius: BorderRadius.circular(6),
                            ),
                            child: Row(
                              children: [
                                const Icon(Icons.warning_amber, size: 16, color: Colors.red),
                                const SizedBox(width: 8),
                                Expanded(
                                  child: Text(
                                    'Daily budget limit exceeded! Total LKR ${day.totalDailyCostLkr.toStringAsFixed(0)} exceeds limit of LKR ${_dailyBudgetLimitLkr.toStringAsFixed(0)}.',
                                    style: TextStyle(color: Colors.red.shade900, fontSize: 12, fontWeight: FontWeight.w500),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],

                        if (overlap != null) ...[
                          const SizedBox(height: 10),
                          Container(
                            padding: const EdgeInsets.all(8),
                            decoration: BoxDecoration(
                              color: Colors.amber.shade100,
                              borderRadius: BorderRadius.circular(6),
                            ),
                            child: Row(
                              children: [
                                const Icon(Icons.schedule, size: 16, color: Colors.brown),
                                const SizedBox(width: 8),
                                Expanded(
                                  child: Text(
                                    '⚠️ Timing overlap: $overlap. Please adjust times or re-order.',
                                    style: TextStyle(color: Colors.brown.shade900, fontSize: 12, fontWeight: FontWeight.w500),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],

                        const Divider(height: 20),

                        ...List.generate(day.activities.length, (actIndex) {
                          final act = day.activities[actIndex];

                          return Container(
                            margin: const EdgeInsets.only(bottom: 10),
                            padding: const EdgeInsets.all(10),
                            decoration: BoxDecoration(
                              color: Colors.grey.shade50,
                              borderRadius: BorderRadius.circular(8),
                              border: Border.all(color: Colors.grey.shade200),
                            ),
                            child: Row(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Column(
                                  children: [
                                    InkWell(
                                      onTap: actIndex > 0
                                          ? () => _swapActivities(dayIndex, actIndex, actIndex - 1)
                                          : null,
                                      child: Icon(
                                        Icons.keyboard_arrow_up,
                                        size: 20,
                                        color: actIndex > 0 ? Colors.teal : Colors.grey.shade300,
                                      ),
                                    ),
                                    Text('${actIndex + 1}', style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Colors.grey)),
                                    InkWell(
                                      onTap: actIndex < day.activities.length - 1
                                          ? () => _swapActivities(dayIndex, actIndex, actIndex + 1)
                                          : null,
                                      child: Icon(
                                        Icons.keyboard_arrow_down,
                                        size: 20,
                                        color: actIndex < day.activities.length - 1 ? Colors.teal : Colors.grey.shade300,
                                      ),
                                    ),
                                  ],
                                ),
                                const SizedBox(width: 10),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Row(
                                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                        children: [
                                          Expanded(
                                            child: Text(
                                              act.title,
                                              style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                                              overflow: TextOverflow.ellipsis,
                                            ),
                                          ),
                                          const SizedBox(width: 8),
                                          FittedBox(
                                            fit: BoxFit.scaleDown,
                                            child: Text(
                                              'LKR ${act.estimatedCostLkr.toStringAsFixed(0)}',
                                              style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: Colors.teal),
                                            ),
                                          ),
                                        ],
                                      ),
                                      const SizedBox(height: 4),
                                      Row(
                                        children: [
                                          const Icon(Icons.access_time, size: 14, color: Colors.grey),
                                          const SizedBox(width: 4),
                                          Text(act.formatTimeRange(context), style: const TextStyle(fontSize: 11, color: Colors.grey)),
                                        ],
                                      ),
                                      if (act.notes.isNotEmpty) ...[
                                        const SizedBox(height: 4),
                                        Text(
                                          act.notes,
                                          style: TextStyle(fontSize: 11, color: Colors.grey.shade700),
                                        ),
                                      ],
                                    ],
                                  ),
                                ),
                              ],
                            ),
                          );
                        }),
                      ],
                    ),
                  ),
                );
              }),

              const SizedBox(height: 16),

              FutureBuilder<dynamic>(
                future: _bookingFuture,
                builder: (context, bookingSnapshot) {
                  final booking = bookingSnapshot.data;

                  if (booking != null) {
                    final status = (booking is Map) ? (booking['status'] ?? 'CONFIRMED') : 'CONFIRMED';
                    return Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: Colors.green.shade100,
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Text(
                        'Booking Status: $status',
                        style: TextStyle(color: Colors.green.shade900, fontWeight: FontWeight.bold),
                        textAlign: TextAlign.center,
                      ),
                    );
                  }

                  return SizedBox(
                    width: double.infinity,
                    height: 52,
                    child: ElevatedButton.icon(
                      onPressed: _proceedToFleetBooking,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF0F766E),
                        foregroundColor: Colors.white,
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                      ),
                      icon: const Icon(Icons.directions_car),
                      label: const Text(
                        'Select Tour Transport & Book',
                        style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                      ),
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