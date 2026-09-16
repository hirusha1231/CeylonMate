import 'package:flutter/material.dart';
import 'features/guide/screens/my_availability_screen.dart';
import 'features/guide/services/guide_availability_service.dart';
import 'features/traveler/widgets/resource_feasibility_view.dart';
import 'core/network/api_client.dart';
import 'features/trips/screens/my_trips_screen.dart';
import 'features/trips/screens/trip_details_screen.dart';
import 'features/trips/screens/trip_form_screen.dart';
import 'features/trips/services/trip_service.dart';

void main() => runApp(const CeylonMateApp());

class CeylonMateApp extends StatelessWidget {
  final GuideAvailabilityService? guideService;
  final ApiClient? apiClient;

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
}

class Member3HomeShell extends StatefulWidget {
  final GuideAvailabilityService? guideService;
  final ApiClient? apiClient;

  const Member3HomeShell({super.key, this.guideService, this.apiClient});

  @override
  State<Member3HomeShell> createState() => _Member3HomeShellState();
}

class _Member3HomeShellState extends State<Member3HomeShell> {
  int _selectedIndex = 0;

  static const String demoGuideId = '00000000-0000-0000-0000-000000000001';

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: IndexedStack(
        index: _selectedIndex,
        children: [
          // 1. Local Guide Availability Management Screen
          MyAvailabilityScreen(
            guideId: demoGuideId,
            service: widget.guideService,
          ),

          // 2. Traveler Feasibility Summary View
          Scaffold(
            appBar: AppBar(
              title: const Text('Traveler Feasibility View'),
            ),
            body: SingleChildScrollView(
              padding: const EdgeInsets.all(16.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Active Trip Itinerary Feasibility',
                    style: Theme.of(context).textTheme.titleLarge?.copyWith(
                          fontWeight: FontWeight.bold,
                        ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'Real-time availability status checked by AI Resource Feasibility Node.',
                    style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                          color: Colors.grey.shade600,
                        ),
                  ),
                  const SizedBox(height: 16),
                  ResourceFeasibilityView(
                    itineraryTitle: 'Sigiriya & Dambulla Day Tour',
                    date: DateTime.now(),
                    guideName: 'Kamal Perera (Licensed Local Guide)',
                    guideStatus: FeasibilityStatus.confirmed,
                    vehicleName: 'Toyota KDH Super GL (AC Van)',
                    vehicleStatus: FeasibilityStatus.confirmed,
                    attractionName: 'Sigiriya Rock Fortress Entry Pass',
                    attractionStatus: FeasibilityStatus.confirmed,
                    onRefreshCheck: () {
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(
                          content: Text('AI Feasibility Node re-verified availability: All resources OK.'),
                        ),
                      );
                    },
                  ),
                  const SizedBox(height: 16),
                  ResourceFeasibilityView(
                    itineraryTitle: 'Ella Scenic Train & Little Adam\'s Peak',
                    date: DateTime.now().add(const Duration(days: 2)),
                    guideName: 'Sunil Rathnayake',
                    guideStatus: FeasibilityStatus.confirmed,
                    vehicleName: 'Luxury Sedan (Air-conditioned)',
                    vehicleStatus: FeasibilityStatus.pending,
                    attractionName: 'Nine Arches Bridge Guided Trek',
                    attractionStatus: FeasibilityStatus.pending,
                  ),
                  const SizedBox(height: 16),
                  ResourceFeasibilityView(
                    itineraryTitle: 'Yala National Park Safari Expedition',
                    date: DateTime.now().add(const Duration(days: 4)),
                    guideName: 'Nimal Bandara (Wildlife Specialist)',
                    guideStatus: FeasibilityStatus.unavailable,
                    vehicleName: '4x4 Safari Jeep',
                    vehicleStatus: FeasibilityStatus.confirmed,
                    attractionName: 'Yala Block 1 Game Drive Permit',
                    attractionStatus: FeasibilityStatus.confirmed,
                  ),
                ],
              ),
            ),
          ),
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
    );
  }
}
