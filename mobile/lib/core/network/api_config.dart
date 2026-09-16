class ApiConfig {
  static const String baseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'http://localhost:5084',
  );

  static const Duration timeout = Duration(seconds: 15);
}
