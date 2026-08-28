import 'dart:convert';
import 'dart:typed_data';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import 'package:image_picker/image_picker.dart' show XFile;
import 'package:shared_preferences/shared_preferences.dart';

class XFileBytes {
  final XFile file;
  final Uint8List bytes;
  XFileBytes(this.file, this.bytes);
}

// 10.0.2.2 = Android emulator loopback to host localhost
// localhost = web / Windows desktop
// For a physical device on the same WiFi, replace with your machine's LAN IP
const String _kProdBase = 'https://natca-cms-backend.onrender.com/api/v1';

String get _kBaseUrl {
  if (kDebugMode) {
    if (kIsWeb) return 'http://localhost:5000/api/v1';
    try {
      if (defaultTargetPlatform == TargetPlatform.android) {
        return 'http://10.0.2.2:5000/api/v1';
      }
    } catch (_) {}
    return 'http://localhost:5000/api/v1';
  }
  return _kProdBase;
}

const String _kAccessTokenKey = 'access_token';
const String _kRefreshTokenKey = 'refresh_token';

// Backend severity enum values
const Map<String, String> _severityMap = {
  'LOW': 'LOW',
  'MEDIUM': 'MEDIUM',
  'HIGH': 'HIGH',
  'EMERGENCY': 'CRITICAL', // mobile uses EMERGENCY, backend uses CRITICAL
};

String mapSeverity(String mobileSeverity) =>
    _severityMap[mobileSeverity] ?? 'MEDIUM';

class ApiClient {
  static final ApiClient _instance = ApiClient._();
  factory ApiClient() => _instance;
  ApiClient._();

  Future<String?> _getAccessToken() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString(_kAccessTokenKey);
  }

  Future<String?> _getRefreshToken() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString(_kRefreshTokenKey);
  }

  Future<void> saveTokens({required String access, required String refresh}) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_kAccessTokenKey, access);
    await prefs.setString(_kRefreshTokenKey, refresh);
  }

  Future<void> clearTokens() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_kAccessTokenKey);
    await prefs.remove(_kRefreshTokenKey);
  }

  Future<Map<String, String>> _authHeaders() async {
    final token = await _getAccessToken();
    return {
      'Content-Type': 'application/json',
      if (token != null) 'Authorization': 'Bearer $token',
    };
  }

  // Attempt to refresh access token; returns true on success
  Future<bool> _refresh() async {
    final refreshToken = await _getRefreshToken();
    if (refreshToken == null) return false;
    try {
      final res = await http.post(
        Uri.parse('$_kBaseUrl/auth/refresh'),
        headers: {'Content-Type': 'application/json'},
        body: json.encode({'refreshToken': refreshToken}),
      ).timeout(const Duration(seconds: 10));
      if (res.statusCode == 200) {
        final body = json.decode(res.body);
        final payload = body['data'] ?? body;
        final newAccess = payload['accessToken'] as String?;
        final newRefresh = payload['refreshToken'] as String?;
        if (newAccess != null) {
          await saveTokens(
            access: newAccess,
            refresh: newRefresh ?? refreshToken,
          );
          return true;
        }
      }
    } catch (_) {}
    return false;
  }

  Future<http.Response> get(String path, {bool auth = false}) async {
    final headers = auth ? await _authHeaders() : {'Content-Type': 'application/json'};
    final res = await http.get(Uri.parse('$_kBaseUrl$path'), headers: headers)
        .timeout(const Duration(seconds: 15));
    if (res.statusCode == 401 && auth) {
      if (await _refresh()) {
        final retryHeaders = await _authHeaders();
        return http.get(Uri.parse('$_kBaseUrl$path'), headers: retryHeaders)
            .timeout(const Duration(seconds: 15));
      }
    }
    return res;
  }

  Future<http.Response> post(String path, Map<String, dynamic> body, {bool auth = false}) async {
    final headers = auth ? await _authHeaders() : {'Content-Type': 'application/json'};
    final res = await http.post(
      Uri.parse('$_kBaseUrl$path'),
      headers: headers,
      body: json.encode(body),
    ).timeout(const Duration(seconds: 15));
    if (res.statusCode == 401 && auth) {
      if (await _refresh()) {
        final retryHeaders = await _authHeaders();
        return http.post(
          Uri.parse('$_kBaseUrl$path'),
          headers: retryHeaders,
          body: json.encode(body),
        ).timeout(const Duration(seconds: 15));
      }
    }
    return res;
  }

  Future<http.Response> patch(String path, Map<String, dynamic> body, {bool auth = false}) async {
    final headers = auth ? await _authHeaders() : {'Content-Type': 'application/json'};
    final res = await http.patch(
      Uri.parse('$_kBaseUrl$path'),
      headers: headers,
      body: json.encode(body),
    ).timeout(const Duration(seconds: 15));
    if (res.statusCode == 401 && auth) {
      if (await _refresh()) {
        final retryHeaders = await _authHeaders();
        return http.patch(
          Uri.parse('$_kBaseUrl$path'),
          headers: retryHeaders,
          body: json.encode(body),
        ).timeout(const Duration(seconds: 15));
      }
    }
    return res;
  }

  Future<http.StreamedResponse> postMultipartBytes(
    String path,
    Map<String, String> fields,
    List<MapEntry<String, XFileBytes>> files,
  ) async {
    final token = await _getAccessToken();
    final request = http.MultipartRequest('POST', Uri.parse('$_kBaseUrl$path'));
    if (token != null) request.headers['Authorization'] = 'Bearer $token';
    request.fields.addAll(fields);
    for (final entry in files) {
      final xfb = entry.value;
      final ext = xfb.file.name.contains('.') ? xfb.file.name.split('.').last : 'jpg';
      request.files.add(http.MultipartFile.fromBytes(
        entry.key,
        xfb.bytes,
        filename: xfb.file.name.isNotEmpty ? xfb.file.name : '${entry.key}.$ext',
      ));
    }
    return request.send().timeout(const Duration(seconds: 30));
  }
}

final apiClient = ApiClient();
