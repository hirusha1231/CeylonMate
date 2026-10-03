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
  Future<AuthUser> register({
    required String email,
    required String password,
    String? fullName,
    String? phoneNumber,
    String role = 'TRAVELER',
  }) async {
    return savedUser = AuthUser(
      id: 'test-id', email: email, role: role);
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

  testWidgets('restored local guide opens guide home and navigates to availability', (tester) async {
    final gateway = FakeAuthGateway()
      ..savedUser = const AuthUser(
        id: 'guide-id', email: 'guide@example.com', role: 'LOCAL_GUIDE');
    await tester.pumpWidget(CeylonMateApp(authGateway: gateway));
    await tester.pumpAndSettle();
    expect(find.text('Local Guide Home'), findsOneWidget);
    expect(find.text('Manage My Availability'), findsOneWidget);

    await tester.tap(find.text('Manage My Availability'));
    await tester.pumpAndSettle();
    expect(find.text('My Guide Availability'), findsOneWidget);
  });

  testWidgets('restore error does not open protected content', (tester) async {
    final gateway = FakeAuthGateway()..failRestore = true;
    await tester.pumpWidget(CeylonMateApp(authGateway: gateway));
    await tester.pumpAndSettle();
    expect(find.text('Retry'), findsOneWidget);
    expect(find.text('Traveler Home'), findsNothing);
  });

  testWidgets('navigates to register screen, validates inputs, and registers traveler', (tester) async {
    final gateway = FakeAuthGateway();
    await tester.pumpWidget(CeylonMateApp(authGateway: gateway));
    await tester.pumpAndSettle();

    // Tap "Sign up" button on LoginScreen
    await tester.tap(find.widgetWithText(TextButton, 'Sign up'));
    await tester.pumpAndSettle();

    expect(find.text('Create Account'), findsWidgets);
    expect(find.text('Join CeylonMate as a traveler or guide'), findsOneWidget);

    final createAccountButton = find.widgetWithText(FilledButton, 'Create Account');
    await tester.ensureVisible(createAccountButton);

    // Attempt submit with empty fields
    await tester.tap(createAccountButton);
    await tester.pumpAndSettle();
    expect(find.text('Enter a valid email address'), findsOneWidget);
    expect(find.text('Enter your password'), findsOneWidget);

    // Enter valid traveler registration details
    // Fields order: FullName (0), Email (1), Phone (2), Password (3), Confirm Password (4)
    await tester.enterText(find.byType(TextFormField).at(0), 'Amal Perera');
    await tester.enterText(find.byType(TextFormField).at(1), 'amal@example.com');
    await tester.enterText(find.byType(TextFormField).at(2), '0771234567');
    await tester.enterText(find.byType(TextFormField).at(3), 'secret123');
    await tester.enterText(find.byType(TextFormField).at(4), 'secret123');

    await tester.ensureVisible(createAccountButton);
    await tester.tap(createAccountButton);
    await tester.pumpAndSettle();

    expect(find.text('Traveler Home'), findsOneWidget);
    expect(gateway.savedUser?.email, 'amal@example.com');
    expect(gateway.savedUser?.role, 'TRAVELER');
  });

  testWidgets('can register as local guide and navigate to guide home', (tester) async {
    final gateway = FakeAuthGateway();
    await tester.pumpWidget(CeylonMateApp(authGateway: gateway));
    await tester.pumpAndSettle();

    await tester.tap(find.widgetWithText(TextButton, 'Sign up'));
    await tester.pumpAndSettle();

    // Select Local Guide role segment
    await tester.tap(find.text('Local Guide'));
    await tester.pumpAndSettle();

    await tester.enterText(find.byType(TextFormField).at(0), 'Nimal Guide');
    await tester.enterText(find.byType(TextFormField).at(1), 'nimal@guide.com');
    await tester.enterText(find.byType(TextFormField).at(2), '0719876543');
    await tester.enterText(find.byType(TextFormField).at(3), 'guidePass123');
    await tester.enterText(find.byType(TextFormField).at(4), 'guidePass123');

    final createAccountButton = find.widgetWithText(FilledButton, 'Create Account');
    await tester.ensureVisible(createAccountButton);
    await tester.tap(createAccountButton);
    await tester.pumpAndSettle();

    expect(find.text('Local Guide Home'), findsOneWidget);
    expect(gateway.savedUser?.role, 'LOCAL_GUIDE');
  });

  testWidgets('can navigate back from register screen to sign in', (tester) async {
    final gateway = FakeAuthGateway();
    await tester.pumpWidget(CeylonMateApp(authGateway: gateway));
    await tester.pumpAndSettle();

    await tester.tap(find.widgetWithText(TextButton, 'Sign up'));
    await tester.pumpAndSettle();
    expect(find.text('Create Account'), findsWidgets);

    // Tap "Sign in" link at bottom of register screen
    final signInButton = find.widgetWithText(TextButton, 'Sign in');
    await tester.ensureVisible(signInButton);
    await tester.tap(signInButton);
    await tester.pumpAndSettle();

    expect(find.text("Don't have an account?"), findsOneWidget);
  });
}


