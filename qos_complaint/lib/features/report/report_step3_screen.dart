import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../app/theme/app_theme.dart';
import '../../app/providers/state_providers.dart';
import '../../core/services/network_diagnostics_service.dart';
import 'widgets/report_progress.dart';

class ReportStep3Screen extends ConsumerStatefulWidget {
  const ReportStep3Screen({super.key});

  @override
  ConsumerState<ReportStep3Screen> createState() => _ReportStep3ScreenState();
}

class _ReportStep3ScreenState extends ConsumerState<ReportStep3Screen> {
  NetworkDiagnostics? _diagnostics;
  bool _measuring = true;
  bool _submitting = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _runDiagnostics());
  }

  Future<void> _runDiagnostics() async {
    final size = MediaQuery.of(context).size;
    final diag = await NetworkDiagnosticsService.capture(size);
    if (!mounted) return;
    setState(() {
      _diagnostics = diag;
      _measuring = false;
    });
  }

  String _categoryFromIssueType(String issueType) {
    switch (issueType) {
      case 'No Signal':
      case 'Call Drops':
        return 'Voice Quality';
      case 'Slow Internet':
      case 'No Internet':
        return 'Data Service';
      case 'SMS Not Sending':
        return 'SMS Service';
      case 'Billing Dispute':
        return 'Billing';
      case 'Mobile Money':
        return 'Mobile Money';
      default:
        return 'General';
    }
  }

  Color _severityColor(String severity) {
    switch (severity) {
      case 'LOW':
        return const Color(0xFF2E7D32);
      case 'MEDIUM':
        return AppColors.warningOrange;
      case 'HIGH':
        return AppColors.errorRed;
      case 'EMERGENCY':
        return const Color(0xFF8B0000);
      default:
        return AppColors.textSecondary;
    }
  }

  @override
  Widget build(BuildContext context) {
    final draft = ref.watch(draftReportProvider);
    final user = ref.watch(userProvider);

    final contactName =
        (draft.contactName?.isNotEmpty ?? false) ? draft.contactName! : (user?.name ?? '—');
    final contactPhone =
        (draft.contactPhone?.isNotEmpty ?? false) ? draft.contactPhone! : (user?.phone ?? '—');
    final contactEmail =
        (draft.contactEmail?.isNotEmpty ?? false) ? draft.contactEmail! : (user?.email ?? '—');

    final category = _categoryFromIssueType(draft.issueType);

    return Scaffold(
      backgroundColor: AppColors.dynamicBackground,
      appBar: AppBar(
        backgroundColor: AppColors.dynamicBackground,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_rounded, color: AppColors.textPrimary),
          onPressed: () => context.pop(),
        ),
        title: Column(
          children: [
            Text(
              "Submit a Complaint",
              style: AppTextStyles.h3.copyWith(fontWeight: FontWeight.bold),
            ),
            Text(
              "Report telecom service issues to NatCA",
              style: AppTextStyles.micro.copyWith(color: AppColors.textSecondary),
            ),
          ],
        ),
        centerTitle: true,
      ),
      body: Column(
        children: [
          const SizedBox(height: 10),
          const ReportProgressBar(currentStep: 4),
          const SizedBox(height: 16),
          Expanded(
            child: SingleChildScrollView(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  _buildReviewCard(draft, category, contactName, contactPhone, contactEmail),
                  const SizedBox(height: 16),

                  if (draft.isBillingType) ...[
                    _buildFinancialCard(draft),
                    const SizedBox(height: 16),
                  ],

                  Text(
                    "Description",
                    style: AppTextStyles.body.copyWith(fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(height: 8),
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                      color: AppColors.blueLightBG,
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(color: AppColors.primaryBlue.withOpacity(0.15)),
                    ),
                    child: Text(
                      draft.description.isNotEmpty
                          ? draft.description
                          : "No description provided.",
                      style: AppTextStyles.body.copyWith(height: 1.5),
                    ),
                  ),
                  const SizedBox(height: 16),

                  if (draft.attachments.isNotEmpty) ...[
                    Text(
                      "Attachments",
                      style: AppTextStyles.body.copyWith(fontWeight: FontWeight.bold),
                    ),
                    const SizedBox(height: 8),
                    _buildAttachmentsRow(draft.attachments),
                    const SizedBox(height: 16),
                  ],

                  _buildNetworkCard(draft),
                  const SizedBox(height: 16),
                  _buildCellSiteCard(),
                  const SizedBox(height: 24),
                ],
              ),
            ),
          ),
          _buildBottomCTA(context, ref, draft),
        ],
      ),
    );
  }

  Widget _buildReviewCard(
    DraftReport draft,
    String category,
    String contactName,
    String contactPhone,
    String contactEmail,
  ) {
    return Container(
      decoration: BoxDecoration(
        color: AppColors.dynamicCard,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.dynamicBorder),
        boxShadow: const [BoxShadow(color: Colors.black12, blurRadius: 6, offset: Offset(0, 2))],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(14, 12, 14, 10),
            child: Text(
              "Review your complaint before submitting",
              style: AppTextStyles.small.copyWith(color: AppColors.textSecondary),
            ),
          ),
          const Divider(height: 1, color: AppColors.border),
          _row("Operator", draft.operatorName),
          _rowDivider(),
          _row("Category", category),
          _rowDivider(),
          _row(
            "Issue Type",
            draft.issueType.toUpperCase(),
            valueColor: AppColors.primaryBlue,
          ),
          _rowDivider(),
          _row(
            "Severity",
            draft.severity,
            valueColor: _severityColor(draft.severity),
          ),
          _rowDivider(),
          _row("District", draft.district),
          _rowDivider(),
          _row("Area", draft.areaDetail),
          _rowDivider(),
          _row(
            "Attachments",
            draft.attachments.isEmpty ? '—' : '${draft.attachments.length} file(s)',
          ),
          const Padding(
            padding: EdgeInsets.symmetric(horizontal: 14),
            child: Divider(height: 8, color: AppColors.border, thickness: 1),
          ),
          _row("Contact Name", contactName),
          _rowDivider(),
          _row("Phone", contactPhone),
          _rowDivider(),
          _row("Email", contactEmail, valueColor: AppColors.primaryBlue),
          const SizedBox(height: 4),
        ],
      ),
    );
  }

  Widget _row(String label, String value, {Color? valueColor}) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 9),
      child: Row(
        children: [
          Expanded(
            flex: 2,
            child: Text(
              label,
              style: AppTextStyles.small.copyWith(color: AppColors.textSecondary),
            ),
          ),
          Expanded(
            flex: 3,
            child: Text(
              value,
              style: AppTextStyles.small.copyWith(
                fontWeight: FontWeight.bold,
                color: valueColor ?? AppColors.dynamicTextPrimary,
              ),
              textAlign: TextAlign.right,
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
            ),
          ),
        ],
      ),
    );
  }

  Widget _rowDivider() => const Padding(
        padding: EdgeInsets.symmetric(horizontal: 14),
        child: Divider(height: 1, color: AppColors.border),
      );

  Widget _buildFinancialCard(DraftReport draft) {
    final isMM = draft.issueType == 'Mobile Money';
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppColors.dynamicCard,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(
          color: isMM
              ? AppColors.primaryBlue.withOpacity(0.3)
              : AppColors.warningOrange.withOpacity(0.3),
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(children: [
            Icon(
              isMM ? Icons.account_balance_wallet_rounded : Icons.receipt_long_rounded,
              color: isMM ? AppColors.primaryBlue : AppColors.warningOrange,
              size: 18,
            ),
            const SizedBox(width: 8),
            Text("Financial Details",
                style: AppTextStyles.body.copyWith(fontWeight: FontWeight.bold)),
          ]),
          const SizedBox(height: 12),
          if (draft.billingSubCategory != null) ...[
            _row("Category", draft.billingSubCategory!),
            const Divider(height: 16, color: AppColors.border),
          ],
          if (draft.transactionRef?.isNotEmpty ?? false) ...[
            _row("Transaction Ref", draft.transactionRef!),
            const Divider(height: 16, color: AppColors.border),
          ],
          if (draft.disputedAmount != null) ...[
            _row("Amount Disputed", "SLE ${draft.disputedAmount!.toStringAsFixed(0)}"),
          ],
          if (draft.transactionDate != null) ...[
            const Divider(height: 16, color: AppColors.border),
            _row("Transaction Date", draft.transactionDate!),
          ],
        ],
      ),
    );
  }

  Widget _buildAttachmentsRow(List<String> attachments) {
    final count = attachments.length > 3 ? 3 : attachments.length;
    return Row(
      children: List.generate(count, (i) {
        final isOverflow = i == 2 && attachments.length > 3;
        return Expanded(
          child: Container(
            height: 72,
            margin: const EdgeInsets.only(right: 8),
            decoration: BoxDecoration(
              color: AppColors.dynamicBorder,
              borderRadius: BorderRadius.circular(10),
            ),
            alignment: Alignment.center,
            child: isOverflow
                ? Container(
                    decoration: BoxDecoration(
                      color: Colors.black.withOpacity(0.55),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    alignment: Alignment.center,
                    child: Text(
                      '+${attachments.length - 2}',
                      style: AppTextStyles.h3.copyWith(color: Colors.white),
                    ),
                  )
                : const Icon(Icons.insert_drive_file_outlined, color: AppColors.textSecondary),
          ),
        );
      }),
    );
  }

  Widget _buildNetworkCard(DraftReport draft) {
    final diag = _diagnostics;
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppColors.dynamicCard,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.dynamicBorder),
        boxShadow: const [BoxShadow(color: Colors.black12, blurRadius: 4, offset: Offset(0, 1))],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            "Network Diagnostics",
            style: AppTextStyles.body.copyWith(fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 12),
          _diagRow(
            Icons.location_on_rounded,
            "Location",
            "${draft.lat.toStringAsFixed(4)}, ${draft.lng.toStringAsFixed(4)}",
            color: const Color(0xFF2E7D32),
          ),
          const SizedBox(height: 8),
          _diagRow(
            Icons.signal_cellular_alt_rounded,
            "Connection",
            _measuring ? "Checking..." : (diag?.connectionType ?? 'Unknown'),
          ),
          const SizedBox(height: 8),
          _diagRow(
            Icons.network_check_rounded,
            "Ping to NatCA",
            _measuring
                ? "..."
                : (diag?.pingMs != null ? '${diag!.pingMs}ms' : 'Timeout'),
          ),
          const SizedBox(height: 8),
          _diagRow(
            Icons.cell_tower_rounded,
            "Network Gen.",
            _measuring ? "..." : (diag?.estimatedGeneration ?? 'Unknown'),
          ),
          const SizedBox(height: 8),
          _diagRow(
            Icons.phone_android_rounded,
            "Device",
            _measuring ? "..." : (diag?.device ?? 'Unknown'),
          ),
          if (diag?.deviceModel != null) ...[
            const SizedBox(height: 8),
            _diagRow(
              Icons.smartphone_rounded,
              "Model",
              diag!.deviceModel!,
            ),
          ],
          const SizedBox(height: 14),
          OutlinedButton.icon(
            onPressed: () => context.push('/speed-comparison'),
            icon: const Icon(Icons.speed_rounded, size: 16),
            label: const Text("Run speed test (optional)"),
            style: OutlinedButton.styleFrom(
              minimumSize: const Size(double.infinity, 44),
              side: const BorderSide(color: AppColors.border),
              foregroundColor: AppColors.textSecondary,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
              textStyle: AppTextStyles.small.copyWith(fontWeight: FontWeight.w600),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildCellSiteCard() {
    final diag = _diagnostics;
    final hasCellData = diag != null &&
        (diag.carrier != null ||
            diag.cellId != null ||
            diag.radioType != null ||
            diag.signalStrength != null);

    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppColors.dynamicCard,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(
          color: hasCellData
              ? AppColors.accentGreen.withOpacity(0.3)
              : AppColors.dynamicBorder,
        ),
        boxShadow: const [BoxShadow(color: Colors.black12, blurRadius: 4, offset: Offset(0, 1))],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(
                Icons.cell_tower_rounded,
                size: 18,
                color: hasCellData ? AppColors.accentGreen : AppColors.textSecondary,
              ),
              const SizedBox(width: 8),
              Text(
                "Cell / Site Details",
                style: AppTextStyles.body.copyWith(fontWeight: FontWeight.bold),
              ),
              const Spacer(),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                  color: hasCellData
                      ? AppColors.accentGreen.withOpacity(0.12)
                      : AppColors.textLight.withOpacity(0.12),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(
                  _measuring
                      ? "Scanning..."
                      : (hasCellData ? "Captured" : "Limited"),
                  style: AppTextStyles.micro.copyWith(
                    color: hasCellData ? AppColors.accentGreen : AppColors.textLight,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),

          if (_measuring) ...[
            const Center(
              child: Padding(
                padding: EdgeInsets.all(16),
                child: SizedBox(
                  width: 20,
                  height: 20,
                  child: CircularProgressIndicator(strokeWidth: 2, color: AppColors.primaryBlue),
                ),
              ),
            ),
          ] else if (hasCellData) ...[
            if (diag.carrier != null)
              _diagRow(Icons.sim_card_rounded, "Carrier", diag.carrier!),
            if (diag.carrier != null) const SizedBox(height: 8),
            if (diag.radioType != null)
              _diagRow(Icons.signal_cellular_alt_rounded, "Radio Type", diag.radioType!),
            if (diag.radioType != null) const SizedBox(height: 8),
            if (diag.cellId != null)
              _diagRow(Icons.router_rounded, "Cell ID", diag.cellId.toString()),
            if (diag.cellId != null) const SizedBox(height: 8),
            if (diag.lac != null)
              _diagRow(Icons.map_rounded, "LAC / TAC", diag.lac.toString()),
            if (diag.lac != null) const SizedBox(height: 8),
            if (diag.signalStrength != null)
              _diagRow(
                Icons.signal_cellular_alt_rounded,
                "Signal",
                "${diag.signalStrength} dBm",
                color: _signalColor(diag.signalStrength!),
              ),
            if (diag.signalStrength != null) const SizedBox(height: 8),
            if (diag.mcc != null && diag.mnc != null)
              _diagRow(Icons.public_rounded, "MCC / MNC", "${diag.mcc} / ${diag.mnc}"),
          ] else ...[
            Padding(
              padding: const EdgeInsets.symmetric(vertical: 8),
              child: Text(
                kIsWeb
                    ? "Cell tower details are not available on web browsers. Use the Android app for full cell site capture."
                    : "Cell tower info could not be read. Ensure location permission is granted.",
                style: AppTextStyles.small.copyWith(color: AppColors.textLight, height: 1.4),
              ),
            ),
          ],
          const SizedBox(height: 8),
          Text(
            "Cell/site data helps NatCA identify specific towers with issues.",
            style: AppTextStyles.micro.copyWith(color: AppColors.textLight),
          ),
        ],
      ),
    );
  }

  Color _signalColor(int dbm) {
    if (dbm >= -70) return const Color(0xFF2E7D32);
    if (dbm >= -85) return AppColors.accentGreen;
    if (dbm >= -100) return AppColors.warningOrange;
    return AppColors.errorRed;
  }

  Widget _diagRow(IconData icon, String label, String value, {Color? color}) {
    return Row(
      children: [
        Icon(icon, size: 15, color: color ?? AppColors.textSecondary),
        const SizedBox(width: 8),
        SizedBox(
          width: 110,
          child: Text(
            label,
            style: AppTextStyles.small.copyWith(color: AppColors.textSecondary),
          ),
        ),
        Expanded(
          child: Text(
            value,
            style: AppTextStyles.small.copyWith(
              fontWeight: FontWeight.w600,
              color: color ?? AppColors.dynamicTextPrimary,
            ),
            overflow: TextOverflow.ellipsis,
          ),
        ),
      ],
    );
  }

  Future<void> _handleSubmit(WidgetRef ref, DraftReport draft) async {
    setState(() => _submitting = true);
    final result = await ref.read(complaintsProvider.notifier).submitNewComplaint(
      draft,
      networkDiagnostics: _diagnostics?.toJson(),
    );
    if (!mounted) return;
    setState(() => _submitting = false);
    ref.read(draftReportProvider.notifier).reset();

    if (result.success) {
      ScaffoldMessenger.of(context).showMaterialBanner(
        MaterialBanner(
          backgroundColor: const Color(0xFF15803D),
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
          leading: const Icon(Icons.check_circle_rounded, color: Colors.white, size: 24),
          content: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              const Text("Complaint received", style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 15)),
              const SizedBox(height: 2),
              Text("Reference: ${result.complaintRef}", style: const TextStyle(color: Colors.white, fontFamily: 'monospace', fontWeight: FontWeight.bold, fontSize: 13)),
              Text("Status: ${result.status}", style: const TextStyle(color: Colors.white70, fontSize: 12)),
              if (result.notifiedChannels.isNotEmpty)
                Text("Confirmation sent via ${result.notifiedChannels.join(', ')}", style: const TextStyle(color: Colors.white70, fontSize: 11)),
            ],
          ),
          actions: [
            IconButton(
              icon: const Icon(Icons.close, color: Colors.white70, size: 20),
              onPressed: () => ScaffoldMessenger.of(context).hideCurrentMaterialBanner(),
            ),
          ],
        ),
      );
      Future.delayed(const Duration(seconds: 6), () {
        if (mounted) ScaffoldMessenger.of(context).hideCurrentMaterialBanner();
      });
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text("Complaint saved locally. Will sync when online."),
          backgroundColor: AppColors.warningOrange,
        ),
      );
    }

    _showSuccessSheet(result);
  }

  void _showSuccessSheet(SubmitResult result) {
    showModalBottomSheet(
      context: context,
      isDismissible: false,
      enableDrag: false,
      isScrollControlled: true,
      backgroundColor: AppColors.dynamicBackground,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (ctx) => Padding(
        padding: const EdgeInsets.fromLTRB(24, 16, 24, 32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(width: 40, height: 4, decoration: BoxDecoration(color: AppColors.border, borderRadius: BorderRadius.circular(2))),
            const SizedBox(height: 24),
            Container(
              width: 64,
              height: 64,
              decoration: BoxDecoration(
                color: result.success ? const Color(0xFF15803D).withOpacity(0.12) : AppColors.warningOrange.withOpacity(0.12),
                shape: BoxShape.circle,
              ),
              child: Icon(
                result.success ? Icons.check_circle_rounded : Icons.cloud_off_rounded,
                color: result.success ? const Color(0xFF15803D) : AppColors.warningOrange,
                size: 36,
              ),
            ),
            const SizedBox(height: 16),
            Text(
              result.success ? "Complaint Submitted!" : "Saved Offline",
              style: AppTextStyles.h2.copyWith(fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 8),
            Text(
              result.success
                  ? "Your complaint has been received. Use the reference number below to track its status."
                  : "Your complaint has been saved and will be submitted when you're back online.",
              textAlign: TextAlign.center,
              style: AppTextStyles.body.copyWith(color: AppColors.textSecondary, height: 1.4),
            ),
            const SizedBox(height: 20),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
              decoration: BoxDecoration(
                color: AppColors.dynamicCard,
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: AppColors.dynamicBorder),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    result.complaintRef,
                    style: AppTextStyles.h3.copyWith(fontFamily: 'monospace', fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(width: 8),
                  GestureDetector(
                    onTap: () {
                      Clipboard.setData(ClipboardData(text: result.complaintRef));
                      ScaffoldMessenger.of(ctx).showSnackBar(
                        const SnackBar(
                          content: Text("Reference copied to clipboard"),
                          duration: Duration(seconds: 2),
                          backgroundColor: AppColors.primaryBlue,
                        ),
                      );
                    },
                    child: Container(
                      padding: const EdgeInsets.all(6),
                      decoration: BoxDecoration(
                        color: AppColors.primaryBlue.withOpacity(0.1),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: const Icon(Icons.copy_rounded, size: 16, color: AppColors.primaryBlue),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                    decoration: BoxDecoration(
                      color: result.success ? const Color(0xFF15803D).withOpacity(0.12) : AppColors.warningOrange.withOpacity(0.12),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Text(
                      result.status,
                      style: AppTextStyles.micro.copyWith(
                        color: result.success ? const Color(0xFF15803D) : AppColors.warningOrange,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 24),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: () {
                  Navigator.pop(ctx);
                  context.go('/dashboard?tab=3');
                },
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.primaryBlue,
                  minimumSize: const Size(0, 50),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(26)),
                ),
                child: Text(
                  "Track This Complaint",
                  style: AppTextStyles.small.copyWith(color: Colors.white, fontWeight: FontWeight.bold),
                ),
              ),
            ),
            const SizedBox(height: 10),
            SizedBox(
              width: double.infinity,
              child: OutlinedButton(
                onPressed: () {
                  Navigator.pop(ctx);
                  context.go('/dashboard');
                },
                style: OutlinedButton.styleFrom(
                  minimumSize: const Size(0, 50),
                  side: const BorderSide(color: AppColors.border),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(26)),
                ),
                child: Text(
                  "Back to Home",
                  style: AppTextStyles.small.copyWith(color: AppColors.primaryBlue, fontWeight: FontWeight.bold),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildBottomCTA(BuildContext context, WidgetRef ref, DraftReport draft) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
      decoration: BoxDecoration(
        color: AppColors.dynamicCard,
        border: Border(top: BorderSide(color: AppColors.dynamicBorder)),
      ),
      child: Row(
        children: [
          Expanded(
            child: OutlinedButton(
              onPressed: () => context.pop(),
              style: OutlinedButton.styleFrom(
                minimumSize: const Size(0, 52),
                side: const BorderSide(color: AppColors.border),
                foregroundColor: AppColors.textSecondary,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(26)),
              ),
              child: const Text("Back", style: TextStyle(fontWeight: FontWeight.bold)),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            flex: 2,
            child: ElevatedButton(
              onPressed: _submitting ? null : () => _handleSubmit(ref, draft),
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.primaryBlue,
                minimumSize: const Size(0, 52),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(26)),
                elevation: 4,
                shadowColor: AppColors.primaryBlue.withOpacity(0.3),
              ),
              child: _submitting
                  ? const SizedBox(
                      width: 20,
                      height: 20,
                      child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                    )
                  : Text(
                      "Submit Complaint",
                      style: AppTextStyles.small.copyWith(
                        color: Colors.white,
                        fontWeight: FontWeight.bold,
                        fontSize: 14,
                      ),
                    ),
            ),
          ),
        ],
      ),
    );
  }
}
