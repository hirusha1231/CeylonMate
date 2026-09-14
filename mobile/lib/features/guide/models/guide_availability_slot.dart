import 'dart:convert';

class GuideAvailabilitySlot {
  final String id;
  final String localGuideUserId;
  final String? guideProfileId;
  final DateTime startTime;
  final DateTime endTime;
  final String slotType; // FULL_DAY, HALF_DAY_MORNING, HALF_DAY_AFTERNOON, EVENING, HOURLY, CUSTOM
  final String status;   // AVAILABLE, RESERVED, BOOKED, BLOCKED, CANCELLED
  final int maxCapacity;
  final int bookedCapacity;
  final double priceAmount;
  final String currency;
  final String? notes;
  final String? rowVersion;

  const GuideAvailabilitySlot({
    required this.id,
    required this.localGuideUserId,
    this.guideProfileId,
    required this.startTime,
    required this.endTime,
    this.slotType = 'FULL_DAY',
    this.status = 'AVAILABLE',
    this.maxCapacity = 1,
    this.bookedCapacity = 0,
    this.priceAmount = 0.0,
    this.currency = 'LKR',
    this.notes,
    this.rowVersion,
  });

  factory GuideAvailabilitySlot.fromJson(Map<String, dynamic> json) {
    String? parseRowVersion(dynamic raw) {
      if (raw == null) return null;
      if (raw is String) return raw;
      if (raw is List) return base64Encode(List<int>.from(raw));
      return raw.toString();
    }

    DateTime parseDate(dynamic raw) {
      if (raw == null) return DateTime.now();
      if (raw is DateTime) return raw;
      try {
        return DateTime.parse(raw.toString());
      } catch (_) {
        return DateTime.now();
      }
    }

    return GuideAvailabilitySlot(
      id: (json['id'] ?? json['Id'])?.toString() ?? '',
      localGuideUserId: (json['localGuideUserId'] ?? json['guideUserId'] ?? json['LocalGuideUserId'])?.toString() ?? '',
      guideProfileId: (json['guideProfileId'] ?? json['GuideProfileId'])?.toString(),
      startTime: parseDate(json['startTimeUtc'] ?? json['startTime'] ?? json['StartTimeUtc']),
      endTime: parseDate(json['endTimeUtc'] ?? json['endTime'] ?? json['EndTimeUtc']),
      slotType: (json['slotType'] ?? json['SlotType'])?.toString() ?? 'FULL_DAY',
      status: (json['status'] ?? json['Status'])?.toString() ?? 'AVAILABLE',
      maxCapacity: (json['maxCapacity'] as num?)?.toInt() ?? 1,
      bookedCapacity: (json['bookedCapacity'] as num?)?.toInt() ?? 0,
      priceAmount: (json['priceAmount'] as num?)?.toDouble() ?? 0.0,
      currency: (json['currency'] ?? json['Currency'])?.toString() ?? 'LKR',
      notes: (json['notes'] ?? json['Notes'])?.toString(),
      rowVersion: parseRowVersion(json['rowVersion'] ?? json['RowVersion']),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'localGuideUserId': localGuideUserId,
      'guideProfileId': guideProfileId,
      'startTimeUtc': startTime.toUtc().toIso8601String(),
      'endTimeUtc': endTime.toUtc().toIso8601String(),
      'slotType': slotType,
      'status': status,
      'maxCapacity': maxCapacity,
      'bookedCapacity': bookedCapacity,
      'priceAmount': priceAmount,
      'currency': currency,
      'notes': notes,
      if (rowVersion != null) 'rowVersion': rowVersion,
    };
  }

  GuideAvailabilitySlot copyWith({
    String? id,
    String? localGuideUserId,
    String? guideProfileId,
    DateTime? startTime,
    DateTime? endTime,
    String? slotType,
    String? status,
    int? maxCapacity,
    int? bookedCapacity,
    double? priceAmount,
    String? currency,
    String? notes,
    String? rowVersion,
  }) {
    return GuideAvailabilitySlot(
      id: id ?? this.id,
      localGuideUserId: localGuideUserId ?? this.localGuideUserId,
      guideProfileId: guideProfileId ?? this.guideProfileId,
      startTime: startTime ?? this.startTime,
      endTime: endTime ?? this.endTime,
      slotType: slotType ?? this.slotType,
      status: status ?? this.status,
      maxCapacity: maxCapacity ?? this.maxCapacity,
      bookedCapacity: bookedCapacity ?? this.bookedCapacity,
      priceAmount: priceAmount ?? this.priceAmount,
      currency: currency ?? this.currency,
      notes: notes ?? this.notes,
      rowVersion: rowVersion ?? this.rowVersion,
    );
  }

  bool get isAvailable => status.toUpperCase() == 'AVAILABLE' && bookedCapacity < maxCapacity;
  bool get isBooked => status.toUpperCase() == 'BOOKED' || bookedCapacity >= maxCapacity;
  bool get isBlocked => status.toUpperCase() == 'BLOCKED';
  bool get isReserved => status.toUpperCase() == 'RESERVED';
}
