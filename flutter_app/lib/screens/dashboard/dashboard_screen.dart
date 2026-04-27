import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import '../../services/auth_provider.dart';
import '../../services/api_service.dart';
import '../../utils/constants.dart';
import '../profile/profile_screen.dart';
import '../notifications/notifications_screen.dart';
import '../bmi/bmi_calculator_screen.dart';
import '../measurements/measurements_screen.dart';
import '../announcements/announcements_screen.dart';
import '../attendance/attendance_screen.dart';

class DashboardScreen extends StatefulWidget {
  const DashboardScreen({super.key});

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  Map<String, dynamic>? _data;
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() { _loading = true; _error = null; });
    try {
      final data = await apiService.getDashboard();
      setState(() { _data = data; _loading = false; });
    } catch (e) {
      setState(() { _error = 'Failed to load dashboard'; _loading = false; });
    }
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    return Scaffold(
      body: SafeArea(
        child: RefreshIndicator(
          onRefresh: _load,
          child: _loading
              ? const Center(child: CircularProgressIndicator())
              : _error != null
                  ? _buildError()
                  : _buildContent(auth),
        ),
      ),
    );
  }

  void _navigateToAttendance(BuildContext context) {
    // Navigate to the attendance screen's Calendar tab
    Navigator.push(
      context,
      MaterialPageRoute(builder: (_) => const AttendanceScreen(initialTab: 1)),
    );
  }

  Widget _buildError() {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Icon(Icons.wifi_off_rounded,
              size: 48, color: AppColors.textHint),
          const SizedBox(height: 12),
          Text(_error!, style: AppTextStyles.body),
          const SizedBox(height: 12),
          ElevatedButton.icon(
            onPressed: _load,
            icon: const Icon(Icons.refresh),
            label: const Text('Retry'),
            style: ElevatedButton.styleFrom(minimumSize: const Size(140, 44)),
          ),
        ],
      ),
    );
  }

  Widget _buildContent(AuthProvider auth) {
    final d = _data!;
    final daysLeft = d['days_left'] as int?;
    final isExpired = d['is_expired'] as bool? ?? false;

    return CustomScrollView(
      slivers: [
        SliverToBoxAdapter(
          child: Padding(
            padding: const EdgeInsets.fromLTRB(20, 20, 20, 0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Greeting
                Row(
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Hello, ${auth.memberName?.split(' ').first ?? ''} 👋',
                            style: AppTextStyles.heading2,
                          ),
                          Text(
                            d['gym_name'] ?? '',
                            style: AppTextStyles.body.copyWith(
                                color: AppColors.textSecondary),
                          ),
                        ],
                      ),
                    ),
                    GestureDetector(
                      onTap: () {
                        Navigator.push(
                          context,
                          MaterialPageRoute(
                            builder: (_) => const ProfileScreen(),
                          ),
                        );
                      },
                      child: Container(
                        width: 42,
                        height: 42,
                        decoration: BoxDecoration(
                          color: AppColors.primaryLight,
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: const Icon(Icons.person_outline_rounded,
                            color: AppColors.primary),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 20),

                // Membership card
                _MembershipCard(data: d, daysLeft: daysLeft, isExpired: isExpired),
                const SizedBox(height: 20),

                // Check-in status
                _CheckInBanner(checkedIn: d['checked_in_today'] as bool? ?? false),
                const SizedBox(height: 20),

                // Stats row — tappable, navigates to Attendance Calendar
                Row(
                  children: [
                    Expanded(child: GestureDetector(
                      onTap: () => _navigateToAttendance(context),
                      child: _StatCard(
                        label: 'This Month',
                        value: '${d['monthly_attendance'] ?? 0}',
                        unit: 'days',
                        icon: Icons.calendar_month_rounded,
                        color: AppColors.info,
                      ),
                    )),
                    const SizedBox(width: 12),
                    Expanded(child: GestureDetector(
                      onTap: () => _navigateToAttendance(context),
                      child: _StatCard(
                        label: 'Total Days',
                        value: '${d['total_attendance'] ?? 0}',
                        unit: 'attended',
                        icon: Icons.check_circle_outline_rounded,
                        color: AppColors.success,
                      ),
                    )),
                    const SizedBox(width: 12),
                    Expanded(child: GestureDetector(
                      onTap: () => _navigateToAttendance(context),
                      child: _StatCard(
                        label: 'Streak',
                        value: '${d['current_streak'] ?? 0}',
                        unit: 'days',
                        icon: Icons.local_fire_department_rounded,
                        color: AppColors.warning,
                      ),
                    )),
                  ],
                ),
                const SizedBox(height: 20),

                // Quick Actions
                const Text('Quick Actions', style: AppTextStyles.bodyMedium),
                const SizedBox(height: 10),
                Row(children: [
                  Expanded(child: _QuickAction(
                    icon: Icons.notifications_outlined, label: 'Notifications',
                    color: AppColors.warning,
                    onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const NotificationsScreen())),
                  )),
                  const SizedBox(width: 10),
                  Expanded(child: _QuickAction(
                    icon: Icons.calculate_outlined, label: 'BMI Calc',
                    color: AppColors.info,
                    onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const BmiCalculatorScreen())),
                  )),
                  const SizedBox(width: 10),
                  Expanded(child: _QuickAction(
                    icon: Icons.straighten_rounded, label: 'Body Stats',
                    color: AppColors.success,
                    onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const MeasurementsScreen())),
                  )),
                  const SizedBox(width: 10),
                  Expanded(child: _QuickAction(
                    icon: Icons.campaign_outlined, label: 'Updates',
                    color: const Color(0xFF7C3AED),
                    onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const AnnouncementsScreen())),
                  )),
                ]),
                const SizedBox(height: 20),

                // Last payment
                if (d['last_payment']?['amount'] != null)
                  _LastPaymentCard(payment: d['last_payment']),

                const SizedBox(height: 24),
              ],
            ),
          ),
        ),
      ],
    );
  }

}

class _MembershipCard extends StatelessWidget {
  final Map<String, dynamic> data;
  final int? daysLeft;
  final bool isExpired;

  const _MembershipCard({
    required this.data,
    required this.daysLeft,
    required this.isExpired,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(22),
      decoration: BoxDecoration(
        gradient: isExpired
            ? const LinearGradient(
                colors: [Color(0xFFEF4444), Color(0xFFDC2626)])
            : AppColors.cardGradient,
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(
            color: AppColors.primary.withOpacity(0.3),
            blurRadius: 20,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(Icons.card_membership_rounded,
                  color: Colors.white70, size: 18),
              const SizedBox(width: 6),
              Text(
                'Membership',
                style: TextStyle(
                    color: Colors.white.withOpacity(0.8),
                    fontSize: 13,
                    fontFamily: 'Poppins'),
              ),
              const Spacer(),
              Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: Colors.white.withOpacity(0.2),
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Text(
                  isExpired ? 'EXPIRED' : 'ACTIVE',
                  style: const TextStyle(
                      color: Colors.white,
                      fontSize: 11,
                      fontWeight: FontWeight.w700,
                      fontFamily: 'Poppins'),
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          Text(
            data['name'] ?? '',
            style: const TextStyle(
                color: Colors.white,
                fontSize: 22,
                fontWeight: FontWeight.w700,
                fontFamily: 'Poppins'),
          ),
          const SizedBox(height: 4),
          Text(
            data['phone'] ?? '',
            style: TextStyle(
                color: Colors.white.withOpacity(0.75),
                fontSize: 14,
                fontFamily: 'Poppins'),
          ),
          const SizedBox(height: 16),
          Row(
            children: [
              _cardInfo('Joined',
                  _formatDate(data['join_date']?.toString())),
              const SizedBox(width: 24),
              _cardInfo(
                  'Valid Till',
                  _formatDate(data['plan_expiry']?.toString())),
              const Spacer(),
              if (!isExpired && daysLeft != null)
                Container(
                  padding: const EdgeInsets.symmetric(
                      horizontal: 12, vertical: 6),
                  decoration: BoxDecoration(
                    color: Colors.white.withOpacity(0.15),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Text(
                    '$daysLeft days left',
                    style: const TextStyle(
                        color: Colors.white,
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                        fontFamily: 'Poppins'),
                  ),
                ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _cardInfo(String label, String value) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label,
            style: TextStyle(
                color: Colors.white.withOpacity(0.7),
                fontSize: 11,
                fontFamily: 'Poppins')),
        Text(value,
            style: const TextStyle(
                color: Colors.white,
                fontSize: 13,
                fontWeight: FontWeight.w600,
                fontFamily: 'Poppins')),
      ],
    );
  }

  String _formatDate(String? raw) {
    if (raw == null) return '—';
    try {
      return DateFormat('dd MMM yyyy').format(DateTime.parse(raw));
    } catch (_) {
      return raw;
    }
  }
}

class _CheckInBanner extends StatelessWidget {
  final bool checkedIn;
  const _CheckInBanner({required this.checkedIn});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: checkedIn
            ? AppColors.success.withOpacity(0.1)
            : AppColors.warning.withOpacity(0.1),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
            color: checkedIn
                ? AppColors.success.withOpacity(0.3)
                : AppColors.warning.withOpacity(0.3)),
      ),
      child: Row(
        children: [
          Icon(
            checkedIn
                ? Icons.check_circle_rounded
                : Icons.qr_code_scanner_rounded,
            color: checkedIn ? AppColors.success : AppColors.warning,
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              checkedIn
                  ? 'You checked in today! Keep up the momentum.'
                  : 'You haven\'t checked in today. Head to the gym!',
              style: AppTextStyles.body.copyWith(
                  color: checkedIn ? AppColors.success : AppColors.warning,
                  fontWeight: FontWeight.w500),
            ),
          ),
        ],
      ),
    );
  }
}

class _StatCard extends StatelessWidget {
  final String label, value, unit;
  final IconData icon;
  final Color color;

  const _StatCard({
    required this.label,
    required this.value,
    required this.unit,
    required this.icon,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: color.withOpacity(0.08),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: color.withOpacity(0.2)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, color: color, size: 20),
          const SizedBox(height: 8),
          Text(value,
              style: TextStyle(
                  fontSize: 20,
                  fontWeight: FontWeight.w700,
                  color: color,
                  fontFamily: 'Poppins')),
          Text(unit,
              style: AppTextStyles.caption.copyWith(color: color.withOpacity(0.8))),
          const SizedBox(height: 2),
          Text(label, style: AppTextStyles.caption),
        ],
      ),
    );
  }
}

class _LastPaymentCard extends StatelessWidget {
  final Map<String, dynamic> payment;
  const _LastPaymentCard({required this.payment});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.border),
      ),
      child: Row(
        children: [
          Container(
            width: 44,
            height: 44,
            decoration: BoxDecoration(
              color: AppColors.primaryLight,
              borderRadius: BorderRadius.circular(12),
            ),
            child: const Icon(Icons.receipt_long_rounded,
                color: AppColors.primary, size: 22),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('Last Payment',
                    style: AppTextStyles.caption),
                Text(
                  'Rs. ${payment['amount']?.toStringAsFixed(0) ?? '—'}',
                  style: AppTextStyles.bodyMedium,
                ),
              ],
            ),
          ),
          Text(
            payment['receipt'] ?? '',
            style: AppTextStyles.caption,
          ),
        ],
      ),
    );
  }
}

class _QuickAction extends StatelessWidget {
  final IconData icon;
  final String label;
  final Color color;
  final VoidCallback onTap;

  const _QuickAction({
    required this.icon,
    required this.label,
    required this.color,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 14),
        decoration: BoxDecoration(
          color: color.withOpacity(0.08),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: color.withOpacity(0.2)),
        ),
        child: Column(
          children: [
            Icon(icon, color: color, size: 22),
            const SizedBox(height: 6),
            Text(label, style: TextStyle(
              fontSize: 10, fontWeight: FontWeight.w600,
              color: color, fontFamily: 'Poppins',
            )),
          ],
        ),
      ),
    );
  }
}
