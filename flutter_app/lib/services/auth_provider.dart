import 'package:flutter/foundation.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import '../services/api_service.dart';
import '../utils/constants.dart';

enum AuthStatus { unknown, authenticated, unauthenticated }

class AuthProvider extends ChangeNotifier {
  final _storage = const FlutterSecureStorage();

  AuthStatus _status = AuthStatus.unknown;
  String? _memberId;
  String? _memberName;
  String? _gymId;
  String? _phone;

  AuthStatus get status => _status;
  String? get memberId => _memberId;
  String? get memberName => _memberName;
  String? get gymId => _gymId;
  String? get phone => _phone;
  bool get isAuthenticated => _status == AuthStatus.authenticated;

  Future<void> init() async {
    final token = await _storage.read(key: AppConstants.tokenKey);
    if (token != null) {
      _memberId = await _storage.read(key: AppConstants.memberIdKey);
      _memberName = await _storage.read(key: AppConstants.memberNameKey);
      _gymId = await _storage.read(key: AppConstants.gymIdKey);
      _phone = await _storage.read(key: AppConstants.phoneKey);
      _status = AuthStatus.authenticated;
    } else {
      _status = AuthStatus.unauthenticated;
    }
    notifyListeners();
  }

  Future<String?> requestOtp(String phone, String gymId) async {
    try {
      await apiService.requestOtp(phone, gymId);
      return null; // null = success
    } catch (e) {
      return _parseError(e);
    }
  }

  Future<String?> verifyOtp(String phone, String gymId, String otp) async {
    try {
      final data = await apiService.verifyOtp(phone, gymId, otp);
      final token = data['access_token'];
      final id = data['id'];
      final name = data['name'];

      await _storage.write(key: AppConstants.tokenKey, value: token);
      await _storage.write(key: AppConstants.memberIdKey, value: id);
      await _storage.write(key: AppConstants.memberNameKey, value: name);
      await _storage.write(key: AppConstants.gymIdKey, value: gymId);
      await _storage.write(key: AppConstants.phoneKey, value: phone);

      _memberId = id;
      _memberName = name;
      _gymId = gymId;
      _phone = phone;
      _status = AuthStatus.authenticated;
      notifyListeners();
      return null;
    } catch (e) {
      return _parseError(e);
    }
  }

  Future<void> logout() async {
    await _storage.deleteAll();
    _status = AuthStatus.unauthenticated;
    _memberId = null;
    _memberName = null;
    _gymId = null;
    _phone = null;
    notifyListeners();
  }

  String _parseError(dynamic e) {
    if (e is Exception) {
      final msg = e.toString();
      if (msg.contains('404')) return 'Phone number not registered in this gym';
      if (msg.contains('400')) return 'Invalid or expired OTP';
      if (msg.contains('403')) return 'Gym subscription expired';
      if (msg.contains('SocketException') || msg.contains('connection')) {
        return 'Cannot connect to server. Check your internet.';
      }
    }
    return 'Something went wrong. Please try again.';
  }
}
