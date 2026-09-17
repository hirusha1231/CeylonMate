import 'package:ceylonmate_mobile/core/network/api_client.dart';
import 'package:ceylonmate_mobile/features/trips/models/trip.dart';
import 'package:ceylonmate_mobile/features/trips/screens/trip_form_screen.dart';
import 'package:ceylonmate_mobile/features/trips/services/trip_service.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

class FakeTripService extends TripService {
  FakeTripService() : super(ApiClient(customBaseUrl: 'http://localhost'));

  int createCalls = 0;

  @override
  Future<TravelerPreferences> getPreferences() async => const TravelerPreferences();

  @override
  Future<Trip> createTrip(Map<String, dynamic> payload) async {
    createCalls++;
    throw StateError('Invalid form reached the API');
  }
}

void main() {
  testWidgets('Create Trip blocks missing dates and non-positive budget/party size',
      (tester) async {
    final service = FakeTripService();
    await tester.pumpWidget(MaterialApp(home: TripFormScreen(service: service)));
    await tester.pumpAndSettle();

    final save = find.widgetWithText(FilledButton, 'Save draft');
    await tester.ensureVisible(save);
    await tester.tap(save);
    await tester.pump();
    expect(find.text('Required'), findsOneWidget);
    expect(find.text('Enter a positive budget'), findsOneWidget);
    expect(find.text('Choose a valid date range.'), findsNothing);

    await tester.enterText(find.widgetWithText(TextFormField, 'Trip objective'), 'Wildlife trip');
    await tester.enterText(find.widgetWithText(TextFormField, 'Budget'), '0');
    await tester.enterText(find.widgetWithText(TextFormField, 'Party size'), '0');
    await tester.ensureVisible(save);
    await tester.tap(save);
    await tester.pump();
    expect(find.text('Enter a positive budget'), findsOneWidget);
    expect(find.text('Enter a positive whole number'), findsOneWidget);

    await tester.enterText(find.widgetWithText(TextFormField, 'Budget'), '1000');
    await tester.enterText(find.widgetWithText(TextFormField, 'Party size'), '2');
    await tester.ensureVisible(save);
    await tester.tap(save);
    await tester.pump();
    expect(find.text('Choose a valid date range.'), findsOneWidget);
    expect(service.createCalls, 0);
  });
}
