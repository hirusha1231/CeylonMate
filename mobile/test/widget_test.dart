import 'package:ceylonmate_mobile/main.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  testWidgets('renders scaffold', (tester) async {
    await tester.pumpWidget(const CeylonMateApp());
    expect(find.text('CeylonMate mobile scaffold is running.'), findsOneWidget);
  });
}
