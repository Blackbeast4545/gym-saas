import 'package:flutter/material.dart';
import '../../services/api_service.dart';
import '../../utils/constants.dart';

class DietScreen extends StatefulWidget {
  const DietScreen({super.key});

  @override
  State<DietScreen> createState() => _DietScreenState();
}

class _DietScreenState extends State<DietScreen> {
  Map<String, dynamic>? _data;
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final data = await apiService.getDietPlan();
      setState(() { _data = data; _loading = false; });
    } catch (_) {
      setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Diet Plan')),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _buildBody(),
    );
  }

  Widget _buildBody() {
    if (_data?['assigned'] == false) {
      return const Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.restaurant_menu_outlined,
                size: 64, color: AppColors.textHint),
            SizedBox(height: 16),
            Text('No Diet Plan Assigned', style: AppTextStyles.heading3),
            SizedBox(height: 8),
            Text(
              'Your trainer will assign a diet plan soon.',
              style: AppTextStyles.body,
              textAlign: TextAlign.center,
            ),
          ],
        ),
      );
    }

    final meals = (_data?['meals'] as Map?) ?? {};
    final calories = _data?['calories_target'];
    final protein = _data?['protein_target'];
    final notes = _data?['notes'];

    final mealOrder = ['breakfast', 'lunch', 'dinner', 'snacks'];
    final mealIcons = {
      'breakfast': Icons.wb_sunny_rounded,
      'lunch': Icons.lunch_dining_rounded,
      'dinner': Icons.dinner_dining_rounded,
      'snacks': Icons.cookie_outlined,
    };
    final mealColors = {
      'breakfast': AppColors.warning,
      'lunch': AppColors.success,
      'dinner': AppColors.primary,
      'snacks': AppColors.info,
    };

    return RefreshIndicator(
      onRefresh: _load,
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Plan title
            Text(_data?['title'] ?? 'My Diet Plan',
                style: AppTextStyles.heading2),
            const SizedBox(height: 4),

            // Macros
            if (calories != null || protein != null) ...[
              const SizedBox(height: 12),
              Row(
                children: [
                  if (calories != null)
                    _MacroChip(
                        label: 'Calories',
                        value: '$calories kcal',
                        color: AppColors.warning),
                  if (calories != null && protein != null)
                    const SizedBox(width: 10),
                  if (protein != null)
                    _MacroChip(
                        label: 'Protein',
                        value: '${protein}g',
                        color: AppColors.success),
                ],
              ),
              const SizedBox(height: 16),
            ],

            // Meal sections
            ...mealOrder.where((m) => meals.containsKey(m)).map((mealKey) {
              final items = (meals[mealKey] as List?) ?? [];
              if (items.isEmpty) return const SizedBox.shrink();
              return _MealSection(
                title: mealKey[0].toUpperCase() + mealKey.substring(1),
                icon: mealIcons[mealKey] ?? Icons.restaurant,
                color: mealColors[mealKey] ?? AppColors.primary,
                items: items,
              );
            }),

            // Notes
            if (notes != null && notes.toString().isNotEmpty) ...[
              const SizedBox(height: 8),
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: AppColors.primaryLight,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(
                      color: AppColors.primary.withOpacity(0.2)),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Row(
                      children: [
                        Icon(Icons.info_outline_rounded,
                            size: 16, color: AppColors.primary),
                        SizedBox(width: 6),
                        Text('Notes',
                            style: TextStyle(
                                fontWeight: FontWeight.w600,
                                color: AppColors.primary,
                                fontFamily: 'Poppins',
                                fontSize: 13)),
                      ],
                    ),
                    const SizedBox(height: 6),
                    Text(notes.toString(), style: AppTextStyles.body),
                  ],
                ),
              ),
            ],
            const SizedBox(height: 20),
          ],
        ),
      ),
    );
  }
}

class _MacroChip extends StatelessWidget {
  final String label, value;
  final Color color;
  const _MacroChip(
      {required this.label, required this.value, required this.color});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
      decoration: BoxDecoration(
        color: color.withOpacity(0.1),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: color.withOpacity(0.3)),
      ),
      child: Column(
        children: [
          Text(value,
              style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w700,
                  color: color,
                  fontFamily: 'Poppins')),
          Text(label,
              style: TextStyle(
                  fontSize: 11,
                  color: color.withOpacity(0.8),
                  fontFamily: 'Poppins')),
        ],
      ),
    );
  }
}

class _MealSection extends StatelessWidget {
  final String title;
  final IconData icon;
  final Color color;
  final List items;

  const _MealSection({
    required this.title,
    required this.icon,
    required this.color,
    required this.items,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 32,
                height: 32,
                decoration: BoxDecoration(
                  color: color.withOpacity(0.15),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Icon(icon, color: color, size: 18),
              ),
              const SizedBox(width: 10),
              Text(title,
                  style: AppTextStyles.heading3.copyWith(fontSize: 16)),
            ],
          ),
          const SizedBox(height: 10),
          ...items.map((item) {
            final m = item as Map<String, dynamic>? ?? {};
            return Container(
              margin: const EdgeInsets.only(bottom: 8),
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: AppColors.surface,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: AppColors.border),
              ),
              child: Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(m['food']?.toString() ?? '',
                            style: AppTextStyles.bodyMedium),
                        if (m['quantity'] != null)
                          Text(m['quantity'].toString(),
                              style: AppTextStyles.caption),
                      ],
                    ),
                  ),
                  if (m['calories'] != null)
                    Text('${m['calories']} kcal',
                        style: AppTextStyles.caption.copyWith(
                            color: AppColors.warning,
                            fontWeight: FontWeight.w600)),
                ],
              ),
            );
          }),
        ],
      ),
    );
  }
}
