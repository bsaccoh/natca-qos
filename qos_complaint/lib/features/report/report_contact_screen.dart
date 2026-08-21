import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../app/theme/app_theme.dart';
import '../../app/providers/state_providers.dart';
import 'widgets/report_progress.dart';

class ReportContactScreen extends ConsumerStatefulWidget {
  const ReportContactScreen({super.key});

  @override
  ConsumerState<ReportContactScreen> createState() => _ReportContactScreenState();
}

class _ReportContactScreenState extends ConsumerState<ReportContactScreen> {
  final _nameCtrl = TextEditingController();
  final _phoneCtrl = TextEditingController();
  final _emailCtrl = TextEditingController();

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final user = ref.read(userProvider);
      final draft = ref.read(draftReportProvider);
      _nameCtrl.text = draft.contactName ?? user?.name ?? '';
      _phoneCtrl.text = draft.contactPhone ?? user?.phone ?? '';
      _emailCtrl.text = draft.contactEmail ?? user?.email ?? '';
    });
  }

  @override
  void dispose() {
    _nameCtrl.dispose();
    _phoneCtrl.dispose();
    _emailCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.dynamicBackground,
      appBar: AppBar(
        backgroundColor: AppColors.dynamicBackground,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_rounded, color: AppColors.textPrimary),
          onPressed: () => context.pop(),
        ),
        title: Text("Contact Info", style: AppTextStyles.h3.copyWith(fontWeight: FontWeight.bold)),
        centerTitle: true,
      ),
      body: Column(
        children: [
          const SizedBox(height: 10),
          const ReportProgressBar(currentStep: 3),
          const SizedBox(height: 20),
          Expanded(
            child: SingleChildScrollView(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: AppColors.blueLightBG,
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(color: AppColors.primaryBlue.withOpacity(0.2)),
                    ),
                    child: Row(
                      children: [
                        const Icon(Icons.info_outline_rounded, color: AppColors.primaryBlue, size: 18),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            "Your contact details help NatCA follow up on your complaint.",
                            style: AppTextStyles.small.copyWith(color: AppColors.primaryBlue),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 24),
                  _buildField("Full Name", _nameCtrl, Icons.person_outline_rounded, "e.g. Babah Saccoh"),
                  const SizedBox(height: 16),
                  _buildField(
                    "Phone Number",
                    _phoneCtrl,
                    Icons.phone_outlined,
                    "e.g. +23276450998",
                    TextInputType.phone,
                  ),
                  const SizedBox(height: 16),
                  _buildField(
                    "Email Address (Optional)",
                    _emailCtrl,
                    Icons.email_outlined,
                    "e.g. name@example.com",
                    TextInputType.emailAddress,
                  ),
                  const SizedBox(height: 30),
                ],
              ),
            ),
          ),
          _buildBottomCTA(context),
        ],
      ),
    );
  }

  Widget _buildField(
    String label,
    TextEditingController ctrl,
    IconData icon,
    String hint, [
    TextInputType? type,
  ]) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: AppTextStyles.body.copyWith(fontWeight: FontWeight.bold)),
        const SizedBox(height: 8),
        Container(
          decoration: BoxDecoration(
            color: AppColors.dynamicCard,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: AppColors.dynamicBorder),
          ),
          child: TextField(
            controller: ctrl,
            keyboardType: type,
            style: AppTextStyles.body,
            decoration: InputDecoration(
              hintText: hint,
              hintStyle: TextStyle(color: AppColors.textLight),
              prefixIcon: Icon(icon, color: AppColors.textSecondary, size: 20),
              border: InputBorder.none,
              contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 14),
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildBottomCTA(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
      decoration: BoxDecoration(
        color: AppColors.dynamicCard,
        border: Border(top: BorderSide(color: AppColors.dynamicBorder)),
      ),
      child: SizedBox(
        width: double.infinity,
        height: 52,
        child: ElevatedButton(
          onPressed: () {
            ref.read(draftReportProvider.notifier).updateContact(
              _nameCtrl.text.trim(),
              _phoneCtrl.text.trim(),
              _emailCtrl.text.trim(),
            );
            context.push('/report/review');
          },
          style: ElevatedButton.styleFrom(
            backgroundColor: AppColors.primaryBlue,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(26)),
            elevation: 4,
            shadowColor: AppColors.primaryBlue.withOpacity(0.3),
          ),
          child: Text(
            "Next",
            style: AppTextStyles.body.copyWith(
              color: Colors.white,
              fontWeight: FontWeight.bold,
              fontSize: 16,
            ),
          ),
        ),
      ),
    );
  }
}
