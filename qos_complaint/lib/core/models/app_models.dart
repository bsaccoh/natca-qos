import 'package:flutter/material.dart';

class ComplaintItem {
  final int id;
  final String reference;
  final int operatorId;
  final String operatorName;
  final String issueType;
  final String description;
  final String district;
  final String areaDetail;
  final double lat;
  final double lng;
  final String status; // 'NEW', 'IN_PROGRESS', 'RESOLVED', 'CLOSED', 'ESCALATED'
  final String priority; // 'LOW', 'MEDIUM', 'HIGH', 'EMERGENCY'
  final String createdAt;
  final String? assignedOfficer;
  final List<String> adminNotes;
  // Billing & Mobile Money fields (null for standard network complaints)
  final String? billingSubCategory;
  final String? transactionRef;
  final double? disputedAmount;
  final String? transactionDate;
  final int? citizenRating;
  final String? citizenFeedback;

  const ComplaintItem({
    required this.id,
    required this.reference,
    required this.operatorId,
    required this.operatorName,
    required this.issueType,
    required this.description,
    required this.district,
    required this.areaDetail,
    required this.lat,
    required this.lng,
    required this.status,
    this.priority = 'MEDIUM',
    required this.createdAt,
    this.assignedOfficer,
    this.adminNotes = const [],
    this.billingSubCategory,
    this.transactionRef,
    this.disputedAmount,
    this.transactionDate,
    this.citizenRating,
    this.citizenFeedback,
  });

  bool get isBillingComplaint =>
      issueType == 'Billing Dispute' || issueType == 'Mobile Money';

  ComplaintItem copyWith({
    String? status,
    String? priority,
    String? assignedOfficer,
    List<String>? adminNotes,
    int? citizenRating,
    String? citizenFeedback,
  }) {
    return ComplaintItem(
      id: id,
      reference: reference,
      operatorId: operatorId,
      operatorName: operatorName,
      issueType: issueType,
      description: description,
      district: district,
      areaDetail: areaDetail,
      lat: lat,
      lng: lng,
      status: status ?? this.status,
      priority: priority ?? this.priority,
      createdAt: createdAt,
      assignedOfficer: assignedOfficer ?? this.assignedOfficer,
      adminNotes: adminNotes ?? this.adminNotes,
      billingSubCategory: billingSubCategory,
      transactionRef: transactionRef,
      disputedAmount: disputedAmount,
      transactionDate: transactionDate,
      citizenRating: citizenRating ?? this.citizenRating,
      citizenFeedback: citizenFeedback ?? this.citizenFeedback,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'reference': reference,
      'operatorId': operatorId,
      'operatorName': operatorName,
      'issueType': issueType,
      'description': description,
      'district': district,
      'areaDetail': areaDetail,
      'lat': lat,
      'lng': lng,
      'status': status,
      'priority': priority,
      'createdAt': createdAt,
      'assignedOfficer': assignedOfficer,
      'adminNotes': adminNotes,
      'billingSubCategory': billingSubCategory,
      'transactionRef': transactionRef,
      'disputedAmount': disputedAmount,
      'transactionDate': transactionDate,
      'citizenRating': citizenRating,
      'citizenFeedback': citizenFeedback,
    };
  }

  factory ComplaintItem.fromJson(Map<String, dynamic> json) {
    return ComplaintItem(
      id: json['id'] as int,
      reference: json['reference'] as String,
      operatorId: json['operatorId'] as int,
      operatorName: json['operatorName'] as String,
      issueType: json['issueType'] as String,
      description: json['description'] as String,
      district: json['district'] as String,
      areaDetail: json['areaDetail'] as String,
      lat: (json['lat'] as num).toDouble(),
      lng: (json['lng'] as num).toDouble(),
      status: json['status'] as String,
      priority: json['priority'] as String? ?? 'MEDIUM',
      createdAt: json['createdAt'] as String,
      assignedOfficer: json['assignedOfficer'] as String?,
      adminNotes: (json['adminNotes'] as List?)?.map((e) => e.toString()).toList() ?? const [],
      billingSubCategory: json['billingSubCategory'] as String?,
      transactionRef: json['transactionRef'] as String?,
      disputedAmount: json['disputedAmount'] != null ? (json['disputedAmount'] as num).toDouble() : null,
      transactionDate: json['transactionDate'] as String?,
      citizenRating: json['citizenRating'] as int?,
      citizenFeedback: json['citizenFeedback'] as String?,
    );
  }
}

class OperatorSlaStats {
  final int operatorId;
  final String operatorName;
  final int totalComplaints;
  final int resolvedComplaints;
  final double slaCompliancePercent; // e.g. 96.5%
  final double avgResolutionHours;   // e.g. 4.2 hours
  final double droppedCallRate;      // e.g. 1.2%
  final Color brandColor;

  const OperatorSlaStats({
    required this.operatorId,
    required this.operatorName,
    required this.totalComplaints,
    required this.resolvedComplaints,
    required this.slaCompliancePercent,
    required this.avgResolutionHours,
    required this.droppedCallRate,
    required this.brandColor,
  });
}


class UpdateTimelineEvent {
  final String title;
  final String timestamp;
  final String description;
  final Color dotColor;

  const UpdateTimelineEvent({
    required this.title,
    required this.timestamp,
    required this.description,
    required this.dotColor,
  });
}

class OperatorScore {
  final String name;
  final double score;
  final String quality;
  final Color color;

  const OperatorScore({
    required this.name,
    required this.score,
    required this.quality,
    required this.color,
  });
}

class NotificationItem {
  final String id;
  final String title;
  final String body;
  final String time;
  final bool isUnread;
  final IconData icon;
  final Color iconColor;

  const NotificationItem({
    required this.id,
    required this.title,
    required this.body,
    required this.time,
    required this.isUnread,
    required this.icon,
    required this.iconColor,
  });

  NotificationItem copyWith({
    bool? isUnread,
  }) {
    return NotificationItem(
      id: id,
      title: title,
      body: body,
      time: time,
      isUnread: isUnread ?? this.isUnread,
      icon: icon,
      iconColor: iconColor,
    );
  }
}

class SpeedTestResult {
  final String id;
  final String timestamp;
  final double downloadSpeed;
  final double uploadSpeed;
  final int ping;
  final String networkType;
  final String operatorName;

  const SpeedTestResult({
    required this.id,
    required this.timestamp,
    required this.downloadSpeed,
    required this.uploadSpeed,
    required this.ping,
    required this.networkType,
    required this.operatorName,
  });

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'timestamp': timestamp,
      'downloadSpeed': downloadSpeed,
      'uploadSpeed': uploadSpeed,
      'ping': ping,
      'networkType': networkType,
      'operatorName': operatorName,
    };
  }

  factory SpeedTestResult.fromJson(Map<String, dynamic> json) {
    return SpeedTestResult(
      id: json['id'] as String,
      timestamp: json['timestamp'] as String,
      downloadSpeed: (json['downloadSpeed'] as num).toDouble(),
      uploadSpeed: (json['uploadSpeed'] as num).toDouble(),
      ping: json['ping'] as int,
      networkType: json['networkType'] as String,
      operatorName: json['operatorName'] as String,
    );
  }
}
