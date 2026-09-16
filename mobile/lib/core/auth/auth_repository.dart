import 'package:dio/dio.dart';
import '../network/api_client.dart';
import 'auth_user.dart';
import 'token_store.dart';

abstract class AuthGateway {
  Future<AuthUser?> restore();
  Future<AuthUser> login(String email, String password);
  Future<void> logout();
}

class AuthRepository implements AuthGateway {
  final ApiClient client;
  final TokenStore tokens;

  AuthRepository({required this.client, required this.tokens});

  @override
  Future<AuthUser?> restore() async {
    final token = await tokens.read();
    if (token == null || token.isEmpty) return null;
    client.updateAuthToken(token);
    try {
      final response = await client.dio.get('/api/auth/me');
      return AuthUser.fromJson(Map<String, dynamic>.from(response.data as Map));
    } on DioException catch (error) {
      if (error.response?.statusCode == 401) {
        await logout();
        return null;
      }
      // Keep the token for a retry, but never expose protected screens offline.
      rethrow;
    }
  }

  @override
  Future<AuthUser> login(String email, String password) async {
    final response = await client.dio.post('/api/auth/login', data: {
      'email': email.trim(),
      'password': password,
    });
    final body = Map<String, dynamic>.from(response.data as Map);
    final token = body['accessToken'] as String;
    final expiry = DateTime.parse(body['expiresAtUtc'] as String);
    if (token.isEmpty || !expiry.isAfter(DateTime.now().toUtc())) {
      throw const FormatException('The server returned an expired token.');
    }
    client.updateAuthToken(token);
    try {
      final me = await client.dio.get('/api/auth/me');
      final user = AuthUser.fromJson(Map<String, dynamic>.from(me.data as Map));
      await tokens.write(token);
      return user;
    } catch (_) {
      client.clearAuthToken();
      rethrow;
    }
  }

  @override
  Future<void> logout() async {
    client.clearAuthToken();
    await tokens.clear();
  }
}

String authError(Object error) {
  if (error is DioException) {
    if (error.response?.statusCode == 401) return 'Invalid email or password.';
    if (error.response?.statusCode == 400) return 'Check your email and password.';
    return 'Could not connect to CeylonMate. Check your connection and retry.';
  }
  if (error is FormatException) return 'The server returned an invalid response.';
  return 'Authentication is unavailable. Please retry.';
}
