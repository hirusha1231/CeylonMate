class ItineraryItemModel {
  final int id;
  final int itineraryDayId;
  final int dayNumber;
  final String timeSlot;
  final String title;
  final String? description;
  final String? location;
  final double? estimatedCost;

  ItineraryItemModel({
    required this.id,
    required this.itineraryDayId,
    required this.dayNumber,
    required this.timeSlot,
    required this.title,
    this.description,
    this.location,
    this.estimatedCost,
  });

  factory ItineraryItemModel.fromJson(Map<String, dynamic> json) {
    return ItineraryItemModel(
      id: json['id'] as int? ?? 0,
      itineraryDayId: json['itineraryDayId'] as int? ?? 0,
      dayNumber: json['dayNumber'] as int? ?? 1,
      timeSlot: json['timeSlot'] as String? ?? '',
      title: json['title'] as String? ?? '',
      description: json['description'] as String?,
      location: json['location'] as String?,
      estimatedCost: (json['estimatedCost'] as num?)?.toDouble(),
    );
  }

  Map<String, dynamic> toJson() => {
    'id': id,
    'itineraryDayId': itineraryDayId,
    'dayNumber': dayNumber,
    'timeSlot': timeSlot,
    'title': title,
    'description': description,
    'location': location,
    'estimatedCost': estimatedCost,
  };
}

class ItineraryDayModel {
  final int id;
  final int itineraryId;
  final int dayNumber;
  final String? title;
  final String? notes;
  final List<ItineraryItemModel> items;

  ItineraryDayModel({
    required this.id,
    required this.itineraryId,
    required this.dayNumber,
    this.title,
    this.notes,
    this.items = const [],
  });

  factory ItineraryDayModel.fromJson(Map<String, dynamic> json) {
    return ItineraryDayModel(
      id: json['id'] as int? ?? 0,
      itineraryId: json['itineraryId'] as int? ?? 0,
      dayNumber: json['dayNumber'] as int? ?? 1,
      title: json['title'] as String?,
      notes: json['notes'] as String?,
      items: (json['items'] as List<dynamic>?)
              ?.map((e) => ItineraryItemModel.fromJson(e as Map<String, dynamic>))
              .toList() ??
          [],
    );
  }
}

class ItineraryModel {
  final int id;
  final int tripRequestId;
  final String title;
  final String status;
  final DateTime createdAtUtc;
  final List<ItineraryDayModel> days;

  ItineraryModel({
    required this.id,
    required this.tripRequestId,
    required this.title,
    required this.status,
    required this.createdAtUtc,
    this.days = const [],
  });

  factory ItineraryModel.fromJson(Map<String, dynamic> json) {
    return ItineraryModel(
      id: json['id'] as int? ?? 0,
      tripRequestId: json['tripRequestId'] as int? ?? 0,
      title: json['title'] as String? ?? '',
      status: json['status'] as String? ?? 'Draft',
      createdAtUtc: DateTime.tryParse(json['createdAtUtc'] as String? ?? '') ?? DateTime.now(),
      days: (json['days'] as List<dynamic>?)
              ?.map((e) => ItineraryDayModel.fromJson(e as Map<String, dynamic>))
              .toList() ??
          [],
    );
  }
}

class BookingModel {
  final int id;
  final int tripRequestId;
  final int? quotationId;
  final String status;
  final double totalAmount;
  final String currency;
  final DateTime createdAtUtc;

  BookingModel({
    required this.id,
    required this.tripRequestId,
    this.quotationId,
    required this.status,
    required this.totalAmount,
    required this.currency,
    required this.createdAtUtc,
  });

  factory BookingModel.fromJson(Map<String, dynamic> json) {
    return BookingModel(
      id: json['id'] as int? ?? 0,
      tripRequestId: json['tripRequestId'] as int? ?? 0,
      quotationId: json['quotationId'] as int?,
      status: json['status'] as String? ?? 'Pending',
      totalAmount: (json['totalAmount'] as num?)?.toDouble() ?? 0.0,
      currency: json['currency'] as String? ?? 'USD',
      createdAtUtc: DateTime.tryParse(json['createdAtUtc'] as String? ?? '') ?? DateTime.now(),
    );
  }
}
