import 'package:flutter/material.dart';

void main() => runApp(const CeylonMateApp());

class CeylonMateApp extends StatelessWidget {
  const CeylonMateApp({super.key});

  @override
  Widget build(BuildContext context) => MaterialApp(
        title: 'CeylonMate',
        home: const Scaffold(
          body: Center(child: Text('CeylonMate mobile scaffold is running.')),
        ),
      );
}
