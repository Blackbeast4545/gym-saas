import 'package:flutter/material.dart';
import '../../services/api_service.dart';
import '../../utils/constants.dart';

class WorkoutScreen extends StatefulWidget {
  const WorkoutScreen({super.key});

  @override
  State<WorkoutScreen> createState() => _WorkoutScreenState();
}

class _WorkoutScreenState extends State<WorkoutScreen> {
  Map<String, dynamic>? _data;
  bool _loading = true;
  int _selectedDay = 0;

  @override
  void initState() {
    super.initState();
    _load();
    // Default to today's day index
    _selectedDay = DateTime.now().weekday - 1; // 0=Mon
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final data = await apiService.getWorkoutPlan();
      setState(() { _data = data; _loading = false; });
    } catch (_) {
      setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('My Workout')),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _buildBody(),
    );
  }

  Widget _buildBody() {
    if (_data?['assigned'] == false) {
      return Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.fitness_center_outlined,
                size: 64, color: AppColors.textHint),
            const SizedBox(height: 16),
            const Text('No Workout Plan Assigned',
                style: AppTextStyles.heading3),
            const SizedBox(height: 8),
            Text(
              'Your trainer will assign a workout plan soon.',
              style: AppTextStyles.body
                  .copyWith(color: AppColors.textSecondary),
              textAlign: TextAlign.center,
            ),
          ],
        ),
      );
    }

    final days = (_data?['days'] as List?) ?? [];
    if (days.isEmpty) {
      return const Center(child: Text('No workout days defined'));
    }

    if (_selectedDay >= days.length) _selectedDay = 0;
    final currentDay = days[_selectedDay];
    final exercises = (currentDay['exercises'] as List?) ?? [];

    return Column(
      children: [
        // Plan name
        Padding(
          padding: const EdgeInsets.fromLTRB(20, 16, 20, 0),
          child: Row(
            children: [
              const Icon(Icons.assignment_rounded,
                  color: AppColors.primary, size: 20),
              const SizedBox(width: 8),
              Text(
                _data?['plan_name'] ?? 'My Plan',
                style: AppTextStyles.bodyMedium,
              ),
            ],
          ),
        ),
        const SizedBox(height: 14),

        // Day selector
        SizedBox(
          height: 48,
          child: ListView.builder(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.symmetric(horizontal: 16),
            itemCount: days.length,
            itemBuilder: (_, i) {
              final day = days[i];
              final isSelected = i == _selectedDay;
              return GestureDetector(
                onTap: () => setState(() => _selectedDay = i),
                child: AnimatedContainer(
                  duration: const Duration(milliseconds: 200),
                  margin: const EdgeInsets.only(right: 8),
                  padding: const EdgeInsets.symmetric(
                      horizontal: 16, vertical: 10),
                  decoration: BoxDecoration(
                    color: isSelected
                        ? AppColors.primary
                        : AppColors.surfaceVariant,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(
                        color: isSelected
                            ? AppColors.primary
                            : AppColors.border),
                  ),
                  child: Text(
                    day['day_name'] ?? 'Day ${i + 1}',
                    style: TextStyle(
                      fontFamily: 'Poppins',
                      fontSize: 13,
                      fontWeight: FontWeight.w600,
                      color: isSelected
                          ? Colors.white
                          : AppColors.textSecondary,
                    ),
                  ),
                ),
              );
            },
          ),
        ),
        const SizedBox(height: 16),

        // Exercises
        Expanded(
          child: exercises.isEmpty
              ? const Center(
                  child: Text('Rest day — recover and recharge! 💪'))
              : ListView.builder(
                  padding: const EdgeInsets.symmetric(horizontal: 20),
                  itemCount: exercises.length,
                  itemBuilder: (_, i) =>
                      _ExerciseCard(exercise: exercises[i], index: i),
                ),
        ),
      ],
    );
  }
}

class _ExerciseCard extends StatelessWidget {
  final dynamic exercise;
  final int index;

  const _ExerciseCard({required this.exercise, required this.index});

  @override
  Widget build(BuildContext context) {
    final ex = exercise as Map<String, dynamic>;
    return Container(
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
            width: 36,
            height: 36,
            decoration: BoxDecoration(
              color: AppColors.primaryLight,
              borderRadius: BorderRadius.circular(10),
            ),
            child: Center(
              child: Text(
                '${index + 1}',
                style: const TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w700,
                    color: AppColors.primary,
                    fontFamily: 'Poppins'),
              ),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(ex['name'] ?? '', style: AppTextStyles.bodyMedium),
                const SizedBox(height: 6),
                Wrap(
                  spacing: 8,
                  runSpacing: 4,
                  children: [
                    if (ex['sets'] != null)
                      _chip('${ex['sets']} sets', AppColors.info),
                    if (ex['reps'] != null)
                      _chip('${ex['reps']} reps', AppColors.success),
                    if (ex['rest'] != null)
                      _chip('Rest: ${ex['rest']}', AppColors.warning),
                    if (ex['duration'] != null)
                      _chip(ex['duration'], AppColors.primary),
                  ],
                ),
                if (ex['notes'] != null && ex['notes'].toString().isNotEmpty) ...[
                  const SizedBox(height: 6),
                  Text(ex['notes'],
                      style: AppTextStyles.caption.copyWith(
                          fontStyle: FontStyle.italic)),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _chip(String label, Color color) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: color.withOpacity(0.1),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Text(
        label,
        style: TextStyle(
            fontSize: 11,
            fontWeight: FontWeight.w600,
            color: color,
            fontFamily: 'Poppins'),
      ),
    );
  }
}
