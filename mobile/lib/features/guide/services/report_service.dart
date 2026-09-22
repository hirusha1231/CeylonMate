import '../../../core/network/api_client.dart';
import '../models/guide_report.dart';

class ReportService {
  final ApiClient client;

  ReportService(this.client);

  Future<List<Map<String, dynamic>>> getDestinations() async {
    final response = await client.dio.get<List<dynamic>>('/api/destinations');
    return (response.data ?? []).cast<Map<String, dynamic>>();
  }

  Future<List<GuideReport>> getReportsForDestination(String destinationId) async {
    final response = await client.dio.get<List<dynamic>>('/api/destinations/$destinationId/reports');
    return (response.data ?? [])
        .map((e) => GuideReport.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  Future<GuideReport> submitConditionReport({
    required String destinationId,
    required String reportType,
    required String message,
    String? photoUrl,
    double? latitude,
    double? longitude,
  }) async {
    final response = await client.dio.post<Map<String, dynamic>>(
      '/api/destinations/$destinationId/reports',
      data: {
        'reportType': reportType,
        'message': message,
        'photoUrl': photoUrl,
        'latitude': latitude,
        'longitude': longitude,
      },
    );
    return GuideReport.fromJson(response.data!);
  }
}
