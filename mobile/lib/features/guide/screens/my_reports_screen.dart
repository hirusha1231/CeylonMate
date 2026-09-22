import 'package:flutter/material.dart';
import '../models/guide_report.dart';
import '../services/report_service.dart';
import 'add_condition_report_screen.dart';

class MyReportsScreen extends StatefulWidget {
  final ReportService service;

  const MyReportsScreen({super.key, required this.service});

  @override
  State<MyReportsScreen> createState() => _MyReportsScreenState();
}

class _MyReportsScreenState extends State<MyReportsScreen> {
  List<GuideReport> _reports = [];
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _loadReports();
  }

  Future<void> _loadReports() async {
    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      final dests = await widget.service.getDestinations();
      final allReports = <GuideReport>[];
      for (final d in dests) {
        final id = d['id'] as String?;
        if (id != null) {
          final reps = await widget.service.getReportsForDestination(id);
          allReports.addAll(reps);
        }
      }
      setState(() {
        _reports = allReports;
        _loading = false;
      });
    } catch (e) {
      setState(() {
        _error = 'Failed to load reports: $e';
        _loading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Guide Condition Reports'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _loadReports,
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () async {
          final res = await Navigator.push(
            context,
            MaterialPageRoute(
              builder: (_) => AddConditionReportScreen(service: widget.service),
            ),
          );
          if (res == true) _loadReports();
        },
        icon: const Icon(Icons.add_location_alt),
        label: const Text('New Report'),
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
              ? Center(child: Text(_error!, style: const TextStyle(color: Colors.red)))
              : _reports.isEmpty
                  ? const Center(child: Text('No reports submitted yet. Tap + to add one.'))
                  : ListView.builder(
                      padding: const EdgeInsets.all(16),
                      itemCount: _reports.length,
                      itemBuilder: (context, index) {
                        final r = _reports[index];
                        return Card(
                          margin: const EdgeInsets.only(bottom: 12),
                          child: ListTile(
                            leading: Icon(
                              r.reportType == 'CLOSURE' ? Icons.block : Icons.warning_amber,
                              color: r.reportType == 'CLOSURE' ? Colors.red : Colors.orange,
                            ),
                            title: Text(r.message),
                            subtitle: Text(
                              'Type: ${r.reportType} | Status: ${r.status}\nReported: ${r.reportedAtUtc.toLocal()}',
                            ),
                            isThreeLine: true,
                          ),
                        );
                      },
                    ),
    );
  }
}
