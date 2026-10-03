import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../../../core/network/api_client.dart';
import '../models/booking_models.dart';
import 'live_tracking_screen.dart';

class PaymentStripeScreen extends StatefulWidget {
  final ApiClient client;
  final BookingCheckoutData checkoutData;
  final String billingName;
  final String billingEmail;
  final String billingPhone;
  final String billingAddress;
  final String billingCity;
  final String travelerNotes;

  const PaymentStripeScreen({
    super.key,
    required this.client,
    required this.checkoutData,
    required this.billingName,
    required this.billingEmail,
    required this.billingPhone,
    required this.billingAddress,
    required this.billingCity,
    required this.travelerNotes,
  });

  @override
  State<PaymentStripeScreen> createState() => _PaymentStripeScreenState();
}

class _PaymentStripeScreenState extends State<PaymentStripeScreen> {
  final _formKey = GlobalKey<FormState>();

  late final TextEditingController _cardNumberController;
  late final TextEditingController _expiryController;
  late final TextEditingController _cvvController;
  late final TextEditingController _nameController;

  bool _isProcessing = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _cardNumberController = TextEditingController(text: '4242 4242 4242 4242');
    _expiryController = TextEditingController(text: '12/28');
    _cvvController = TextEditingController(text: '123');
    _nameController = TextEditingController(text: widget.billingName);
  }

  @override
  void dispose() {
    _cardNumberController.dispose();
    _expiryController.dispose();
    _cvvController.dispose();
    _nameController.dispose();
    super.dispose();
  }

  Future<void> _processPayment() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() {
      _isProcessing = true;
      _error = null;
    });

    try {
      // Step 1: Raise curated booking request in backend
      final raisePayload = {
        'packageId': 101,
        'passengerCount': widget.checkoutData.partySize,
        'startDate': widget.checkoutData.startDate.toIso8601String().split('T').first,
        'pickupTime': '06:30 AM',
        'travelerNotes': widget.travelerNotes.isNotEmpty
            ? '${widget.travelerNotes} | Vehicle: ${widget.checkoutData.vehicle.vehicleModel}'
            : 'Vehicle: ${widget.checkoutData.vehicle.vehicleModel}',
      };

      final createRes = await widget.client.dio.post('/api/bookings/raise-request', data: raisePayload);
      final bookingMap = Map<String, dynamic>.from(createRes.data as Map);
      final bookingId = bookingMap['id']?.toString() ?? '1';

      // Step 2: Simulate Stripe token authorization delay
      await Future.delayed(const Duration(milliseconds: 1200));

      // Step 3: Confirm payment in backend
      await widget.client.dio.post('/api/bookings/$bookingId/confirm-payment');

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('💳 Stripe payment successful! Booking confirmed.'),
            backgroundColor: Colors.green,
          ),
        );

        Navigator.pushReplacement(
          context,
          MaterialPageRoute(
            builder: (_) => LiveTrackingScreen(
              client: widget.client,
              bookingId: bookingId,
              bookingReference: bookingMap['bookingReference']?.toString() ?? 'CM-2026-0042',
              vehicleModel: widget.checkoutData.vehicle.vehicleModel,
              totalAmountLkr: widget.checkoutData.totalEstimatedAmountLkr,
            ),
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _error = 'Payment gateway error: $e';
          _isProcessing = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final amountLkr = widget.checkoutData.totalEstimatedAmountLkr;
    final amountUsd = widget.checkoutData.totalEstimatedAmountUsd;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Stripe Mock Payment'),
        elevation: 1,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // Stripe Badge Header
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: const Color(0xFF635BFF).withValues(alpha: 0.08),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: const Color(0xFF635BFF).withValues(alpha: 0.3)),
                ),
                child: Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                      decoration: BoxDecoration(
                        color: const Color(0xFF635BFF),
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: const Text('stripe', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 16)),
                    ),
                    const SizedBox(width: 14),
                    const Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text('Encrypted Sandbox Checkout', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                          Text('PCI-DSS Level 1 Compliant Security', style: TextStyle(color: Colors.grey, fontSize: 11)),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 20),

              // Total to Charge Banner
              Card(
                color: Colors.teal.shade50,
                elevation: 0,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text('Total Chargeable:', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600)),
                      Text(
                        'LKR ${amountLkr.toStringAsFixed(0)} (USD \$${amountUsd.toStringAsFixed(2)})',
                        style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.teal),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 24),

              if (_error != null)
                Container(
                  padding: const EdgeInsets.all(12),
                  margin: const EdgeInsets.only(bottom: 16),
                  decoration: BoxDecoration(
                    color: Colors.red.shade50,
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: Colors.red.shade200),
                  ),
                  child: Text(_error!, style: TextStyle(color: Colors.red.shade800)),
                ),

              // Cardholder Name (Letters only)
              TextFormField(
                controller: _nameController,
                decoration: const InputDecoration(
                  labelText: 'Cardholder Name *',
                  prefixIcon: Icon(Icons.person_outline),
                  border: OutlineInputBorder(),
                  helperText: 'Letters only',
                ),
                validator: (val) {
                  final trimmed = val?.trim() ?? '';
                  if (trimmed.isEmpty) return 'Cardholder name is required';
                  if (RegExp(r'\d').hasMatch(trimmed)) return 'Letters only';
                  return null;
                },
              ),
              const SizedBox(height: 16),

              // Card Number (16 digits formatted)
              TextFormField(
                controller: _cardNumberController,
                keyboardType: TextInputType.number,
                inputFormatters: [
                  FilteringTextInputFormatter.digitsOnly,
                  LengthLimitingTextInputFormatter(16),
                ],
                decoration: const InputDecoration(
                  labelText: 'Card Number *',
                  hintText: '4242 4242 4242 4242',
                  prefixIcon: Icon(Icons.credit_card),
                  border: OutlineInputBorder(),
                  helperText: '16 digits (e.g. 4242...)',
                ),
                validator: (val) {
                  final clean = val?.replaceAll(' ', '').trim() ?? '';
                  if (clean.length != 16) return 'Card number must be 16 digits';
                  return null;
                },
              ),
              const SizedBox(height: 16),

              // Expiry Date (MM/YY) & CVV (3-4 digits)
              Row(
                children: [
                  Expanded(
                    child: TextFormField(
                      controller: _expiryController,
                      keyboardType: TextInputType.datetime,
                      inputFormatters: [LengthLimitingTextInputFormatter(5)],
                      decoration: const InputDecoration(
                        labelText: 'Expires (MM/YY) *',
                        hintText: '12/28',
                        prefixIcon: Icon(Icons.calendar_today_outlined),
                        border: OutlineInputBorder(),
                      ),
                      validator: (val) {
                        final trimmed = val?.trim() ?? '';
                        if (!RegExp(r'^(0[1-9]|1[0-2])\/?([0-9]{2})$').hasMatch(trimmed)) {
                          return 'Format MM/YY';
                        }
                        final parts = trimmed.split('/');
                        final year = int.tryParse('20${parts[1]}') ?? 0;
                        if (year < DateTime.now().year) {
                          return 'Expired card';
                        }
                        return null;
                      },
                    ),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: TextFormField(
                      controller: _cvvController,
                      keyboardType: TextInputType.number,
                      obscureText: true,
                      inputFormatters: [
                        FilteringTextInputFormatter.digitsOnly,
                        LengthLimitingTextInputFormatter(4),
                      ],
                      decoration: const InputDecoration(
                        labelText: 'CVV / CVC *',
                        hintText: '123',
                        prefixIcon: Icon(Icons.lock_outline),
                        border: OutlineInputBorder(),
                      ),
                      validator: (val) {
                        final trimmed = val?.trim() ?? '';
                        if (trimmed.length < 3 || trimmed.length > 4) return '3 or 4 digits';
                        return null;
                      },
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 32),

              // Pay Button
              SizedBox(
                height: 52,
                child: ElevatedButton.icon(
                  onPressed: _isProcessing ? null : _processPayment,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF635BFF),
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                  ),
                  icon: _isProcessing
                      ? const SizedBox.shrink()
                      : const Icon(Icons.verified_user_outlined),
                  label: _isProcessing
                      ? const SizedBox(
                          height: 22,
                          width: 22,
                          child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2.5),
                        )
                      : Text(
                          'Pay \$${amountUsd.toStringAsFixed(0)} (LKR ${amountLkr.toStringAsFixed(0)})',
                          style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                        ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
