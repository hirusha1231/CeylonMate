import 'dart:convert';
import 'package:dio/dio.dart';
import '../../../core/network/api_client.dart';
import '../models/trip.dart';

class TripService {
  final ApiClient client;

  TripService(this.client);

  bool get isStaff {
    // UI hint only. The API remains the authorization authority.
    final header = client.dio.options.headers['Authorization']?.toString() ?? '';
    if (!header.startsWith('Bearer ')) return false;
    try {
      final parts = header.substring(7).split('.');
      final claims = jsonDecode(utf8.decode(base64Url.decode(base64Url.normalize(parts[1])))) as Map;
      final role = claims['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'];
      return role == 'ADMIN' || role == 'TRAVEL_AGENT';
    } catch (_) {
      return false;
    }
  }

  Future<TripPage> myTrips({int page = 1}) async {
    final response = await client.dio.get('/api/trips/my',
        queryParameters: {'page': page, 'pageSize': 20});
    return TripPage.fromJson(Map<String, dynamic>.from(response.data as Map));
  }

  Future<Trip> getTrip(String id) async {
    final response = await client.dio.get('/api/trips/$id');
    return Trip.fromJson(Map<String, dynamic>.from(response.data as Map));
  }

  Future<Trip> createTrip(Map<String, dynamic> payload) async {
    final response = await client.dio.post('/api/trips', data: payload);
    return Trip.fromJson(Map<String, dynamic>.from(response.data as Map));
  }

  Future<Trip> updateTrip(String id, Map<String, dynamic> payload) async {
    final response = await client.dio.put('/api/trips/$id', data: payload);
    return Trip.fromJson(Map<String, dynamic>.from(response.data as Map));
  }

  Future<Trip> submitTrip(String id) async {
    final response = await client.dio.post('/api/trips/$id/submit');
    return Trip.fromJson(Map<String, dynamic>.from(response.data as Map));
  }

  Future<Trip> startPlanning(String id) async {
    final response = await client.dio.post('/api/trips/$id/start-planning');
    return Trip.fromJson(Map<String, dynamic>.from(response.data as Map));
  }

  Future<TravelerPreferences> getPreferences() async {
    try {
      final response = await client.dio.get('/api/traveler/profile');
      return TravelerPreferences.fromJson(
          Map<String, dynamic>.from(response.data as Map));
    } on DioException catch (error) {
      if (error.response?.statusCode == 404) {
        return const TravelerPreferences();
      }
      rethrow;
    }
  }
  Future<void> cancelTrip(String tripId) async {
    await client.dio.delete('/api/bookings/$tripId');
  }

  Future<void> deleteBooking(int bookingId) async {
    await client.dio.delete('/api/Bookings/$bookingId');
  }

  Future<void> savePreferences(TravelerPreferences preferences) async {
    await client.dio.put('/api/traveler/profile', data: {
      'visitorCategory': preferences.visitorCategory,
      'preferences': preferences.interests,
    });
  }
}

String tripError(Object error) {
  if (error is DioException) {
    if (error.response?.statusCode == 401) return 'Sign in with a traveler account to continue.';
    if (error.response?.statusCode == 403) return 'Your account is not allowed to do this.';
    if (error.response?.statusCode == 404) return 'This trip was not found.';
    final data = error.response?.data;
    if (data is Map && data['title'] is String) return data['title'] as String;
    if (error.response?.statusCode == 409) return 'The trip status changed. Refresh and try again.';
    return 'Could not reach the trip service. Check your connection and try again.';
  }
  return 'Something went wrong. Please try again.';
}
