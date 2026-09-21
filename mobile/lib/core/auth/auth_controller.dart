import 'package:flutter/foundation.dart';
import 'auth_repository.dart';
import 'auth_user.dart';

enum AuthPhase { checking, signedOut, signedIn, error }

class AuthController extends ChangeNotifier {
  final AuthGateway gateway;
  AuthPhase phase = AuthPhase.checking;
  AuthUser? user;
  String? error;
  bool busy = false;

  AuthController(this.gateway);

  Future<void> initialize() async {
    phase = AuthPhase.checking;
    error = null;
    notifyListeners();
    try {
      user = await gateway.restore();
      phase = user == null ? AuthPhase.signedOut : AuthPhase.signedIn;
    } catch (failure) {
      user = null;
      phase = AuthPhase.error;
      error = authError(failure);
    }
    notifyListeners();
  }

  Future<bool> login(String email, String password) async {
    if (busy) return false;
    busy = true;
    error = null;
    notifyListeners();
    try {
      user = await gateway.login(email, password);
      phase = AuthPhase.signedIn;
      return true;
    } catch (failure) {
      user = null;
      phase = AuthPhase.signedOut;
      error = authError(failure);
      return false;
    } finally {
      busy = false;
      notifyListeners();
    }
  }

  Future<void> logout() async {
    busy = true;
    user = null;
    phase = AuthPhase.checking;
    notifyListeners();
    try {
      await gateway.logout();
      error = null;
    } catch (failure) {
      user = null;
      phase = AuthPhase.error;
      error = 'Could not clear saved credentials. Please retry sign out.';
      return;
    } finally {
      busy = false;
      notifyListeners();
    }
    phase = AuthPhase.signedOut;
    notifyListeners();
  }
}
