import 'package:flutter_test/flutter_test.dart';
import 'package:ceylonmate_mobile/main.dart';
import 'package:ceylonmate_mobile/features/guide/services/guide_availability_service.dart';
import 'package:ceylonmate_mobile/features/guide/models/guide_availability_slot.dart';

class FakeGuideAvailabilityService extends GuideAvailabilityService {
  @override
  Future<List<GuideAvailabilitySlot>> fetchAvailability(
    String guideId, {
    DateTime? month,
    DateTime? startDate,
    DateTime? endDate,
  }) async {
    return [
      GuideAvailabilitySlot(
        id: 'test-slot-1',
        localGuideUserId: guideId,
        startTime: DateTime.now(),
        endTime: DateTime.now().add(const Duration(hours: 8)),
        slotType: 'FULL_DAY',
        status: 'AVAILABLE',
        priceAmount: 15000,
      ),
    ];
  }
}

void main() {
  testWidgets('Renders CeylonMate App without crashing', (WidgetTester tester) async {
    final fakeService = FakeGuideAvailabilityService();
    await tester.pumpWidget(CeylonMateApp(guideService: fakeService));
    await tester.pumpAndSettle();

    expect(find.byType(CeylonMateApp), findsOneWidget);
    expect(find.text('My Guide Availability'), findsOneWidget);
  });
}