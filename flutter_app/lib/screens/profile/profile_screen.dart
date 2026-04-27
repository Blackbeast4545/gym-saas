import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import '../../services/api_service.dart';
import '../../services/auth_provider.dart';
import '../../utils/constants.dart';

class ProfileScreen extends StatefulWidget {
  const ProfileScreen({super.key});

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  Map<String, dynamic>? _profile;
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final data = await apiService.getProfile();
      setState(() {
        _profile = data;
        _loading = false;
      });
    } catch (_) {
      setState(() => _loading = false);
    }
  }

  String _fmtDate(String? raw) {
    if (raw == null) return '—';
    try {
      return DateFormat('dd MMM yyyy').format(DateTime.parse(raw));
    } catch (_) {
      return raw;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Profile')),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _profile == null
              ? const Center(child: Text('Failed to load profile'))
              : RefreshIndicator(
                  onRefresh: _load,
                  child: ListView(
                    padding: const EdgeInsets.all(20),
                    children: [
                      // Avatar + Name
                      Center(
                        child: Column(
                          children: [
                            CircleAvatar(
                              radius: 45,
                              backgroundColor: AppColors.primaryLight,
                              backgroundImage:
                                  _profile!['profile_photo_url'] != null
                                      ? NetworkImage(
                                          _profile!['profile_photo_url'])
                                      : null,
                              child: _profile!['profile_photo_url'] == null
                                  ? Text(
                                      (_profile!['name'] ?? 'U')[0]
                                          .toUpperCase(),
                                      style: const TextStyle(
                                        fontSize: 36,
                                        fontWeight: FontWeight.w700,
                                        color: AppColors.primary,
                                        fontFamily: 'Poppins',
                                      ),
                                    )
                                  : null,
                            ),
                            const SizedBox(height: 12),
                            Text(
                              _profile!['name'] ?? '—',
                              style: AppTextStyles.heading2,
                            ),
                            const SizedBox(height: 4),
                            Text(
                              _profile!['phone'] ?? '',
                              style: AppTextStyles.body.copyWith(
                                  color: AppColors.textSecondary),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 24),

                      // Personal Details
                      _SectionCard(
                        title: 'Personal Details',
                        icon: Icons.person_outline_rounded,
                        children: [
                          _InfoRow('Name', _profile!['name']),
                          _InfoRow('Phone', _profile!['phone']),
                          _InfoRow('Email', _profile!['email'] ?? '—'),
                          _InfoRow('Date of Birth',
                              _fmtDate(_profile!['dob']?.toString())),
                          _InfoRow('Gender', _profile!['gender'] ?? '—'),
                        ],
                      ),
                      const SizedBox(height: 16),

                      // Membership
                      _SectionCard(
                        title: 'Membership',
                        icon: Icons.card_membership_rounded,
                        children: [
                          _InfoRow('Joined',
                              _fmtDate(_profile!['join_date']?.toString())),
                          _InfoRow(
                              'Plan Expiry',
                              _fmtDate(
                                  _profile!['plan_expiry']?.toString())),
                          _InfoRow(
                            'Status',
                            _profile!['plan_expiry'] != null &&
                                    DateTime.tryParse(
                                                _profile!['plan_expiry']
                                                    .toString()) !=
                                            null &&
                                    DateTime.parse(
                                            _profile!['plan_expiry']
                                                .toString())
                                        .isAfter(DateTime.now())
                                ? 'Active'
                                : 'Expired',
                            valueColor:
                                _profile!['plan_expiry'] != null &&
                                        DateTime.tryParse(
                                                    _profile!['plan_expiry']
                                                        .toString()) !=
                                                null &&
                                        DateTime.parse(
                                                _profile!['plan_expiry']
                                                    .toString())
                                            .isAfter(DateTime.now())
                                    ? AppColors.success
                                    : AppColors.error,
                          ),
                        ],
                      ),
                      const SizedBox(height: 16),

                      // Gym Info
                      _SectionCard(
                        title: 'Gym Information',
                        icon: Icons.fitness_center_rounded,
                        children: [
                          _InfoRow('Gym', _profile!['gym_name'] ?? '—'),
                          _InfoRow(
                              'Address', _profile!['gym_address'] ?? '—'),
                          _InfoRow(
                              'Gym Phone', _profile!['gym_phone'] ?? '—'),
                        ],
                        logoUrl: _profile!['gym_logo_url']?.toString(),
                      ),
                      const SizedBox(height: 24),

                      // Logout button
                      SizedBox(
                        width: double.infinity,
                        child: OutlinedButton.icon(
                          onPressed: () {
                            showDialog(
                              context: context,
                              builder: (ctx) => AlertDialog(
                                title: const Text('Logout',
                                    style: TextStyle(fontFamily: 'Poppins')),
                                content: const Text(
                                    'Are you sure you want to logout?',
                                    style: TextStyle(fontFamily: 'Poppins')),
                                actions: [
                                  TextButton(
                                    onPressed: () =>
                                        Navigator.pop(ctx),
                                    child: const Text('Cancel'),
                                  ),
                                  TextButton(
                                    onPressed: () {
                                      Navigator.pop(ctx);
                                      context
                                          .read<AuthProvider>()
                                          .logout();
                                      Navigator.pushReplacementNamed(
                                          context, '/login');
                                    },
                                    child: const Text('Logout',
                                        style: TextStyle(
                                            color: AppColors.error)),
                                  ),
                                ],
                              ),
                            );
                          },
                          icon: const Icon(Icons.logout_rounded,
                              color: AppColors.error),
                          label: const Text('Logout',
                              style: TextStyle(
                                  color: AppColors.error,
                                  fontFamily: 'Poppins')),
                          style: OutlinedButton.styleFrom(
                            side: const BorderSide(color: AppColors.error),
                            minimumSize: const Size(double.infinity, 50),
                            shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(12)),
                          ),
                        ),
                      ),
                      const SizedBox(height: 16),
                      Center(
                        child: Text(
                          'FitNexus v${AppConstants.appVersion}',
                          style: AppTextStyles.caption,
                        ),
                      ),
                      const SizedBox(height: 20),
                    ],
                  ),
                ),
    );
  }
}

class _SectionCard extends StatelessWidget {
  final String title;
  final IconData icon;
  final List<Widget> children;
  final String? logoUrl;

  const _SectionCard({
    required this.title,
    required this.icon,
    required this.children,
    this.logoUrl,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(icon, color: AppColors.primary, size: 20),
              const SizedBox(width: 8),
              Text(title, style: AppTextStyles.bodyMedium),
              if (logoUrl != null) ...[
                const Spacer(),
                ClipRRect(
                  borderRadius: BorderRadius.circular(8),
                  child: Image.network(
                    logoUrl!,
                    width: 36,
                    height: 36,
                    fit: BoxFit.contain,
                    errorBuilder: (_, __, ___) => const SizedBox.shrink(),
                  ),
                ),
              ],
            ],
          ),
          const SizedBox(height: 12),
          ...children,
        ],
      ),
    );
  }
}

class _InfoRow extends StatelessWidget {
  final String label;
  final String? value;
  final Color? valueColor;

  const _InfoRow(this.label, this.value, {this.valueColor});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: AppTextStyles.caption),
          Text(
            value ?? '—',
            style: AppTextStyles.bodyMedium.copyWith(
              color: valueColor,
              fontSize: 13,
            ),
          ),
        ],
      ),
    );
  }
}
