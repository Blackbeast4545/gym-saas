import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:fl_chart/fl_chart.dart';
import '../../services/api_service.dart';
import '../../utils/constants.dart';

class MeasurementsScreen extends StatefulWidget {
  const MeasurementsScreen({super.key});

  @override
  State<MeasurementsScreen> createState() => _MeasurementsScreenState();
}

class _MeasurementsScreenState extends State<MeasurementsScreen> {
  List<dynamic> _records = [];
  bool _loading = true;
  String _selectedMetric = 'weight';

  final _metrics = {
    'weight': {'label': 'Weight', 'unit': 'kg', 'icon': Icons.monitor_weight_outlined, 'color': AppColors.primary},
    'chest': {'label': 'Chest', 'unit': 'cm', 'icon': Icons.accessibility_new_rounded, 'color': AppColors.info},
    'waist': {'label': 'Waist', 'unit': 'cm', 'icon': Icons.circle_outlined, 'color': AppColors.warning},
    'biceps': {'label': 'Biceps', 'unit': 'cm', 'icon': Icons.fitness_center_rounded, 'color': AppColors.success},
    'thighs': {'label': 'Thighs', 'unit': 'cm', 'icon': Icons.directions_walk_rounded, 'color': AppColors.error},
    'body_fat': {'label': 'Body Fat', 'unit': '%', 'icon': Icons.water_drop_outlined, 'color': const Color(0xFFEF6C00)},
  };

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final data = await apiService.getMeasurements();
      setState(() { _records = data; _loading = false; });
    } catch (_) {
      setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Body Measurements')),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _records.isEmpty
              ? _buildEmpty()
              : RefreshIndicator(onRefresh: _load, child: _buildContent()),
    );
  }

  Widget _buildEmpty() {
    return const Center(child: Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(Icons.straighten_rounded, size: 64, color: AppColors.textHint),
        SizedBox(height: 16),
        Text('No measurements yet', style: AppTextStyles.heading3),
        SizedBox(height: 8),
        Text('Ask your trainer to record\nyour body measurements.', style: AppTextStyles.body, textAlign: TextAlign.center),
      ],
    ));
  }

  Widget _buildContent() {
    final metricInfo = _metrics[_selectedMetric]!;
    final color = metricInfo['color'] as Color;
    final unit = metricInfo['unit'] as String;

    // Get data points for selected metric
    final points = <Map<String, dynamic>>[];
    for (final r in _records.reversed) {
      final val = r[_selectedMetric];
      if (val != null) {
        points.add({'date': r['measured_at'], 'value': (val as num).toDouble()});
      }
    }

    // Latest & first for change calculation
    double? change;
    if (points.length >= 2) {
      change = points.last['value'] - points.first['value'];
    }

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        // Metric selector chips
        SizedBox(
          height: 40,
          child: ListView(
            scrollDirection: Axis.horizontal,
            children: _metrics.entries.map((e) {
              final active = _selectedMetric == e.key;
              final c = e.value['color'] as Color;
              return Padding(
                padding: const EdgeInsets.only(right: 8),
                child: ChoiceChip(
                  label: Text(e.value['label'] as String),
                  selected: active,
                  onSelected: (_) => setState(() => _selectedMetric = e.key),
                  selectedColor: c.withOpacity(0.15),
                  labelStyle: TextStyle(
                    color: active ? c : AppColors.textSecondary,
                    fontWeight: active ? FontWeight.w600 : FontWeight.w400,
                    fontFamily: 'Poppins', fontSize: 12,
                  ),
                  side: BorderSide(color: active ? c.withOpacity(0.4) : AppColors.border),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
                ),
              );
            }).toList(),
          ),
        ),
        const SizedBox(height: 16),

        // Current value + change
        if (points.isNotEmpty)
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              color: color.withOpacity(0.08),
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: color.withOpacity(0.2)),
            ),
            child: Row(children: [
              Icon(metricInfo['icon'] as IconData, color: color, size: 32),
              const SizedBox(width: 16),
              Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text('${points.last['value']} $unit', style: TextStyle(
                  fontSize: 28, fontWeight: FontWeight.w800, color: color, fontFamily: 'Poppins',
                )),
                Text('Latest ${metricInfo['label']}', style: AppTextStyles.caption),
              ]),
              const Spacer(),
              if (change != null)
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                  decoration: BoxDecoration(
                    color: (change >= 0 ? AppColors.error : AppColors.success).withOpacity(0.1),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Row(mainAxisSize: MainAxisSize.min, children: [
                    Icon(
                      change >= 0 ? Icons.arrow_upward_rounded : Icons.arrow_downward_rounded,
                      size: 14, color: change >= 0 ? AppColors.error : AppColors.success,
                    ),
                    Text(' ${change.abs().toStringAsFixed(1)}', style: TextStyle(
                      fontSize: 13, fontWeight: FontWeight.w700,
                      color: change >= 0 ? AppColors.error : AppColors.success,
                      fontFamily: 'Poppins',
                    )),
                  ]),
                ),
            ]),
          ),
        const SizedBox(height: 16),

        // Chart
        if (points.length >= 2)
          Container(
            height: 200,
            padding: const EdgeInsets.fromLTRB(8, 16, 16, 8),
            decoration: BoxDecoration(
              color: AppColors.surface,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: AppColors.border),
            ),
            child: LineChart(LineChartData(
              gridData: FlGridData(
                show: true,
                drawVerticalLine: false,
                getDrawingHorizontalLine: (_) => FlLine(color: AppColors.border, strokeWidth: 0.5),
              ),
              titlesData: FlTitlesData(
                leftTitles: AxisTitles(sideTitles: SideTitles(
                  showTitles: true, reservedSize: 40,
                  getTitlesWidget: (v, _) => Text(v.toStringAsFixed(0),
                    style: const TextStyle(fontSize: 10, color: AppColors.textHint, fontFamily: 'Poppins')),
                )),
                bottomTitles: AxisTitles(sideTitles: SideTitles(
                  showTitles: true, reservedSize: 24,
                  interval: (points.length > 6) ? (points.length / 4).ceilToDouble() : 1,
                  getTitlesWidget: (v, _) {
                    final i = v.toInt();
                    if (i < 0 || i >= points.length) return const SizedBox.shrink();
                    try {
                      final dt = DateTime.parse(points[i]['date']);
                      return Text(DateFormat('dd/MM').format(dt),
                        style: const TextStyle(fontSize: 9, color: AppColors.textHint, fontFamily: 'Poppins'));
                    } catch (_) { return const SizedBox.shrink(); }
                  },
                )),
                topTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
                rightTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
              ),
              borderData: FlBorderData(show: false),
              lineBarsData: [
                LineChartBarData(
                  spots: List.generate(points.length, (i) => FlSpot(i.toDouble(), points[i]['value'])),
                  color: color,
                  barWidth: 2.5,
                  dotData: FlDotData(show: points.length <= 12),
                  belowBarData: BarAreaData(show: true, color: color.withOpacity(0.08)),
                  isCurved: true,
                  curveSmoothness: 0.25,
                ),
              ],
            )),
          ),
        const SizedBox(height: 16),

        // History list
        Text('History', style: AppTextStyles.bodyMedium),
        const SizedBox(height: 8),
        ...points.reversed.map((p) {
          final dt = DateTime.tryParse(p['date'] ?? '');
          return Container(
            margin: const EdgeInsets.only(bottom: 6),
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
            decoration: BoxDecoration(
              color: AppColors.surface,
              borderRadius: BorderRadius.circular(10),
              border: Border.all(color: AppColors.border),
            ),
            child: Row(children: [
              Text(dt != null ? DateFormat('dd MMM yyyy').format(dt) : '—', style: AppTextStyles.caption),
              const Spacer(),
              Text('${p['value']} $unit', style: AppTextStyles.bodyMedium.copyWith(color: color)),
            ]),
          );
        }),
        const SizedBox(height: 20),
      ],
    );
  }
}
