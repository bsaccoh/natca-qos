import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../app/theme/app_theme.dart';
import '../../core/services/api_client.dart';

class SimRegistrationScreen extends StatefulWidget {
  const SimRegistrationScreen({super.key});

  @override
  State<SimRegistrationScreen> createState() => _SimRegistrationScreenState();
}

class _SimRegistrationScreenState extends State<SimRegistrationScreen> {
  final _formKey = GlobalKey<FormState>();
  final _phoneController = TextEditingController();
  final _ninController = TextEditingController();

  bool _isLoading = false;
  bool _hasResult = false;

  // Result state
  String _resultStatus = '';
  String _resultPhone = '';
  String _resultName = '';
  String _resultRef = '';
  String? _rejectionReason;
  bool _notFound = false;

  Future<void> _verifySim() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() {
      _isLoading = true;
      _hasResult = false;
      _notFound = false;
    });

    try {
      final nin = _ninController.text.trim();
      final response = await apiClient.get('/kyc/status/$nin').timeout(const Duration(seconds: 8));

      if (!mounted) return;

      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        final row = data['data'] ?? data;

        setState(() {
          _isLoading = false;
          _hasResult = true;
          _notFound = false;
          _resultStatus = (row['status'] ?? '').toString().toUpperCase();
          _resultPhone = row['phone'] ?? '';
          _resultName = '${row['first_name'] ?? ''} ${row['last_name'] ?? ''}'.trim();
          _resultRef = row['kyc_reference'] ?? '';
          _rejectionReason = row['rejection_reason'];
        });
      } else if (response.statusCode == 404) {
        setState(() {
          _isLoading = false;
          _hasResult = true;
          _notFound = true;
        });
      } else {
        setState(() => _isLoading = false);
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Could not verify. Please try again.')),
          );
        }
      }
    } catch (_) {
      if (mounted) {
        setState(() => _isLoading = false);
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Network error. Check your connection and try again.')),
        );
      }
    }
  }

  bool get _isVerified {
    if (_notFound) return false;
    final inputPhone = _phoneController.text.trim();
    return _resultStatus == 'APPROVED' &&
        (_resultPhone == inputPhone || _resultPhone.endsWith(inputPhone) || inputPhone.endsWith(_resultPhone));
  }

  @override
  void dispose() {
    _phoneController.dispose();
    _ninController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.isDark ? const Color(0xFF101424) : AppColors.background,
      appBar: AppBar(
        title: Text("SIM Verification", style: AppTextStyles.h2.copyWith(fontWeight: FontWeight.bold, color: AppColors.dynamicTextPrimary)),
        backgroundColor: Colors.transparent,
        elevation: 0,
        iconTheme: const IconThemeData(color: AppColors.primaryBlue),
      ),
      body: SingleChildScrollView(
        child: Padding(
          padding: const EdgeInsets.all(20.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: AppColors.primaryBlue.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: AppColors.primaryBlue.withOpacity(0.3)),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.info_outline, color: AppColors.primaryBlue),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Text(
                        "Verify if your mobile number is properly linked to your National Identification Number (NIN) as per NatCA regulations.",
                        style: TextStyle(color: AppColors.isDark ? Colors.white70 : AppColors.textSecondary, fontSize: 13),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 24),

              Form(
                key: _formKey,
                child: Column(
                  children: [
                    TextFormField(
                      controller: _phoneController,
                      keyboardType: TextInputType.phone,
                      style: TextStyle(color: AppColors.dynamicTextPrimary),
                      decoration: InputDecoration(
                        labelText: 'Phone Number',
                        hintText: 'e.g. 077123456',
                        prefixIcon: const Icon(Icons.phone_android_rounded),
                        filled: true,
                        fillColor: AppColors.dynamicCard,
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                      validator: (value) {
                        if (value == null || value.isEmpty) return 'Enter your phone number';
                        if (value.length < 8) return 'Enter a valid phone number';
                        return null;
                      },
                    ),
                    const SizedBox(height: 16),
                    TextFormField(
                      controller: _ninController,
                      keyboardType: TextInputType.text,
                      textCapitalization: TextCapitalization.characters,
                      style: TextStyle(color: AppColors.dynamicTextPrimary),
                      decoration: InputDecoration(
                        labelText: 'National ID Number (NIN)',
                        hintText: 'e.g. ABCDEFGH',
                        prefixIcon: const Icon(Icons.badge_outlined),
                        filled: true,
                        fillColor: AppColors.dynamicCard,
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                      validator: (value) {
                        if (value == null || value.isEmpty) return 'Enter your NIN';
                        return null;
                      },
                    ),
                    const SizedBox(height: 24),
                    SizedBox(
                      width: double.infinity,
                      height: 50,
                      child: ElevatedButton(
                        onPressed: _isLoading ? null : _verifySim,
                        style: ElevatedButton.styleFrom(
                          backgroundColor: AppColors.primaryBlue,
                          foregroundColor: Colors.white,
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                        ),
                        child: _isLoading
                            ? const SizedBox(width: 24, height: 24, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                            : const Text("VERIFY REGISTRATION", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                      ),
                    ),
                  ],
                ),
              ),

              if (_hasResult) ...[
                const SizedBox(height: 32),
                _buildResultCard(),
              ],
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildResultCard() {
    if (_notFound) {
      return _buildStatusCard(
        icon: Icons.cancel_rounded,
        color: AppColors.errorRed,
        title: "SIM Not Linked",
        message: "No KYC record found for this NIN. Your phone number is not linked. Please self-register to comply with NatCA regulations.",
        showRegisterButton: true,
      );
    }

    if (_isVerified) {
      return _buildStatusCard(
        icon: Icons.check_circle_rounded,
        color: AppColors.successGreen,
        title: "SIM is Verified",
        message: "Your phone number $_resultPhone is successfully linked to NIN ${_ninController.text.trim()}."
            "${_resultName.isNotEmpty ? '\nRegistered to: $_resultName' : ''}"
            "${_resultRef.isNotEmpty ? '\nKYC Ref: $_resultRef' : ''}",
      );
    }

    // KYC exists but not yet approved
    switch (_resultStatus) {
      case 'PENDING':
      case 'UNDER_REVIEW':
        return _buildStatusCard(
          icon: Icons.hourglass_top_rounded,
          color: AppColors.warningOrange,
          title: _resultStatus == 'PENDING' ? "KYC Pending Review" : "KYC Under Review",
          message: "Your KYC submission is being reviewed by NatCA. Your SIM will be linked once approved."
              "${_resultRef.isNotEmpty ? '\nKYC Ref: $_resultRef' : ''}",
        );
      case 'REJECTED':
        return _buildStatusCard(
          icon: Icons.cancel_rounded,
          color: AppColors.errorRed,
          title: "KYC Rejected",
          message: "Your KYC submission was rejected."
              "${_rejectionReason != null && _rejectionReason!.isNotEmpty ? '\nReason: $_rejectionReason' : ''}"
              "\n\nPlease re-submit with correct information.",
          showRegisterButton: true,
        );
      case 'APPROVED':
        // Approved but phone doesn't match
        return _buildStatusCard(
          icon: Icons.warning_rounded,
          color: AppColors.warningOrange,
          title: "NIN Registered to Different Number",
          message: "This NIN is linked to a different phone number. If you believe this is an error, visit your operator's office.",
        );
      default:
        return _buildStatusCard(
          icon: Icons.info_rounded,
          color: AppColors.primaryBlue,
          title: "Status: $_resultStatus",
          message: "KYC submission found with status: $_resultStatus."
              "${_resultRef.isNotEmpty ? '\nKYC Ref: $_resultRef' : ''}",
        );
    }
  }

  Widget _buildStatusCard({
    required IconData icon,
    required Color color,
    required String title,
    required String message,
    bool showRegisterButton = false,
  }) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: AppColors.dynamicCard,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: color, width: 2),
        boxShadow: [
          BoxShadow(color: color.withOpacity(0.1), blurRadius: 10, spreadRadius: 2),
        ],
      ),
      child: Column(
        children: [
          Icon(icon, color: color, size: 64),
          const SizedBox(height: 16),
          Text(
            title,
            style: AppTextStyles.h2.copyWith(fontWeight: FontWeight.bold, color: color),
          ),
          const SizedBox(height: 8),
          Text(
            message,
            textAlign: TextAlign.center,
            style: const TextStyle(color: AppColors.textSecondary, height: 1.5),
          ),
          if (showRegisterButton) ...[
            const SizedBox(height: 24),
            SizedBox(
              width: double.infinity,
              height: 44,
              child: OutlinedButton.icon(
                onPressed: () {
                  context.push('/kyc-registration?phone=${Uri.encodeComponent(_phoneController.text)}&nin=${Uri.encodeComponent(_ninController.text)}');
                },
                icon: const Icon(Icons.person_add_alt_1),
                label: const Text("SELF-REGISTER NOW"),
                style: OutlinedButton.styleFrom(
                  foregroundColor: AppColors.primaryBlue,
                  side: const BorderSide(color: AppColors.primaryBlue),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }
}
