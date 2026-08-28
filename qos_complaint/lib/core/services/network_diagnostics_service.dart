import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';
import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:device_info_plus/device_info_plus.dart';
import 'package:http/http.dart' as http;

class NetworkDiagnostics {
  final String connectionType;
  final String estimatedGeneration;
  final int? pingMs;
  final String device;
  final String? deviceModel;
  final String? osVersion;
  final String? carrier;
  final String? radioType;
  final int? cellId;
  final int? lac;
  final int? signalStrength;
  final String? mcc;
  final String? mnc;

  const NetworkDiagnostics({
    required this.connectionType,
    required this.estimatedGeneration,
    this.pingMs,
    required this.device,
    this.deviceModel,
    this.osVersion,
    this.carrier,
    this.radioType,
    this.cellId,
    this.lac,
    this.signalStrength,
    this.mcc,
    this.mnc,
  });

  Map<String, dynamic> toJson() {
    return {
      'connectionType': connectionType,
      'estimatedGeneration': estimatedGeneration,
      if (pingMs != null) 'pingMs': pingMs,
      'device': device,
      if (deviceModel != null) 'deviceModel': deviceModel,
      if (osVersion != null) 'osVersion': osVersion,
      if (carrier != null) 'carrier': carrier,
      if (radioType != null) 'radioType': radioType,
      if (cellId != null) 'cellId': cellId,
      if (lac != null) 'lac': lac,
      if (signalStrength != null) 'signalStrength': signalStrength,
      if (mcc != null) 'mcc': mcc,
      if (mnc != null) 'mnc': mnc,
    };
  }
}

class NetworkDiagnosticsService {
  static const _channel = MethodChannel('com.natca.qoe/cell_info');

  static String get _pingUrl {
    if (kDebugMode) {
      if (kIsWeb) return 'http://localhost:5000/';
      if (defaultTargetPlatform == TargetPlatform.android) return 'http://10.0.2.2:5000/';
      return 'http://localhost:5000/';
    }
    return 'https://natca-cms-backend.onrender.com/';
  }

  static Future<NetworkDiagnostics> capture(Size screenSize) async {
    final results = await Future.wait([
      _getConnectionType(),
      _measurePing(),
      _getDeviceInfo(screenSize),
      _getCellInfo(),
    ]);

    final connType = results[0] as String;
    final pingResult = results[1] as _PingResult;
    final deviceInfo = results[2] as _DeviceInfo;
    final cellInfo = results[3] as _CellInfo;

    final generation = _estimateGeneration(connType, pingResult.ms);

    return NetworkDiagnostics(
      connectionType: connType,
      estimatedGeneration: generation,
      pingMs: pingResult.ms,
      device: deviceInfo.summary,
      deviceModel: deviceInfo.model,
      osVersion: deviceInfo.osVersion,
      carrier: cellInfo.carrier,
      radioType: cellInfo.radioType,
      cellId: cellInfo.cellId,
      lac: cellInfo.lac,
      signalStrength: cellInfo.signalStrength,
      mcc: cellInfo.mcc,
      mnc: cellInfo.mnc,
    );
  }

  static Future<String> _getConnectionType() async {
    try {
      final result = await Connectivity().checkConnectivity();
      if (result.contains(ConnectivityResult.wifi)) return 'WiFi';
      if (result.contains(ConnectivityResult.mobile)) return 'Mobile Data';
      if (result.contains(ConnectivityResult.ethernet)) return 'Ethernet';
      if (result.contains(ConnectivityResult.vpn)) return 'VPN';
      if (result.contains(ConnectivityResult.none)) return 'No Connection';
      return 'Unknown';
    } catch (_) {
      return 'Unknown';
    }
  }

  static Future<_PingResult> _measurePing() async {
    try {
      final sw = Stopwatch()..start();
      await http.get(Uri.parse(_pingUrl)).timeout(const Duration(seconds: 6));
      sw.stop();
      return _PingResult(ms: sw.elapsedMilliseconds);
    } catch (_) {
      return const _PingResult(ms: null);
    }
  }

  static String _estimateGeneration(String connType, int? pingMs) {
    if (connType == 'WiFi') return 'WiFi';
    if (connType == 'Ethernet') return 'Ethernet';
    if (connType == 'No Connection') return 'None';
    if (pingMs == null) return 'Unknown';
    if (pingMs < 60) return '4G/LTE';
    if (pingMs < 180) return '4G';
    if (pingMs < 500) return '3G';
    return '2G/EDGE';
  }

  static Future<_DeviceInfo> _getDeviceInfo(Size screenSize) async {
    try {
      final deviceInfoPlugin = DeviceInfoPlugin();
      String os;
      String? model;
      String? osVersion;

      if (kIsWeb) {
        final webInfo = await deviceInfoPlugin.webBrowserInfo;
        os = 'Web';
        model = webInfo.browserName.name;
        osVersion = webInfo.platform;
      } else {
        switch (defaultTargetPlatform) {
          case TargetPlatform.android:
            final androidInfo = await deviceInfoPlugin.androidInfo;
            os = 'Android';
            model = '${androidInfo.manufacturer} ${androidInfo.model}';
            osVersion = 'Android ${androidInfo.version.release} (SDK ${androidInfo.version.sdkInt})';
          case TargetPlatform.iOS:
            final iosInfo = await deviceInfoPlugin.iosInfo;
            os = 'iOS';
            model = iosInfo.utsname.machine;
            osVersion = '${iosInfo.systemName} ${iosInfo.systemVersion}';
          default:
            os = defaultTargetPlatform.name;
            model = null;
            osVersion = null;
        }
      }

      final summary = '$os · ${screenSize.width.toInt()}×${screenSize.height.toInt()}';
      return _DeviceInfo(summary: summary, model: model, osVersion: osVersion);
    } catch (_) {
      final os = kIsWeb ? 'Web' : defaultTargetPlatform.name;
      return _DeviceInfo(
        summary: '$os · ${screenSize.width.toInt()}×${screenSize.height.toInt()}',
      );
    }
  }

  static Future<_CellInfo> _getCellInfo() async {
    if (kIsWeb) return const _CellInfo();

    if (defaultTargetPlatform != TargetPlatform.android) {
      return const _CellInfo();
    }

    try {
      final result = await _channel.invokeMethod('getCellInfo');
      if (result is Map) {
        return _CellInfo(
          carrier: result['carrier'] as String?,
          radioType: result['radioType'] as String?,
          cellId: result['cellId'] as int?,
          lac: result['lac'] as int?,
          signalStrength: result['signalStrength'] as int?,
          mcc: result['mcc'] as String?,
          mnc: result['mnc'] as String?,
        );
      }
    } on MissingPluginException {
      // Method channel not implemented on this platform
    } catch (_) {
      // Cell info not available
    }

    return const _CellInfo();
  }
}

class _PingResult {
  final int? ms;
  const _PingResult({this.ms});
}

class _DeviceInfo {
  final String summary;
  final String? model;
  final String? osVersion;
  const _DeviceInfo({required this.summary, this.model, this.osVersion});
}

class _CellInfo {
  final String? carrier;
  final String? radioType;
  final int? cellId;
  final int? lac;
  final int? signalStrength;
  final String? mcc;
  final String? mnc;
  const _CellInfo({
    this.carrier,
    this.radioType,
    this.cellId,
    this.lac,
    this.signalStrength,
    this.mcc,
    this.mnc,
  });
}
