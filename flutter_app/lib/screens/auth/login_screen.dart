import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import '../../services/auth_provider.dart';
import '../../utils/constants.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _gymIdCtrl = TextEditingController();
  final _phoneCtrl = TextEditingController();
  final _otpCtrl = TextEditingController();

  bool _otpSent = false;
  bool _loading = false;
  String? _error;

  Future<void> _requestOtp() async {
    final phone = _phoneCtrl.text.trim();
    final gymId = _gymIdCtrl.text.trim();
    if (gymId.isEmpty || phone.length < 10) {
      setState(() => _error = 'Enter valid Gym ID and 10-digit phone number');
      return;
    }

    setState(() { _loading = true; _error = null; });
    final auth = context.read<AuthProvider>();
    final err = await auth.requestOtp(phone, gymId);
    setState(() { _loading = false; });

    if (err != null) {
      setState(() => _error = err);
    } else {
      setState(() { _otpSent = true; _error = null; });
      _showSnack('OTP sent to $phone');
    }
  }

  Future<void> _verifyOtp() async {
    final otp = _otpCtrl.text.trim();
    if (otp.length < 4) {
      setState(() => _error = 'Enter the OTP sent to your phone');
      return;
    }

    setState(() { _loading = true; _error = null; });
    final auth = context.read<AuthProvider>();
    final err = await auth.verifyOtp(
      _phoneCtrl.text.trim(),
      _gymIdCtrl.text.trim(),
      otp,
    );
    setState(() { _loading = false; });

    if (err != null) {
      setState(() => _error = err);
    } else {
      Navigator.pushReplacementNamed(context, '/home');
    }
  }

  void _showSnack(String msg) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(msg, style: const TextStyle(fontFamily: 'Poppins')),
        backgroundColor: AppColors.success,
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
      ),
    );
  }

  @override
  void dispose() {
    _gymIdCtrl.dispose();
    _phoneCtrl.dispose();
    _otpCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const SizedBox(height: 32),

              // Logo
              Container(
                width: 64,
                height: 64,
                decoration: BoxDecoration(
                  gradient: AppColors.primaryGradient,
                  borderRadius: BorderRadius.circular(16),
                ),
                child: const Icon(Icons.fitness_center_rounded,
                    color: Colors.white, size: 32),
              ),
              const SizedBox(height: 24),

              Text(
                _otpSent ? 'Verify OTP' : 'Member Login',
                style: AppTextStyles.heading1,
              ),
              const SizedBox(height: 6),
              Text(
                _otpSent
                    ? 'Enter the OTP sent to ${_phoneCtrl.text}'
                    : 'Login with your registered mobile number',
                style: AppTextStyles.body.copyWith(
                    color: AppColors.textSecondary),
              ),
              const SizedBox(height: 36),

              if (!_otpSent) ...[
                // Gym ID field
                _buildLabel('Gym ID'),
                const SizedBox(height: 6),
                TextField(
                  controller: _gymIdCtrl,
                  decoration: const InputDecoration(
                    hintText: 'Enter your gym ID',
                    prefixIcon: Icon(Icons.storefront_outlined,
                        color: AppColors.textHint),
                  ),
                  textInputAction: TextInputAction.next,
                ),
                const SizedBox(height: 16),

                // Phone field
                _buildLabel('Mobile Number'),
                const SizedBox(height: 6),
                TextField(
                  controller: _phoneCtrl,
                  keyboardType: TextInputType.phone,
                  inputFormatters: [
                    FilteringTextInputFormatter.digitsOnly,
                    LengthLimitingTextInputFormatter(10),
                  ],
                  decoration: const InputDecoration(
                    hintText: '10-digit mobile number',
                    prefixIcon: Icon(Icons.phone_outlined,
                        color: AppColors.textHint),
                    prefixText: '+91  ',
                  ),
                ),
              ] else ...[
                // OTP field
                _buildLabel('OTP'),
                const SizedBox(height: 6),
                TextField(
                  controller: _otpCtrl,
                  keyboardType: TextInputType.number,
                  inputFormatters: [
                    FilteringTextInputFormatter.digitsOnly,
                    LengthLimitingTextInputFormatter(6),
                  ],
                  textAlign: TextAlign.center,
                  style: const TextStyle(
                    fontSize: 24,
                    fontWeight: FontWeight.w700,
                    letterSpacing: 12,
                    fontFamily: 'Poppins',
                  ),
                  decoration: const InputDecoration(
                    hintText: '------',
                    hintStyle: TextStyle(letterSpacing: 12),
                  ),
                  autofocus: true,
                ),
                const SizedBox(height: 12),
                Center(
                  child: TextButton(
                    onPressed: _loading ? null : () {
                      setState(() { _otpSent = false; _otpCtrl.clear(); });
                    },
                    child: const Text('Change phone number',
                        style: TextStyle(color: AppColors.primary,
                            fontFamily: 'Poppins')),
                  ),
                ),
              ],

              // Error
              if (_error != null) ...[
                const SizedBox(height: 12),
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: AppColors.error.withOpacity(0.08),
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(color: AppColors.error.withOpacity(0.3)),
                  ),
                  child: Row(
                    children: [
                      const Icon(Icons.error_outline,
                          color: AppColors.error, size: 18),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(_error!,
                            style: AppTextStyles.caption.copyWith(
                                color: AppColors.error)),
                      ),
                    ],
                  ),
                ),
              ],

              const SizedBox(height: 28),

              // Button
              ElevatedButton(
                onPressed: _loading
                    ? null
                    : (_otpSent ? _verifyOtp : _requestOtp),
                child: _loading
                    ? const SizedBox(
                        height: 20,
                        width: 20,
                        child: CircularProgressIndicator(
                          color: Colors.white, strokeWidth: 2.5),
                      )
                    : Text(_otpSent ? 'Verify & Login' : 'Send OTP'),
              ),

              const SizedBox(height: 24),
              Center(
                child: Text(
                  'Contact your gym for the Gym ID',
                  style: AppTextStyles.caption,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildLabel(String text) {
    return Text(text,
        style: AppTextStyles.label.copyWith(color: AppColors.textPrimary));
  }
}
