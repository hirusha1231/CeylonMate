import 'package:flutter_test/flutter_test.dart';
import 'package:ceylonmate_mobile/main.dart';

void main() {
  testWidgets('Renders CeylonMate App without crashing', (WidgetTester tester) async {
    await tester.pumpWidget(const CeylonMateApp());
    expect(find.byType(CeylonMateApp), findsOneWidget);
  });
}