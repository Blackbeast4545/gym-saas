import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../../services/api_service.dart';
import '../../utils/constants.dart';

class NotificationsScreen extends StatefulWidget {
  const NotificationsScreen({super.key});

  @override
  State<NotificationsScreen> createState() => _NotificationsScreenState();
}

class _NotificationsScreenState extends State<NotificationsScreen> {
  List<dynamic> _notifications = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final data = await apiService.getNotifications();
      setState(() { _notifications = data; _loading = false; });
    } catch (_) {
      setState(() => _loading = false);
    }
  }

  IconData _iconFor(String type) {
    switch (type) {
      case 'sms': return Icons.sms_rounded;
      case 'whatsapp': return Icons.chat_rounded;
      case 'push': return Icons.notifications_rounded;
      default: return Icons.mail_rounded;
    }
  }

  Color _colorFor(String type) {
    switch (type) {
      case 'sms': return AppColors.info;
      case 'whatsapp': return const Color(0xFF25D366);
      case 'push': return AppColors.warning;
      default: return AppColors.primary;
    }
  }

  String _timeAgo(String? raw) {
    if (raw == null) return '';
    try {
      final dt = DateTime.parse(raw);
      final diff = DateTime.now().difference(dt);
      if (diff.inMinutes < 60) return '${diff.inMinutes}m ago';
      if (diff.inHours < 24) return '${diff.inHours}h ago';
      if (diff.inDays < 7) return '${diff.inDays}d ago';
      return DateFormat('dd MMM').format(dt);
    } catch (_) { return ''; }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Notifications')),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _notifications.isEmpty
              ? const Center(child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(Icons.notifications_none_rounded, size: 64, color: AppColors.textHint),
                    SizedBox(height: 16),
                    Text('No notifications yet', style: AppTextStyles.heading3),
                    SizedBox(height: 8),
                    Text('You\'ll see gym updates here.', style: AppTextStyles.body),
                  ],
                ))
              : RefreshIndicator(
                  onRefresh: _load,
                  child: ListView.builder(
                    padding: const EdgeInsets.all(16),
                    itemCount: _notifications.length,
                    itemBuilder: (_, i) {
                      final n = _notifications[i] as Map<String, dynamic>;
                      final type = n['type']?.toString() ?? 'push';
                      final color = _colorFor(type);
                      return Container(
                        margin: const EdgeInsets.only(bottom: 10),
                        padding: const EdgeInsets.all(14),
                        decoration: BoxDecoration(
                          color: AppColors.surface,
                          borderRadius: BorderRadius.circular(14),
                          border: Border.all(color: AppColors.border),
                        ),
                        child: Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Container(
                              width: 40, height: 40,
                              decoration: BoxDecoration(
                                color: color.withOpacity(0.1),
                                borderRadius: BorderRadius.circular(10),
                              ),
                              child: Icon(_iconFor(type), color: color, size: 20),
                            ),
                            const SizedBox(width: 12),
                            Expanded(child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(children: [
                                  Expanded(child: Text(
                                    n['title'] ?? 'Notification',
                                    style: AppTextStyles.bodyMedium,
                                    maxLines: 1, overflow: TextOverflow.ellipsis,
                                  )),
                                  Text(_timeAgo(n['sent_at']?.toString()), style: AppTextStyles.caption),
                                ]),
                                const SizedBox(height: 4),
                                Text(
                                  n['message'] ?? '',
                                  style: AppTextStyles.body.copyWith(fontSize: 13, color: AppColors.textSecondary),
                                  maxLines: 3, overflow: TextOverflow.ellipsis,
                                ),
                              ],
                            )),
                          ],
                        ),
                      );
                    },
                  ),
                ),
    );
  }
}
