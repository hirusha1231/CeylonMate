import 'package:flutter/material.dart';
import 'core/auth/auth_controller.dart';
import 'core/auth/auth_repository.dart';
import 'core/auth/auth_user.dart';
import 'core/auth/token_store.dart';
import 'core/network/api_client.dart';
import 'features/guide/screens/add_condition_report_screen.dart';
import 'features/guide/screens/my_availability_screen.dart';
import 'features/guide/screens/my_reports_screen.dart';
import 'features/guide/services/guide_availability_service.dart';
import 'features/guide/services/report_service.dart';
import 'features/guide/screens/guide_profile_screen.dart';
import 'features/trips/screens/my_trips_screen.dart';
import 'features/trips/screens/trip_details_screen.dart';
import 'features/trips/screens/trip_form_screen.dart';
import 'features/trips/services/trip_service.dart';
import 'dart:ui';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(const CeylonMateApp());
}

class CeylonMateApp extends StatefulWidget {
  final ApiClient? apiClient;
  final AuthGateway? authGateway;
  final GuideAvailabilityService? guideService;

  const CeylonMateApp({
    super.key,
    this.apiClient,
    this.authGateway,
    this.guideService,
  });

  @override
  State<CeylonMateApp> createState() => _CeylonMateAppState();
}

class _CeylonMateAppState extends State<CeylonMateApp> {
  late final ApiClient _client;
  late final AuthController _auth;

  @override
  void initState() {
    super.initState();
    _client = widget.apiClient ?? ApiClient();
    _auth = AuthController(
      widget.authGateway ??
          AuthRepository(
            client: _client,
            tokens: SecureTokenStore(),
          ),
    );
    _auth.addListener(_onAuthChanged);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) _auth.initialize();
    });
  }

  void _onAuthChanged() {
    if (mounted) setState(() {});
  }

  @override
  void dispose() {
    _auth.removeListener(_onAuthChanged);
    _auth.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final trips = TripService(_client);
    final reports = ReportService(_client);

    return MaterialApp(
      title: 'CeylonMate Mobile',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        useMaterial3: true,
        colorSchemeSeed: Colors.teal,
      ),
      key: ValueKey('${_auth.phase}:${_auth.user?.id ?? ''}'),
      onGenerateRoute: (settings) {
        if (settings.name == '/trips/new') {
          return MaterialPageRoute(
            builder: (_) => TripFormScreen(service: trips),
          );
        }
        if (settings.name == '/trips/my') {
          return MaterialPageRoute(
            builder: (_) => MyTripsScreen(service: trips),
          );
        }
        if (settings.name == '/trips/details' && settings.arguments is String) {
          return MaterialPageRoute(
            builder: (_) => TripDetailsScreen(
              service: trips,
              tripId: settings.arguments! as String,
            ),
          );
        }
        if (settings.name == '/guide/report') {
          return MaterialPageRoute(
            builder: (_) => AddConditionReportScreen(service: reports),
          );
        }
        if (settings.name == '/guide/reports') {
          return MaterialPageRoute(
            builder: (_) => MyReportsScreen(service: reports),
          );
        }

        final requiredRole = switch (settings.name) {
          '/traveler' => 'TRAVELER',
          '/guide' => 'LOCAL_GUIDE',
          _ => null,
        };

        if (requiredRole == null) return null;

        return MaterialPageRoute<void>(
          settings: settings,
          builder: (_) {
            if (_auth.phase != AuthPhase.signedIn || _auth.user == null) {
              return LoginScreen(auth: _auth);
            }
            if (_auth.user!.role != requiredRole) {
              return Scaffold(
                appBar: AppBar(title: const Text('Access denied')),
                body: const Center(
                  child: Text('This route is not available for your role.'),
                ),
              );
            }
            return RoleHomeScreen(
              auth: _auth,
              user: _auth.user!,
              apiClient: _client,
              guideService: widget.guideService,
            );
          },
        );
      },
      home: switch (_auth.phase) {
        AuthPhase.checking => const Scaffold(
            body: Center(child: CircularProgressIndicator()),
          ),
        AuthPhase.error => Scaffold(
            body: Center(
              child: Padding(
                padding: const EdgeInsets.all(24),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Icon(Icons.cloud_off, size: 48),
                    const SizedBox(height: 12),
                    Text(
                      _auth.error ?? 'Unable to verify your session.',
                      textAlign: TextAlign.center,
                    ),
                    const SizedBox(height: 12),
                    FilledButton(
                      onPressed: _auth.initialize,
                      child: const Text('Retry'),
                    ),
                    TextButton(
                      onPressed: _auth.logout,
                      child: const Text('Sign out'),
                    ),
                  ],
                ),
              ),
            ),
          ),
        AuthPhase.signedOut => LoginScreen(auth: _auth),
        AuthPhase.signedIn => RoleHomeScreen(
            auth: _auth,
            user: _auth.user!,
            apiClient: _client,
            guideService: widget.guideService,
          ),
      },
    );
  }
}

class LoginScreen extends StatefulWidget {
  final AuthController auth;

  const LoginScreen({super.key, required this.auth});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _formKey = GlobalKey<FormState>();
  final _email = TextEditingController();
  final _password = TextEditingController();
  bool _obscurePassword = true;

  @override
  void dispose() {
    _email.dispose();
    _password.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    await widget.auth.login(_email.text.trim(), _password.text);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: ListenableBuilder(
        listenable: widget.auth,
        builder: (context, _) {
          return Stack(
            fit: StackFit.expand,
            children: [
              // 1. Fullscreen Sri Lanka Misty Ella Train Ride Background
              Container(
                decoration: const BoxDecoration(
                  gradient: LinearGradient(
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                    colors: [Color(0xFF0F766E), Color(0xFF134E4A), Color(0xFF042F2E)],
                  ),
                ),
                child: WidgetsBinding.instance.runtimeType.toString().contains('Test')
                    ? null
                    : Image.network(
                        'https://images.unsplash.com/photo-1546708973-b339540b5162?auto=format&fit=crop&q=80&w=1200',
                        fit: BoxFit.cover,
                        errorBuilder: (_, __, ___) => const SizedBox.shrink(),
                      ),
              ),

              // 2. Cinematic Dark Mist Vignette & Gradient Overlay
              Container(
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    begin: Alignment.topCenter,
                    end: Alignment.bottomCenter,
                    colors: [
                      Colors.black.withValues(alpha: 0.35),
                      Colors.black.withValues(alpha: 0.75),
                    ],
                  ),
                ),
              ),

              // 3. Content with Transparent Frosted Glass Card
              SafeArea(
                child: Center(
                  child: SingleChildScrollView(
                    padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 8),
                    child: ConstrainedBox(
                      constraints: const BoxConstraints(maxWidth: 420),
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          // Top App Branding
                          Container(
                            padding: const EdgeInsets.all(8),
                            decoration: BoxDecoration(
                              color: Colors.white.withValues(alpha: 0.15),
                              shape: BoxShape.circle,
                              border: Border.all(
                                color: Colors.white.withValues(alpha: 0.3),
                                width: 1.5,
                              ),
                            ),
                            child: const Icon(
                              Icons.train_outlined,
                              color: Colors.white,
                              size: 28,
                            ),
                          ),
                          const SizedBox(height: 6),
                          const Text(
                            'CeylonMate',
                            style: TextStyle(
                              fontSize: 28,
                              fontWeight: FontWeight.bold,
                              color: Colors.white,
                              letterSpacing: 1.2,
                              shadows: [
                                Shadow(
                                  color: Colors.black45,
                                  blurRadius: 10,
                                  offset: Offset(0, 2),
                                ),
                              ],
                            ),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            'Misty Hill Country & Authentic Journeys',
                            style: TextStyle(
                              fontSize: 13,
                              color: Colors.white.withValues(alpha: 0.9),
                              fontWeight: FontWeight.w400,
                            ),
                          ),
                          const SizedBox(height: 12),

                          // Frosted Transparent Glass Card (Glassmorphism)
                          ClipRRect(
                            borderRadius: BorderRadius.circular(20),
                            child: BackdropFilter(
                              filter: ImageFilter.blur(sigmaX: 16, sigmaY: 16),
                              child: Container(
                                padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
                                decoration: BoxDecoration(
                                  color: Colors.black.withValues(alpha: 0.28),
                                  borderRadius: BorderRadius.circular(20),
                                  border: Border.all(
                                    color: Colors.white.withValues(alpha: 0.22),
                                    width: 1.5,
                                  ),
                                  boxShadow: [
                                    BoxShadow(
                                      color: Colors.black.withValues(alpha: 0.25),
                                      blurRadius: 20,
                                      spreadRadius: 2,
                                    ),
                                  ],
                                ),
                                child: Form(
                                  key: _formKey,
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.stretch,
                                    children: [
                                      const Text(
                                        'Welcome Back',
                                        style: TextStyle(
                                          fontSize: 20,
                                          fontWeight: FontWeight.bold,
                                          color: Colors.white,
                                        ),
                                      ),
                                      const SizedBox(height: 2),
                                      Text(
                                        'Sign in to explore itineraries & bookings',
                                        style: TextStyle(
                                          fontSize: 12,
                                          color: Colors.white.withValues(alpha: 0.8),
                                        ),
                                      ),
                                      const SizedBox(height: 14),

                                      // Transparent Email Field
                                      TextFormField(
                                        controller: _email,
                                        keyboardType: TextInputType.emailAddress,
                                        style: const TextStyle(color: Colors.white),
                                        autofillHints: const [AutofillHints.email],
                                        decoration: InputDecoration(
                                          labelText: 'Email Address',
                                          labelStyle: TextStyle(
                                            color: Colors.white.withValues(alpha: 0.85),
                                          ),
                                          prefixIcon: const Icon(
                                            Icons.email_outlined,
                                            color: Colors.tealAccent,
                                          ),
                                          filled: true,
                                          fillColor: Colors.white.withValues(alpha: 0.12),
                                          enabledBorder: OutlineInputBorder(
                                            borderRadius: BorderRadius.circular(14),
                                            borderSide: BorderSide(
                                              color: Colors.white.withValues(alpha: 0.25),
                                            ),
                                          ),
                                          focusedBorder: OutlineInputBorder(
                                            borderRadius: BorderRadius.circular(14),
                                            borderSide: const BorderSide(
                                              color: Colors.tealAccent,
                                              width: 1.5,
                                            ),
                                          ),
                                        ),
                                        validator: (value) =>
                                            RegExp(r'^[\w\.-]+@[\w\.-]+\.\w+$')
                                                    .hasMatch(value?.trim() ?? '')
                                                ? null
                                                : 'Enter a valid email address',
                                      ),
                                      const SizedBox(height: 16),

                                      // Transparent Password Field
                                      TextFormField(
                                        controller: _password,
                                        obscureText: _obscurePassword,
                                        style: const TextStyle(color: Colors.white),
                                        autofillHints: const [AutofillHints.password],
                                        decoration: InputDecoration(
                                          labelText: 'Password',
                                          labelStyle: TextStyle(
                                            color: Colors.white.withValues(alpha: 0.85),
                                          ),
                                          prefixIcon: const Icon(
                                            Icons.lock_outline,
                                            color: Colors.tealAccent,
                                          ),
                                          filled: true,
                                          fillColor: Colors.white.withValues(alpha: 0.12),
                                          enabledBorder: OutlineInputBorder(
                                            borderRadius: BorderRadius.circular(14),
                                            borderSide: BorderSide(
                                              color: Colors.white.withValues(alpha: 0.25),
                                            ),
                                          ),
                                          focusedBorder: OutlineInputBorder(
                                            borderRadius: BorderRadius.circular(14),
                                            borderSide: const BorderSide(
                                              color: Colors.tealAccent,
                                              width: 1.5,
                                            ),
                                          ),
                                          suffixIcon: IconButton(
                                            tooltip: _obscurePassword
                                                ? 'Show password'
                                                : 'Hide password',
                                            icon: Icon(
                                              _obscurePassword
                                                  ? Icons.visibility_off
                                                  : Icons.visibility,
                                              color: Colors.white70,
                                            ),
                                            onPressed: () => setState(
                                              () => _obscurePassword = !_obscurePassword,
                                            ),
                                          ),
                                        ),
                                        validator: (value) =>
                                            value == null || value.isEmpty
                                                ? 'Enter your password'
                                                : null,
                                        onFieldSubmitted: (_) => _submit(),
                                      ),

                                      if (widget.auth.error != null) ...[
                                        const SizedBox(height: 14),
                                        Container(
                                          padding: const EdgeInsets.all(10),
                                          decoration: BoxDecoration(
                                            color: Colors.red.withValues(alpha: 0.35),
                                            borderRadius: BorderRadius.circular(10),
                                            border: Border.all(
                                              color: Colors.redAccent.shade100,
                                            ),
                                          ),
                                          child: Text(
                                            widget.auth.error!,
                                            style: const TextStyle(
                                              color: Colors.white,
                                              fontSize: 13,
                                              fontWeight: FontWeight.w500,
                                            ),
                                          ),
                                        ),
                                      ],

                                      const SizedBox(height: 24),

                                      // Vibrant Sign In Button
                                      SizedBox(
                                        height: 52,
                                        child: FilledButton(
                                          style: FilledButton.styleFrom(
                                            backgroundColor: const Color(0xFF0F766E),
                                            foregroundColor: Colors.white,
                                            elevation: 4,
                                            shape: RoundedRectangleBorder(
                                              borderRadius: BorderRadius.circular(14),
                                            ),
                                          ),
                                          onPressed: widget.auth.busy ? null : _submit,
                                          child: widget.auth.busy
                                              ? const SizedBox(
                                                  height: 22,
                                                  width: 22,
                                                  child: CircularProgressIndicator(
                                                    strokeWidth: 2,
                                                    color: Colors.white,
                                                  ),
                                                )
                                              : const Text(
                                                  'Sign in',
                                                  style: TextStyle(
                                                    fontSize: 16,
                                                    fontWeight: FontWeight.bold,
                                                    letterSpacing: 0.5,
                                                  ),
                                                ),
                                        ),
                                      ),
                                      const SizedBox(height: 16),

                                      // Register Link
                                      Wrap(
                                        alignment: WrapAlignment.center,
                                        crossAxisAlignment: WrapCrossAlignment.center,
                                        children: [
                                          Text(
                                            "Don't have an account?",
                                            style: TextStyle(
                                              color: Colors.white.withValues(alpha: 0.8),
                                              fontSize: 13,
                                            ),
                                          ),
                                          TextButton(
                                            onPressed: widget.auth.busy
                                                ? null
                                                : () {
                                                    widget.auth.error = null;
                                                    Navigator.of(context).push(
                                                      MaterialPageRoute(
                                                        builder: (_) =>
                                                            RegisterScreen(auth: widget.auth),
                                                      ),
                                                    );
                                                  },
                                            child: const Text(
                                              'Sign up',
                                              style: TextStyle(
                                                color: Colors.tealAccent,
                                                fontWeight: FontWeight.bold,
                                                fontSize: 13,
                                              ),
                                            ),
                                          ),
                                        ],
                                      ),
                                    ],
                                  ),
                                ),
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              ),
            ],
          );
        },
      ),
    );
  }
}

class RegisterScreen extends StatefulWidget {
  final AuthController auth;

  const RegisterScreen({super.key, required this.auth});

  @override
  State<RegisterScreen> createState() => _RegisterScreenState();
}

class _RegisterScreenState extends State<RegisterScreen> {
  final _formKey = GlobalKey<FormState>();
  final _fullName = TextEditingController();
  final _email = TextEditingController();
  final _phone = TextEditingController();
  final _password = TextEditingController();
  final _confirmPassword = TextEditingController();

  String _role = 'TRAVELER';
  bool _obscurePassword = true;
  bool _obscureConfirmPassword = true;

  @override
  void dispose() {
    _fullName.dispose();
    _email.dispose();
    _phone.dispose();
    _password.dispose();
    _confirmPassword.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    final success = await widget.auth.register(
      email: _email.text.trim(),
      password: _password.text,
      fullName: _fullName.text.trim().isEmpty ? null : _fullName.text.trim(),
      phoneNumber: _phone.text.trim().isEmpty ? null : _phone.text.trim(),
      role: _role,
    );
    if (success && mounted) {
      if (Navigator.of(context).canPop()) {
        Navigator.of(context).pop();
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('CeylonMate')),
      body: ListenableBuilder(
        listenable: widget.auth,
        builder: (context, _) {
          return Center(
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 440),
              child: Form(
                key: _formKey,
                child: SingleChildScrollView(
                  padding: const EdgeInsets.all(24),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      const Icon(Icons.person_add_outlined, size: 52),
                      const SizedBox(height: 12),
                      Text(
                        'Create Account',
                        style: Theme.of(context).textTheme.headlineMedium,
                        textAlign: TextAlign.center,
                      ),
                      const SizedBox(height: 6),
                      Text(
                        'Join CeylonMate as a traveler or guide',
                        style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                              color: Theme.of(context).colorScheme.onSurfaceVariant,
                            ),
                        textAlign: TextAlign.center,
                      ),
                      const SizedBox(height: 20),
                      SegmentedButton<String>(
                        segments: const [
                          ButtonSegment<String>(
                            value: 'TRAVELER',
                            label: Text('Traveler'),
                            icon: Icon(Icons.flight_takeoff),
                          ),
                          ButtonSegment<String>(
                            value: 'LOCAL_GUIDE',
                            label: Text('Local Guide'),
                            icon: Icon(Icons.explore),
                          ),
                        ],
                        selected: {_role},
                        onSelectionChanged: widget.auth.busy
                            ? null
                            : (newSelection) {
                                setState(() {
                                  _role = newSelection.first;
                                });
                              },
                      ),
                      const SizedBox(height: 16),
                      TextFormField(
                        controller: _fullName,
                        textCapitalization: TextCapitalization.words,
                        autofillHints: const [AutofillHints.name],
                        decoration: const InputDecoration(
                          labelText: 'Full Name (Optional)',
                          prefixIcon: Icon(Icons.person_outline),
                        ),
                        validator: (value) {
                          final trimmed = value?.trim() ?? '';
                          if (trimmed.isNotEmpty &&
                              RegExp(r'\d').hasMatch(trimmed)) {
                            return 'Full Name must contain letters only';
                          }
                          return null;
                        },
                      ),
                      const SizedBox(height: 12),
                      TextFormField(
                        controller: _email,
                        keyboardType: TextInputType.emailAddress,
                        autofillHints: const [AutofillHints.email],
                        decoration: const InputDecoration(
                          labelText: 'Email',
                          prefixIcon: Icon(Icons.email_outlined),
                        ),
                        validator: (value) =>
                            RegExp(r'^[\w\.-]+@[\w\.-]+\.\w+$')
                                    .hasMatch(value?.trim() ?? '')
                                ? null
                                : 'Enter a valid email address',
                      ),
                      const SizedBox(height: 12),
                      TextFormField(
                        controller: _phone,
                        keyboardType: TextInputType.phone,
                        autofillHints: const [AutofillHints.telephoneNumber],
                        decoration: const InputDecoration(
                          labelText: 'Phone Number (Optional)',
                          prefixIcon: Icon(Icons.phone_outlined),
                        ),
                        validator: (value) {
                          final trimmed = value?.trim() ?? '';
                          if (trimmed.isNotEmpty &&
                              RegExp(r'[a-zA-Z]').hasMatch(trimmed)) {
                            return 'Phone Number must contain numbers only';
                          }
                          return null;
                        },
                      ),
                      const SizedBox(height: 12),
                      TextFormField(
                        controller: _password,
                        obscureText: _obscurePassword,
                        autofillHints: const [AutofillHints.newPassword],
                        decoration: InputDecoration(
                          labelText: 'Password',
                          prefixIcon: const Icon(Icons.lock_outline),
                          helperText: 'Minimum 6 characters',
                          suffixIcon: IconButton(
                            tooltip: _obscurePassword
                                ? 'Show password'
                                : 'Hide password',
                            icon: Icon(
                              _obscurePassword
                                  ? Icons.visibility
                                  : Icons.visibility_off,
                            ),
                            onPressed: () => setState(
                              () => _obscurePassword = !_obscurePassword,
                            ),
                          ),
                        ),
                        validator: (value) {
                          if (value == null || value.isEmpty) {
                            return 'Enter your password';
                          }
                          if (value.length < 6) {
                            return 'Password must be at least 6 characters';
                          }
                          return null;
                        },
                      ),
                      const SizedBox(height: 12),
                      TextFormField(
                        controller: _confirmPassword,
                        obscureText: _obscureConfirmPassword,
                        autofillHints: const [AutofillHints.newPassword],
                        decoration: InputDecoration(
                          labelText: 'Confirm Password',
                          prefixIcon: const Icon(Icons.lock_reset_outlined),
                          suffixIcon: IconButton(
                            tooltip: _obscureConfirmPassword
                                ? 'Show password'
                                : 'Hide password',
                            icon: Icon(
                              _obscureConfirmPassword
                                  ? Icons.visibility
                                  : Icons.visibility_off,
                            ),
                            onPressed: () => setState(
                              () => _obscureConfirmPassword =
                                  !_obscureConfirmPassword,
                            ),
                          ),
                        ),
                        validator: (value) {
                          if (value == null || value.isEmpty) {
                            return 'Confirm your password';
                          }
                          if (value != _password.text) {
                            return 'Passwords do not match';
                          }
                          return null;
                        },
                        onFieldSubmitted: (_) => _submit(),
                      ),
                      if (widget.auth.error != null) ...[
                        const SizedBox(height: 14),
                        Container(
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            color: Theme.of(context).colorScheme.errorContainer,
                            borderRadius: BorderRadius.circular(10),
                          ),
                          child: Row(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Icon(
                                Icons.error_outline,
                                color: Theme.of(context).colorScheme.error,
                                size: 20,
                              ),
                              const SizedBox(width: 8),
                              Expanded(
                                child: Text(
                                  widget.auth.error!,
                                  style: TextStyle(
                                    color: Theme.of(context)
                                        .colorScheme
                                        .onErrorContainer,
                                    fontSize: 13,
                                    fontWeight: FontWeight.w500,
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                      const SizedBox(height: 24),
                      FilledButton(
                        onPressed: widget.auth.busy ? null : _submit,
                        child: widget.auth.busy
                            ? const SizedBox(
                                height: 20,
                                width: 20,
                                child: CircularProgressIndicator(strokeWidth: 2),
                              )
                            : const Text('Create Account'),
                      ),
                      const SizedBox(height: 16),
                      Wrap(
                        alignment: WrapAlignment.center,
                        crossAxisAlignment: WrapCrossAlignment.center,
                        children: [
                          Text(
                            'Already have an account? ',
                            style: TextStyle(
                              color:
                                  Theme.of(context).colorScheme.onSurfaceVariant,
                            ),
                          ),
                          TextButton(
                            onPressed: widget.auth.busy
                                ? null
                                : () {
                                    widget.auth.error = null;
                                    Navigator.of(context).pop();
                                  },
                            child: const Text('Sign in'),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ),
            ),
          );
        },
      ),
    );
  }
}

class RoleHomeScreen extends StatelessWidget {
  final AuthController auth;
  final AuthUser user;
  final ApiClient? apiClient;
  final GuideAvailabilityService? guideService;

  const RoleHomeScreen({
    super.key,
    required this.auth,
    required this.user,
    this.apiClient,
    this.guideService,
  });

  @override
  Widget build(BuildContext context) {
    final roleLabel = switch (user.role) {
      'TRAVELER' => 'Traveler',
      'LOCAL_GUIDE' => 'Local Guide',
      _ => 'Unsupported role',
    };

    final client = apiClient ?? ApiClient();

    return Scaffold(
      appBar: AppBar(
        title: Text('$roleLabel Home'),
        actions: [
          IconButton(
            tooltip: 'Logout',
            onPressed: auth.busy ? null : auth.logout,
            icon: const Icon(Icons.logout),
          ),
        ],
      ),
      body: Center(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(
                user.role == 'LOCAL_GUIDE' ? Icons.hiking : Icons.explore,
                size: 56,
                color: Theme.of(context).colorScheme.primary,
              ),
              const SizedBox(height: 16),
              Text(
                'Welcome, ${user.email}',
                style: Theme.of(context).textTheme.titleLarge,
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 8),
              Text(
                user.role == 'TRAVELER'
                    ? 'Your traveler workspace is ready.'
                    : user.role == 'LOCAL_GUIDE'
                        ? 'Your local guide workspace is ready.'
                        : 'This mobile shell does not support ${user.role} yet.',
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 24),

              // Traveler UI Actions (Member 1)
              if (user.role == 'TRAVELER') ...[
                ConstrainedBox(
                  constraints: const BoxConstraints(maxWidth: 320),
                  child: Column(
                    children: [
                      SizedBox(
                        width: double.infinity,
                        height: 50,
                        child: ElevatedButton.icon(
                          icon: const Icon(Icons.add_location_alt),
                          label: const Text('Create Trip Request'),
                          onPressed: () {
                            Navigator.of(context).push(
                              MaterialPageRoute(
                                builder: (_) => TripFormScreen(
                                  service: TripService(client),
                                ),
                              ),
                            );
                          },
                        ),
                      ),
                      const SizedBox(height: 12),
                      SizedBox(
                        width: double.infinity,
                        height: 48,
                        child: ElevatedButton.icon(
                          icon: const Icon(Icons.list_alt),
                          label: const Text('My Trips'),
                          onPressed: () {
                            Navigator.of(context).push(
                              MaterialPageRoute(
                                builder: (_) => MyTripsScreen(
                                  service: TripService(client),
                                ),
                              ),
                            );
                          },
                        ),
                      ),
                    ],
                  ),
                ),
              ],

              // Local Guide UI Actions (Member 2 & Member 3)
              if (user.role == 'LOCAL_GUIDE') ...[
                ConstrainedBox(
                  constraints: const BoxConstraints(maxWidth: 320),
                  child: Column(
                    children: [
                      SizedBox(
                        width: double.infinity,
                        height: 50,
                        child: ElevatedButton.icon(
                          style: ElevatedButton.styleFrom(
                            backgroundColor: const Color(0xFF0F766E),
                            foregroundColor: Colors.white,
                            elevation: 2,
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(12),
                            ),
                          ),
                          icon: const Icon(Icons.calendar_month),
                          label: const Text(
                            'Manage My Availability',
                            style: TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                          onPressed: () {
                            final service = guideService ??
                                GuideAvailabilityService(apiClient: client);
                            Navigator.push(
                              context,
                              MaterialPageRoute(
                                builder: (_) => MyAvailabilityScreen(
                                  guideId: user.id,
                                  service: service,
                                ),
                              ),
                            );
                          },
                        ),
                      ),
                      const SizedBox(height: 12),
                      SizedBox(
                        width: double.infinity,
                        height: 48,
                        child: OutlinedButton.icon(
                          style: OutlinedButton.styleFrom(
                            foregroundColor: const Color(0xFF0F766E),
                            side: const BorderSide(
                              color: Color(0xFF0F766E),
                              width: 1.5,
                            ),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(12),
                            ),
                          ),
                          icon: const Icon(Icons.assignment_turned_in),
                          label: const Text(
                            'Condition Reports',
                            style: TextStyle(
                              fontSize: 15,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                          onPressed: () {
                            Navigator.push(
                              context,
                              MaterialPageRoute(
                                builder: (_) => MyReportsScreen(
                                  service: ReportService(client),
                                ),
                              ),
                            );
                          },
                        ),
                      ),
                      const SizedBox(height: 12),
                      SizedBox(
                        width: double.infinity,
                        height: 48,
                        child: OutlinedButton.icon(
                          icon: const Icon(Icons.report_problem_outlined),
                          label: const Text('Add Condition Report'),
                          onPressed: () {
                            Navigator.of(context).push(
                              MaterialPageRoute(
                                builder: (_) => AddConditionReportScreen(
                                  service: ReportService(client),
                                ),
                              ),
                            );
                          },
                        ),
                      ),
                      const SizedBox(height: 12),
                      SizedBox(
                        width: double.infinity,
                        height: 48,
                        child: OutlinedButton.icon(
                          icon: const Icon(Icons.person_pin),
                          label: const Text('Guide Profile Setup'),
                          onPressed: () {
                            Navigator.of(context).push(
                              MaterialPageRoute(
                                builder: (_) => GuideProfileScreen(
                                  apiClient: client,
                                ),
                              ),
                            );
                          },
                        ),
                      ),
                    ],
                  ),
                ),
              ],

              if (auth.error != null) ...[
                const SizedBox(height: 12),
                Text(
                  auth.error!,
                  style: TextStyle(
                    color: Theme.of(context).colorScheme.error,
                  ),
                ),
              ],
              if (auth.busy)
                const Padding(
                  padding: EdgeInsets.only(top: 16),
                  child: CircularProgressIndicator(),
                ),
            ],
          ),
        ),
      ),
    );
  }
}