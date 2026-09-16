class Trip {
  final String id;
  final String objective;
  final DateTime startDate;
  final DateTime endDate;
  final double budget;
  final String currency;
  final int partySize;
  final double? startingLatitude;
  final double? startingLongitude;
  final String? accessibilityNeeds;
  final String status;
  final DateTime createdAtUtc;
  final DateTime updatedAtUtc;

  const Trip({
    required this.id,
    required this.objective,
    required this.startDate,
    required this.endDate,
    required this.budget,
    required this.currency,
    required this.partySize,
    this.startingLatitude,
    this.startingLongitude,
    this.accessibilityNeeds,
    required this.status,
    required this.createdAtUtc,
    required this.updatedAtUtc,
  });

  factory Trip.fromJson(Map<String, dynamic> json) => Trip(
        id: json['id'] as String,
        objective: json['objective'] as String,
        startDate: DateTime.parse(json['startDate'] as String),
        endDate: DateTime.parse(json['endDate'] as String),
        budget: (json['budget'] as num).toDouble(),
        currency: json['currency'] as String,
        partySize: json['partySize'] as int,
        startingLatitude: (json['startingLatitude'] as num?)?.toDouble(),
        startingLongitude: (json['startingLongitude'] as num?)?.toDouble(),
        accessibilityNeeds: json['accessibilityNeeds'] as String?,
        status: json['status'] as String,
        createdAtUtc: DateTime.parse(json['createdAtUtc'] as String),
        updatedAtUtc: DateTime.parse(json['updatedAtUtc'] as String),
      );
}

class TravelerPreferences {
  final String? visitorCategory;
  final String? interests;

  const TravelerPreferences({this.visitorCategory, this.interests});

  factory TravelerPreferences.fromJson(Map<String, dynamic> json) =>
      TravelerPreferences(
        visitorCategory: json['visitorCategory'] as String?,
        interests: json['preferences'] as String?,
      );
}

class TripPage {
  final List<Trip> items;
  final int page;
  final int totalCount;

  const TripPage(this.items, this.page, this.totalCount);

  factory TripPage.fromJson(Map<String, dynamic> json) => TripPage(
        (json['items'] as List<dynamic>)
            .map((item) => Trip.fromJson(Map<String, dynamic>.from(item as Map)))
            .toList(),
        json['page'] as int,
        json['totalCount'] as int,
      );
}
