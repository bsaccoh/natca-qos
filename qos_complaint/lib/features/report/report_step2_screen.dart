import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:geocoding/geocoding.dart';
import 'package:geolocator/geolocator.dart';
import 'package:go_router/go_router.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../../app/theme/app_theme.dart';
import '../../app/providers/state_providers.dart';
import '../../core/services/api_client.dart';
import 'widgets/report_progress.dart';

class ReportStep2Screen extends ConsumerStatefulWidget {
  const ReportStep2Screen({super.key});

  @override
  ConsumerState<ReportStep2Screen> createState() => _ReportStep2ScreenState();
}

class _ReportStep2ScreenState extends ConsumerState<ReportStep2Screen> with SingleTickerProviderStateMixin {
  late AnimationController _pulseController;

  String _currentStreet = "Fetching location…";
  String _currentCity = "Sierra Leone";
  double _currentLat = 8.4657;
  double _currentLng = -13.2317;
  bool _loadingLocation = false;

  List<Map<String, dynamic>> _districts = [];
  int? _selectedDistrictId;
  String? _selectedDistrictName;
  bool _loadingDistricts = false;

  @override
  void initState() {
    super.initState();
    _pulseController = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 2),
    )..repeat();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _getCurrentLocation();
      _fetchDistricts();
    });
  }

  Future<void> _fetchDistricts() async {
    setState(() => _loadingDistricts = true);
    try {
      final response = await apiClient.get('/districts').timeout(const Duration(seconds: 8));
      if (response.statusCode == 200 && mounted) {
        final data = json.decode(response.body);
        final rows = (data['data'] ?? data) as List;
        final parsed = rows.map<Map<String, dynamic>>((r) => <String, dynamic>{
          'district_id': r['district_id'],
          'name': r['name'],
          'province': r['province'] ?? '',
        }).toList();
        setState(() {
          _districts = parsed;
          _loadingDistricts = false;
        });
        final prefs = await SharedPreferences.getInstance();
        await prefs.setString('cached_districts', json.encode(parsed));
      } else {
        await _loadCachedDistricts();
      }
    } catch (_) {
      await _loadCachedDistricts();
    }
  }

  Future<void> _loadCachedDistricts() async {
    final prefs = await SharedPreferences.getInstance();
    final cached = prefs.getString('cached_districts');
    if (cached != null && mounted) {
      final rows = (json.decode(cached) as List).cast<Map<String, dynamic>>();
      setState(() {
        _districts = rows;
        _loadingDistricts = false;
      });
    } else {
      if (mounted) setState(() => _loadingDistricts = false);
    }
  }

  @override
  void dispose() {
    _pulseController.dispose();
    super.dispose();
  }

  Future<void> _getCurrentLocation() async {
    if (_loadingLocation) return;
    setState(() => _loadingLocation = true);

    try {
      LocationPermission permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        permission = await Geolocator.requestPermission();
        if (permission == LocationPermission.denied) {
          _setFallback("Location permission denied");
          return;
        }
      }
      if (permission == LocationPermission.deniedForever) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: const Text("Location permission permanently denied. Enable it in app settings."),
              action: SnackBarAction(label: "Settings", onPressed: Geolocator.openAppSettings),
            ),
          );
        }
        _setFallback("Location access denied");
        return;
      }

      final position = await Geolocator.getCurrentPosition(
        desiredAccuracy: LocationAccuracy.high,
      ).timeout(const Duration(seconds: 12));

      final placemarks = await placemarkFromCoordinates(
        position.latitude,
        position.longitude,
      );

      if (!mounted) return;

      String street = "Unknown Street";
      String city = "Sierra Leone";
      if (placemarks.isNotEmpty) {
        final p = placemarks.first;
        final streetParts = [p.street, p.subLocality]
            .whereType<String>()
            .where((s) => s.isNotEmpty)
            .toList();
        street = streetParts.isNotEmpty ? streetParts.join(', ') : (p.name ?? "Unknown");

        final cityParts = [p.locality, p.administrativeArea]
            .whereType<String>()
            .where((s) => s.isNotEmpty)
            .toList();
        city = cityParts.isNotEmpty ? cityParts.join(', ') : "Sierra Leone";
      }

      setState(() {
        _currentStreet = street;
        _currentCity = city;
        _currentLat = position.latitude;
        _currentLng = position.longitude;
      });
    } catch (_) {
      _setFallback("Could not get location");
    } finally {
      if (mounted) setState(() => _loadingLocation = false);
    }
  }

  void _setFallback(String reason) {
    if (!mounted) return;
    setState(() {
      _currentStreet = reason;
      _currentCity = "Sierra Leone";
      _loadingLocation = false;
    });
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
        title: Text("Location", style: AppTextStyles.h3.copyWith(fontWeight: FontWeight.bold)),
        centerTitle: true,
      ),
      body: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Subtitle and step bar
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text("Confirm your location", style: AppTextStyles.small),
                const SizedBox(height: 10),
                const ReportProgressBar(currentStep: 2),
              ],
            ),
          ),
          const SizedBox(height: 16),

          // Google Map Simulation Canvas
          Expanded(
            child: Container(
              margin: const EdgeInsets.symmetric(horizontal: 16),
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: AppColors.dynamicBorder),
              ),
              child: ClipRRect(
                borderRadius: BorderRadius.circular(16),
                child: Stack(
                  children: [
                    // Mock Google Map Painter Drawing roads, paths, rivers
                    Positioned.fill(
                      child: CustomPaint(
                        painter: _MockMapPainter(lat: _currentLat, lng: _currentLng),
                      ),
                    ),

                    // Central Target Pin + Accuracy pulse ring
                    Center(
                      child: AnimatedBuilder(
                        animation: _pulseController,
                        builder: (context, child) {
                          return CustomPaint(
                            size: const Size(120, 120),
                            painter: _MapPulsePinPainter(progress: _pulseController.value),
                          );
                        },
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
          const SizedBox(height: 16),

          // Location details card
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: AppColors.dynamicCard,
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: AppColors.dynamicBorder),
                boxShadow: const [
                  BoxShadow(color: Colors.black12, blurRadius: 6, offset: Offset(0, 2)),
                ],
              ),
              child: Row(
                children: [
                  const Icon(Icons.location_on_rounded, color: AppColors.primaryBlue, size: 24),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(_currentStreet, style: AppTextStyles.body.copyWith(fontWeight: FontWeight.bold)),
                        const SizedBox(height: 2),
                        Text(_currentCity, style: AppTextStyles.small),
                        const SizedBox(height: 4),
                        Row(
                          children: [
                            Container(
                              width: 6,
                              height: 6,
                              decoration: BoxDecoration(
                                color: _loadingLocation ? AppColors.textLight : AppColors.accentGreen,
                                shape: BoxShape.circle,
                              ),
                            ),
                            const SizedBox(width: 6),
                            Text(
                              _loadingLocation ? "Acquiring GPS signal\u2026" : "GPS \u00b7 High Accuracy",
                              style: AppTextStyles.micro.copyWith(
                                color: _loadingLocation ? AppColors.textLight : AppColors.accentGreen,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                  IconButton(
                    icon: _loadingLocation
                        ? const SizedBox(
                            width: 20,
                            height: 20,
                            child: CircularProgressIndicator(strokeWidth: 2, color: AppColors.primaryBlue),
                          )
                        : const Icon(Icons.my_location_rounded, color: AppColors.primaryBlue),
                    onPressed: _loadingLocation ? null : _getCurrentLocation,
                  ),
                ],
              ),
            ),
          ),

          const SizedBox(height: 16),

          // District dropdown
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
              decoration: BoxDecoration(
                color: AppColors.dynamicCard,
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: AppColors.dynamicBorder),
              ),
              child: _loadingDistricts
                  ? const Padding(
                      padding: EdgeInsets.symmetric(vertical: 14),
                      child: Row(
                        children: [
                          SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2)),
                          SizedBox(width: 12),
                          Text("Loading districts…"),
                        ],
                      ),
                    )
                  : DropdownButtonFormField<int>(
                      value: _selectedDistrictId,
                      decoration: InputDecoration(
                        labelText: 'District',
                        labelStyle: TextStyle(color: AppColors.textSecondary),
                        prefixIcon: const Icon(Icons.map_rounded, color: AppColors.primaryBlue, size: 20),
                        border: InputBorder.none,
                        contentPadding: EdgeInsets.zero,
                      ),
                      isExpanded: true,
                      dropdownColor: AppColors.dynamicCard,
                      style: TextStyle(color: AppColors.dynamicTextPrimary, fontSize: 14),
                      hint: Text("Select your district", style: TextStyle(color: AppColors.textSecondary, fontSize: 14)),
                      items: _districts.map<DropdownMenuItem<int>>((d) {
                        return DropdownMenuItem<int>(
                          value: d['district_id'] as int,
                          child: Text(d['name'] as String),
                        );
                      }).toList(),
                      onChanged: (id) {
                        if (id == null) return;
                        final match = _districts.firstWhere((d) => d['district_id'] == id);
                        setState(() {
                          _selectedDistrictId = id;
                          _selectedDistrictName = match['name'] as String;
                        });
                      },
                    ),
            ),
          ),
          const SizedBox(height: 16),

          // Action links
          Center(
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                GestureDetector(
                  onTap: _loadingLocation ? null : _getCurrentLocation,
                  child: Row(
                    children: [
                      Icon(Icons.navigation_outlined, size: 16, color: _loadingLocation ? AppColors.textLight : AppColors.primaryBlue),
                      const SizedBox(width: 4),
                      Text(
                        _loadingLocation ? "Getting location…" : "Use Current Location",
                        style: AppTextStyles.small.copyWith(
                          color: _loadingLocation ? AppColors.textLight : AppColors.primaryBlue,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 24),

          // Confirm Location Button
          _buildBottomCTA(context),
        ],
      ),
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
            if (_selectedDistrictId == null && _districts.isNotEmpty && !_loadingDistricts) {
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('Please select your district')),
              );
              return;
            }
            ref.read(draftReportProvider.notifier).updateLocation(
              _currentStreet,
              _currentCity,
              _currentLat,
              _currentLng,
            );
            if (_selectedDistrictId != null && _selectedDistrictName != null) {
              ref.read(draftReportProvider.notifier).updateDistrict(
                _selectedDistrictId!,
                _selectedDistrictName!,
              );
            }
            context.push('/report/contact');
          },
          style: ElevatedButton.styleFrom(
            backgroundColor: AppColors.primaryBlue,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(26),
            ),
            elevation: 4,
            shadowColor: AppColors.primaryBlue.withOpacity(0.3),
          ),
          child: Text(
            "Confirm Location",
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

class _MockMapPainter extends CustomPainter {
  final double lat;
  final double lng;

  _MockMapPainter({required this.lat, required this.lng});

  @override
  void paint(Canvas canvas, Size size) {
    final bgPaint = Paint()..color = const Color(0xFFE8ECEF);
    canvas.drawRect(Rect.fromLTWH(0, 0, size.width, size.height), bgPaint);

    final roadPaint = Paint()
      ..color = Colors.white
      ..style = PaintingStyle.stroke
      ..strokeWidth = 14.0;

    final parkPaint = Paint()
      ..color = const Color(0xFFD4E6D6)
      ..style = PaintingStyle.fill;

    // Draw parks
    canvas.drawRect(Rect.fromLTWH(20, 20, 100, 80), parkPaint);
    canvas.drawRect(Rect.fromLTWH(size.width - 120, size.height - 110, 90, 80), parkPaint);

    // Draw roads grid
    final roadPath = Path();
    roadPath.moveTo(0, size.height * 0.3);
    roadPath.lineTo(size.width, size.height * 0.35);

    roadPath.moveTo(size.width * 0.3, 0);
    roadPath.lineTo(size.width * 0.35, size.height);

    roadPath.moveTo(0, size.height * 0.7);
    roadPath.cubicTo(size.width * 0.3, size.height * 0.75, size.width * 0.6, size.height * 0.55, size.width, size.height * 0.65);

    canvas.drawPath(roadPath, roadPaint);

    // Outline roads border (grey)
    final borderPaint = Paint()
      ..color = const Color(0xFFCBD3D8)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1.0;
    canvas.drawPath(roadPath, borderPaint);
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => true;
}

class _MapPulsePinPainter extends CustomPainter {
  final double progress;

  _MapPulsePinPainter({required this.progress});

  @override
  void paint(Canvas canvas, Size size) {
    final cx = size.width / 2;
    final cy = size.height / 2;

    // 1. Draw accuracy pulse rings
    final pulsePaint = Paint()
      ..color = AppColors.primaryBlue.withOpacity((1.0 - progress) * 0.3)
      ..style = PaintingStyle.fill;
    canvas.drawCircle(Offset(cx, cy), 10 + progress * 30, pulsePaint);

    final pulseBorder = Paint()
      ..color = AppColors.primaryBlue.withOpacity((1.0 - progress) * 0.5)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 2.0;
    canvas.drawCircle(Offset(cx, cy), 10 + progress * 30, pulseBorder);

    // 2. Base circle anchor
    final basePaint = Paint()
      ..color = AppColors.primaryBlue.withOpacity(0.3)
      ..style = PaintingStyle.fill;
    canvas.drawCircle(Offset(cx, cy), 6.0, basePaint);

    // 3. Teardrop Pin Shape
    final pinPaint = Paint()
      ..color = AppColors.primaryBlue
      ..style = PaintingStyle.fill;

    final pinPath = Path();
    pinPath.moveTo(cx, cy);
    pinPath.cubicTo(cx - 15, cy - 20, cx - 15, cy - 38, cx, cy - 38);
    pinPath.cubicTo(cx + 15, cy - 38, cx + 15, cy - 20, cx, cy);
    pinPath.close();
    canvas.drawPath(pinPath, pinPaint);

    // 4. Pin center dot
    final centerDotPaint = Paint()
      ..color = Colors.white
      ..style = PaintingStyle.fill;
    canvas.drawCircle(Offset(cx, cy - 26), 4.0, centerDotPaint);
  }

  @override
  bool shouldRepaint(covariant _MapPulsePinPainter oldDelegate) => oldDelegate.progress != progress;
}
