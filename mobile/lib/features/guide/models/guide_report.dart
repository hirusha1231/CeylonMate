class GuideReport {
  final String id;
  final String destinationId;
  final String guideId;
  final String reportType;
  final String message;
  final String? photoUrl;
  final double? latitude;
  final double? longitude;
  final String status;
  final DateTime reportedAtUtc;

  GuideReport({
    required this.id,
    required this.destinationId,
    required this.guideId,
    required this.reportType,
    required this.message,
    this.photoUrl,
    this.latitude,
    this.longitude,
    required this.status,
    required this.reportedAtUtc,
  });

  factory GuideReport.fromJson(Map<String, dynamic> json) {
    return GuideReport(
      id: json['id'] as String? ?? '',
      destinationId: json['destinationId'] as String? ?? '',
      guideId: json['guideId'] as String? ?? '',
      reportType: json['reportType'] as String? ?? 'WEATHER',
      message: json['message'] as String? ?? '',
      photoUrl: json['photoUrl'] as String?,
      latitude: (json['latitude'] as num?)?.toDouble(),
      longitude: (json['longitude'] as num?)?.toDouble(),
      status: json['status'] as String? ?? 'VERIFIED',
      reportedAtUtc: json['reportedAtUtc'] != null
          ? DateTime.parse(json['reportedAtUtc'] as String)
          : DateTime.now(),
    );
  }
}
