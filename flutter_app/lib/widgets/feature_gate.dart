import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../services/feature_provider.dart';
import '../utils/constants.dart';

/// Wraps a child widget and shows an upgrade prompt if the feature is locked.
///
/// Usage:
///   FeatureGate(
///     feature: 'member_workout_view',
///     child: WorkoutScreen(),
///   )
class FeatureGate extends StatelessWidget {
  final String feature;
  final Widget child;

  const FeatureGate({
    super.key,
    required this.feature,
    required this.child,
  });

  @override
  Widget build(BuildContext context) {
    return Consumer<FeatureProvider>(
      builder: (context, fp, _) {
        if (!fp.loaded) {
          return const Scaffold(
            body: Center(child: CircularProgressIndicator()),
          );
        }
        if (fp.can(feature)) return child;
        return _UpgradeWall(
          featureLabel: fp.featureLabel(feature),
          requiredPlan: fp.requiredPlan(feature),
          currentPlan: fp.plan,
        );
      },
    );
  }
}

class _UpgradeWall extends StatelessWidget {
  final String featureLabel;
  final String requiredPlan;
  final String currentPlan;

  const _UpgradeWall({
    required this.featureLabel,
    required this.requiredPlan,
    required this.currentPlan,
  });

  @override
  Widget build(BuildContext context) {
    final planName = requiredPlan[0].toUpperCase() + requiredPlan.substring(1);

    return Scaffold(
      appBar: AppBar(title: Text(featureLabel)),
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(32),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              // Lock icon
              Container(
                width: 80,
                height: 80,
                decoration: BoxDecoration(
                  color: AppColors.primaryLight,
                  shape: BoxShape.circle,
                ),
                child: const Icon(
                  Icons.lock_outline_rounded,
                  size: 40,
                  color: AppColors.primary,
                ),
              ),
              const SizedBox(height: 24),

              // Title
              Text(
                '$planName Feature',
                style: const TextStyle(
                  fontSize: 20,
                  fontWeight: FontWeight.w700,
                  color: AppColors.textPrimary,
                  fontFamily: 'Poppins',
                ),
              ),
              const SizedBox(height: 8),

              // Description
              Text(
                '$featureLabel is available on the $planName plan. '
                'Ask your gym to upgrade for access.',
                textAlign: TextAlign.center,
                style: const TextStyle(
                  fontSize: 14,
                  color: AppColors.textSecondary,
                  fontFamily: 'Poppins',
                  height: 1.5,
                ),
              ),
              const SizedBox(height: 24),

              // Current plan badge
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                decoration: BoxDecoration(
                  color: AppColors.surfaceVariant,
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(color: AppColors.border),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Icon(Icons.info_outline_rounded,
                        size: 16, color: AppColors.textSecondary),
                    const SizedBox(width: 6),
                    Text(
                      'Current plan: ${currentPlan[0].toUpperCase()}${currentPlan.substring(1)}',
                      style: const TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w500,
                        color: AppColors.textSecondary,
                        fontFamily: 'Poppins',
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 32),

              // Back button
              SizedBox(
                width: double.infinity,
                child: OutlinedButton(
                  onPressed: () => Navigator.of(context).pop(),
                  style: OutlinedButton.styleFrom(
                    foregroundColor: AppColors.primary,
                    side: const BorderSide(color: AppColors.primary),
                    shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12)),
                    padding: const EdgeInsets.symmetric(vertical: 14),
                  ),
                  child: const Text('Go Back'),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
