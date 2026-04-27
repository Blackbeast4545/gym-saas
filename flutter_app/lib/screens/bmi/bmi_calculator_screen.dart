import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'dart:math';
import 'dart:convert';
import '../../utils/constants.dart';

class BmiCalculatorScreen extends StatefulWidget {
  const BmiCalculatorScreen({super.key});

  @override
  State<BmiCalculatorScreen> createState() => _BmiCalculatorScreenState();
}

class _BmiCalculatorScreenState extends State<BmiCalculatorScreen> {
  final _weightCtrl = TextEditingController();
  final _heightCtrl = TextEditingController();
  final _ageCtrl = TextEditingController();
  String _gender = 'male';
  double? _bmi;
  String _category = '';
  Color _categoryColor = AppColors.textSecondary;
  double? _bodyFatEstimate;
  List<Map<String, dynamic>> _history = [];

  @override
  void initState() {
    super.initState();
    _loadHistory();
  }

  Future<void> _loadHistory() async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString('bmi_history') ?? '[]';
    setState(() {
      _history = List<Map<String, dynamic>>.from(jsonDecode(raw));
    });
  }

  Future<void> _saveToHistory(double bmi, String category) async {
    final prefs = await SharedPreferences.getInstance();
    _history.insert(0, {
      'bmi': bmi,
      'category': category,
      'weight': double.tryParse(_weightCtrl.text),
      'height': double.tryParse(_heightCtrl.text),
      'date': DateTime.now().toIso8601String(),
    });
    if (_history.length > 20) _history = _history.sublist(0, 20);
    await prefs.setString('bmi_history', jsonEncode(_history));
  }

  void _calculate() {
    final w = double.tryParse(_weightCtrl.text);
    final h = double.tryParse(_heightCtrl.text);
    final age = int.tryParse(_ageCtrl.text);
    if (w == null || h == null || w <= 0 || h <= 0) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Enter valid weight and height')),
      );
      return;
    }
    final hMeters = h / 100;
    final bmi = w / (hMeters * hMeters);
    String cat;
    Color col;
    if (bmi < 18.5) { cat = 'Underweight'; col = AppColors.info; }
    else if (bmi < 25) { cat = 'Normal'; col = AppColors.success; }
    else if (bmi < 30) { cat = 'Overweight'; col = AppColors.warning; }
    else { cat = 'Obese'; col = AppColors.error; }

    // Body fat estimation using Deurenberg formula
    double? bf;
    if (age != null && age > 0) {
      final genderFactor = _gender == 'male' ? 1 : 0;
      bf = (1.20 * bmi) + (0.23 * age) - (10.8 * genderFactor) - 5.4;
      if (bf < 3) bf = 3;
      if (bf > 60) bf = 60;
    }

    setState(() {
      _bmi = bmi;
      _category = cat;
      _categoryColor = col;
      _bodyFatEstimate = bf;
    });
    _saveToHistory(bmi, cat);
    _loadHistory();
    FocusScope.of(context).unfocus();
  }

  List<String> _getHealthTips() {
    if (_bmi == null) return [];
    if (_bmi! < 18.5) {
      return [
        'Focus on nutrient-dense foods like nuts, seeds, and whole grains',
        'Include protein-rich foods in every meal',
        'Consider strength training to build healthy muscle mass',
        'Eat frequent, smaller meals throughout the day',
      ];
    } else if (_bmi! < 25) {
      return [
        'Maintain your current balanced diet and exercise routine',
        'Aim for 150 minutes of moderate exercise per week',
        'Stay hydrated with at least 2-3 litres of water daily',
        'Prioritise quality sleep of 7-8 hours',
      ];
    } else if (_bmi! < 30) {
      return [
        'Reduce portion sizes and avoid processed foods',
        'Increase daily physical activity and cardio exercises',
        'Track your calorie intake to maintain a healthy deficit',
        'Consult a nutritionist for a personalised meal plan',
      ];
    } else {
      return [
        'Consult a healthcare professional for guidance',
        'Start with low-impact exercises like walking or swimming',
        'Focus on whole foods and reduce sugar intake',
        'Set realistic, gradual weight loss goals',
      ];
    }
  }

  @override
  void dispose() {
    _weightCtrl.dispose();
    _heightCtrl.dispose();
    _ageCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('BMI Calculator')),
      body: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          // Input card
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              color: AppColors.surface,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: AppColors.border),
            ),
            child: Column(children: [
              Row(children: [
                Expanded(child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('Weight (kg)', style: AppTextStyles.label),
                    const SizedBox(height: 6),
                    TextField(
                      controller: _weightCtrl,
                      keyboardType: const TextInputType.numberWithOptions(decimal: true),
                      decoration: InputDecoration(
                        hintText: 'e.g. 70',
                        prefixIcon: const Icon(Icons.monitor_weight_outlined, size: 20),
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                    ),
                  ],
                )),
                const SizedBox(width: 12),
                Expanded(child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('Height (cm)', style: AppTextStyles.label),
                    const SizedBox(height: 6),
                    TextField(
                      controller: _heightCtrl,
                      keyboardType: const TextInputType.numberWithOptions(decimal: true),
                      decoration: InputDecoration(
                        hintText: 'e.g. 175',
                        prefixIcon: const Icon(Icons.height_rounded, size: 20),
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                    ),
                  ],
                )),
              ]),
              const SizedBox(height: 14),
              Row(children: [
                Expanded(child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('Age', style: AppTextStyles.label),
                    const SizedBox(height: 6),
                    TextField(
                      controller: _ageCtrl,
                      keyboardType: TextInputType.number,
                      decoration: InputDecoration(
                        hintText: 'e.g. 25',
                        prefixIcon: const Icon(Icons.cake_outlined, size: 20),
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                    ),
                  ],
                )),
                const SizedBox(width: 12),
                Expanded(child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('Gender', style: AppTextStyles.label),
                    const SizedBox(height: 6),
                    Container(
                      decoration: BoxDecoration(
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: AppColors.border),
                        color: AppColors.surfaceVariant,
                      ),
                      child: Row(children: [
                        Expanded(
                          child: GestureDetector(
                            onTap: () => setState(() => _gender = 'male'),
                            child: Container(
                              padding: const EdgeInsets.symmetric(vertical: 14),
                              decoration: BoxDecoration(
                                color: _gender == 'male' ? AppColors.primary.withOpacity(0.1) : Colors.transparent,
                                borderRadius: const BorderRadius.horizontal(left: Radius.circular(11)),
                                border: _gender == 'male' ? Border.all(color: AppColors.primary.withOpacity(0.3)) : null,
                              ),
                              child: Center(child: Text('♂ Male', style: TextStyle(
                                fontSize: 13, fontFamily: 'Poppins',
                                fontWeight: _gender == 'male' ? FontWeight.w600 : FontWeight.w400,
                                color: _gender == 'male' ? AppColors.primary : AppColors.textSecondary,
                              ))),
                            ),
                          ),
                        ),
                        Expanded(
                          child: GestureDetector(
                            onTap: () => setState(() => _gender = 'female'),
                            child: Container(
                              padding: const EdgeInsets.symmetric(vertical: 14),
                              decoration: BoxDecoration(
                                color: _gender == 'female' ? AppColors.primary.withOpacity(0.1) : Colors.transparent,
                                borderRadius: const BorderRadius.horizontal(right: Radius.circular(11)),
                                border: _gender == 'female' ? Border.all(color: AppColors.primary.withOpacity(0.3)) : null,
                              ),
                              child: Center(child: Text('♀ Female', style: TextStyle(
                                fontSize: 13, fontFamily: 'Poppins',
                                fontWeight: _gender == 'female' ? FontWeight.w600 : FontWeight.w400,
                                color: _gender == 'female' ? AppColors.primary : AppColors.textSecondary,
                              ))),
                            ),
                          ),
                        ),
                      ]),
                    ),
                  ],
                )),
              ]),
              const SizedBox(height: 20),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton.icon(
                  onPressed: _calculate,
                  icon: const Icon(Icons.calculate_rounded),
                  label: const Text('Calculate BMI'),
                ),
              ),
            ]),
          ),
          const SizedBox(height: 20),

          // Result
          if (_bmi != null) ...[
            Container(
              padding: const EdgeInsets.all(24),
              decoration: BoxDecoration(
                color: _categoryColor.withOpacity(0.08),
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: _categoryColor.withOpacity(0.3)),
              ),
              child: Column(children: [
                Text(
                  _bmi!.toStringAsFixed(1),
                  style: TextStyle(
                    fontSize: 48, fontWeight: FontWeight.w800,
                    color: _categoryColor, fontFamily: 'Poppins',
                  ),
                ),
                const SizedBox(height: 4),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
                  decoration: BoxDecoration(
                    color: _categoryColor.withOpacity(0.15),
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: Text(_category, style: TextStyle(
                    fontSize: 14, fontWeight: FontWeight.w700,
                    color: _categoryColor, fontFamily: 'Poppins',
                  )),
                ),
                if (_bodyFatEstimate != null) ...[
                  const SizedBox(height: 16),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                    decoration: BoxDecoration(
                      color: Colors.white.withOpacity(0.6),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Row(mainAxisSize: MainAxisSize.min, children: [
                      const Icon(Icons.water_drop_outlined, size: 16, color: AppColors.textSecondary),
                      const SizedBox(width: 6),
                      Text(
                        'Est. Body Fat: ${_bodyFatEstimate!.toStringAsFixed(1)}%',
                        style: const TextStyle(
                          fontSize: 13, fontWeight: FontWeight.w600,
                          color: AppColors.textPrimary, fontFamily: 'Poppins',
                        ),
                      ),
                    ]),
                  ),
                ],
              ]),
            ),
            const SizedBox(height: 20),

            // BMI chart reference
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: AppColors.surface,
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: AppColors.border),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('BMI Categories', style: AppTextStyles.bodyMedium),
                  const SizedBox(height: 12),
                  _bmiRow('Underweight', '< 18.5', AppColors.info),
                  _bmiRow('Normal', '18.5 - 24.9', AppColors.success),
                  _bmiRow('Overweight', '25.0 - 29.9', AppColors.warning),
                  _bmiRow('Obese', '30.0+', AppColors.error),
                ],
              ),
            ),
            const SizedBox(height: 20),

            // Health Tips
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: AppColors.surface,
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: AppColors.border),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(children: [
                    Icon(Icons.lightbulb_outline_rounded, size: 18, color: AppColors.warning),
                    const SizedBox(width: 8),
                    const Text('Health Tips', style: AppTextStyles.bodyMedium),
                  ]),
                  const SizedBox(height: 12),
                  ..._getHealthTips().map((tip) => Padding(
                    padding: const EdgeInsets.only(bottom: 8),
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Container(
                          width: 6, height: 6, margin: const EdgeInsets.only(top: 5, right: 10),
                          decoration: BoxDecoration(color: _categoryColor, shape: BoxShape.circle),
                        ),
                        Expanded(child: Text(tip, style: const TextStyle(
                          fontSize: 13, color: AppColors.textPrimary, fontFamily: 'Poppins', height: 1.4,
                        ))),
                      ],
                    ),
                  )),
                ],
              ),
            ),
          ],
          const SizedBox(height: 20),

          // BMI History
          if (_history.isNotEmpty) ...[
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: AppColors.surface,
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: AppColors.border),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text('BMI History', style: AppTextStyles.bodyMedium),
                      Text('${_history.length} records', style: AppTextStyles.caption),
                    ],
                  ),
                  const SizedBox(height: 12),
                  ..._history.take(10).map((entry) {
                    final dt = DateTime.tryParse(entry['date'] ?? '');
                    final bmi = (entry['bmi'] as num?)?.toDouble();
                    final cat = entry['category'] ?? '';
                    Color catColor;
                    switch (cat) {
                      case 'Underweight': catColor = AppColors.info; break;
                      case 'Normal': catColor = AppColors.success; break;
                      case 'Overweight': catColor = AppColors.warning; break;
                      default: catColor = AppColors.error;
                    }
                    return Container(
                      margin: const EdgeInsets.only(bottom: 6),
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                      decoration: BoxDecoration(
                        color: catColor.withOpacity(0.05),
                        borderRadius: BorderRadius.circular(10),
                        border: Border.all(color: catColor.withOpacity(0.15)),
                      ),
                      child: Row(children: [
                        if (dt != null)
                          Text(
                            '${dt.day}/${dt.month}/${dt.year}',
                            style: AppTextStyles.caption,
                          ),
                        const Spacer(),
                        Text(
                          bmi != null ? bmi.toStringAsFixed(1) : '—',
                          style: TextStyle(
                            fontSize: 15, fontWeight: FontWeight.w700,
                            color: catColor, fontFamily: 'Poppins',
                          ),
                        ),
                        const SizedBox(width: 8),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                          decoration: BoxDecoration(
                            color: catColor.withOpacity(0.15),
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: Text(cat, style: TextStyle(
                            fontSize: 10, fontWeight: FontWeight.w600,
                            color: catColor, fontFamily: 'Poppins',
                          )),
                        ),
                      ]),
                    );
                  }),
                ],
              ),
            ),
          ],
          const SizedBox(height: 20),
        ],
      ),
    );
  }

  Widget _bmiRow(String label, String range, Color color) {
    final isActive = _category == label;
    return Container(
      margin: const EdgeInsets.only(bottom: 6),
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      decoration: BoxDecoration(
        color: isActive ? color.withOpacity(0.1) : Colors.transparent,
        borderRadius: BorderRadius.circular(8),
        border: isActive ? Border.all(color: color.withOpacity(0.3)) : null,
      ),
      child: Row(children: [
        Container(width: 10, height: 10, decoration: BoxDecoration(color: color, shape: BoxShape.circle)),
        const SizedBox(width: 10),
        Expanded(child: Text(label, style: TextStyle(
          fontSize: 13, fontWeight: isActive ? FontWeight.w600 : FontWeight.w400,
          color: isActive ? color : AppColors.textPrimary, fontFamily: 'Poppins',
        ))),
        Text(range, style: AppTextStyles.caption),
      ]),
    );
  }
}
