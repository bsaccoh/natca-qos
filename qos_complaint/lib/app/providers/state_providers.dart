import 'dart:async';
import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../../core/models/app_models.dart';
import '../../core/models/user_model.dart';
import '../../core/services/api_client.dart';
import '../theme/app_theme.dart';

// ── 1. ACTIVE DISPLAY THEME STATE ───────────────────────────────────────────
class ThemeNotifier extends StateNotifier<bool> {
  ThemeNotifier() : super(false);

  void toggleTheme() {
    state = !state;
    AppColors.isDark = state;
  }
}

final themeProvider = StateNotifierProvider<ThemeNotifier, bool>((ref) {
  return ThemeNotifier();
});

// ── LOGGED-IN USER STATE ─────────────────────────────────────────────────────
class UserNotifier extends StateNotifier<UserModel?> {
  UserNotifier() : super(null) {
    _loadUser();
  }

  Future<void> _loadUser() async {
    final prefs = await SharedPreferences.getInstance();
    final userJson = prefs.getString('current_user');
    if (userJson != null) {
      state = UserModel.fromJson(json.decode(userJson));
    }
  }

  Future<void> login(UserModel user) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('current_user', json.encode(user.toJson()));
    state = user;
  }

  Future<void> logout() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('current_user');
    state = null;
  }
}

final userProvider = StateNotifierProvider<UserNotifier, UserModel?>((ref) {
  return UserNotifier();
});

// ── 2. DRAFT REPORTING FORM STATE ───────────────────────────────────────────
class DraftReport {
  final String issueType;
  final int operatorId;
  final String operatorName;
  final String description;
  final String district;
  final int? districtId;
  final String areaDetail;
  final double lat;
  final double lng;
  final List<String> attachments;
  // Billing & Mobile Money fields
  final String? billingSubCategory;
  final String? transactionRef;
  final double? disputedAmount;
  final String? transactionDate;
  // Severity: LOW, MEDIUM, HIGH, EMERGENCY
  final String severity;
  // Contact info (pre-filled from user profile, editable on contact step)
  final String? contactName;
  final String? contactPhone;
  final String? contactEmail;

  const DraftReport({
    this.issueType = "Call Drops",
    this.operatorId = 2, // Africell by default
    this.operatorName = "Africell",
    this.description = "",
    this.district = "Kenema District",
    this.districtId,
    this.areaDetail = "12 Bockarie Gbay Street",
    this.lat = 8.1189,
    this.lng = -11.1963,
    this.attachments = const [],
    this.billingSubCategory,
    this.transactionRef,
    this.disputedAmount,
    this.transactionDate,
    this.severity = 'MEDIUM',
    this.contactName,
    this.contactPhone,
    this.contactEmail,
  });

  bool get isBillingType =>
      issueType == 'Billing Dispute' || issueType == 'Mobile Money';

  DraftReport copyWith({
    String? issueType,
    int? operatorId,
    String? operatorName,
    String? description,
    String? district,
    int? districtId,
    bool clearDistrictId = false,
    String? areaDetail,
    double? lat,
    double? lng,
    List<String>? attachments,
    String? billingSubCategory,
    String? transactionRef,
    double? disputedAmount,
    String? transactionDate,
    String? severity,
    String? contactName,
    String? contactPhone,
    String? contactEmail,
  }) {
    return DraftReport(
      issueType: issueType ?? this.issueType,
      operatorId: operatorId ?? this.operatorId,
      operatorName: operatorName ?? this.operatorName,
      description: description ?? this.description,
      district: district ?? this.district,
      districtId: clearDistrictId ? null : (districtId ?? this.districtId),
      areaDetail: areaDetail ?? this.areaDetail,
      lat: lat ?? this.lat,
      lng: lng ?? this.lng,
      attachments: attachments ?? this.attachments,
      billingSubCategory: billingSubCategory ?? this.billingSubCategory,
      transactionRef: transactionRef ?? this.transactionRef,
      disputedAmount: disputedAmount ?? this.disputedAmount,
      transactionDate: transactionDate ?? this.transactionDate,
      severity: severity ?? this.severity,
      contactName: contactName ?? this.contactName,
      contactPhone: contactPhone ?? this.contactPhone,
      contactEmail: contactEmail ?? this.contactEmail,
    );
  }
}

class DraftReportNotifier extends StateNotifier<DraftReport> {
  DraftReportNotifier() : super(const DraftReport());

  void updateIssueType(String val) => state = state.copyWith(issueType: val);
  void updateOperator(int id, String name) => state = state.copyWith(operatorId: id, operatorName: name);
  void updateDescription(String val) => state = state.copyWith(description: val);
  void updateLocation(String street, String city, double lat, double lng) =>
      state = state.copyWith(areaDetail: street, district: city, lat: lat, lng: lng);
  void updateDistrict(int id, String name) =>
      state = state.copyWith(districtId: id, district: name);
  void addAttachment(String path) => state = state.copyWith(attachments: [...state.attachments, path]);
  void clearAttachments() => state = state.copyWith(attachments: const []);
  // Billing & Mobile Money setters
  void updateBillingSubCategory(String val) => state = state.copyWith(billingSubCategory: val);
  void updateTransactionRef(String val) => state = state.copyWith(transactionRef: val);
  void updateDisputedAmount(double val) => state = state.copyWith(disputedAmount: val);
  void updateTransactionDate(String val) => state = state.copyWith(transactionDate: val);
  void updateSeverity(String val) => state = state.copyWith(severity: val);
  void updateContact(String name, String phone, String email) =>
      state = state.copyWith(contactName: name, contactPhone: phone, contactEmail: email);
  void reset() => state = const DraftReport();
}

final draftReportProvider = StateNotifierProvider<DraftReportNotifier, DraftReport>((ref) {
  return DraftReportNotifier();
});

// ── District name → backend ID mapping ──────────────────────────────────────
const _districtNameToId = <String, int>{
  'Western Area Urban': 1, 'Western Area Rural': 2,
  'Bo': 3, 'Bonthe': 4, 'Moyamba': 5, 'Pujehun': 6,
  'Kenema': 7, 'Kailahun': 8, 'Kono': 9, 'Bombali': 10,
  'Kambia': 11, 'Koinadugu': 12, 'Port Loko': 13, 'Tonkolili': 14,
  'Falaba': 15, 'Karene': 16,
};

int? _districtIdFromName(String name) {
  final id = _districtNameToId[name];
  if (id != null) return id;
  final clean = name.replaceAll(RegExp(r'\s*(District|Province|Region)\s*', caseSensitive: false), '').trim();
  final id2 = _districtNameToId[clean];
  if (id2 != null) return id2;
  for (final entry in _districtNameToId.entries) {
    if (clean.toLowerCase().contains(entry.key.toLowerCase()) ||
        entry.key.toLowerCase().contains(clean.toLowerCase())) return entry.value;
  }
  return null;
}

// ── SUBMIT RESULT ──────────────────────────────────────────────────────────
class SubmitResult {
  final bool success;
  final String complaintRef;
  final String status;
  final List<String> notifiedChannels;

  const SubmitResult({
    required this.success,
    required this.complaintRef,
    required this.status,
    required this.notifiedChannels,
  });
}

// ── 3. COMPLAINTS LIST DATABASE STATE ──────────────────────────────────────
class ComplaintsNotifier extends StateNotifier<List<ComplaintItem>> {
  ComplaintsNotifier() : super(_initialMockComplaints()) {
    _restoreOfflineQueue().then((_) => fetchComplaints());
  }

  Future<void> _restoreOfflineQueue() async {
    final prefs = await SharedPreferences.getInstance();
    final queuedStrs = prefs.getStringList('offline_complaints') ?? [];
    if (queuedStrs.isEmpty) return;
    final queued = queuedStrs
        .map((s) => ComplaintItem.fromJson(json.decode(s)))
        .toList();
    // Prepend queued items, removing any duplicates already in mock state
    final existingIds = state.map((e) => e.id).toSet();
    final newItems = queued.where((e) => !existingIds.contains(e.id)).toList();
    if (newItems.isNotEmpty) state = [...newItems, ...state];
  }

  Future<void> fetchComplaints() async {
    try {
      final response = await apiClient.get('/complaints', auth: true).timeout(const Duration(milliseconds: 3000));
      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        if (data != null && data['rows'] != null) {
          final List rows = data['rows'];
          final List<ComplaintItem> loaded = [];
          for (var item in rows) {
            loaded.add(ComplaintItem(
              id: item['complaint_id'] ?? 0,
              reference: item['complaint_ref'] ?? '',
              operatorId: item['operator_id'] ?? 0,
              operatorName: _getOperatorName(item['operator_id']),
              issueType: item['issue_type'] ?? 'No Signal',
              description: item['description'] ?? '',
              district: item['district'] ?? 'Kenema',
              areaDetail: item['area_detail'] ?? '',
              lat: double.tryParse(item['lat']?.toString() ?? '8.11') ?? 8.11,
              lng: double.tryParse(item['lng']?.toString() ?? '-11.19') ?? -11.19,
              status: item['status'] ?? 'NEW',
              createdAt: item['created_at'] ?? '',
            ));
          }
          if (loaded.isNotEmpty) {
            state = loaded;
          }
        }
      }
    } catch (_) {
      // Offline fallback: keep pre-populated mock complaints
    }
  }

  Future<SubmitResult> submitNewComplaint(DraftReport draft, {Map<String, dynamic>? networkDiagnostics}) async {
    final now = DateTime.now();
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    final hour12 = now.hour == 0 ? 12 : (now.hour > 12 ? now.hour - 12 : now.hour);
    final dateStr = "${now.day} ${months[now.month - 1]} ${now.year}, ${hour12.toString().padLeft(2, '0')}:${now.minute.toString().padLeft(2, '0')} ${now.hour >= 12 ? 'PM' : 'AM'}";
    final refCode = "CN${now.millisecondsSinceEpoch.toString().substring(4)}";

    final newItem = ComplaintItem(
      id: now.millisecondsSinceEpoch,
      reference: refCode,
      operatorId: draft.operatorId,
      operatorName: draft.operatorName,
      issueType: draft.issueType,
      description: draft.description,
      district: draft.district,
      areaDetail: draft.areaDetail,
      lat: draft.lat,
      lng: draft.lng,
      status: 'QUEUED',
      createdAt: dateStr,
      billingSubCategory: draft.billingSubCategory,
      transactionRef: draft.transactionRef,
      disputedAmount: draft.disputedAmount,
      transactionDate: draft.transactionDate,
    );

    state = [newItem, ...state];

    try {
      final districtId = draft.districtId ?? _districtIdFromName(draft.district);
      final body = <String, dynamic>{
        'operatorId': draft.operatorId,
        'issueType': draft.issueType,
        'severity': mapSeverity(draft.severity),
        if (districtId != null) 'districtId': districtId,
        'areaDetail': draft.areaDetail,
        'latitude': draft.lat,
        'longitude': draft.lng,
        'description': draft.description,
        'source': 'MOBILE',
        if (draft.contactName != null) 'contactName': draft.contactName,
        if (draft.contactPhone != null) 'contactPhone': draft.contactPhone,
        if (draft.contactEmail != null && draft.contactEmail!.isNotEmpty) 'contactEmail': draft.contactEmail,
        if (draft.isBillingType) ...{
          'billingSubCategory': draft.billingSubCategory,
          'transactionRef': draft.transactionRef,
          'disputedAmount': draft.disputedAmount,
          'transactionDate': draft.transactionDate,
        },
        if (networkDiagnostics != null) 'networkDiagnostics': networkDiagnostics,
      };

      final response = await apiClient.post('/complaints/submit', body, auth: true)
          .timeout(const Duration(seconds: 10));

      if (response.statusCode == 200 || response.statusCode == 201) {
        final data = json.decode(response.body);
        final respData = data['data'] ?? data;
        final complaintRef = respData['complaint_ref'] as String? ?? refCode;
        final status = respData['status'] as String? ?? 'NEW';
        final channels = (respData['notifiedChannels'] as List?)?.map((e) => e.toString()).toList() ?? [];

        state = [
          newItem.copyWith(status: 'NEW'),
          ...state.where((e) => e.id != newItem.id),
        ];
        return SubmitResult(success: true, complaintRef: complaintRef, status: status, notifiedChannels: channels);
      } else {
        await _queueOfflineComplaint(newItem);
        return SubmitResult(success: false, complaintRef: refCode, status: 'QUEUED', notifiedChannels: []);
      }
    } catch (e) {
      await _queueOfflineComplaint(newItem);
      return SubmitResult(success: false, complaintRef: refCode, status: 'QUEUED', notifiedChannels: []);
    }
  }

  Future<void> _queueOfflineComplaint(ComplaintItem item) async {
    final prefs = await SharedPreferences.getInstance();
    final queuedStrs = prefs.getStringList('offline_complaints') ?? [];
    queuedStrs.add(json.encode(item.toJson()));
    await prefs.setStringList('offline_complaints', queuedStrs);
  }

  Future<List<ComplaintItem>> getOfflineComplaints() async {
    final prefs = await SharedPreferences.getInstance();
    final queuedStrs = prefs.getStringList('offline_complaints') ?? [];
    return queuedStrs.map((s) => ComplaintItem.fromJson(json.decode(s))).toList();
  }

  Future<void> clearOfflineComplaints() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('offline_complaints');
    
    // Remove QUEUED items from local state (optional, if we are clearing them manually)
    state = state.where((e) => e.status != 'QUEUED').toList();
  }

  Future<bool> syncOfflineComplaints() async {
    final offlineItems = await getOfflineComplaints();
    if (offlineItems.isEmpty) return true;

    bool allSynced = true;
    for (var item in offlineItems) {
      // Try to sync each
      try {
        final body = <String, dynamic>{
          'operator_id': item.operatorId,
          'issue_type': item.issueType,
          'severity': 'MEDIUM',
          'district': item.district,
          'area_detail': item.areaDetail,
          'lat': item.lat,
          'lng': item.lng,
          'description': item.description,
          'source': 'MOBILE',
          if (item.isBillingComplaint) ...{
            'billing_sub_category': item.billingSubCategory,
            'transaction_ref': item.transactionRef,
            'disputed_amount': item.disputedAmount,
            'transaction_date': item.transactionDate,
          },
        };

        final response = await apiClient.post('/complaints/submit', body, auth: true)
            .timeout(const Duration(seconds: 10));
        
        if (response.statusCode != 200 && response.statusCode != 201) {
          allSynced = false;
        } else {
          // Update local status
          state = state.map((e) {
            if (e.id == item.id) return e.copyWith(status: 'NEW');
            return e;
          }).toList();
        }
      } catch (_) {
        allSynced = false;
      }
    }

    if (allSynced) {
      final prefs = await SharedPreferences.getInstance();
      await prefs.remove('offline_complaints');
    }
    return allSynced;
  }

  void updateComplaintStatus(int id, String newStatus) {
    state = state.map((c) {
      if (c.id == id) {
        return c.copyWith(status: newStatus);
      }
      return c;
    }).toList();
  }

  void updateComplaintPriority(int id, String priority) {
    state = state.map((c) {
      if (c.id == id) {
        return c.copyWith(priority: priority);
      }
      return c;
    }).toList();
  }

  void assignOfficer(int id, String officerName) {
    state = state.map((c) {
      if (c.id == id) {
        return c.copyWith(assignedOfficer: officerName);
      }
      return c;
    }).toList();
  }

  void addAdminNote(int id, String noteText) {
    state = state.map((c) {
      if (c.id == id) {
        final updatedNotes = List<String>.from(c.adminNotes)..add(noteText);
        return c.copyWith(adminNotes: updatedNotes);
      }
      return c;
    }).toList();
  }

  String _getOperatorName(int id) {
    switch (id) {
      case 1: return "Orange";
      case 2: return "Africell";
      case 3: return "Qcell";
      case 4: return "Sierra Tel";
      default: return "Other";
    }
  }

  static List<ComplaintItem> _initialMockComplaints() {
    return [
      ComplaintItem(
        id: 1,
        reference: "CN123456789",
        operatorId: 2,
        operatorName: "Africell",
        issueType: "Call Drops",
        description: "Calls keep dropping even when I have full signal.",
        district: "Kenema",
        areaDetail: "12 Bockarie Gbay Street",
        lat: 8.1189,
        lng: -11.1963,
        status: "IN_PROGRESS",
        priority: "HIGH",
        createdAt: "11 Jul 2025, 10:30 AM",
        assignedOfficer: "NatCA Inspector Kamara",
        adminNotes: ["Dispatched field inspector to Kenema cell tower #4", "Africell tech team alerted of packet loss"],
      ),
      ComplaintItem(
        id: 2,
        reference: "CN123456790",
        operatorId: 4,
        operatorName: "Sierra Tel",
        issueType: "Slow Internet",
        description: "LTE speeds are extremely low in the afternoon.",
        district: "Western Area Urban",
        areaDetail: "Siaka Stevens Street, Freetown",
        lat: 8.484,
        lng: -13.229,
        status: "NEW",
        priority: "MEDIUM",
        createdAt: "09 Jul 2025, 02:15 PM",
        assignedOfficer: "Unassigned",
        adminNotes: ["Pending initial regulatory triage"],
      ),
      ComplaintItem(
        id: 3,
        reference: "CN123456791",
        operatorId: 2,
        operatorName: "Orange",
        issueType: "Mobile Money",
        description: "Failed Cash-Out transaction of SLE 450. Money deducted but cash not dispensed.",
        district: "Bo District",
        areaDetail: "Bo Central Market",
        lat: 7.9647,
        lng: -11.7383,
        status: "IN_PROGRESS",
        priority: "EMERGENCY",
        createdAt: "08 Jul 2025, 11:20 AM",
        billingSubCategory: "Failed Transfer / Cash Out",
        transactionRef: "OM-88392019",
        disputedAmount: 450.00,
        transactionDate: "08 Jul 2025",
        assignedOfficer: "FinTech Compliance Officer Saccoh",
        adminNotes: ["Escalated to Orange Money Disputes Desk", "Reconciliation statement requested from bank gateway"],
      ),
      ComplaintItem(
        id: 4,
        reference: "CN123456792",
        operatorId: 2,
        operatorName: "Orange",
        issueType: "No Signal",
        description: "Zero reception inside buildings on main street.",
        district: "Kenema",
        areaDetail: "Gbangbatoke",
        lat: 8.0830,
        lng: -11.3120,
        status: "RESOLVED",
        priority: "LOW",
        createdAt: "05 Jul 2025, 09:45 AM",
        assignedOfficer: "Eng. Sesay",
        adminNotes: ["Orange restored secondary BTS repeater node"],
      ),
      ComplaintItem(
        id: 5,
        reference: "CN123456793",
        operatorId: 4,
        operatorName: "Qcell",
        issueType: "Billing Dispute",
        description: "Data bundle expired after 2 hours despite 10GB remaining.",
        district: "Makeni",
        areaDetail: "Station Road, Makeni",
        lat: 8.8856,
        lng: -12.0439,
        status: "ESCALATED",
        priority: "HIGH",
        createdAt: "03 Jul 2025, 04:10 PM",
        billingSubCategory: "Unjust Data Depletion",
        transactionRef: "QC-992014",
        disputedAmount: 120.00,
        transactionDate: "03 Jul 2025",
        assignedOfficer: "NatCA Senior Legal Counsel",
        adminNotes: ["Operator failed 48h SLA response deadline", "Formal notice of regulatory query dispatched"],
      ),
      ComplaintItem(
        id: 6,
        reference: "CN123456794",
        operatorId: 4,
        operatorName: "Qcell",
        issueType: "No Internet",
        description: "Data service has been completely offline for 24h.",
        district: "Kenema",
        areaDetail: "Kenema City Centre",
        lat: 8.1150,
        lng: -11.2010,
        status: "CLOSED",
        priority: "MEDIUM",
        createdAt: "01 Jul 2025, 08:00 AM",
        assignedOfficer: "Eng. Bangura",
        adminNotes: ["Fiber optic cut repaired by Qcell core engineering"],
      ),
    ];
  }
}

final complaintsProvider = StateNotifierProvider<ComplaintsNotifier, List<ComplaintItem>>((ref) {
  return ComplaintsNotifier();
});

// ── ADMIN FILTER PROVIDERS ──────────────────────────────────────────────────
final adminSearchQueryProvider = StateProvider<String>((ref) => '');
final adminOperatorFilterProvider = StateProvider<String>((ref) => 'ALL');
final adminStatusFilterProvider = StateProvider<String>((ref) => 'ALL');
final adminPriorityFilterProvider = StateProvider<String>((ref) => 'ALL');
final adminDistrictFilterProvider = StateProvider<String>((ref) => 'ALL');

final filteredComplaintsProvider = Provider<List<ComplaintItem>>((ref) {
  final complaints = ref.watch(complaintsProvider);
  final query = ref.watch(adminSearchQueryProvider).toLowerCase();
  final opFilter = ref.watch(adminOperatorFilterProvider);
  final statusFilter = ref.watch(adminStatusFilterProvider);
  final priorityFilter = ref.watch(adminPriorityFilterProvider);
  final districtFilter = ref.watch(adminDistrictFilterProvider);

  return complaints.where((item) {
    if (opFilter != 'ALL' && item.operatorName != opFilter) return false;
    if (statusFilter != 'ALL' && item.status != statusFilter) return false;
    if (priorityFilter != 'ALL' && item.priority != priorityFilter) return false;
    if (districtFilter != 'ALL' && item.district != districtFilter) return false;
    if (query.isNotEmpty) {
      final matchRef = item.reference.toLowerCase().contains(query);
      final matchDesc = item.description.toLowerCase().contains(query);
      final matchIssue = item.issueType.toLowerCase().contains(query);
      final matchArea = item.areaDetail.toLowerCase().contains(query);
      final matchOfficer = (item.assignedOfficer ?? '').toLowerCase().contains(query);
      if (!matchRef && !matchDesc && !matchIssue && !matchArea && !matchOfficer) return false;
    }
    return true;
  }).toList();
});


// ── 4. NOTIFICATIONS TIMELINE STATE ────────────────────────────────────────
class NotificationsNotifier extends StateNotifier<List<NotificationItem>> {
  NotificationsNotifier() : super(_initialNotifications());

  void markAllRead() {
    state = state.map((n) => n.copyWith(isUnread: false)).toList();
  }

  static List<NotificationItem> _initialNotifications() {
    return const [
      NotificationItem(
        id: "notif-1",
        title: "Complaint Update",
        body: "Your complaint #CN123456789 has been assigned to our technical team.",
        time: "2 hours ago",
        isUnread: true,
        icon: Icons.assignment_turned_in_outlined,
        iconColor: AppColors.primaryBlue,
      ),
      NotificationItem(
        id: "notif-2",
        title: "NatCA Announcement",
        body: "Scheduled maintenance on Orange network in Kenema, 12 Jul 2025.",
        time: "5 hours ago",
        isUnread: true,
        icon: Icons.campaign_outlined,
        iconColor: AppColors.warningOrange,
      ),
      NotificationItem(
        id: "notif-3",
        title: "Complaint Resolved",
        body: "Your No Signal complaint in Gbangbatoke has been resolved.",
        time: "Yesterday",
        isUnread: false,
        icon: Icons.check_circle_outline_rounded,
        iconColor: AppColors.successGreen,
      ),
    ];
  }
}

final notificationsProvider = StateNotifierProvider<NotificationsNotifier, List<NotificationItem>>((ref) {
  return NotificationsNotifier();
});

// ── 5. SPEED TEST HISTORY STATE ──────────────────────────────────────────────
class SpeedTestHistoryNotifier extends StateNotifier<List<SpeedTestResult>> {
  SpeedTestHistoryNotifier() : super([]) {
    _loadHistory();
  }

  Future<void> _loadHistory() async {
    final prefs = await SharedPreferences.getInstance();
    final List<String> saved = prefs.getStringList('speed_test_history') ?? [];
    state = saved.map((s) => SpeedTestResult.fromJson(json.decode(s))).toList();
  }

  Future<void> addResult(SpeedTestResult result) async {
    state = [result, ...state];
    final prefs = await SharedPreferences.getInstance();
    final List<String> saved = state.map((r) => json.encode(r.toJson())).toList();
    await prefs.setStringList('speed_test_history', saved);
  }
}

final speedTestHistoryProvider = StateNotifierProvider<SpeedTestHistoryNotifier, List<SpeedTestResult>>((ref) {
  return SpeedTestHistoryNotifier();
});
