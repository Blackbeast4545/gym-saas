import 'package:flutter/material.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import 'package:table_calendar/table_calendar.dart';
import '../../services/api_service.dart';
import '../../services/auth_provider.dart';
import '../../utils/constants.dart';

class AttendanceScreen extends StatefulWidget {
  final int initialTab;
  const AttendanceScreen({super.key, this.initialTab = 0});

  @override
  State<AttendanceScreen> createState() => _AttendanceScreenState();
}

class _AttendanceScreenState extends State<AttendanceScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;
  Map<String, dynamic>? _historyData;
  bool _historyLoading = true;
  Set<DateTime> _presentDays = {};

  // Sundays as holidays (configurable)
  final Set<int> _holidayWeekdays = {DateTime.sunday};

  @override
  void initState() {
    super.initState();
    _tabController = TabController(
      length: 2,
      vsync: this,
      initialIndex: widget.initialTab,
    );
    _loadHistory();
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  Future<void> _loadHistory() async {
    setState(() => _historyLoading = true);
    try {
      final data = await apiService.getAttendanceHistory();
      final logs = (data['logs'] as List?) ?? [];
      final days = <DateTime>{};
      for (final log in logs) {
        final dt = DateTime.tryParse(log['date']?.toString() ?? '');
        if (dt != null) {
          days.add(DateTime(dt.year, dt.month, dt.day));
        }
      }
      setState(() {
        _historyData = data;
        _presentDays = days;
        _historyLoading = false;
      });
    } catch (_) {
      setState(() => _historyLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Attendance'),
        bottom: TabBar(
          controller: _tabController,
          tabs: const [
            Tab(text: 'QR Check In'),
            Tab(text: 'Calendar'),
          ],
          labelColor: AppColors.primary,
          unselectedLabelColor: AppColors.textSecondary,
          indicatorColor: AppColors.primary,
          labelStyle: const TextStyle(
              fontWeight: FontWeight.w600, fontFamily: 'Poppins'),
        ),
      ),
      body: TabBarView(
        controller: _tabController,
        children: [
          _QRScannerTab(),
          _CalendarTab(
            data: _historyData,
            loading: _historyLoading,
            presentDays: _presentDays,
            holidayWeekdays: _holidayWeekdays,
            onRefresh: _loadHistory,
          ),
        ],
      ),
    );
  }
}

// ─────────────────────────────────────────────
// QR SCANNER TAB
// ─────────────────────────────────────────────

class _QRScannerTab extends StatefulWidget {
  @override
  State<_QRScannerTab> createState() => _QRScannerTabState();
}

class _QRScannerTabState extends State<_QRScannerTab> {
  MobileScannerController? _scannerController;
  bool _scanning = false;
  bool _processing = false;
  String? _result;
  bool _success = false;

  void _startScan() {
    setState(() {
      _scanning = true;
      _result = null;
      _scannerController = MobileScannerController();
    });
  }

  void _stopScan() {
    _scannerController?.dispose();
    setState(() {
      _scanning = false;
      _scannerController = null;
    });
  }

  Future<void> _handleQRCode(String rawValue) async {
    if (_processing) return;
    setState(() => _processing = true);
    _scannerController?.stop();

    if (!rawValue.startsWith('FITNEXUS:CHECKIN:')) {
      setState(() {
        _processing = false;
        _result = 'Invalid QR code. Please scan your gym QR.';
        _success = false;
        _scanning = false;
      });
      return;
    }

    final token = rawValue.split(':').last;
    final auth = context.read<AuthProvider>();

    try {
      final res = await apiService.scanQrCheckIn(token, auth.memberId!);
      setState(() {
        _processing = false;
        _scanning = false;
        _success = res['success'] == true || res['already_checked_in'] == true;
        _result = res['message'] ?? 'Check-in recorded!';
      });
    } catch (e) {
      setState(() {
        _processing = false;
        _scanning = false;
        _success = false;
        _result = 'Check-in failed. Please try again.';
      });
    }
  }

  @override
  void dispose() {
    _scannerController?.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (_scanning && _scannerController != null) {
      return Stack(
        children: [
          MobileScanner(
            controller: _scannerController!,
            onDetect: (capture) {
              final barcode = capture.barcodes.firstOrNull;
              if (barcode?.rawValue != null) {
                _handleQRCode(barcode!.rawValue!);
              }
            },
          ),
          Container(color: Colors.black.withOpacity(0.5)),
          Center(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Container(
                  width: 240,
                  height: 240,
                  decoration: BoxDecoration(
                    border: Border.all(color: AppColors.primary, width: 3),
                    borderRadius: BorderRadius.circular(16),
                    color: Colors.transparent,
                  ),
                ),
                const SizedBox(height: 24),
                if (_processing)
                  const CircularProgressIndicator(color: Colors.white)
                else
                  const Text('Point camera at gym QR code',
                      style: TextStyle(
                          color: Colors.white,
                          fontSize: 15,
                          fontFamily: 'Poppins')),
                const SizedBox(height: 16),
                TextButton(
                  onPressed: _stopScan,
                  child: const Text('Cancel',
                      style:
                          TextStyle(color: Colors.white, fontFamily: 'Poppins')),
                ),
              ],
            ),
          ),
        ],
      );
    }

    return Padding(
      padding: const EdgeInsets.all(24),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Container(
            width: 120,
            height: 120,
            decoration: BoxDecoration(
              color: AppColors.primaryLight,
              shape: BoxShape.circle,
            ),
            child: const Icon(Icons.qr_code_scanner_rounded,
                size: 60, color: AppColors.primary),
          ),
          const SizedBox(height: 24),
          const Text('Scan Gym QR to Check In',
              style: AppTextStyles.heading3, textAlign: TextAlign.center),
          const SizedBox(height: 8),
          const Text(
            'Point your camera at the QR code displayed at your gym entrance.',
            style: AppTextStyles.body,
            textAlign: TextAlign.center,
          ),
          if (_result != null) ...[
            const SizedBox(height: 24),
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: (_success ? AppColors.success : AppColors.error)
                    .withOpacity(0.1),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(
                    color: (_success ? AppColors.success : AppColors.error)
                        .withOpacity(0.3)),
              ),
              child: Row(
                children: [
                  Icon(
                      _success
                          ? Icons.check_circle_rounded
                          : Icons.error_outline_rounded,
                      color: _success ? AppColors.success : AppColors.error),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Text(_result!,
                        style: AppTextStyles.body.copyWith(
                            color:
                                _success ? AppColors.success : AppColors.error,
                            fontWeight: FontWeight.w500)),
                  ),
                ],
              ),
            ),
          ],
          const SizedBox(height: 32),
          ElevatedButton.icon(
            onPressed: _startScan,
            icon: const Icon(Icons.qr_code_scanner_rounded),
            label: Text(_result != null ? 'Scan Again' : 'Open Scanner'),
          ),
        ],
      ),
    );
  }
}

// ─────────────────────────────────────────────
// CALENDAR TAB — Petpooja-style colored cells
// Green = Present, Red = Absent, Gray = Holiday
// ─────────────────────────────────────────────

class _CalendarTab extends StatefulWidget {
  final Map<String, dynamic>? data;
  final bool loading;
  final Set<DateTime> presentDays;
  final Set<int> holidayWeekdays;
  final VoidCallback onRefresh;

  const _CalendarTab({
    required this.data,
    required this.loading,
    required this.presentDays,
    required this.holidayWeekdays,
    required this.onRefresh,
  });

  @override
  State<_CalendarTab> createState() => _CalendarTabState();
}

class _CalendarTabState extends State<_CalendarTab> {
  DateTime _focusedDay = DateTime.now();
  DateTime? _selectedDay;

  bool _isHoliday(DateTime day) {
    return widget.holidayWeekdays.contains(day.weekday);
  }

  bool _isPresent(DateTime day) {
    return widget.presentDays.contains(DateTime(day.year, day.month, day.day));
  }

  bool _isPastOrToday(DateTime day) {
    final today = DateTime.now();
    final todayNorm = DateTime(today.year, today.month, today.day);
    final dayNorm = DateTime(day.year, day.month, day.day);
    return !dayNorm.isAfter(todayNorm);
  }

  @override
  Widget build(BuildContext context) {
    if (widget.loading) {
      return const Center(child: CircularProgressIndicator());
    }

    final total = widget.data?['total_days'] ?? 0;
    final streak = widget.data?['current_streak'] ?? 0;

    // Count present days in focused month
    final monthPresent = widget.presentDays
        .where((d) =>
            d.month == _focusedDay.month && d.year == _focusedDay.year)
        .length;

    // Count absent (non-holiday, non-present, past) days in focused month
    final now = DateTime.now();
    int monthAbsent = 0;
    final firstOfMonth = DateTime(_focusedDay.year, _focusedDay.month, 1);
    final lastOfMonth = DateTime(_focusedDay.year, _focusedDay.month + 1, 0);
    for (var d = firstOfMonth; !d.isAfter(lastOfMonth); d = d.add(const Duration(days: 1))) {
      if (_isPastOrToday(d) && !_isHoliday(d) && !_isPresent(d)) {
        monthAbsent++;
      }
    }

    return RefreshIndicator(
      onRefresh: () async => widget.onRefresh(),
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // Stats row
          Row(
            children: [
              Expanded(
                  child: _miniStat(
                      'Total', '$total', Icons.check_circle_outline_rounded,
                      AppColors.success)),
              const SizedBox(width: 10),
              Expanded(
                  child: _miniStat('Streak', '$streak 🔥',
                      Icons.local_fire_department_rounded, AppColors.warning)),
              const SizedBox(width: 10),
              Expanded(
                  child: _miniStat('This Month', '$monthPresent',
                      Icons.calendar_month_rounded, AppColors.info)),
            ],
          ),
          const SizedBox(height: 16),

          // Calendar — Petpooja style with colored cell backgrounds
          Container(
            decoration: BoxDecoration(
              color: AppColors.surface,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: AppColors.border),
            ),
            child: TableCalendar(
              firstDay: DateTime(2023, 1, 1),
              lastDay: DateTime.now().add(const Duration(days: 30)),
              focusedDay: _focusedDay,
              selectedDayPredicate: (day) => isSameDay(_selectedDay, day),
              onDaySelected: (selected, focused) {
                setState(() {
                  _selectedDay = selected;
                  _focusedDay = focused;
                });
              },
              onPageChanged: (focused) {
                setState(() => _focusedDay = focused);
              },
              calendarBuilders: CalendarBuilders(
                // Custom day builder for colored cells
                defaultBuilder: (context, day, focusedDay) {
                  return _buildDayCell(day, isToday: false, isSelected: false);
                },
                todayBuilder: (context, day, focusedDay) {
                  return _buildDayCell(day, isToday: true, isSelected: false);
                },
                selectedBuilder: (context, day, focusedDay) {
                  return _buildDayCell(day, isToday: isSameDay(day, DateTime.now()), isSelected: true);
                },
                outsideBuilder: (context, day, focusedDay) {
                  return Center(
                    child: Text(
                      '${day.day}',
                      style: const TextStyle(
                        color: AppColors.textHint,
                        fontSize: 13,
                        fontFamily: 'Poppins',
                      ),
                    ),
                  );
                },
              ),
              headerStyle: const HeaderStyle(
                formatButtonVisible: false,
                titleCentered: true,
                titleTextStyle: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w600,
                    fontFamily: 'Poppins'),
                leftChevronIcon: Icon(Icons.chevron_left_rounded,
                    color: AppColors.primary),
                rightChevronIcon: Icon(Icons.chevron_right_rounded,
                    color: AppColors.primary),
              ),
              daysOfWeekStyle: const DaysOfWeekStyle(
                weekdayStyle: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                    color: AppColors.textSecondary,
                    fontFamily: 'Poppins'),
                weekendStyle: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                    color: AppColors.textHint,
                    fontFamily: 'Poppins'),
              ),
              calendarStyle: const CalendarStyle(
                // These won't be used since we override builders, but keep as fallback
                markersMaxCount: 0,
                cellMargin: EdgeInsets.all(3),
              ),
            ),
          ),
          const SizedBox(height: 16),

          // Legend
          Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: AppColors.surface,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: AppColors.border),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceEvenly,
              children: [
                _legendItem(const Color(0xFF22C55E), 'Present'),
                _legendItem(const Color(0xFFEF4444), 'Absent'),
                _legendItem(const Color(0xFF9CA3AF), 'Holiday'),
                _legendItem(AppColors.primary, 'Today'),
              ],
            ),
          ),
          const SizedBox(height: 16),

          // Monthly summary
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: AppColors.surface,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: AppColors.border),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  DateFormat('MMMM yyyy').format(_focusedDay),
                  style: AppTextStyles.bodyMedium,
                ),
                const SizedBox(height: 12),
                Row(
                  children: [
                    Expanded(child: _summaryBox('Present', '$monthPresent', const Color(0xFF22C55E))),
                    const SizedBox(width: 10),
                    Expanded(child: _summaryBox('Absent', '$monthAbsent', const Color(0xFFEF4444))),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(height: 20),
        ],
      ),
    );
  }

  Widget _buildDayCell(DateTime day, {required bool isToday, required bool isSelected}) {
    Color bgColor;
    Color textColor;
    BoxBorder? border;

    final pastOrToday = _isPastOrToday(day);
    final present = _isPresent(day);
    final holiday = _isHoliday(day);

    if (isSelected) {
      // Selected day gets a primary border ring
      border = Border.all(color: AppColors.primary, width: 2);
    }

    if (!pastOrToday) {
      // Future days — no coloring
      bgColor = Colors.transparent;
      textColor = AppColors.textPrimary;
    } else if (present) {
      // Present — green
      bgColor = const Color(0xFF22C55E).withOpacity(0.18);
      textColor = const Color(0xFF15803D);
    } else if (holiday) {
      // Holiday — gray
      bgColor = const Color(0xFF9CA3AF).withOpacity(0.18);
      textColor = const Color(0xFF6B7280);
    } else {
      // Absent — red
      bgColor = const Color(0xFFEF4444).withOpacity(0.15);
      textColor = const Color(0xFFDC2626);
    }

    return Container(
      margin: const EdgeInsets.all(3),
      decoration: BoxDecoration(
        color: bgColor,
        borderRadius: BorderRadius.circular(8),
        border: border,
      ),
      child: Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              '${day.day}',
              style: TextStyle(
                fontSize: 13,
                fontWeight: (isToday || present) ? FontWeight.w700 : FontWeight.w500,
                color: textColor,
                fontFamily: 'Poppins',
              ),
            ),
            if (isToday)
              Container(
                width: 5, height: 5,
                margin: const EdgeInsets.only(top: 1),
                decoration: const BoxDecoration(
                  color: AppColors.primary,
                  shape: BoxShape.circle,
                ),
              ),
          ],
        ),
      ),
    );
  }

  Widget _legendItem(Color color, String label) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          width: 14, height: 14,
          decoration: BoxDecoration(
            color: color.withOpacity(0.2),
            borderRadius: BorderRadius.circular(4),
            border: Border.all(color: color.withOpacity(0.5)),
          ),
        ),
        const SizedBox(width: 5),
        Text(label,
            style: const TextStyle(
                fontSize: 11,
                color: AppColors.textSecondary,
                fontFamily: 'Poppins')),
      ],
    );
  }

  Widget _summaryBox(String label, String value, Color color) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: color.withOpacity(0.08),
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: color.withOpacity(0.2)),
      ),
      child: Column(
        children: [
          Text(value, style: TextStyle(
            fontSize: 22, fontWeight: FontWeight.w700,
            color: color, fontFamily: 'Poppins',
          )),
          const SizedBox(height: 2),
          Text(label, style: TextStyle(
            fontSize: 11, color: color.withOpacity(0.8),
            fontFamily: 'Poppins',
          )),
        ],
      ),
    );
  }

  Widget _miniStat(String label, String value, IconData icon, Color color) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: color.withOpacity(0.08),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: color.withOpacity(0.2)),
      ),
      child: Column(
        children: [
          Icon(icon, color: color, size: 22),
          const SizedBox(height: 6),
          Text(value,
              style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.w700,
                  color: color,
                  fontFamily: 'Poppins')),
          Text(label,
              style: AppTextStyles.caption.copyWith(fontSize: 10)),
        ],
      ),
    );
  }
}
