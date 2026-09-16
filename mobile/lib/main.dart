import 'package:flutter/material.dart';
import 'core/auth/auth_controller.dart';
import 'core/auth/auth_repository.dart';
import 'core/auth/auth_user.dart';
import 'core/auth/token_store.dart';
import 'core/network/api_client.dart';
import 'features/guide/services/guide_availability_service.dart';
import 'features/traveler/widgets/resource_feasibility_view.dart';
import 'core/network/api_client.dart';
import 'features/trips/screens/my_trips_screen.dart';
import 'features/trips/screens/trip_details_screen.dart';
import 'features/trips/screens/trip_form_screen.dart';
import 'features/trips/services/trip_service.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(const CeylonMateApp());
}

class CeylonMateApp extends StatefulWidget {
  // Injectable seams keep the shell testable and let feature screens share the token.
  final ApiClient? apiClient;
  final AuthGateway? authGateway;
  final GuideAvailabilityService? guideService;
  final ApiClient? apiClient;

  const CeylonMateApp({super.key, this.apiClient, this.authGateway, this.guideService});

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
    _auth = AuthController(widget.authGateway ?? AuthRepository(
      client: _client,
      tokens: SecureTokenStore(),
    ));
    _auth.addListener(_onAuthChanged);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) _auth.initialize();
    });
  const CeylonMateApp({super.key, this.guideService, this.apiClient});

  @override
  Widget build(BuildContext context) {
    final trips = TripService(apiClient ?? ApiClient());
    return MaterialApp(
      title: 'CeylonMate Mobile',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        useMaterial3: true,
        colorSchemeSeed: Colors.teal,
      ),
      home: Member3HomeShell(guideService: guideService, apiClient: apiClient),
      onGenerateRoute: (settings) {
        if (settings.name == '/trips/new') {
          return MaterialPageRoute(builder: (_) => TripFormScreen(service: trips));
        }
        if (settings.name == '/trips/details' && settings.arguments is String) {
          return MaterialPageRoute(builder: (_) => TripDetailsScreen(
            service: trips, tripId: settings.arguments! as String));
        }
        return null;
      },
    );
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
  Widget build(BuildContext context) => MaterialApp(
    title: 'CeylonMate Mobile',
    debugShowCheckedModeBanner: false,
    theme: ThemeData(useMaterial3: true, colorSchemeSeed: Colors.teal),
    // Recreate the navigator when auth changes so protected routes cannot
    // remain in the back stack after logout or account switching.
    key: ValueKey('${_auth.phase}:${_auth.user?.id ?? ''}'),
    onGenerateRoute: (settings) {
      final requiredRole = switch (settings.name) {
        '/traveler' => 'TRAVELER',
        '/guide' => 'LOCAL_GUIDE',
        _ => null,
      };
      if (requiredRole == null) return null;
      return MaterialPageRoute<void>(settings: settings, builder: (_) {
        if (_auth.phase != AuthPhase.signedIn || _auth.user == null) {
          return LoginScreen(auth: _auth);
        }
        if (_auth.user!.role != requiredRole) {
          return Scaffold(appBar: AppBar(title: const Text('Access denied')),
            body: const Center(child: Text('This route is not available for your role.')));
        }
        return RoleHomeScreen(auth: _auth, user: _auth.user!);
      });
    },
    home: switch (_auth.phase) {
      AuthPhase.checking => const Scaffold(
          body: Center(child: CircularProgressIndicator())),
      AuthPhase.error => Scaffold(
          body: Center(child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(mainAxisSize: MainAxisSize.min, children: [
              const Icon(Icons.cloud_off, size: 48),
              const SizedBox(height: 12),
              Text(_auth.error ?? 'Unable to verify your session.',
                textAlign: TextAlign.center),
              const SizedBox(height: 12),
              FilledButton(onPressed: _auth.initialize, child: const Text('Retry')),
              TextButton(onPressed: _auth.logout, child: const Text('Sign out')),
            ]),
          )),
        ),
      AuthPhase.signedOut => LoginScreen(auth: _auth),
      AuthPhase.signedIn => RoleHomeScreen(auth: _auth, user: _auth.user!),
    },
  );
}

class LoginScreen extends StatefulWidget {
  final AuthController auth;

  const LoginScreen({super.key, required this.auth});
class Member3HomeShell extends StatefulWidget {
  final GuideAvailabilityService? guideService;
  final ApiClient? apiClient;

  const Member3HomeShell({super.key, this.guideService, this.apiClient});

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
    await widget.auth.login(_email.text, _password.text);
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: const Text('CeylonMate')),
    body: Center(child: ConstrainedBox(
      constraints: const BoxConstraints(maxWidth: 420),
      child: Form(
        key: _formKey,
        child: ListView(shrinkWrap: true, padding: const EdgeInsets.all(24), children: [
          const Icon(Icons.travel_explore, size: 56),
          const SizedBox(height: 16),
          Text('Sign in', style: Theme.of(context).textTheme.headlineMedium,
            textAlign: TextAlign.center),
          const SizedBox(height: 24),
          TextFormField(
            controller: _email,
            keyboardType: TextInputType.emailAddress,
            autofillHints: const [AutofillHints.email],
            decoration: const InputDecoration(labelText: 'Email'),
            validator: (value) => RegExp(r'^[^\s@]+@[^\s@]+\.[^\s@]+$')
                .hasMatch(value?.trim() ?? '') ? null : 'Enter a valid email',
          ),
          const SizedBox(height: 12),
          TextFormField(
            controller: _password,
            obscureText: _obscurePassword,
            autofillHints: const [AutofillHints.password],
            decoration: InputDecoration(
              labelText: 'Password',
              suffixIcon: IconButton(
                tooltip: _obscurePassword ? 'Show password' : 'Hide password',
                icon: Icon(_obscurePassword ? Icons.visibility : Icons.visibility_off),
                onPressed: () => setState(() => _obscurePassword = !_obscurePassword),
              ),
            ),
            validator: (value) => value == null || value.isEmpty
                ? 'Enter your password' : null,
            onFieldSubmitted: (_) => _submit(),
          ),
          if (widget.auth.error != null) ...[
            const SizedBox(height: 12),
            Text(widget.auth.error!,
              style: TextStyle(color: Theme.of(context).colorScheme.error)),
          ],
          const SizedBox(height: 24),
          FilledButton(
            onPressed: widget.auth.busy ? null : _submit,
            child: widget.auth.busy
                ? const SizedBox(height: 20, width: 20,
                    child: CircularProgressIndicator(strokeWidth: 2))
                : const Text('Sign in'),
          ),
        ]),
          if (_selectedIndex == 2)
            MyTripsScreen(service: TripService(widget.apiClient ?? ApiClient())),
        ],
      ),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _selectedIndex,
        onDestinationSelected: (index) {
          setState(() => _selectedIndex = index);
        },
        destinations: const [
          NavigationDestination(
            icon: Icon(Icons.event_available),
            selectedIcon: Icon(Icons.event_available, color: Colors.teal),
            label: 'Local Guide',
          ),
          NavigationDestination(
            icon: Icon(Icons.explore_outlined),
            selectedIcon: Icon(Icons.explore, color: Colors.teal),
            label: 'Traveler View',
          ),
          NavigationDestination(
            icon: Icon(Icons.luggage_outlined),
            selectedIcon: Icon(Icons.luggage, color: Colors.teal),
            label: 'My Trips',
          ),
        ],
      ),
    )),
  );
}

class RoleHomeScreen extends StatelessWidget {
  final AuthController auth;
  final AuthUser user;

  const RoleHomeScreen({super.key, required this.auth, required this.user});

  @override
  Widget build(BuildContext context) {
    final roleLabel = switch (user.role) {
      'TRAVELER' => 'Traveler',
      'LOCAL_GUIDE' => 'Local Guide',
      _ => 'Unsupported role',
    };
    return Scaffold(
      appBar: AppBar(title: Text('$roleLabel Home'), actions: [
        IconButton(
          tooltip: 'Logout',
          onPressed: auth.busy ? null : auth.logout,
          icon: const Icon(Icons.logout),
        ),
      ]),
      body: Center(child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(mainAxisSize: MainAxisSize.min, children: [
          Icon(user.role == 'LOCAL_GUIDE' ? Icons.hiking : Icons.explore,
            size: 56, color: Theme.of(context).colorScheme.primary),
          const SizedBox(height: 16),
          Text('Welcome, ${user.email}',
            style: Theme.of(context).textTheme.titleLarge,
            textAlign: TextAlign.center),
          const SizedBox(height: 8),
          Text(user.role == 'TRAVELER'
              ? 'Your traveler workspace is ready.'
              : user.role == 'LOCAL_GUIDE'
                  ? 'Your local guide workspace is ready.'
                  : 'This mobile shell does not support ${user.role} yet.',
            textAlign: TextAlign.center),
          if (auth.error != null) ...[
            const SizedBox(height: 12),
            Text(auth.error!, style: TextStyle(color: Theme.of(context).colorScheme.error)),
          ],
          if (auth.busy) const Padding(
            padding: EdgeInsets.only(top: 16), child: CircularProgressIndicator()),
        ]),
      )),
    );
  }
}
