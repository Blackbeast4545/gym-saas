import 'package:flutter/material.dart';

class AppConstants {
  // ── API ────────────────────────────────────
 static const String baseUrl = 'https://gym-saas-api-kefz.onrender.com/api/v1'; // Production
  // static const String baseUrl = 'http://localhost:8000/api/v1'; // iOS simulator
  // static const String baseUrl = 'https://your-domain.com/api/v1'; // Production

  static const int connectTimeout = 15000;
  static const int receiveTimeout = 15000;

  // ── Storage Keys ───────────────────────────
  static const String tokenKey = 'access_token';
  static const String memberIdKey = 'member_id';
  static const String memberNameKey = 'member_name';
  static const String gymIdKey = 'gym_id';
  static const String phoneKey = 'phone';

  // ── App ────────────────────────────────────
  static const String appName = 'FitNexus';
  static const String appVersion = '1.0.0';
}

class AppColors {
  // Primary
  static const Color primary = Color(0xFF4F46E5);       // Indigo
  static const Color primaryDark = Color(0xFF3730A3);
  static const Color primaryLight = Color(0xFFEEF2FF);

  // Accent
  static const Color accent = Color(0xFF10B981);        // Emerald
  static const Color accentDark = Color(0xFF059669);

  // Status
  static const Color success = Color(0xFF22C55E);
  static const Color warning = Color(0xFFF59E0B);
  static const Color error = Color(0xFFEF4444);
  static const Color info = Color(0xFF3B82F6);

  // Neutral
  static const Color background = Color(0xFFF8F9FC);
  static const Color surface = Color(0xFFFFFFFF);
  static const Color surfaceVariant = Color(0xFFF1F5F9);
  static const Color border = Color(0xFFE2E8F0);
  static const Color textPrimary = Color(0xFF0F172A);
  static const Color textSecondary = Color(0xFF64748B);
  static const Color textHint = Color(0xFF94A3B8);

  // Gradient
  static const LinearGradient primaryGradient = LinearGradient(
    colors: [Color(0xFF4F46E5), Color(0xFF7C3AED)],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );

  static const LinearGradient cardGradient = LinearGradient(
    colors: [Color(0xFF4F46E5), Color(0xFF6366F1)],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );
}

class AppTextStyles {
  static const TextStyle heading1 = TextStyle(
    fontSize: 28, fontWeight: FontWeight.w700,
    color: AppColors.textPrimary, fontFamily: 'Poppins',
  );
  static const TextStyle heading2 = TextStyle(
    fontSize: 22, fontWeight: FontWeight.w600,
    color: AppColors.textPrimary, fontFamily: 'Poppins',
  );
  static const TextStyle heading3 = TextStyle(
    fontSize: 18, fontWeight: FontWeight.w600,
    color: AppColors.textPrimary, fontFamily: 'Poppins',
  );
  static const TextStyle body = TextStyle(
    fontSize: 14, fontWeight: FontWeight.w400,
    color: AppColors.textPrimary, fontFamily: 'Poppins',
  );
  static const TextStyle bodyMedium = TextStyle(
    fontSize: 14, fontWeight: FontWeight.w500,
    color: AppColors.textPrimary, fontFamily: 'Poppins',
  );
  static const TextStyle caption = TextStyle(
    fontSize: 12, fontWeight: FontWeight.w400,
    color: AppColors.textSecondary, fontFamily: 'Poppins',
  );
  static const TextStyle label = TextStyle(
    fontSize: 13, fontWeight: FontWeight.w500,
    color: AppColors.textSecondary, fontFamily: 'Poppins',
  );
}

ThemeData appTheme() {
  return ThemeData(
    useMaterial3: true,
    fontFamily: 'Poppins',
    colorScheme: ColorScheme.fromSeed(
      seedColor: AppColors.primary,
      primary: AppColors.primary,
      background: AppColors.background,
      surface: AppColors.surface,
    ),
    scaffoldBackgroundColor: AppColors.background,
    appBarTheme: const AppBarTheme(
      backgroundColor: AppColors.surface,
      elevation: 0,
      centerTitle: false,
      titleTextStyle: TextStyle(
        fontSize: 18, fontWeight: FontWeight.w600,
        color: AppColors.textPrimary, fontFamily: 'Poppins',
      ),
      iconTheme: IconThemeData(color: AppColors.textPrimary),
    ),
    elevatedButtonTheme: ElevatedButtonThemeData(
      style: ElevatedButton.styleFrom(
        backgroundColor: AppColors.primary,
        foregroundColor: Colors.white,
        minimumSize: const Size(double.infinity, 52),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        textStyle: const TextStyle(
          fontSize: 15, fontWeight: FontWeight.w600, fontFamily: 'Poppins',
        ),
      ),
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: AppColors.surfaceVariant,
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: AppColors.border),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: AppColors.border),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: AppColors.primary, width: 2),
      ),
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      hintStyle: const TextStyle(color: AppColors.textHint, fontFamily: 'Poppins'),
    ),
    cardTheme: CardTheme(
      color: AppColors.surface,
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
        side: const BorderSide(color: AppColors.border),
      ),
    ),
  );
}
