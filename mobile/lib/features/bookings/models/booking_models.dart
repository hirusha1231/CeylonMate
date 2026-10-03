class VehicleFleetItem {
  final String id;
  final String vehicleModel;
  final String categoryBadge;
  final int maxPassengers;
  final double dailyRateUsd;
  final double dailyRateLkr;
  final String imageUrl;
  final String description;

  const VehicleFleetItem({
    required this.id,
    required this.vehicleModel,
    required this.categoryBadge,
    required this.maxPassengers,
    required this.dailyRateUsd,
    required this.dailyRateLkr,
    required this.imageUrl,
    required this.description,
  });

  factory VehicleFleetItem.fromJson(Map<String, dynamic> json) {
    return VehicleFleetItem(
      id: json['id']?.toString() ?? '',
      vehicleModel: json['vehicleModel']?.toString() ?? 'Toyota Commuter VIP',
      categoryBadge: json['categoryBadge']?.toString() ?? 'VIP Chauffeur',
      maxPassengers: (json['maxPassengers'] as num?)?.toInt() ?? 4,
      dailyRateUsd: (json['dailyRateUsd'] as num?)?.toDouble() ?? 75.0,
      dailyRateLkr: (json['dailyRateLkr'] as num?)?.toDouble() ?? 24500.0,
      imageUrl: json['imageUrl']?.toString() ??
          'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?auto=format&fit=crop&q=80&w=400',
      description: json['description']?.toString() ?? 'Air-conditioned luxury chauffeur escort',
    );
  }
}

class BookingCheckoutData {
  final String tripRequestId;
  final String tripTitle;
  final int partySize;
  final DateTime startDate;
  final DateTime endDate;
  final VehicleFleetItem vehicle;
  final double totalEstimatedAmountLkr;
  final double totalEstimatedAmountUsd;

  const BookingCheckoutData({
    required this.tripRequestId,
    required this.tripTitle,
    required this.partySize,
    required this.startDate,
    required this.endDate,
    required this.vehicle,
    required this.totalEstimatedAmountLkr,
    required this.totalEstimatedAmountUsd,
  });
}
