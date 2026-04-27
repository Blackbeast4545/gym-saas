import 'package:flutter/foundation.dart';
import 'api_service.dart';

/// Manages feature access based on the gym's subscription plan.
/// Usage:
///   final featureProvider = context.read<FeatureProvider>();
///   if (featureProvider.can('member_workout_view')) { ... }
class FeatureProvider extends ChangeNotifier {
  String _plan = 'basic';
  Map<String, dynamic> _features = {};
  Map<String, dynamic> _labels = {};
  Map<String, dynamic> _upgradeMap = {};
  bool _loaded = false;

  String get plan => _plan;
  bool get loaded => _loaded;
  Map<String, dynamic> get features => _features;
  Map<String, dynamic> get labels => _labels;
  Map<String, dynamic> get upgradeMap => _upgradeMap;

  /// Check if a feature is enabled
  bool can(String feature) {
    return _features[feature] == true;
  }

  /// Get the plan name required to unlock a feature (for upgrade prompts)
  String requiredPlan(String feature) {
    return (_upgradeMap[feature] ?? 'pro').toString();
  }

  /// Human-readable label for a feature
  String featureLabel(String feature) {
    return (_labels[feature] ?? feature.replaceAll('_', ' ')).toString();
  }

  /// Load features from the API
  Future<void> loadFeatures() async {
    try {
      final data = await apiService.getFeatures();
      _plan = data['plan'] ?? 'basic';
      _features = Map<String, dynamic>.from(data['features'] ?? {});
      _labels = Map<String, dynamic>.from(data['labels'] ?? {});
      _upgradeMap = Map<String, dynamic>.from(data['upgrade_map'] ?? {});
      _loaded = true;
      notifyListeners();
    } catch (e) {
      // On failure, default to basic plan (most restrictive)
      _plan = 'basic';
      _features = {};
      _loaded = true;
      notifyListeners();
    }
  }

  /// Reset on logout
  void reset() {
    _plan = 'basic';
    _features = {};
    _labels = {};
    _upgradeMap = {};
    _loaded = false;
    notifyListeners();
  }
}
