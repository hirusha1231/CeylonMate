import '../../../core/network/api_client.dart';
import '../models/itinerary_models.dart';

class ItineraryService {
  final ApiClient client;

  ItineraryService(this.client);

  Future<List<ItineraryModel>> getItinerariesByTrip(int tripRequestId) async {
    final response = await client.dio.get('/api/Itineraries/by-trip/$tripRequestId');
    final list = response.data as List<dynamic>? ?? [];
    return list.map((json) => ItineraryModel.fromJson(json as Map<String, dynamic>)).toList();
  }

  Future<ItineraryModel?> getItinerary(int id) async {
    final response = await client.dio.get('/api/Itineraries/$id');
    if (response.data == null) return null;
    return ItineraryModel.fromJson(response.data as Map<String, dynamic>);
  }

  Future<BookingModel?> getBookingByTrip(int tripRequestId) async {
    final response = await client.dio.get('/api/Bookings/by-trip/$tripRequestId');
    if (response.data == null) return null;
    return BookingModel.fromJson(response.data as Map<String, dynamic>);
  }

  Future<BookingModel> createBooking({
    required int tripRequestId,
    int? quotationId,
    required double totalAmount,
    String currency = 'USD',
  }) async {
    final response = await client.dio.post(
      '/api/Bookings',
      data: {
        'tripRequestId': tripRequestId,
        'quotationId': quotationId,
        'totalAmount': totalAmount,
        'currency': currency,
      },
    );
    return BookingModel.fromJson(response.data as Map<String, dynamic>);
  }
}
