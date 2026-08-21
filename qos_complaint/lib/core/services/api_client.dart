import 'dart:convert';
import 'dart:io' show File;
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

// 10.0.2.2 = Android emulator loopback to host localhost
// localhost = web / Windows desktop
// For a physical device on the same WiFi, replace with your machine's LAN IP
String get _kBaseUrl {
  if (kIsWeb) return 'http://localhost:5000/api/v1';
  try {
    if (defaultTargetPlatform == TargetPlatform.android) {
      return 'http://10.0.2.2:5000/api/v1';
    }
  } catch (_) {}
  return 'http://localhost:5000/api/v1';
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
        final data = json.decode(res.body);
        final newAccess = data['accessToken'] as String?;
        final newRefresh = data['refreshToken'] as String?;
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

  Future<http.StreamedResponse> postMultipart(
    String path,
    Map<String, String> fields,
    List<MapEntry<String, File>> files,
  ) async {
    final token = await _getAccessToken();
    final request = http.MultipartRequest('POST', Uri.parse('$_kBaseUrl$path'));
    if (token != null) request.headers['Authorization'] = 'Bearer $token';
    request.fields.addAll(fields);
    for (final entry in files) {
      request.files.add(await http.MultipartFile.fromPath(entry.key, entry.value.path));
    }
    return request.send().timeout(const Duration(seconds: 30));
  }
}

final apiClient = ApiClient();
