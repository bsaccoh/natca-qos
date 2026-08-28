import 'dart:async';
import 'dart:convert';
import 'dart:typed_data';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:camera/camera.dart';
import 'package:image_picker/image_picker.dart';
import '../../app/theme/app_theme.dart';
import '../../core/services/api_client.dart';

const _idTypes = ['NATIONAL_ID', 'PASSPORT', 'VOTER_CARD', 'DRIVER_LICENSE'];

class KycRegistrationScreen extends StatefulWidget {
  final String phoneNumber;
  final String nin;

  const KycRegistrationScreen({
    super.key,
    required this.phoneNumber,
    required this.nin,
  });

  @override
  State<KycRegistrationScreen> createState() => _KycRegistrationScreenState();
}

class _KycRegistrationScreenState extends State<KycRegistrationScreen>
    with SingleTickerProviderStateMixin {
  int _currentStep = 0;

  // Step 0: Phone & Operator
  final _phoneController = TextEditingController();
  final _iccidController = TextEditingController();
  String? _selectedOperatorId;
  List<Map<String, dynamic>> _operators = [];

  // Step 1: Identity Details
  final _formKey = GlobalKey<FormState>();
  final _ninController = TextEditingController();
  final _firstNameController = TextEditingController();
  final _lastNameController = TextEditingController();
  final _dobController = TextEditingController();
  final _addressController = TextEditingController();
  final _nationalityController = TextEditingController();
  String _selectedSex = '';
  String _selectedIdType = 'NATIONAL_ID';
  String _idExpiryDate = '';
  String? _selectedDistrictId;
  String? _selectedChiefdomId;
  List<Map<String, dynamic>> _districts = [];
  List<Map<String, dynamic>> _chiefdoms = [];

  // Step 2: Documents
  bool _idFrontUploaded = false;
  bool _idBackUploaded = false;
  XFile? _idFrontFile;
  XFile? _idBackFile;
  Uint8List? _idFrontBytes;
  Uint8List? _idBackBytes;

  // Step 3: Face Scan
  bool _faceScanComplete = false;
  bool _isScanning = false;
  XFile? _faceFile;
  Uint8List? _faceBytes;
  CameraController? _cameraController;
  late AnimationController _scanAnimationController;
  bool _isCameraInitialized = false;
  String _cameraError = '';

  final _imagePicker = ImagePicker();

  // Identity verification results
  double? _faceMatchScore;
  String _faceMatchMessage = '';
  bool _faceCheckDone = false;
  bool _faceCheckRunning = false;

  bool _ninCheckDone = false;
  bool _ninCheckRunning = false;
  bool? _ninCheckOk;
  String _ninCheckMessage = '';

  // Step 4: Submit
  bool _isSubmitting = false;
  bool _isSuccess = false;
  String _kycReference = '';

  @override
  void initState() {
    super.initState();
    _phoneController.text = widget.phoneNumber;
    _ninController.text = widget.nin;
    _nationalityController.text = 'Sierra Leonean';
    _scanAnimationController = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 2),
    )..repeat(reverse: true);
    _fetchOperators();
    _fetchDistricts();
  }

  @override
  void dispose() {
    _phoneController.dispose();
    _iccidController.dispose();
    _ninController.dispose();
    _firstNameController.dispose();
    _lastNameController.dispose();
    _dobController.dispose();
    _addressController.dispose();
    _nationalityController.dispose();
    _scanAnimationController.dispose();
    _cameraController?.dispose();
    super.dispose();
  }

  Future<void> _fetchOperators() async {
    try {
      final res = await apiClient.get('/operators');
      if (res.statusCode == 200) {
        final data = json.decode(res.body);
        final list = (data['data'] ?? data) as List;
        if (mounted) {
          setState(() {
            _operators = list
                .map((e) => <String, dynamic>{
                      'id': e['operator_id'].toString(),
                      'name': e['operator_name'] ?? '',
                    })
                .toList();
          });
        }
      }
    } catch (_) {}
  }

  Future<void> _fetchDistricts() async {
    try {
      final res = await apiClient.get('/districts');
      if (res.statusCode == 200) {
        final data = json.decode(res.body);
        final list = (data['data'] ?? data) as List;
        if (mounted) {
          setState(() {
            _districts = list
                .map((e) => <String, dynamic>{
                      'id': e['district_id'].toString(),
                      'name': e['name'] ?? '',
                    })
                .toList();
          });
        }
      }
    } catch (_) {}
  }

  Future<void> _fetchChiefdoms(String districtId) async {
    try {
      final res = await apiClient.get('/districts/$districtId/chiefdoms');
      if (res.statusCode == 200) {
        final data = json.decode(res.body);
        final list = (data['data'] ?? data) as List;
        if (mounted) {
          setState(() {
            _chiefdoms = list
                .map((e) => <String, dynamic>{
                      'id': e['chiefdom_id'].toString(),
                      'name': e['name'] ?? '',
                    })
                .toList();
          });
        }
      }
    } catch (_) {
      if (mounted) setState(() => _chiefdoms = []);
    }
  }

  Future<void> _initializeCamera() async {
    if (_isCameraInitialized) return;
    try {
      final cameras = await availableCameras();
      final front = cameras.firstWhere(
        (c) => c.lensDirection == CameraLensDirection.front,
        orElse: () => cameras.first,
      );
      _cameraController = CameraController(front, ResolutionPreset.medium, enableAudio: false);
      await _cameraController!.initialize();
      if (mounted) setState(() { _isCameraInitialized = true; _cameraError = ''; });
    } catch (e) {
      if (mounted) setState(() => _cameraError = 'Could not initialize camera: $e');
    }
  }

  Future<void> _pickIdImage(bool isFront) async {
    final source = await showModalBottomSheet<ImageSource>(
      context: context,
      shape: const RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(top: Radius.circular(16))),
      builder: (ctx) => SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 16),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(isFront ? 'Upload Front of ID' : 'Upload Back of ID',
                  style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
              const SizedBox(height: 16),
              ListTile(
                leading: const Icon(Icons.camera_alt_rounded, color: AppColors.primaryBlue),
                title: const Text('Take Photo'),
                onTap: () => Navigator.pop(ctx, ImageSource.camera),
              ),
              ListTile(
                leading: const Icon(Icons.photo_library_rounded, color: AppColors.primaryBlue),
                title: const Text('Choose from Gallery'),
                onTap: () => Navigator.pop(ctx, ImageSource.gallery),
              ),
            ],
          ),
        ),
      ),
    );
    if (source == null) return;

    final picked = await _imagePicker.pickImage(source: source, imageQuality: 85);
    if (picked != null && mounted) {
      final bytes = await picked.readAsBytes();
      setState(() {
        if (isFront) {
          _idFrontFile = picked;
          _idFrontBytes = bytes;
          _idFrontUploaded = true;
        } else {
          _idBackFile = picked;
          _idBackBytes = bytes;
          _idBackUploaded = true;
        }
      });
    }
  }

  Future<void> _captureFace() async {
    if (!_isCameraInitialized || _cameraController == null) return;
    if (_idFrontFile == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please upload the front of your ID first')),
      );
      return;
    }

    setState(() { _isScanning = true; _faceMatchMessage = ''; });

    try {
      final xFile = await _cameraController!.takePicture();
      final selfieBytes = await xFile.readAsBytes();
      setState(() { _faceFile = xFile; _faceBytes = selfieBytes; });

      final res = await apiClient.postMultipartBytes(
        '/kyc/compare-faces',
        <String, String>{},
        [
          MapEntry('id_front', XFileBytes(_idFrontFile!, _idFrontBytes!)),
          MapEntry('selfie', XFileBytes(xFile, selfieBytes)),
        ],
      );

      final body = await res.stream.bytesToString();
      if (!mounted) return;

      if (res.statusCode == 200 || res.statusCode == 201) {
        final data = json.decode(body);
        final d = data['data'] ?? data;
        final matched = d['ok'] == true;
        final score = (d['score'] as num?)?.toDouble() ?? 0;
        final msg = d['message'] as String? ?? '';

        setState(() {
          _isScanning = false;
          _faceScanComplete = true;
          _faceMatchScore = score;
          _faceMatchMessage = msg;
          if (!matched) _faceFile = xFile;
        });
        _cameraController?.dispose();
        _cameraController = null;
      } else if (res.statusCode == 503) {
        setState(() {
          _isScanning = false;
          _faceScanComplete = true;
          _faceMatchScore = null;
          _faceMatchMessage = 'Face match service unavailable. Photo saved for manual review.';
        });
        _cameraController?.dispose();
        _cameraController = null;
      } else {
        String errMsg = 'Face comparison failed. Please try again.';
        try { final d = json.decode(body); if (d['error'] != null) errMsg = d['error'].toString(); } catch (_) {}
        setState(() { _isScanning = false; _faceMatchMessage = errMsg; _faceFile = null; _faceBytes = null; });
      }
    } catch (_) {
      if (mounted) {
        setState(() {
          _isScanning = false;
          _faceMatchMessage = 'Could not reach face match service. Please check your connection.';
          _faceFile = null;
          _faceBytes = null;
        });
      }
    }
  }

  Future<void> _runIdentityChecks() async {
    if (_idFrontFile == null || _idFrontBytes == null) return;

    // Face check
    if (_faceFile != null && _faceBytes != null) {
      setState(() { _faceCheckRunning = true; _faceCheckDone = false; });
      try {
        final res = await apiClient.postMultipartBytes(
          '/kyc/compare-faces',
          <String, String>{},
          [
            MapEntry('id_front', XFileBytes(_idFrontFile!, _idFrontBytes!)),
            MapEntry('selfie', XFileBytes(_faceFile!, _faceBytes!)),
          ],
        );
        final body = await res.stream.bytesToString();
        if (mounted && (res.statusCode == 200 || res.statusCode == 201)) {
          final d = (json.decode(body)['data'] ?? json.decode(body));
          setState(() {
            _faceMatchScore = (d['score'] as num?)?.toDouble() ?? 0;
            _faceMatchMessage = d['message'] as String? ?? '';
            _faceCheckDone = true;
            _faceCheckRunning = false;
          });
        } else {
          if (mounted) setState(() { _faceCheckDone = true; _faceCheckRunning = false; });
        }
      } catch (_) {
        if (mounted) setState(() { _faceCheckDone = true; _faceCheckRunning = false; _faceMatchMessage = 'Face check failed'; });
      }
    }

    // NIN check
    final nin = _ninController.text.trim();
    if (nin.isNotEmpty) {
      setState(() { _ninCheckRunning = true; _ninCheckDone = false; });
      try {
        final res = await apiClient.postMultipartBytes(
          '/kyc/verify-nin',
          <String, String>{'nin': nin},
          [MapEntry('id_front', XFileBytes(_idFrontFile!, _idFrontBytes!))],
        );
        final body = await res.stream.bytesToString();
        if (mounted && res.statusCode == 200) {
          final d = (json.decode(body)['data'] ?? json.decode(body));
          final expiry = d['expiry'] as String?;
          if (expiry != null && _idExpiryDate.isEmpty) {
            _idExpiryDate = expiry;
          }
          setState(() {
            _ninCheckOk = d['ok'] as bool?;
            _ninCheckMessage = d['message'] as String? ?? '';
            _ninCheckDone = true;
            _ninCheckRunning = false;
          });
        } else {
          if (mounted) setState(() { _ninCheckDone = true; _ninCheckRunning = false; _ninCheckMessage = 'NIN check unavailable'; });
        }
      } catch (_) {
        if (mounted) setState(() { _ninCheckDone = true; _ninCheckRunning = false; _ninCheckMessage = 'NIN check failed'; });
      }
    }
  }

  bool get _faceCheckPassed => _faceCheckDone && _faceMatchScore != null && _faceMatchScore! >= 55;
  bool get _canSubmit => !_isSubmitting && !_faceCheckRunning && !_ninCheckRunning && _faceCheckDone;

  Future<void> _submitRegistration({bool force = false}) async {
    if (_isSubmitting) return;
    if (!force && !_canSubmit) return;

    setState(() => _isSubmitting = true);

    try {
      final fields = <String, String>{
        'phone': _phoneController.text.trim(),
        'firstName': _firstNameController.text.trim(),
        'lastName': _lastNameController.text.trim(),
        'nin': _ninController.text.trim(),
        'dateOfBirth': _dobController.text.trim(),
        'address': _addressController.text.trim(),
        'nationality': _nationalityController.text.trim(),
        'idType': _selectedIdType,
        if (_selectedSex.isNotEmpty) 'sex': _selectedSex,
        if (_selectedOperatorId != null) 'operatorId': _selectedOperatorId!,
        if (_iccidController.text.trim().isNotEmpty) 'iccid': _iccidController.text.trim(),
        if (_idExpiryDate.isNotEmpty) 'idExpiryDate': _idExpiryDate,
        if (_selectedDistrictId != null) 'districtId': _selectedDistrictId!,
        if (_selectedChiefdomId != null) 'chiefdomId': _selectedChiefdomId!,
        if (_faceMatchScore != null) 'faceMatchScore': _faceMatchScore!.toStringAsFixed(1),
      };

      final files = <MapEntry<String, XFileBytes>>[];
      if (_idFrontFile != null && _idFrontBytes != null) {
        files.add(MapEntry('id_front', XFileBytes(_idFrontFile!, _idFrontBytes!)));
      }
      if (_idBackFile != null && _idBackBytes != null) {
        files.add(MapEntry('id_back', XFileBytes(_idBackFile!, _idBackBytes!)));
      }
      if (_faceFile != null && _faceBytes != null) {
        files.add(MapEntry('face', XFileBytes(_faceFile!, _faceBytes!)));
      }

      final res = await apiClient.postMultipartBytes('/kyc/submit', fields, files);

      if (res.statusCode == 200 || res.statusCode == 201) {
        final body = await res.stream.bytesToString();
        final data = json.decode(body);
        final d = data['data'] ?? data;
        if (mounted) setState(() { _isSubmitting = false; _isSuccess = true; _kycReference = d['kyc_reference'] ?? ''; });
      } else {
        final body = await res.stream.bytesToString();
        String errMsg = 'KYC submission failed. Please try again.';
        try { final d = json.decode(body); if (d['error'] != null) errMsg = d['error'].toString(); } catch (_) {}
        if (mounted) {
          setState(() => _isSubmitting = false);
          ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(errMsg)));
        }
      }
    } catch (_) {
      if (mounted) {
        setState(() => _isSubmitting = false);
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Network error. Check your connection and try again.')),
        );
      }
    }
  }

  Future<void> _pickDate(String field) async {
    final now = DateTime.now();
    final picked = await showDatePicker(
      context: context,
      initialDate: field == 'dob' ? DateTime(1990) : now,
      firstDate: field == 'dob' ? DateTime(1920) : now,
      lastDate: field == 'dob' ? now : DateTime(2040),
    );
    if (picked != null && mounted) {
      final formatted = '${picked.year}-${picked.month.toString().padLeft(2, '0')}-${picked.day.toString().padLeft(2, '0')}';
      setState(() {
        if (field == 'dob') {
          _dobController.text = formatted;
        } else {
          _idExpiryDate = formatted;
        }
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_isSuccess) return _buildSuccessScreen();

    return Scaffold(
      backgroundColor: AppColors.isDark ? const Color(0xFF101424) : AppColors.background,
      appBar: AppBar(
        title: Text('KYC Self-Registration',
            style: AppTextStyles.h2.copyWith(fontWeight: FontWeight.bold, color: AppColors.dynamicTextPrimary)),
        backgroundColor: Colors.transparent,
        elevation: 0,
        iconTheme: const IconThemeData(color: AppColors.primaryBlue),
      ),
      body: Stepper(
        type: StepperType.vertical,
        currentStep: _currentStep,
        onStepContinue: _onStepContinue,
        onStepCancel: () { if (_currentStep > 0) setState(() => _currentStep -= 1); },
        controlsBuilder: _buildControls,
        steps: [
          Step(
            title: Text('Phone & Operator', style: TextStyle(color: AppColors.dynamicTextPrimary, fontWeight: FontWeight.bold)),
            isActive: _currentStep >= 0,
            state: _currentStep > 0 ? StepState.complete : StepState.indexed,
            content: _buildStep0(),
          ),
          Step(
            title: Text('Identity Details', style: TextStyle(color: AppColors.dynamicTextPrimary, fontWeight: FontWeight.bold)),
            isActive: _currentStep >= 1,
            state: _currentStep > 1 ? StepState.complete : StepState.indexed,
            content: Form(key: _formKey, child: _buildStep1()),
          ),
          Step(
            title: Text('Documents', style: TextStyle(color: AppColors.dynamicTextPrimary, fontWeight: FontWeight.bold)),
            isActive: _currentStep >= 2,
            state: _currentStep > 2 ? StepState.complete : StepState.indexed,
            content: _buildStep2(),
          ),
          Step(
            title: Text('Face Photo', style: TextStyle(color: AppColors.dynamicTextPrimary, fontWeight: FontWeight.bold)),
            isActive: _currentStep >= 3,
            state: _currentStep > 3 ? StepState.complete : StepState.indexed,
            content: _buildStep3(),
          ),
          Step(
            title: Text('Review & Submit', style: TextStyle(color: AppColors.dynamicTextPrimary, fontWeight: FontWeight.bold)),
            isActive: _currentStep >= 4,
            content: _buildStep4(),
          ),
        ],
      ),
    );
  }

  void _onStepContinue() {
    if (_currentStep == 0) {
      if (_phoneController.text.trim().isEmpty || _selectedOperatorId == null) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Phone and operator are required')));
        return;
      }
    } else if (_currentStep == 1) {
      if (!_formKey.currentState!.validate()) return;
    } else if (_currentStep == 2) {
      if (!_idFrontUploaded || !_idBackUploaded) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Please upload both sides of your ID')));
        return;
      }
    } else if (_currentStep == 3) {
      if (!_faceScanComplete) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Please complete the face scan')));
        return;
      }
    } else if (_currentStep == 4) {
      return;
    }

    setState(() {
      if (_currentStep < 4) {
        _currentStep += 1;
        if (_currentStep == 3 && !_faceScanComplete) _initializeCamera();
        if (_currentStep == 4) _runIdentityChecks();
      }
    });
  }

  Widget _buildControls(BuildContext context, ControlsDetails details) {
    if (_currentStep == 4 && _isSubmitting) {
      return const Padding(padding: EdgeInsets.only(top: 16), child: Center(child: CircularProgressIndicator()));
    }

    if (_currentStep == 4) {
      return Padding(
        padding: const EdgeInsets.only(top: 16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            if (_faceCheckRunning || _ninCheckRunning)
              const Padding(
                padding: EdgeInsets.only(bottom: 8),
                child: Text('Running identity checks...', style: TextStyle(color: AppColors.textSecondary, fontSize: 12)),
              ),
            if (_faceCheckDone && !_faceCheckPassed && !_faceCheckRunning)
              Padding(
                padding: const EdgeInsets.only(bottom: 8),
                child: Text(
                  'Face check could not be verified — admin will review manually',
                  style: TextStyle(color: AppColors.warningOrange, fontSize: 12),
                ),
              ),
            Row(
              children: [
                OutlinedButton(
                  onPressed: details.onStepCancel,
                  style: OutlinedButton.styleFrom(
                    padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 20),
                    side: const BorderSide(color: AppColors.primaryBlue),
                  ),
                  child: const Text('Back', style: TextStyle(color: AppColors.primaryBlue, fontWeight: FontWeight.bold)),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: ElevatedButton(
                    onPressed: _canSubmit ? () => _submitRegistration() : null,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.successGreen,
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 14),
                    ),
                    child: Text(
                      _faceCheckRunning || _ninCheckRunning ? 'Checking...' : 'Submit Registration',
                      style: const TextStyle(fontWeight: FontWeight.bold),
                    ),
                  ),
                ),
              ],
            ),
          ],
        ),
      );
    }

    return Padding(
      padding: const EdgeInsets.only(top: 16),
      child: Row(
        children: [
          Expanded(
            flex: 2,
            child: ElevatedButton(
              onPressed: details.onStepContinue,
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.primaryBlue,
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 14),
              ),
              child: const FittedBox(
                fit: BoxFit.scaleDown,
                child: Text('CONTINUE', style: TextStyle(fontWeight: FontWeight.bold)),
              ),
            ),
          ),
          if (_currentStep > 0) ...[
            const SizedBox(width: 12),
            Expanded(
              child: OutlinedButton(
                onPressed: details.onStepCancel,
                style: OutlinedButton.styleFrom(
                  padding: const EdgeInsets.symmetric(vertical: 14),
                  side: const BorderSide(color: AppColors.primaryBlue),
                ),
                child: const FittedBox(
                  fit: BoxFit.scaleDown,
                  child: Text('BACK', style: TextStyle(color: AppColors.primaryBlue, fontWeight: FontWeight.bold)),
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }

  // ── Step 0: Phone & Operator ──────────────────────────────────────────
  Widget _buildStep0() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text('Provide the phone number and your telecom operator',
            style: TextStyle(color: AppColors.textSecondary, fontSize: 13)),
        const SizedBox(height: 16),
        _textField('Phone Number', _phoneController, keyboardType: TextInputType.phone),
        const SizedBox(height: 12),
        _textField('ICCID (SIM Card Number)', _iccidController, required: false,
            hint: '19-digit number on SIM card'),
        const SizedBox(height: 12),
        _dropdown(
          'Operator *',
          _selectedOperatorId,
          _operators.map((o) => DropdownMenuItem(value: o['id'] as String, child: Text(o['name'] as String))).toList(),
          (val) => setState(() => _selectedOperatorId = val),
        ),
      ],
    );
  }

  // ── Step 1: Identity Details ──────────────────────────────────────────
  Widget _buildStep1() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text('Enter your personal details as they appear on your ID',
            style: TextStyle(color: AppColors.textSecondary, fontSize: 13)),
        const SizedBox(height: 16),
        Row(
          children: [
            Expanded(child: _textField('First Name', _firstNameController)),
            const SizedBox(width: 12),
            Expanded(child: _textField('Last Name', _lastNameController)),
          ],
        ),
        const SizedBox(height: 12),
        _textField('National ID Number (NIN)', _ninController, caps: true),
        const SizedBox(height: 12),
        GestureDetector(
          onTap: () => _pickDate('dob'),
          child: AbsorbPointer(child: _textField('Date of Birth', _dobController, hint: 'Tap to select')),
        ),
        const SizedBox(height: 12),
        _dropdown(
          'Sex',
          _selectedSex.isEmpty ? null : _selectedSex,
          ['MALE', 'FEMALE', 'OTHER'].map((s) => DropdownMenuItem(value: s, child: Text(s))).toList(),
          (val) => setState(() => _selectedSex = val ?? ''),
          required: false,
        ),
        const SizedBox(height: 12),
        _textField('Nationality', _nationalityController, required: false),
        const SizedBox(height: 12),
        _dropdown(
          'ID Type',
          _selectedIdType,
          _idTypes.map((t) => DropdownMenuItem(value: t, child: Text(t.replaceAll('_', ' ')))).toList(),
          (val) => setState(() => _selectedIdType = val ?? 'NATIONAL_ID'),
        ),
        const SizedBox(height: 12),
        GestureDetector(
          onTap: () => _pickDate('expiry'),
          child: AbsorbPointer(
            child: TextFormField(
              readOnly: true,
              style: TextStyle(color: AppColors.dynamicTextPrimary),
              decoration: InputDecoration(
                labelText: 'ID Expiry Date',
                hintText: _idExpiryDate.isEmpty ? 'Tap to select' : _idExpiryDate,
                filled: true,
                fillColor: AppColors.dynamicCard,
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                suffixIcon: const Icon(Icons.calendar_today, size: 18),
              ),
              controller: TextEditingController(text: _idExpiryDate),
            ),
          ),
        ),
        const SizedBox(height: 12),
        _dropdown(
          'District',
          _selectedDistrictId,
          _districts.map((d) => DropdownMenuItem(value: d['id'] as String, child: Text(d['name'] as String))).toList(),
          (val) {
            setState(() { _selectedDistrictId = val; _selectedChiefdomId = null; _chiefdoms = []; });
            if (val != null) _fetchChiefdoms(val);
          },
          required: false,
        ),
        if (_chiefdoms.isNotEmpty) ...[
          const SizedBox(height: 12),
          _dropdown(
            'Chiefdom',
            _selectedChiefdomId,
            _chiefdoms.map((c) => DropdownMenuItem(value: c['id'] as String, child: Text(c['name'] as String))).toList(),
            (val) => setState(() => _selectedChiefdomId = val),
            required: false,
          ),
        ],
        const SizedBox(height: 12),
        _textField('Address', _addressController, required: false, maxLines: 2),
      ],
    );
  }

  // ── Step 2: Documents ─────────────────────────────────────────────────
  Widget _buildStep2() {
    return Column(
      children: [
        Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: AppColors.primaryBlue.withOpacity(0.08),
            borderRadius: BorderRadius.circular(10),
          ),
          child: const Row(
            children: [
              Icon(Icons.info_outline, color: AppColors.primaryBlue, size: 18),
              SizedBox(width: 8),
              Expanded(
                child: Text('Photos must be clear, well-lit, and all corners visible.',
                    style: TextStyle(color: AppColors.textSecondary, fontSize: 12)),
              ),
            ],
          ),
        ),
        const SizedBox(height: 16),
        _buildDocCard('Front of ID', _idFrontUploaded, _idFrontBytes, () => _pickIdImage(true)),
        const SizedBox(height: 12),
        _buildDocCard('Back of ID', _idBackUploaded, _idBackBytes, () => _pickIdImage(false)),
      ],
    );
  }

  // ── Step 3: Face Scan ─────────────────────────────────────────────────
  Widget _buildStep3() {
    if (_faceScanComplete) {
      return Container(
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(
          color: AppColors.successGreen.withOpacity(0.1),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: AppColors.successGreen),
        ),
        child: Column(
          children: [
            const Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(Icons.face_retouching_natural, color: AppColors.successGreen, size: 32),
                SizedBox(width: 12),
                Text('Face Captured!', style: TextStyle(color: AppColors.successGreen, fontWeight: FontWeight.bold, fontSize: 16)),
              ],
            ),
            if (_faceMatchScore != null) ...[
              const SizedBox(height: 8),
              Text('Match score: ${_faceMatchScore!.toStringAsFixed(0)}%',
                  style: TextStyle(color: _faceMatchScore! >= 55 ? AppColors.successGreen : AppColors.warningOrange, fontSize: 13)),
            ],
            if (_faceMatchMessage.isNotEmpty && _faceMatchScore == null) ...[
              const SizedBox(height: 8),
              Text(_faceMatchMessage, textAlign: TextAlign.center,
                  style: const TextStyle(color: AppColors.textSecondary, fontSize: 12)),
            ],
          ],
        ),
      );
    }

    if (_cameraError.isNotEmpty) {
      return Center(child: Text(_cameraError, style: const TextStyle(color: AppColors.errorRed)));
    }

    return Column(
      children: [
        Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: AppColors.primaryBlue.withOpacity(0.08),
            borderRadius: BorderRadius.circular(10),
          ),
          child: const Row(
            children: [
              Icon(Icons.info_outline, color: AppColors.primaryBlue, size: 18),
              SizedBox(width: 8),
              Expanded(
                child: Text('Face the camera directly, ensure good lighting, remove glasses/hat if possible.',
                    style: TextStyle(color: AppColors.textSecondary, fontSize: 12)),
              ),
            ],
          ),
        ),
        const SizedBox(height: 20),
        Container(
          width: 220, height: 220,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            color: AppColors.dynamicCard,
            border: Border.all(color: _isScanning ? AppColors.primaryBlue : AppColors.dynamicBorder, width: 4),
          ),
          clipBehavior: Clip.antiAlias,
          child: Stack(
            alignment: Alignment.center,
            children: [
              if (!_isCameraInitialized)
                const CircularProgressIndicator()
              else if (_cameraController != null)
                SizedBox(
                  width: double.infinity, height: double.infinity,
                  child: FittedBox(
                    fit: BoxFit.cover,
                    child: SizedBox(
                      width: _cameraController!.value.previewSize?.height ?? 1,
                      height: _cameraController!.value.previewSize?.width ?? 1,
                      child: CameraPreview(_cameraController!),
                    ),
                  ),
                ),
              if (_isScanning)
                AnimatedBuilder(
                  animation: _scanAnimationController,
                  builder: (context, child) => Positioned(
                    top: _scanAnimationController.value * 200,
                    child: Container(
                      width: 200, height: 4,
                      decoration: BoxDecoration(
                        color: AppColors.accentGreen,
                        boxShadow: [BoxShadow(color: AppColors.accentGreen.withOpacity(0.5), blurRadius: 8, spreadRadius: 2)],
                      ),
                    ),
                  ),
                ),
            ],
          ),
        ),
        const SizedBox(height: 16),
        if (_faceMatchMessage.isNotEmpty && !_faceScanComplete) ...[
          Container(
            padding: const EdgeInsets.all(12),
            margin: const EdgeInsets.only(bottom: 12),
            decoration: BoxDecoration(
              color: AppColors.errorRed.withOpacity(0.08),
              borderRadius: BorderRadius.circular(10),
              border: Border.all(color: AppColors.errorRed.withOpacity(0.3)),
            ),
            child: Row(
              children: [
                const Icon(Icons.warning_rounded, color: AppColors.errorRed, size: 20),
                const SizedBox(width: 8),
                Expanded(child: Text(_faceMatchMessage, style: const TextStyle(color: AppColors.errorRed, fontSize: 12, height: 1.4))),
              ],
            ),
          ),
        ],
        if (!_isScanning)
          ElevatedButton.icon(
            onPressed: _isCameraInitialized ? _captureFace : null,
            icon: const Icon(Icons.face_retouching_natural),
            label: Text(_faceMatchMessage.isNotEmpty ? 'RETRY CAPTURE' : 'CAPTURE & COMPARE'),
            style: ElevatedButton.styleFrom(backgroundColor: AppColors.primaryBlue, foregroundColor: Colors.white),
          ),
        if (_isScanning)
          const Column(
            children: [
              SizedBox(height: 8),
              SizedBox(width: 24, height: 24, child: CircularProgressIndicator(strokeWidth: 2, color: AppColors.primaryBlue)),
              SizedBox(height: 8),
              Text('Comparing face with ID...', style: TextStyle(color: AppColors.primaryBlue, fontWeight: FontWeight.bold)),
            ],
          ),
      ],
    );
  }

  // ── Step 4: Review & Submit ───────────────────────────────────────────
  Widget _buildStep4() {
    final opName = _operators.where((o) => o['id'] == _selectedOperatorId).map((o) => o['name']).firstOrNull ?? '';

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Identity Checks Panel
        Container(
          padding: const EdgeInsets.all(14),
          margin: const EdgeInsets.only(bottom: 16),
          decoration: BoxDecoration(
            color: AppColors.dynamicCard,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: AppColors.dynamicBorder),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text('Identity checks', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
              const SizedBox(height: 10),
              _verificationRow(
                Icons.face,
                'Face on ID matches your selfie',
                _faceCheckRunning
                    ? 'running'
                    : _faceCheckDone
                        ? (_faceCheckPassed ? 'pass' : 'fail')
                        : 'idle',
                _faceMatchMessage,
                _faceMatchScore,
              ),
              Divider(color: AppColors.dynamicBorder),
              _verificationRow(
                Icons.fingerprint,
                'NIN matches text on ID',
                _ninCheckRunning
                    ? 'running'
                    : _ninCheckDone
                        ? (_ninCheckOk == true ? 'pass' : (_ninCheckOk == false ? 'fail' : 'skip'))
                        : 'idle',
                _ninCheckMessage,
                null,
              ),
              const SizedBox(height: 8),
              if (_faceCheckDone || _ninCheckDone)
                GestureDetector(
                  onTap: _runIdentityChecks,
                  child: const Text('Re-run checks',
                      style: TextStyle(color: AppColors.primaryBlue, fontWeight: FontWeight.bold, fontSize: 13)),
                ),
            ],
          ),
        ),

        // Review Table
        const Text('Review your details', style: TextStyle(color: AppColors.textSecondary, fontSize: 13)),
        const SizedBox(height: 8),
        Container(
          decoration: BoxDecoration(
            color: AppColors.dynamicCard,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: AppColors.dynamicBorder),
          ),
          child: Column(
            children: [
              _reviewRow('Phone', _phoneController.text),
              _reviewRow('Operator', opName),
              if (_iccidController.text.isNotEmpty) _reviewRow('ICCID', _iccidController.text),
              _reviewRow('Full Name', '${_firstNameController.text} ${_lastNameController.text}'.trim()),
              _reviewRow('NIN', _ninController.text),
              _reviewRow('DOB', _dobController.text),
              if (_idExpiryDate.isNotEmpty) _reviewRow('ID Expires', _idExpiryDate),
              _reviewRow('ID Type', _selectedIdType.replaceAll('_', ' ')),
              if (_selectedSex.isNotEmpty) _reviewRow('Sex', _selectedSex),
              if (_nationalityController.text.isNotEmpty) _reviewRow('Nationality', _nationalityController.text),
            ],
          ),
        ),
        const SizedBox(height: 16),
        const Text('Documents', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
        const SizedBox(height: 8),
        Wrap(
          spacing: 8,
          children: [
            if (_idFrontUploaded) _docChip('ID Front', true),
            if (_idBackUploaded) _docChip('ID Back', true),
            if (_faceFile != null) _docChip('Face Photo', true),
          ],
        ),
      ],
    );
  }

  // ── Reusable widgets ──────────────────────────────────────────────────

  Widget _textField(String label, TextEditingController controller, {
    bool required = true, String? hint, TextInputType? keyboardType,
    bool caps = false, int maxLines = 1,
  }) {
    return TextFormField(
      controller: controller,
      keyboardType: keyboardType,
      textCapitalization: caps ? TextCapitalization.characters : TextCapitalization.none,
      maxLines: maxLines,
      style: TextStyle(color: AppColors.dynamicTextPrimary),
      decoration: InputDecoration(
        labelText: label,
        hintText: hint,
        filled: true,
        fillColor: AppColors.dynamicCard,
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
      ),
      validator: required ? (val) => (val == null || val.isEmpty) ? 'Required' : null : null,
    );
  }

  Widget _dropdown(String label, String? value, List<DropdownMenuItem<String>> items,
      ValueChanged<String?> onChanged, {bool required = true}) {
    return DropdownButtonFormField<String>(
      value: value,
      items: items,
      onChanged: onChanged,
      style: TextStyle(color: AppColors.dynamicTextPrimary),
      decoration: InputDecoration(
        labelText: label,
        filled: true,
        fillColor: AppColors.dynamicCard,
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
      ),
      validator: required ? (val) => (val == null || val.isEmpty) ? 'Required' : null : null,
    );
  }

  Widget _buildDocCard(String title, bool uploaded, Uint8List? bytes, VoidCallback onTap) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        height: uploaded ? 120 : 100,
        width: double.infinity,
        decoration: BoxDecoration(
          color: uploaded ? AppColors.successGreen.withOpacity(0.1) : AppColors.dynamicCard,
          border: Border.all(
            color: uploaded ? AppColors.successGreen : AppColors.dynamicBorder,
            style: uploaded ? BorderStyle.solid : BorderStyle.none,
          ),
          borderRadius: BorderRadius.circular(12),
        ),
        child: uploaded && bytes != null
            ? Row(
                children: [
                  const SizedBox(width: 12),
                  ClipRRect(
                    borderRadius: BorderRadius.circular(8),
                    child: Image.memory(bytes, width: 80, height: 96, fit: BoxFit.cover),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(children: [
                          const Icon(Icons.check_circle, color: AppColors.successGreen, size: 18),
                          const SizedBox(width: 6),
                          Text('$title Uploaded',
                              style: const TextStyle(color: AppColors.successGreen, fontWeight: FontWeight.bold, fontSize: 13)),
                        ]),
                        const SizedBox(height: 4),
                        const Text('Tap to replace', style: TextStyle(color: AppColors.textSecondary, fontSize: 11)),
                      ],
                    ),
                  ),
                ],
              )
            : Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Icon(Icons.upload_file, color: AppColors.primaryBlue, size: 32),
                  const SizedBox(height: 8),
                  Text('Tap to upload $title',
                      style: const TextStyle(color: AppColors.textPrimary, fontWeight: FontWeight.bold)),
                  const SizedBox(height: 4),
                  const Text('Camera or gallery', style: TextStyle(color: AppColors.textSecondary, fontSize: 11)),
                ],
              ),
      ),
    );
  }

  Widget _verificationRow(IconData icon, String label, String state, String message, double? score) {
    Widget statusIcon;
    Color color;
    switch (state) {
      case 'running':
        statusIcon = const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2));
        color = AppColors.textSecondary;
        break;
      case 'pass':
        statusIcon = const Icon(Icons.check_circle, color: AppColors.successGreen, size: 18);
        color = AppColors.successGreen;
        break;
      case 'fail':
        statusIcon = const Icon(Icons.cancel, color: AppColors.errorRed, size: 18);
        color = AppColors.errorRed;
        break;
      case 'skip':
        statusIcon = const Icon(Icons.help_outline, color: AppColors.warningOrange, size: 18);
        color = AppColors.warningOrange;
        break;
      default:
        statusIcon = const SizedBox(width: 18, height: 18);
        color = AppColors.textSecondary;
    }

    String statusText;
    switch (state) {
      case 'idle': statusText = 'Waiting to run...'; break;
      case 'running': statusText = 'Analysing image...'; break;
      default: statusText = message;
    }

    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, color: AppColors.primaryBlue, size: 20),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Expanded(child: Text(label, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13))),
                    if (score != null)
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                        decoration: BoxDecoration(
                          color: (state == 'pass' ? AppColors.successGreen : AppColors.errorRed).withOpacity(0.15),
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: Text('${score.toStringAsFixed(0)}%',
                            style: TextStyle(
                              color: state == 'pass' ? AppColors.successGreen : AppColors.errorRed,
                              fontWeight: FontWeight.bold, fontSize: 11,
                            )),
                      ),
                  ],
                ),
                const SizedBox(height: 2),
                Text(statusText, style: TextStyle(color: color, fontSize: 11)),
              ],
            ),
          ),
          const SizedBox(width: 8),
          statusIcon,
        ],
      ),
    );
  }

  Widget _reviewRow(String label, String value) {
    if (value.isEmpty) return const SizedBox.shrink();
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
      decoration: BoxDecoration(
        border: Border(bottom: BorderSide(color: AppColors.dynamicBorder, width: 0.5)),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: const TextStyle(color: AppColors.textSecondary, fontSize: 13)),
          Flexible(
            child: Text(value,
                textAlign: TextAlign.end,
                style: TextStyle(color: AppColors.dynamicTextPrimary, fontWeight: FontWeight.w600, fontSize: 13)),
          ),
        ],
      ),
    );
  }

  Widget _docChip(String label, bool ok) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: AppColors.successGreen.withOpacity(0.1),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.successGreen.withOpacity(0.4)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Icon(Icons.check, color: AppColors.successGreen, size: 14),
          const SizedBox(width: 4),
          Text(label, style: const TextStyle(color: AppColors.successGreen, fontWeight: FontWeight.bold, fontSize: 12)),
        ],
      ),
    );
  }

  Widget _buildSuccessScreen() {
    return Scaffold(
      backgroundColor: AppColors.isDark ? const Color(0xFF101424) : AppColors.background,
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(32),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(Icons.verified, color: AppColors.successGreen, size: 100),
              const SizedBox(height: 24),
              Text('Registration Submitted!',
                  style: AppTextStyles.h1.copyWith(color: AppColors.successGreen), textAlign: TextAlign.center),
              const SizedBox(height: 16),
              const Text(
                'Your KYC details have been submitted for verification. Your SIM will be linked once approved.',
                textAlign: TextAlign.center,
                style: TextStyle(color: AppColors.textSecondary, fontSize: 16),
              ),
              if (_kycReference.isNotEmpty) ...[
                const SizedBox(height: 24),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
                  decoration: BoxDecoration(
                    color: AppColors.dynamicCard,
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(color: AppColors.successGreen.withOpacity(0.4)),
                  ),
                  child: Column(
                    children: [
                      const Text('Your KYC Reference', style: TextStyle(color: AppColors.textSecondary, fontSize: 12)),
                      const SizedBox(height: 6),
                      Text(_kycReference,
                          style: AppTextStyles.h2.copyWith(
                              fontFamily: 'monospace', fontWeight: FontWeight.bold, color: AppColors.dynamicTextPrimary)),
                      const SizedBox(height: 4),
                      const Text('Save this to check your status later',
                          style: TextStyle(color: AppColors.textSecondary, fontSize: 11)),
                    ],
                  ),
                ),
              ],
              const SizedBox(height: 32),
              SizedBox(
                width: double.infinity,
                height: 50,
                child: ElevatedButton(
                  onPressed: () => context.go('/dashboard'),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.primaryBlue,
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                  child: const Text('RETURN TO DASHBOARD', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
