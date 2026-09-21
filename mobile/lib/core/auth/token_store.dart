import 'package:flutter_secure_storage/flutter_secure_storage.dart';

abstract class TokenStore {
  Future<String?> read();
  Future<void> write(String token);
  Future<void> clear();
}

class SecureTokenStore implements TokenStore {
  static const _key = 'ceylonmate.jwt.access_token';
  final FlutterSecureStorage storage;

  SecureTokenStore({FlutterSecureStorage? storage})
      : storage = storage ?? const FlutterSecureStorage();

  @override
  Future<String?> read() => storage.read(key: _key);

  @override
  Future<void> write(String token) => storage.write(key: _key, value: token);

  @override
  Future<void> clear() => storage.delete(key: _key);
}
