import 'package:flutter/material.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:provider/provider.dart';
import '../../services/api_service.dart';
import '../../services/feature_provider.dart';
import '../../utils/constants.dart';
import '../../widgets/feature_gate.dart';
import '../dashboard/dashboard_screen.dart';
import '../workout/workout_screen.dart';
import '../attendance/attendance_screen.dart';
import '../payments/payments_screen.dart';
import '../diet/diet_screen.dart';
import '../profile/profile_screen.dart';

class MainNav extends StatefulWidget {
  const MainNav({super.key});

  @override
  State<MainNav> createState() => _MainNavState();
}

class _MainNavState extends State<MainNav> {
  int _selectedIndex = 0;

  @override
  void initState() {
    super.initState();
    _setupFCM();
    _setupForegroundNotifications();
    // Load feature flags on app start
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<FeatureProvider>().loadFeatures();
    });
  }

  Future<void> _setupFCM() async {
    final messaging = FirebaseMessaging.instance;
    await messaging.requestPermission(alert: true, badge: true, sound: true);
    final token = await messaging.getToken();
    if (token != null) {
      try {
        await apiService.updateFcmToken(token);
      } catch (_) {}
    }
    messaging.onTokenRefresh.listen((newToken) async {
      try {
        await apiService.updateFcmToken(newToken);
      } catch (_) {}
    });
  }

  void _setupForegroundNotifications() {
    FirebaseMessaging.onMessage.listen((RemoteMessage message) {
      final notification = message.notification;
      if (notification != null && mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  notification.title ?? '',
                  style: const TextStyle(
                      fontWeight: FontWeight.w600, fontFamily: 'Poppins'),
                ),
                if (notification.body != null)
                  Text(notification.body!,
                      style: const TextStyle(
                          fontSize: 12, fontFamily: 'Poppins')),
              ],
            ),
            backgroundColor: AppColors.primary,
            behavior: SnackBarBehavior.floating,
            shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(10)),
            duration: const Duration(seconds: 4),
          ),
        );
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    // Screens — Workout and Diet are wrapped with FeatureGate
    final screens = <Widget>[
      const DashboardScreen(),
      const FeatureGate(
        feature: 'member_workout_view',
        child: WorkoutScreen(),
      ),
      const AttendanceScreen(),
      const PaymentsScreen(),
      const FeatureGate(
        feature: 'member_diet_view',
        child: DietScreen(),
      ),
      const ProfileScreen(),
    ];

    return Scaffold(
      body: IndexedStack(index: _selectedIndex, children: screens),
      bottomNavigationBar: Container(
        decoration: const BoxDecoration(
          border: Border(top: BorderSide(color: AppColors.border)),
        ),
        child: NavigationBar(
          selectedIndex: _selectedIndex,
          onDestinationSelected: (i) =>
              setState(() => _selectedIndex = i),
          backgroundColor: AppColors.surface,
          elevation: 0,
          labelBehavior:
              NavigationDestinationLabelBehavior.onlyShowSelected,
          destinations: const [
            NavigationDestination(
              icon: Icon(Icons.home_outlined),
              selectedIcon: Icon(Icons.home_rounded),
              label: 'Home',
            ),
            NavigationDestination(
              icon: Icon(Icons.fitness_center_outlined),
              selectedIcon: Icon(Icons.fitness_center_rounded),
              label: 'Workout',
            ),
            NavigationDestination(
              icon: Icon(Icons.qr_code_scanner_outlined),
              selectedIcon: Icon(Icons.qr_code_scanner_rounded),
              label: 'Check In',
            ),
            NavigationDestination(
              icon: Icon(Icons.receipt_long_outlined),
              selectedIcon: Icon(Icons.receipt_long_rounded),
              label: 'Payments',
            ),
            NavigationDestination(
              icon: Icon(Icons.restaurant_menu_outlined),
              selectedIcon: Icon(Icons.restaurant_menu_rounded),
              label: 'Diet',
            ),
            NavigationDestination(
              icon: Icon(Icons.person_outline_rounded),
              selectedIcon: Icon(Icons.person_rounded),
              label: 'Profile',
            ),
          ],
        ),
      ),
    );
  }
}
