import 'package:dio/dio.dart';
import '../../../core/network/api_client.dart';
import '../models/itinerary_models.dart';

class ItineraryService {
  final ApiClient client;

  ItineraryService(this.client);

  Future<List<ItineraryModel>> getItinerariesByTrip(String tripRequestId) async {
    try {
      // First attempt query by-trip, fallback to direct id lookup if 404
      Response response;
      try {
        response = await client.dio.get('/api/Itineraries/by-trip/$tripRequestId');
      } on DioException catch (e) {
        if (e.response?.statusCode == 404) {
          response = await client.dio.get('/api/Itineraries/$tripRequestId');
        } else {
          rethrow;
        }
      }

      if (response.data == null) return [];

      if (response.data is List) {
        final list = response.data as List<dynamic>;
        return list.map((e) => ItineraryModel.fromJson(e as Map<String, dynamic>)).toList();
      } else if (response.data is Map<String, dynamic>) {
        return [ItineraryModel.fromJson(response.data as Map<String, dynamic>)];
      }
      return [];
    } on DioException catch (e) {
      if (e.response?.statusCode == 404) {
        return [];
      }
      rethrow;
    }
  }

  Future<BookingModel?> getBookingByTrip(String tripRequestId) async {
  try {
    Response response;
    try {
      response = await client.dio.get('/api/Bookings/by-trip/$tripRequestId');
    } on DioException catch (e) {
      if (e.response?.statusCode == 404) {
        response = await client.dio.get('/api/Bookings/$tripRequestId');
      } else {
        rethrow;
      }
    }

    if (response.data == null) return null;
    return BookingModel.fromJson(response.data as Map<String, dynamic>);
  } on DioException catch (e) {
    if (e.response?.statusCode == 404) {
      return null;
    }
    rethrow;
  }
  }  
  Future<BookingModel> createBooking({
    required dynamic tripRequestId,
    double? totalAmount,
    dynamic itineraryId,
    String? status,
  }) async {
    final payload = <String, dynamic>{
      'tripRequestId': int.tryParse(tripRequestId.toString()) ?? 1,
      if (itineraryId != null)
        'itineraryId': int.tryParse(itineraryId.toString()) ?? itineraryId,
      if (totalAmount != null) 'totalAmount': totalAmount,
      'status': status ?? 'CONFIRMED',
    };

    final response = await client.dio.post(
      '/api/Bookings',
      data: payload,
    );

    return BookingModel.fromJson(response.data as Map<String, dynamic>);
  }
}
  
