import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:ceylonmate_mobile/core/auth/auth_repository.dart';
import 'package:ceylonmate_mobile/core/auth/auth_user.dart';
import 'package:ceylonmate_mobile/main.dart';

class FakeAuthGateway implements AuthGateway {
  AuthUser? savedUser;
  bool failRestore = false;
  bool failLogin = false;

  @override
  Future<AuthUser?> restore() async {
    if (failRestore) throw StateError('offline');
    return savedUser;
  }

  @override
  Future<AuthUser> login(String email, String password) async {
    if (failLogin) throw StateError('login failed');
    return savedUser = AuthUser(
      id: 'test-id', email: email, role: 'TRAVELER');
  }

  @override
  Future<void> logout() async {
    savedUser = null;
  }
}

void main() {
  testWidgets('signed-out users cannot see home; login and logout reset shell',
      (tester) async {
    final gateway = FakeAuthGateway();
    await tester.pumpWidget(CeylonMateApp(authGateway: gateway));
    await tester.pumpAndSettle();
    expect(find.text('Sign in'), findsWidgets);
    expect(find.text('Traveler Home'), findsNothing);

    await tester.enterText(find.byType(TextFormField).at(0), 'traveler@example.com');
    await tester.enterText(find.byType(TextFormField).at(1), 'password');
    await tester.tap(find.widgetWithText(FilledButton, 'Sign in'));
    await tester.pumpAndSettle();
    expect(find.text('Traveler Home'), findsOneWidget);

    await tester.tap(find.byTooltip('Logout'));
    await tester.pumpAndSettle();
    expect(find.text('Traveler Home'), findsNothing);
    expect(find.text('Sign in'), findsWidgets);
  });

  testWidgets('restored local guide opens guide home', (tester) async {
    final gateway = FakeAuthGateway()
      ..savedUser = const AuthUser(
        id: 'guide-id', email: 'guide@example.com', role: 'LOCAL_GUIDE');
    await tester.pumpWidget(CeylonMateApp(authGateway: gateway));
    await tester.pumpAndSettle();
    expect(find.text('Local Guide Home'), findsOneWidget);
    final context = tester.element(find.text('Local Guide Home'));
    Navigator.of(context).pushNamed('/traveler');
    await tester.pumpAndSettle();
    expect(find.text('Access denied'), findsOneWidget);
  });

  testWidgets('restore error does not open protected content', (tester) async {
    final gateway = FakeAuthGateway()..failRestore = true;
    await tester.pumpWidget(CeylonMateApp(authGateway: gateway));
    await tester.pumpAndSettle();
    expect(find.text('Retry'), findsOneWidget);
    expect(find.text('Traveler Home'), findsNothing);
  });
}
