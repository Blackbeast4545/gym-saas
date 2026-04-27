import 'package:dio/dio.dart';
import 'dart:typed_data';
import 'package:pretty_dio_logger/pretty_dio_logger.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import '../utils/constants.dart';

class ApiService {
  static final ApiService _instance = ApiService._internal();
  factory ApiService() => _instance;
  ApiService._internal();

  late final Dio _dio;
  final _storage = const FlutterSecureStorage();
  String? _lastDemoMessage;

  /// Returns and clears the last demo mode message (if any)
  String? consumeDemoMessage() {
    final msg = _lastDemoMessage;
    _lastDemoMessage = null;
    return msg;
  }

  void init() {
    _dio = Dio(BaseOptions(
      baseUrl: AppConstants.baseUrl,
      connectTimeout: const Duration(milliseconds: AppConstants.connectTimeout),
      receiveTimeout: const Duration(milliseconds: AppConstants.receiveTimeout),
      headers: {'Content-Type': 'application/json'},
    ));

    // Auth interceptor — attach Bearer token automatically
    _dio.interceptors.add(InterceptorsWrapper(
      onRequest: (options, handler) async {
        final token = await _storage.read(key: AppConstants.tokenKey);
        if (token != null) {
          options.headers['Authorization'] = 'Bearer $token';
        }
        return handler.next(options);
      },
      onError: (error, handler) async {
        if (error.response?.statusCode == 401) {
          // Token expired — clear storage, redirect handled by AuthProvider
          await _storage.deleteAll();
        }
        // Demo mode — swallow error, the UI will show the message via demoMessage
        if (error.response?.statusCode == 403) {
          final data = error.response?.data;
          if (data is Map && data['demo_mode'] == true) {
            _lastDemoMessage = data['detail']?.toString() ?? 'Demo account — view only';
          }
        }
        return handler.next(error);
      },
    ));

    _dio.interceptors.add(PrettyDioLogger(
      requestHeader: false,
      requestBody: true,
      responseBody: true,
      error: true,
      compact: true,
    ));
  }

  // ── AUTH ──────────────────────────────────

  Future<Map<String, dynamic>> requestOtp(String phone, String gymId) async {
    final res = await _dio.post('/auth/member/request-otp', data: {
      'phone': phone,
      'gym_id': gymId,
    });
    return res.data;
  }

  Future<Map<String, dynamic>> verifyOtp(
      String phone, String gymId, String otp) async {
    final res = await _dio.post('/auth/member/verify-otp', data: {
      'phone': phone,
      'gym_id': gymId,
      'otp': otp,
    });
    return res.data;
  }

  // ── MEMBER DASHBOARD ──────────────────────

  Future<Map<String, dynamic>> getDashboard() async {
    final res = await _dio.get('/member/dashboard');
    return res.data;
  }

  Future<Map<String, dynamic>> getProfile() async {
    final res = await _dio.get('/member/profile');
    return res.data;
  }

  // ── WORKOUT ───────────────────────────────

  Future<Map<String, dynamic>> getWorkoutPlan() async {
    final res = await _dio.get('/member/workout');
    return res.data;
  }

  // ── DIET ──────────────────────────────────

  Future<Map<String, dynamic>> getDietPlan() async {
    final res = await _dio.get('/member/diet');
    return res.data;
  }

  // ── ATTENDANCE ────────────────────────────

  Future<Map<String, dynamic>> getAttendanceHistory() async {
    final res = await _dio.get('/attendance/my-history');
    return res.data;
  }

  Future<Map<String, dynamic>> scanQrCheckIn(
      String qrToken, String memberId) async {
    final res = await _dio.post('/attendance/scan', data: {
      'qr_token': qrToken,
      'member_id': memberId,
    });
    return res.data;
  }

  // ── PAYMENTS ──────────────────────────────

  Future<List<dynamic>> getPayments() async {
    final res = await _dio.get('/member/payments');
    return res.data;
  }

  // ── NOTIFICATIONS ─────────────────────────

  Future<List<dynamic>> getNotifications() async {
    final res = await _dio.get('/notifications/my-notifications');
    return res.data;
  }

  Future<void> updateFcmToken(String fcmToken) async {
    await _dio.post('/notifications/update-fcm-token', data: {
      'fcm_token': fcmToken,
    });
  }

  // ── BODY MEASUREMENTS ────────────────────

  Future<List<dynamic>> getMeasurements() async {
    final res = await _dio.get('/member/measurements');
    return res.data;
  }

  // ── RECEIPT PDF DOWNLOAD ─────────────────

  Future<Uint8List> getReceiptPdf(String paymentId) async {
    final res = await _dio.get(
      '/member/payments/$paymentId/receipt',
      options: Options(responseType: ResponseType.bytes),
    );
    return Uint8List.fromList(res.data);
  }

  // ── ANNOUNCEMENTS ────────────────────────

  Future<List<dynamic>> getAnnouncements() async {
    final res = await _dio.get('/member/announcements');
    return res.data;
  }

  // ── FEATURE FLAGS ──────────────────────────

  Future<Map<String, dynamic>> getFeatures() async {
    final res = await _dio.get('/member/features');
    return Map<String, dynamic>.from(res.data);
  }
}

final apiService = ApiService();
