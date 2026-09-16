import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../models/trip.dart';
import '../services/trip_service.dart';
import 'trip_details_screen.dart';
import 'trip_form_screen.dart';

class MyTripsScreen extends StatefulWidget {
  final TripService service;

  const MyTripsScreen({super.key, required this.service});

  @override
  State<MyTripsScreen> createState() => _MyTripsScreenState();
}

class _MyTripsScreenState extends State<MyTripsScreen> {
  TripPage? _page;
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load(1);
  }

  Future<void> _load(int page) async {
    setState(() { _loading = true; _error = null; });
    try {
      final result = await widget.service.myTrips(page: page);
      if (mounted) setState(() => _page = result);
    } catch (error) {
      if (mounted) setState(() => _error = tripError(error));
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _create() async {
    final saved = await Navigator.push<Trip>(context,
      MaterialPageRoute(builder: (_) => TripFormScreen(service: widget.service)));
    if (saved != null) _load(1);
  }

  Future<void> _open(Trip trip) async {
    await Navigator.push<void>(context,
      MaterialPageRoute(builder: (_) => TripDetailsScreen(
        service: widget.service, tripId: trip.id)));
    _load(_page?.page ?? 1);
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: const Text('My Trips'), actions: [
      IconButton(onPressed: () => _load(_page?.page ?? 1),
        icon: const Icon(Icons.refresh), tooltip: 'Refresh trips'),
    ]),
    floatingActionButton: FloatingActionButton.extended(
      onPressed: _create, icon: const Icon(Icons.add), label: const Text('Create Trip')),
    body: _loading
        ? const Center(child: CircularProgressIndicator())
        : _error != null
            ? Center(child: Column(mainAxisSize: MainAxisSize.min, children: [
                Text(_error!, textAlign: TextAlign.center),
                const SizedBox(height: 8),
                OutlinedButton(onPressed: () => _load(_page?.page ?? 1),
                  child: const Text('Retry')),
              ]))
            : _page!.items.isEmpty
                ? Center(child: Column(mainAxisSize: MainAxisSize.min, children: [
                    const Icon(Icons.luggage_outlined, size: 56),
                    const SizedBox(height: 8),
                    const Text('No trip requests yet'),
                    TextButton(onPressed: _create, child: const Text('Create your first trip')),
                  ]))
                : RefreshIndicator(
                    onRefresh: () => _load(_page!.page),
                    child: ListView.builder(
                      itemCount: _page!.items.length + 1,
                      itemBuilder: (context, index) {
                        if (index == _page!.items.length) {
                          return Row(mainAxisAlignment: MainAxisAlignment.center, children: [
                            TextButton(onPressed: _page!.page > 1
                                ? () => _load(_page!.page - 1) : null,
                              child: const Text('Previous')),
                            Text('Page ${_page!.page}'),
                            TextButton(onPressed: _page!.page * 20 < _page!.totalCount
                                ? () => _load(_page!.page + 1) : null,
                              child: const Text('Next')),
                          ]);
                        }
                        final trip = _page!.items[index];
                        return Card(child: ListTile(
                          title: Text(trip.objective, maxLines: 2,
                            overflow: TextOverflow.ellipsis),
                          subtitle: Text('${DateFormat.yMMMd().format(trip.startDate)} – '
                              '${DateFormat.yMMMd().format(trip.endDate)} · ${trip.status.replaceAll('_', ' ')}'),
                          trailing: const Icon(Icons.chevron_right),
                          onTap: () => _open(trip),
                        ));
                      },
                    ),
                  ),
  );
}
