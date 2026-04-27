import 'package:flutter/material.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:provider/provider.dart';
import 'services/auth_provider.dart';
import 'services/feature_provider.dart';
import 'services/api_service.dart';
import 'screens/auth/splash_screen.dart';
import 'screens/auth/login_screen.dart';
import 'screens/dashboard/main_nav.dart';
import 'utils/constants.dart';

@pragma('vm:entry-point')
Future<void> _firebaseMessagingBackgroundHandler(RemoteMessage message) async {
  await Firebase.initializeApp();
}

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Firebase
  await Firebase.initializeApp();
  FirebaseMessaging.onBackgroundMessage(_firebaseMessagingBackgroundHandler);

  // API
  apiService.init();

  runApp(
    MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => AuthProvider()),
        ChangeNotifierProvider(create: (_) => FeatureProvider()),
      ],
      child: const GymSaasApp(),
    ),
  );
}

class GymSaasApp extends StatelessWidget {
  const GymSaasApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: AppConstants.appName,
      debugShowCheckedModeBanner: false,
      theme: appTheme(),
      home: const SplashScreen(),
      routes: {
        '/login': (_) => const LoginScreen(),
        '/home': (_) => const MainNav(),
      },
    );
  }
}
