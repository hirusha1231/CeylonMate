import 'dart:io';
import 'package:flutter_test/flutter_test.dart';
import 'package:ceylonmate_mobile/main.dart';
import 'package:ceylonmate_mobile/features/guide/services/guide_availability_service.dart';
import 'package:ceylonmate_mobile/features/guide/models/guide_availability_slot.dart';

class MockHttpOverrides extends HttpOverrides {
  @override
  HttpClient createHttpClient(SecurityContext? context) {
    return super.createHttpClient(context)
      ..badCertificateCallback = (cert, host, port) => true;
  }
}

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
  setUpAll(() {
    HttpOverrides.global = MockHttpOverrides();
  });

  testWidgets('Renders CeylonMate App without crashing', (WidgetTester tester) async {
    final fakeService = FakeGuideAvailabilityService();
    await tester.pumpWidget(CeylonMateApp(guideService: fakeService));
    await tester.pump(const Duration(milliseconds: 500));

    expect(find.byType(CeylonMateApp), findsOneWidget);
  });
}