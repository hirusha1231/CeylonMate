import 'package:flutter_test/flutter_test.dart';
import 'package:ceylonmate_mobile/features/trips/models/trip.dart';

void main() {
  test('trip page parses the API response shape', () {
    final page = TripPage.fromJson({
      'items': [
        {
          'id': '11111111-1111-1111-1111-111111111111',
          'objective': 'Wildlife',
          'startDate': '2026-12-01',
          'endDate': '2026-12-05',
          'budget': 50000,
          'currency': 'LKR',
          'partySize': 2,
          'startingLatitude': 6.927079,
          'startingLongitude': 79.861244,
          'accessibilityNeeds': null,
          'status': 'DRAFT',
          'createdAtUtc': '2026-09-16T10:00:00Z',
          'updatedAtUtc': '2026-09-16T10:00:00Z',
        }
      ],
      'page': 1,
      'pageSize': 20,
      'totalCount': 1,
    });

    expect(page.totalCount, 1);
    expect(page.items.single.status, 'DRAFT');
    expect(page.items.single.startingLatitude, closeTo(6.927079, 0.000001));
  });
}
