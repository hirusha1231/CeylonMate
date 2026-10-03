import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../../../core/network/api_client.dart';
import '../models/booking_models.dart';
import 'payment_stripe_screen.dart';

class BookingCheckoutScreen extends StatefulWidget {
  final ApiClient client;
  final BookingCheckoutData checkoutData;

  const BookingCheckoutScreen({
    super.key,
    required this.client,
    required this.checkoutData,
  });

  @override
  State<BookingCheckoutScreen> createState() => _BookingCheckoutScreenState();
}

class _BookingCheckoutScreenState extends State<BookingCheckoutScreen> {
  final _formKey = GlobalKey<FormState>();

  late final TextEditingController _fullNameController;
  late final TextEditingController _emailController;
  late final TextEditingController _phoneController;
  late final TextEditingController _addressController;
  late final TextEditingController _cityController;
  late final TextEditingController _postalCodeController;
  late final TextEditingController _notesController;

  @override
  void initState() {
    super.initState();
    _fullNameController = TextEditingController();
    _emailController = TextEditingController();
    _phoneController = TextEditingController();
    _addressController = TextEditingController();
    _cityController = TextEditingController();
    _postalCodeController = TextEditingController();
    _notesController = TextEditingController();
  }

  @override
  void dispose() {
    _fullNameController.dispose();
    _emailController.dispose();
    _phoneController.dispose();
    _addressController.dispose();
    _cityController.dispose();
    _postalCodeController.dispose();
    _notesController.dispose();
    super.dispose();
  }

  void _proceedToPayment() {
    if (!_formKey.currentState!.validate()) return;

    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => PaymentStripeScreen(
          client: widget.client,
          checkoutData: widget.checkoutData,
          billingName: _fullNameController.text.trim(),
          billingEmail: _emailController.text.trim(),
          billingPhone: _phoneController.text.trim(),
          billingAddress: _addressController.text.trim(),
          billingCity: _cityController.text.trim(),
          travelerNotes: _notesController.text.trim(),
        ),
      ),
    );
  }

  Widget _buildSummaryRow(
    String label,
    String value, {
    bool isHighlight = false,
    Color? valueColor,
  }) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Flexible(
            flex: 4,
            child: Text(
              label,
              style: TextStyle(
                color: Colors.grey[700],
                fontSize: 13,
                fontWeight: isHighlight ? FontWeight.bold : FontWeight.w500,
              ),
            ),
          ),
          const SizedBox(width: 8),
          Expanded(
            flex: 6,
            child: Text(
              value,
              textAlign: TextAlign.right,
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
              style: TextStyle(
                fontSize: isHighlight ? 14 : 13,
                fontWeight: FontWeight.bold,
                color: valueColor ??
                    (isHighlight ? const Color(0xFF0F766E) : Colors.black87),
              ),
            ),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final data = widget.checkoutData;
    final dateFormat = DateFormat('MMM dd, yyyy');
    final durationDays = data.endDate.difference(data.startDate).inDays + 1;
    final totalDays = durationDays > 0 ? durationDays : 1;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Booking Checkout & Summary'),
        elevation: 1,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Trip Summary Card (Overflow Fixed)
              Card(
                elevation: 2,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          const Icon(Icons.explore, color: Colors.teal),
                          const SizedBox(width: 8),
                          Expanded(
                            child: Text(
                              data.tripTitle,
                              style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                        ],
                      ),
                      const Divider(height: 24),
                      _buildSummaryRow(
                        'Travel Window:',
                        '${dateFormat.format(data.startDate)} – ${dateFormat.format(data.endDate)} ($totalDays ${totalDays == 1 ? 'day' : 'days'})',
                      ),
                      _buildSummaryRow(
                        'Party Size:',
                        '${data.partySize} ${data.partySize == 1 ? 'Person' : 'People'}',
                      ),
                      _buildSummaryRow(
                        'Selected Vehicle:',
                        data.vehicle.vehicleModel,
                        valueColor: Colors.teal,
                      ),
                      const Divider(height: 24),
                      _buildSummaryRow(
                        'Total Estimated Amount:',
                        'LKR ${data.totalEstimatedAmountLkr.toStringAsFixed(0)} (~USD \$${data.totalEstimatedAmountUsd.toStringAsFixed(0)})',
                        isHighlight: true,
                        valueColor: Colors.teal,
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 24),

              // Billing Details Section Title
              Text(
                'Traveler Billing Details',
                style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 4),
              const Text(
                'Used for booking vouchers and invoice generation.',
                style: TextStyle(fontSize: 12, color: Colors.grey),
              ),
              const SizedBox(height: 16),

              // Full Name (Letters only)
              TextFormField(
                controller: _fullNameController,
                decoration: const InputDecoration(
                  labelText: 'Billing Full Name *',
                  hintText: 'e.g. John Doe',
                  prefixIcon: Icon(Icons.person_outline),
                  border: OutlineInputBorder(),
                  helperText: 'Letters only',
                ),
                validator: (value) {
                  final trimmed = value?.trim() ?? '';
                  if (trimmed.isEmpty) return 'Full Name is required';
                  if (RegExp(r'\d').hasMatch(trimmed)) return 'Name must contain letters only';
                  return null;
                },
              ),
              const SizedBox(height: 12),

              // Email & Phone
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Expanded(
                    flex: 3,
                    child: TextFormField(
                      controller: _emailController,
                      keyboardType: TextInputType.emailAddress,
                      decoration: const InputDecoration(
                        labelText: 'Email Address *',
                        hintText: 'traveler@example.com',
                        prefixIcon: Icon(Icons.email_outlined),
                        border: OutlineInputBorder(),
                      ),
                      validator: (value) =>
                          RegExp(r'^[\w\.-]+@[\w\.-]+\.\w+$').hasMatch(value?.trim() ?? '')
                              ? null
                              : 'Valid email required',
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    flex: 2,
                    child: TextFormField(
                      controller: _phoneController,
                      keyboardType: TextInputType.phone,
                      decoration: const InputDecoration(
                        labelText: 'Phone *',
                        hintText: '0771234567',
                        prefixIcon: Icon(Icons.phone_outlined),
                        border: OutlineInputBorder(),
                      ),
                      validator: (value) {
                        final trimmed = value?.trim() ?? '';
                        if (trimmed.isEmpty) return 'Phone required';
                        if (RegExp(r'[a-zA-Z]').hasMatch(trimmed)) return 'Numbers only';
                        return null;
                      },
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),

              // Billing Address
              TextFormField(
                controller: _addressController,
                decoration: const InputDecoration(
                  labelText: 'Street Address *',
                  hintText: 'e.g. No. 12, Galle Road',
                  prefixIcon: Icon(Icons.home_outlined),
                  border: OutlineInputBorder(),
                ),
                validator: (value) {
                  final trimmed = value?.trim() ?? '';
                  if (trimmed.isEmpty) return 'Street address is required';
                  if (trimmed.length < 5) return 'Address must be at least 5 characters';
                  return null;
                },
              ),
              const SizedBox(height: 12),

              // City & Postal Code
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Expanded(
                    flex: 2,
                    child: TextFormField(
                      controller: _cityController,
                      decoration: const InputDecoration(
                        labelText: 'City *',
                        hintText: 'e.g. Kandy',
                        prefixIcon: Icon(Icons.location_city_outlined),
                        border: OutlineInputBorder(),
                      ),
                      validator: (value) =>
                          value == null || value.trim().length < 2 ? 'City required' : null,
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    flex: 1,
                    child: TextFormField(
                      controller: _postalCodeController,
                      keyboardType: TextInputType.number,
                      decoration: const InputDecoration(
                        labelText: 'Postal Code *',
                        hintText: '00700',
                        border: OutlineInputBorder(),
                      ),
                      validator: (value) {
                        final trimmed = value?.trim() ?? '';
                        if (trimmed.isEmpty) return 'Required';
                        if (trimmed.length < 3 || trimmed.length > 10) return '3-10 chars';
                        return null;
                      },
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),

              // Special Notes
              TextFormField(
                controller: _notesController,
                maxLines: 2,
                decoration: const InputDecoration(
                  labelText: 'Special Traveler Requests / Notes (Optional)',
                  hintText: 'e.g. Flight arrives at CMB 05:40 AM, infant car seat requested.',
                  prefixIcon: Icon(Icons.note_outlined),
                  border: OutlineInputBorder(),
                ),
              ),
              const SizedBox(height: 24),

              // Proceed Button
              SizedBox(
                width: double.infinity,
                height: 52,
                child: ElevatedButton.icon(
                  onPressed: _proceedToPayment,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.teal,
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                  ),
                  icon: const Icon(Icons.lock_outline),
                  label: const Text(
                    'Proceed to Secure Payment',
                    style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
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