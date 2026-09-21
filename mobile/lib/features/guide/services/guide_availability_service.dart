import 'package:dio/dio.dart';
import '../../../core/network/api_client.dart';
import '../models/guide_availability_slot.dart';

class GuideAvailabilityService {
  final ApiClient apiClient;

  GuideAvailabilityService({ApiClient? apiClient})
      : apiClient = apiClient ?? ApiClient();

  /// Fetches availability slots for a specific local guide.
  /// Handles raw List responses, wrapped objects ({data: [...]}, {slots: [...]}), and handles non-Map Dio errors safely.
  Future<List<GuideAvailabilitySlot>> fetchAvailability(
    String guideId, {
    DateTime? month,
    DateTime? startDate,
    DateTime? endDate,
  }) async {
    try {
      DateTime? start = startDate;
      DateTime? end = endDate;

      if (month != null && start == null && end == null) {
        start = DateTime(month.year, month.month, 1);
        end = DateTime(month.year, month.month + 1, 0, 23, 59, 59);
      }

      final queryParams = <String, dynamic>{};
      if (start != null) {
        queryParams['startDate'] = start.toUtc().toIso8601String();
      }
      if (end != null) {
        queryParams['endDate'] = end.toUtc().toIso8601String();
      }

      final response = await apiClient.dio.get(
        '/api/guides/$guideId/availability',
        queryParameters: queryParams,
      );

      final dynamic rawData = response.data;
      final List<dynamic> list;

      if (rawData is List) {
        list = rawData;
      } else if (rawData is Map<String, dynamic> && rawData['data'] is List) {
        list = rawData['data'] as List<dynamic>;
      } else if (rawData is Map<String, dynamic> && rawData['slots'] is List) {
        list = rawData['slots'] as List<dynamic>;
      } else if (rawData is Map<String, dynamic> && rawData['items'] is List) {
        list = rawData['items'] as List<dynamic>;
      } else {
        list = [];
      }

      return list
          .whereType<Map<String, dynamic>>()
          .map((item) => GuideAvailabilitySlot.fromJson(item))
          .toList();
    } on DioException catch (e) {
      String msg = e.message ?? 'Network error occurred';
      final errData = e.response?.data;
      if (errData is Map<String, dynamic>) {
        msg = errData['detail']?.toString() ??
            errData['title']?.toString() ??
            errData['message']?.toString() ??
            msg;
      } else if (errData is String && errData.isNotEmpty) {
        msg = errData;
      }
      throw Exception('Failed to load guide availability: $msg');
    } catch (e) {
      throw Exception('Unexpected error fetching availability: $e');
    }
  }

  /// Adds or updates a guide availability slot.
  Future<GuideAvailabilitySlot> saveAvailability(
    String guideId,
    GuideAvailabilitySlot slot,
  ) async {
    try {
      final payload = {
        'startTimeUtc': slot.startTime.toUtc().toIso8601String(),
        'endTimeUtc': slot.endTime.toUtc().toIso8601String(),
        'slotType': slot.slotType,
        'maxCapacity': slot.maxCapacity,
        'priceAmount': slot.priceAmount,
        'currency': slot.currency,
        'notes': slot.notes,
      };

      final response = await apiClient.dio.post(
        '/api/guides/$guideId/availability',
        data: payload,
      );

      if ((response.statusCode == 201 || response.statusCode == 200) &&
          response.data is Map<String, dynamic>) {
        return GuideAvailabilitySlot.fromJson(
            response.data as Map<String, dynamic>);
      }

      throw Exception('Failed to save slot. Server status: ${response.statusCode}');
    } on DioException catch (e) {
      if (e.response?.statusCode == 409) {
        throw Exception('Slot is no longer available or was booked by another user. Please choose a different slot.');
      }
      String msg = e.message ?? 'Network error occurred';
      final errData = e.response?.data;
      if (errData is Map<String, dynamic>) {
        msg = errData['detail']?.toString() ??
            errData['title']?.toString() ??
            errData['message']?.toString() ??
            msg;
      } else if (errData is String && errData.isNotEmpty) {
        msg = errData;
      }
      throw Exception('Failed to save availability slot: $msg');
    } catch (e) {
      throw Exception('Unexpected error saving slot: $e');
    }
  }

  /// Updates an existing guide availability slot via PUT.
  Future<GuideAvailabilitySlot> updateAvailabilitySlot(
    String slotId,
    GuideAvailabilitySlot slot,
  ) async {
    try {
      final payload = {
        'startTimeUtc': slot.startTime.toUtc().toIso8601String(),
        'endTimeUtc': slot.endTime.toUtc().toIso8601String(),
        'slotType': slot.slotType,
        'status': slot.status,
        'maxCapacity': slot.maxCapacity,
        'priceAmount': slot.priceAmount,
        'currency': slot.currency,
        'notes': slot.notes,
        'rowVersion': slot.rowVersion,
      };

      final response = await apiClient.dio.put(
        '/api/guides/availability/$slotId',
        data: payload,
      );

      if (response.statusCode == 200 && response.data is Map<String, dynamic>) {
        return GuideAvailabilitySlot.fromJson(
            response.data as Map<String, dynamic>);
      }

      throw Exception('Failed to update slot. Server status: ${response.statusCode}');
    } on DioException catch (e) {
      if (e.response?.statusCode == 409) {
        throw Exception('Concurrency conflict detected while updating slot. Please refresh and try again.');
      }
      String msg = e.message ?? 'Network error occurred';
      final errData = e.response?.data;
      if (errData is Map<String, dynamic>) {
        msg = errData['detail']?.toString() ??
            errData['title']?.toString() ??
            errData['message']?.toString() ??
            msg;
      }
      throw Exception('Failed to update slot: $msg');
    } catch (e) {
      throw Exception('Unexpected error updating slot: $e');
    }
  }

  /// Deletes a guide availability slot via DELETE.
  Future<bool> deleteAvailabilitySlot(String slotId) async {
    try {
      final response = await apiClient.dio.delete(
        '/api/guides/availability/$slotId',
      );

      if (response.statusCode == 204 || response.statusCode == 200) {
        return true;
      }
      return false;
    } on DioException catch (e) {
      if (e.response?.statusCode == 409) {
        throw Exception('Cannot delete slot with active reservations or holds.');
      }
      String msg = e.message ?? 'Network error occurred';
      final errData = e.response?.data;
      if (errData is Map<String, dynamic>) {
        msg = errData['message']?.toString() ??
            errData['detail']?.toString() ??
            msg;
      }
      throw Exception('Failed to delete slot: $msg');
    } catch (e) {
      throw Exception('Unexpected error deleting slot: $e');
    }
  }
}
