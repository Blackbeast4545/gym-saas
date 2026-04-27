import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../../services/api_service.dart';
import '../../utils/constants.dart';

class AnnouncementsScreen extends StatefulWidget {
  const AnnouncementsScreen({super.key});

  @override
  State<AnnouncementsScreen> createState() => _AnnouncementsScreenState();
}

class _AnnouncementsScreenState extends State<AnnouncementsScreen> {
  List<dynamic> _items = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final data = await apiService.getAnnouncements();
      setState(() { _items = data; _loading = false; });
    } catch (_) {
      setState(() => _loading = false);
    }
  }

  IconData _iconFor(String? cat) {
    switch (cat) {
      case 'holiday': return Icons.beach_access_rounded;
      case 'event': return Icons.celebration_rounded;
      case 'batch': return Icons.groups_rounded;
      case 'maintenance': return Icons.build_rounded;
      default: return Icons.campaign_rounded;
    }
  }

  Color _colorFor(String? cat) {
    switch (cat) {
      case 'holiday': return AppColors.error;
      case 'event': return AppColors.primary;
      case 'batch': return AppColors.info;
      case 'maintenance': return AppColors.warning;
      default: return const Color(0xFF7C3AED);
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
      appBar: AppBar(title: const Text('Announcements')),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _items.isEmpty
              ? const Center(child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(Icons.campaign_outlined, size: 64, color: AppColors.textHint),
                    SizedBox(height: 16),
                    Text('No announcements', style: AppTextStyles.heading3),
                    SizedBox(height: 8),
                    Text('Gym updates will appear here.', style: AppTextStyles.body),
                  ],
                ))
              : RefreshIndicator(
                  onRefresh: _load,
                  child: ListView.builder(
                    padding: const EdgeInsets.all(16),
                    itemCount: _items.length,
                    itemBuilder: (_, i) {
                      final a = _items[i] as Map<String, dynamic>;
                      final cat = a['category']?.toString();
                      final color = _colorFor(cat);
                      return GestureDetector(
                        onTap: () => _showDetail(a),
                        child: Container(
                          margin: const EdgeInsets.only(bottom: 12),
                          padding: const EdgeInsets.all(16),
                          decoration: BoxDecoration(
                            color: AppColors.surface,
                            borderRadius: BorderRadius.circular(14),
                            border: Border.all(color: AppColors.border),
                          ),
                          child: Row(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Container(
                                width: 44, height: 44,
                                decoration: BoxDecoration(
                                  color: color.withOpacity(0.1),
                                  borderRadius: BorderRadius.circular(12),
                                ),
                                child: Icon(_iconFor(cat), color: color, size: 22),
                              ),
                              const SizedBox(width: 12),
                              Expanded(child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Row(children: [
                                    if (cat != null && cat != 'general')
                                      Container(
                                        margin: const EdgeInsets.only(right: 8),
                                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                                        decoration: BoxDecoration(
                                          color: color.withOpacity(0.1),
                                          borderRadius: BorderRadius.circular(6),
                                        ),
                                        child: Text(
                                          cat.toUpperCase(),
                                          style: TextStyle(fontSize: 9, fontWeight: FontWeight.w700,
                                            color: color, fontFamily: 'Poppins', letterSpacing: 0.5),
                                        ),
                                      ),
                                    const Spacer(),
                                    Text(_timeAgo(a['created_at']?.toString()), style: AppTextStyles.caption),
                                  ]),
                                  const SizedBox(height: 4),
                                  Text(a['title'] ?? '', style: AppTextStyles.bodyMedium, maxLines: 2, overflow: TextOverflow.ellipsis),
                                  const SizedBox(height: 4),
                                  Text(a['message'] ?? '', style: AppTextStyles.body.copyWith(
                                    fontSize: 13, color: AppColors.textSecondary),
                                    maxLines: 2, overflow: TextOverflow.ellipsis,
                                  ),
                                ],
                              )),
                            ],
                          ),
                        ),
                      );
                    },
                  ),
                ),
    );
  }

  void _showDetail(Map<String, dynamic> a) {
    final cat = a['category']?.toString();
    final color = _colorFor(cat);
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (_) => Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Center(child: Container(width: 40, height: 4, decoration: BoxDecoration(
              color: AppColors.border, borderRadius: BorderRadius.circular(2)))),
            const SizedBox(height: 20),
            Row(children: [
              Container(
                width: 44, height: 44,
                decoration: BoxDecoration(
                  color: color.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(_iconFor(cat), color: color, size: 22),
              ),
              const SizedBox(width: 12),
              Expanded(child: Text(a['title'] ?? '', style: AppTextStyles.heading3)),
            ]),
            const SizedBox(height: 16),
            Text(a['message'] ?? '', style: AppTextStyles.body.copyWith(
              height: 1.6, color: AppColors.textSecondary)),
            const SizedBox(height: 16),
            Text(_timeAgo(a['created_at']?.toString()), style: AppTextStyles.caption),
            const SizedBox(height: 24),
          ],
        ),
      ),
    );
  }
}
