import 'package:dio/dio.dart';
import '../network/api_client.dart';
import 'auth_user.dart';
import 'token_store.dart';

abstract class AuthGateway {
  Future<AuthUser?> restore();
  Future<AuthUser> login(String email, String password);
  Future<AuthUser> register({
    required String email,
    required String password,
    String? fullName,
    String? phoneNumber,
    String role,
  });
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
  Future<AuthUser> register({
    required String email,
    required String password,
    String? fullName,
    String? phoneNumber,
    String role = 'TRAVELER',
  }) async {
    final response = await client.dio.post('/api/auth/register', data: {
      'email': email.trim(),
      'password': password,
      if (fullName != null && fullName.trim().isNotEmpty) 'fullName': fullName.trim(),
      if (phoneNumber != null && phoneNumber.trim().isNotEmpty) 'phoneNumber': phoneNumber.trim(),
      'role': role,
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
    if (error.response?.statusCode == 409) return 'An account with this email already exists.';
    if (error.response?.statusCode == 401) return 'Invalid email or password.';
    if (error.response?.statusCode == 400) {
      final data = error.response?.data;
      if (data is Map) {
        if (data['errors'] is Map) {
          final errors = data['errors'] as Map;
          final firstError = errors.values.first;
          if (firstError is List && firstError.isNotEmpty) {
            return firstError.first.toString();
          }
        }
        if (data['title'] is String) return data['title'] as String;
        if (data['message'] is String) return data['message'] as String;
      }
      return 'Check your email, password, and input fields.';
    }
    return 'Could not connect to CeylonMate. Check your connection and retry.';
  }
  if (error is FormatException) return 'The server returned an invalid response.';
  return 'Authentication is unavailable. Please retry.';
}
