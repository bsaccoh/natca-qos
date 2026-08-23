import 'dart:async';
import 'dart:convert';
import 'dart:typed_data';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:camera/camera.dart';
import 'package:image_picker/image_picker.dart';
import '../../app/theme/app_theme.dart';
import '../../core/services/api_client.dart';

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

class _KycRegistrationScreenState extends State<KycRegistrationScreen> with SingleTickerProviderStateMixin {
  int _currentStep = 0;
  
  // Step 1: Personal Details
  final _formKey = GlobalKey<FormState>();
  final _ninController = TextEditingController();
  final _firstNameController = TextEditingController();
  final _lastNameController = TextEditingController();
  final _dobController = TextEditingController();
  final _addressController = TextEditingController();

  // Step 2: ID Upload
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
  String _cameraError = "";

  final _imagePicker = ImagePicker();

  // Face match result
  double? _faceMatchScore;
  String _faceMatchMessage = '';

  // Step 4: Submission
  bool _isSubmitting = false;
  bool _isSuccess = false;
  String _kycReference = '';

  @override
  void initState() {
    super.initState();
    _ninController.text = widget.nin;
    _scanAnimationController = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 2),
    )..repeat(reverse: true);
  }

  @override
  void dispose() {
    _ninController.dispose();
    _firstNameController.dispose();
    _lastNameController.dispose();
    _dobController.dispose();
    _addressController.dispose();
    _scanAnimationController.dispose();
    _cameraController?.dispose();
    super.dispose();
  }

  Future<void> _initializeCamera() async {
    if (_isCameraInitialized) return;

    try {
      final cameras = await availableCameras();
      // Try to find the front camera
      final frontCamera = cameras.firstWhere(
        (camera) => camera.lensDirection == CameraLensDirection.front,
        orElse: () => cameras.first,
      );

      _cameraController = CameraController(
        frontCamera,
        ResolutionPreset.medium,
        enableAudio: false,
      );

      await _cameraController!.initialize();
      if (mounted) {
        setState(() {
          _isCameraInitialized = true;
          _cameraError = "";
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _cameraError = "Could not initialize camera: ${e.toString()}";
        });
      }
    }
  }

  Future<void> _pickIdImage(bool isFront) async {
    final source = await showModalBottomSheet<ImageSource>(
      context: context,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(16))),
      builder: (ctx) => SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 16),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(isFront ? "Upload Front of ID" : "Upload Back of ID",
                  style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
              const SizedBox(height: 16),
              ListTile(
                leading: const Icon(Icons.camera_alt_rounded, color: AppColors.primaryBlue),
                title: const Text("Take Photo"),
                subtitle: const Text("Use camera to capture your ID"),
                onTap: () => Navigator.pop(ctx, ImageSource.camera),
              ),
              ListTile(
                leading: const Icon(Icons.photo_library_rounded, color: AppColors.primaryBlue),
                title: const Text("Choose from Gallery"),
                subtitle: const Text("Select an existing photo"),
                onTap: () => Navigator.pop(ctx, ImageSource.gallery),
              ),
            ],
          ),
        ),
      ),
    );
    if (source == null) return;

    final picked = await _imagePicker.pickImage(
      source: source,
      imageQuality: 85,
    );
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

  void _startFaceScan() async {
    if (!_isCameraInitialized || _cameraController == null) return;
    if (_idFrontFile == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please upload the front of your ID first')),
      );
      return;
    }

    setState(() {
      _isScanning = true;
      _faceMatchMessage = '';
    });

    try {
      final xFile = await _cameraController!.takePicture();
      final selfieBytes = await xFile.readAsBytes();

      setState(() {
        _faceFile = xFile;
        _faceBytes = selfieBytes;
      });

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
        final respData = data['data'] ?? data;
        final matched = respData['ok'] == true;
        final score = (respData['score'] as num?)?.toDouble() ?? 0;
        final message = respData['message'] as String? ?? '';

        if (matched) {
          setState(() {
            _isScanning = false;
            _faceScanComplete = true;
            _faceMatchScore = score;
            _faceMatchMessage = message;
          });
          _cameraController?.dispose();
          _cameraController = null;
        } else {
          setState(() {
            _isScanning = false;
            _faceScanComplete = false;
            _faceMatchScore = score;
            _faceMatchMessage = message;
            _faceFile = null;
          });
        }
      } else if (res.statusCode == 503) {
        // Face match service unavailable — allow manual proceed
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
        try {
          final data = json.decode(body);
          if (data['error'] != null) errMsg = data['error'].toString();
        } catch (_) {}
        setState(() {
          _isScanning = false;
          _faceMatchMessage = errMsg;
          _faceFile = null;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _isScanning = false;
          _faceMatchMessage = 'Could not reach face match service. Please check your connection.';
          _faceFile = null;
        });
      }
    }
  }

  Future<void> _submitRegistration() async {
    setState(() => _isSubmitting = true);

    try {
      final fields = <String, String>{
        'firstName': _firstNameController.text.trim(),
        'lastName': _lastNameController.text.trim(),
        'nin': _ninController.text.trim(),
        'dateOfBirth': _dobController.text.trim(),
        'address': _addressController.text.trim(),
        'phone': widget.phoneNumber,
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
        final respData = data['data'] ?? data;
        final ref = respData['kyc_reference'] as String? ?? '';
        if (mounted) setState(() { _isSubmitting = false; _isSuccess = true; _kycReference = ref; });
      } else {
        final body = await res.stream.bytesToString();
        String errorMsg = 'KYC submission failed. Please try again.';
        try {
          final data = json.decode(body);
          if (data['error'] != null) errorMsg = data['error'].toString();
        } catch (_) {}
        if (mounted) {
          setState(() => _isSubmitting = false);
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text(errorMsg)),
          );
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

  @override
  Widget build(BuildContext context) {
    if (_isSuccess) {
      return _buildSuccessScreen();
    }

    return Scaffold(
      backgroundColor: AppColors.isDark ? const Color(0xFF101424) : AppColors.background,
      appBar: AppBar(
        title: Text("KYC Self-Registration", style: AppTextStyles.h2.copyWith(fontWeight: FontWeight.bold, color: AppColors.dynamicTextPrimary)),
        backgroundColor: Colors.transparent,
        elevation: 0,
        iconTheme: const IconThemeData(color: AppColors.primaryBlue),
      ),
      body: Stepper(
        type: StepperType.vertical,
        currentStep: _currentStep,
        onStepContinue: () {
          if (_currentStep == 0) {
            if (!_formKey.currentState!.validate()) return;
          } else if (_currentStep == 1) {
            if (!_idFrontUploaded || !_idBackUploaded) {
              ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Please upload both sides of your ID')));
              return;
            }
          } else if (_currentStep == 2) {
            if (!_faceScanComplete) {
              ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Please complete the face scan')));
              return;
            }
          } else if (_currentStep == 3) {
            _submitRegistration();
            return;
          }
          
          setState(() {
            if (_currentStep < 3) {
              _currentStep += 1;
              // Initialize camera only when entering step 2
              if (_currentStep == 2 && !_faceScanComplete) {
                _initializeCamera();
              }
            }
          });
        },
        onStepCancel: () {
          setState(() {
            if (_currentStep > 0) {
              _currentStep -= 1;
            }
          });
        },
        controlsBuilder: (context, details) {
          if (_currentStep == 3 && _isSubmitting) {
            return const Padding(
              padding: EdgeInsets.only(top: 16.0),
              child: Center(child: CircularProgressIndicator()),
            );
          }
          return Padding(
            padding: const EdgeInsets.only(top: 16.0),
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
                    child: FittedBox(
                      fit: BoxFit.scaleDown,
                      child: Text(_currentStep == 3 ? 'SUBMIT REGISTRATION' : 'CONTINUE', style: const TextStyle(fontWeight: FontWeight.bold)),
                    ),
                  ),
                ),
                if (_currentStep > 0) ...[
                  const SizedBox(width: 12),
                  Expanded(
                    flex: 1,
                    child: OutlinedButton(
                      onPressed: details.onStepCancel,
                      style: OutlinedButton.styleFrom(
                        padding: const EdgeInsets.symmetric(vertical: 14),
                        side: const BorderSide(color: AppColors.primaryBlue),
                      ),
                      child: FittedBox(
                        fit: BoxFit.scaleDown,
                        child: const Text('BACK', style: TextStyle(color: AppColors.primaryBlue, fontWeight: FontWeight.bold)),
                      ),
                    ),
                  ),
                ],
              ],
            ),
          );
        },
        steps: [
          Step(
            title: Text("Personal Details", style: TextStyle(color: AppColors.dynamicTextPrimary, fontWeight: FontWeight.bold)),
            isActive: _currentStep >= 0,
            state: _currentStep > 0 ? StepState.complete : StepState.indexed,
            content: Form(
              key: _formKey,
              child: Column(
                children: [
                  _buildTextField("National ID Number (NIN)", _ninController),
                  const SizedBox(height: 12),
                  _buildTextField("First Name", _firstNameController),
                  const SizedBox(height: 12),
                  _buildTextField("Last Name", _lastNameController),
                  const SizedBox(height: 12),
                  _buildTextField("Date of Birth (YYYY-MM-DD)", _dobController),
                  const SizedBox(height: 12),
                  _buildTextField("Residential Address", _addressController),
                ],
              ),
            ),
          ),
          Step(
            title: Text("ID Verification", style: TextStyle(color: AppColors.dynamicTextPrimary, fontWeight: FontWeight.bold)),
            isActive: _currentStep >= 1,
            state: _currentStep > 1 ? StepState.complete : StepState.indexed,
            content: Column(
              children: [
                const Text("Please upload clear photos of your National ID Card.", style: TextStyle(color: AppColors.textSecondary)),
                const SizedBox(height: 16),
                _buildIdUploadCard("Front of ID", _idFrontUploaded, _idFrontBytes, () => _pickIdImage(true)),
                const SizedBox(height: 12),
                _buildIdUploadCard("Back of ID", _idBackUploaded, _idBackBytes, () => _pickIdImage(false)),
              ],
            ),
          ),
          Step(
            title: Text("Face Scan", style: TextStyle(color: AppColors.dynamicTextPrimary, fontWeight: FontWeight.bold)),
            isActive: _currentStep >= 2,
            state: _currentStep > 2 ? StepState.complete : StepState.indexed,
            content: _buildFaceScanUI(),
          ),
          Step(
            title: Text("Review & Submit", style: TextStyle(color: AppColors.dynamicTextPrimary, fontWeight: FontWeight.bold)),
            isActive: _currentStep >= 3,
            content: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                _buildReviewItem("Phone Number", widget.phoneNumber),
                _buildReviewItem("NIN", _ninController.text),
                _buildReviewItem("Name", "${_firstNameController.text} ${_lastNameController.text}"),
                _buildReviewItem("Date of Birth", _dobController.text),
                _buildReviewItem("Address", _addressController.text),
                _buildReviewItem("ID Documents", "Front & Back Uploaded"),
                _buildReviewItem("Face Match", _faceMatchScore != null
                    ? "Verified (${_faceMatchScore!.toStringAsFixed(0)}% match)"
                    : "Photo saved for review"),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildTextField(String label, TextEditingController controller) {
    return TextFormField(
      controller: controller,
      style: TextStyle(color: AppColors.dynamicTextPrimary),
      decoration: InputDecoration(
        labelText: label,
        filled: true,
        fillColor: AppColors.dynamicCard,
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
      ),
      validator: (val) => (val == null || val.isEmpty) ? 'Required' : null,
    );
  }

  Widget _buildIdUploadCard(String title, bool isUploaded, Uint8List? bytes, VoidCallback onTap) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        height: isUploaded ? 120 : 100,
        width: double.infinity,
        decoration: BoxDecoration(
          color: isUploaded ? AppColors.successGreen.withOpacity(0.1) : AppColors.dynamicCard,
          border: Border.all(color: isUploaded ? AppColors.successGreen : AppColors.dynamicBorder, style: isUploaded ? BorderStyle.solid : BorderStyle.none),
          borderRadius: BorderRadius.circular(12),
        ),
        child: isUploaded && bytes != null
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
                        Row(
                          children: [
                            const Icon(Icons.check_circle, color: AppColors.successGreen, size: 18),
                            const SizedBox(width: 6),
                            Text("$title Uploaded", style: const TextStyle(color: AppColors.successGreen, fontWeight: FontWeight.bold, fontSize: 13)),
                          ],
                        ),
                        const SizedBox(height: 4),
                        const Text("Tap to replace", style: TextStyle(color: AppColors.textSecondary, fontSize: 11)),
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
                  Text("Tap to upload $title", style: const TextStyle(color: AppColors.textPrimary, fontWeight: FontWeight.bold)),
                  const SizedBox(height: 4),
                  const Text("Camera or gallery", style: TextStyle(color: AppColors.textSecondary, fontSize: 11)),
                ],
              ),
      ),
    );
  }

  Widget _buildFaceScanUI() {
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
                Text("Face Verified!", style: TextStyle(color: AppColors.successGreen, fontWeight: FontWeight.bold, fontSize: 16)),
              ],
            ),
            if (_faceMatchScore != null) ...[
              const SizedBox(height: 8),
              Text("Match score: ${_faceMatchScore!.toStringAsFixed(0)}%",
                  style: const TextStyle(color: AppColors.successGreen, fontSize: 13)),
            ],
            if (_faceMatchMessage.isNotEmpty && _faceMatchScore == null) ...[
              const SizedBox(height: 8),
              Text(_faceMatchMessage,
                  textAlign: TextAlign.center,
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
        const Text("Position your face within the frame. Your selfie will be compared against your uploaded ID photo.",
            textAlign: TextAlign.center, style: TextStyle(color: AppColors.textSecondary)),
        const SizedBox(height: 24),
        Container(
          width: 220,
          height: 220,
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
                  width: double.infinity,
                  height: double.infinity,
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
                  builder: (context, child) {
                    return Positioned(
                      top: _scanAnimationController.value * 200,
                      child: Container(
                        width: 200,
                        height: 4,
                        decoration: BoxDecoration(
                          color: AppColors.accentGreen,
                          boxShadow: [BoxShadow(color: AppColors.accentGreen.withOpacity(0.5), blurRadius: 8, spreadRadius: 2)],
                        ),
                      ),
                    );
                  },
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
                Expanded(
                  child: Text(_faceMatchMessage,
                      style: const TextStyle(color: AppColors.errorRed, fontSize: 12, height: 1.4)),
                ),
              ],
            ),
          ),
        ],
        if (!_isScanning)
          ElevatedButton.icon(
            onPressed: _isCameraInitialized ? _startFaceScan : null,
            icon: const Icon(Icons.face_retouching_natural),
            label: Text(_faceMatchMessage.isNotEmpty ? "RETRY CAPTURE" : "CAPTURE & COMPARE"),
            style: ElevatedButton.styleFrom(backgroundColor: AppColors.primaryBlue, foregroundColor: Colors.white),
          ),
        if (_isScanning)
          const Column(
            children: [
              SizedBox(height: 8),
              SizedBox(width: 24, height: 24, child: CircularProgressIndicator(strokeWidth: 2, color: AppColors.primaryBlue)),
              SizedBox(height: 8),
              Text("Comparing face with ID...", style: TextStyle(color: AppColors.primaryBlue, fontWeight: FontWeight.bold)),
              SizedBox(height: 4),
              Text("This may take a few seconds", style: TextStyle(color: AppColors.textSecondary, fontSize: 11)),
            ],
          ),
      ],
    );
  }

  Widget _buildReviewItem(String label, String value) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12.0),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(width: 100, child: Text(label, style: const TextStyle(color: AppColors.textMuted, fontSize: 12))),
          Expanded(child: Text(value, style: TextStyle(color: AppColors.dynamicTextPrimary, fontWeight: FontWeight.w600))),
        ],
      ),
    );
  }

  Widget _buildSuccessScreen() {
    return Scaffold(
      backgroundColor: AppColors.isDark ? const Color(0xFF101424) : AppColors.background,
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(32.0),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(Icons.verified, color: AppColors.successGreen, size: 100),
              const SizedBox(height: 24),
              Text("Registration Submitted!", style: AppTextStyles.h1.copyWith(color: AppColors.successGreen), textAlign: TextAlign.center),
              const SizedBox(height: 16),
              const Text(
                "Your KYC details have been successfully submitted for verification. Your SIM will be linked once approved.",
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
                      const Text("Your KYC Reference", style: TextStyle(color: AppColors.textSecondary, fontSize: 12)),
                      const SizedBox(height: 6),
                      Text(_kycReference, style: AppTextStyles.h2.copyWith(fontFamily: 'monospace', fontWeight: FontWeight.bold, color: AppColors.dynamicTextPrimary)),
                      const SizedBox(height: 4),
                      const Text("Save this to check your status later", style: TextStyle(color: AppColors.textSecondary, fontSize: 11)),
                    ],
                  ),
                ),
              ],
              const SizedBox(height: 16),
              Container(
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: AppColors.primaryBlue.withOpacity(0.08),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.info_outline, color: AppColors.primaryBlue, size: 20),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Text(
                        "You can check your verification status anytime from the SIM Verification screen using your NIN.",
                        style: TextStyle(color: AppColors.isDark ? Colors.white70 : AppColors.textSecondary, fontSize: 12, height: 1.4),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 32),
              SizedBox(
                width: double.infinity,
                height: 50,
                child: ElevatedButton(
                  onPressed: () => context.go('/dashboard'),
                  style: ElevatedButton.styleFrom(backgroundColor: AppColors.primaryBlue, foregroundColor: Colors.white, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12))),
                  child: const Text("RETURN TO DASHBOARD", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
