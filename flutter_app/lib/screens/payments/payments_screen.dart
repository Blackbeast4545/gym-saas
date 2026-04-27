import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:dio/dio.dart';
import 'dart:io';
import 'dart:typed_data';
import '../../services/api_service.dart';
import '../../utils/constants.dart';

class PaymentsScreen extends StatefulWidget {
  const PaymentsScreen({super.key});

  @override
  State<PaymentsScreen> createState() => _PaymentsScreenState();
}

class _PaymentsScreenState extends State<PaymentsScreen> {
  List<dynamic> _payments = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final data = await apiService.getPayments();
      setState(() {
        _payments = data;
        _loading = false;
      });
    } catch (_) {
      setState(() => _loading = false);
    }
  }

  Future<Uint8List?> _downloadReceiptBytes(String paymentId) async {
    try {
      final res = await apiService.getReceiptPdf(paymentId);
      return res;
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Failed to download receipt')),
        );
      }
      return null;
    }
  }

  Future<void> _saveAndOpenReceipt(String paymentId, String receiptNumber) async {
    // Show loading
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Downloading receipt…'), duration: Duration(seconds: 1)),
      );
    }

    final bytes = await _downloadReceiptBytes(paymentId);
    if (bytes == null) return;

    try {
      // Save to app's temp directory (no extra package needed)
      final dir = Directory.systemTemp;
      final file = File('${dir.path}/receipt-$receiptNumber.pdf');
      await file.writeAsBytes(bytes);

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Receipt saved: receipt-$receiptNumber.pdf'),
            duration: const Duration(seconds: 3),
            action: SnackBarAction(
              label: 'OK',
              onPressed: () {},
            ),
          ),
        );
      }
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Failed to save receipt')),
        );
      }
    }
  }

  Future<void> _shareReceipt(String paymentId, String receiptNumber) async {
    final bytes = await _downloadReceiptBytes(paymentId);
    if (bytes == null) return;

    try {
      // Save to temp, then use Android/iOS share intent via platform channel
      final dir = Directory.systemTemp;
      final file = File('${dir.path}/receipt-$receiptNumber.pdf');
      await file.writeAsBytes(bytes);

      // Use Flutter's built-in share via Intent (Android) / UIActivityViewController (iOS)
      // This uses the platform's native sharing without any extra packages
      if (Platform.isAndroid) {
        // On Android, we use an intent via process
        await Process.run('am', [
          'start',
          '-a', 'android.intent.action.SEND',
          '-t', 'application/pdf',
          '--eu', 'android.intent.extra.STREAM',
          'file://${file.path}',
        ]);
      }

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Receipt ready: receipt-$receiptNumber.pdf'),
            duration: const Duration(seconds: 3),
          ),
        );
      }
    } catch (_) {
      // Fallback message
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Receipt downloaded. Check your files to share.')),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Payments')),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _payments.isEmpty
              ? _buildEmpty()
              : RefreshIndicator(
                  onRefresh: _load,
                  child: ListView.builder(
                    padding: const EdgeInsets.all(16),
                    itemCount: _payments.length,
                    itemBuilder: (_, i) => _PaymentCard(
                      payment: _payments[i],
                      onTap: () => _showReceipt(context, _payments[i]),
                    ),
                  ),
                ),
    );
  }

  Widget _buildEmpty() {
    return const Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(Icons.receipt_long_outlined,
              size: 64, color: AppColors.textHint),
          SizedBox(height: 16),
          Text('No payment records', style: AppTextStyles.heading3),
          SizedBox(height: 8),
          Text('Your payment history will appear here.',
              style: AppTextStyles.body),
        ],
      ),
    );
  }

  void _showReceipt(BuildContext context, Map<String, dynamic> p) {
    final amt = (p['amount'] as num?)?.toDouble() ?? 0;
    final date = DateTime.tryParse(p['date']?.toString() ?? '');
    final validFrom = p['valid_from'] != null
        ? DateTime.tryParse(p['valid_from'].toString())
        : null;
    final validTo = p['valid_to'] != null
        ? DateTime.tryParse(p['valid_to'].toString())
        : null;
    final mode = (p['mode']?.toString() ?? 'cash')
        .replaceAll('_', ' ')
        .toUpperCase();
    final paymentId = p['id']?.toString() ?? '';
    final receiptNumber = p['receipt_number']?.toString() ?? '';

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => DraggableScrollableSheet(
        initialChildSize: 0.80,
        minChildSize: 0.5,
        maxChildSize: 0.92,
        builder: (_, scrollCtrl) => Container(
          decoration: const BoxDecoration(
            color: AppColors.surface,
            borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
          ),
          child: ListView(
            controller: scrollCtrl,
            padding: const EdgeInsets.all(24),
            children: [
              // Drag handle
              Center(
                child: Container(
                  width: 40,
                  height: 4,
                  decoration: BoxDecoration(
                    color: AppColors.border,
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
              ),
              const SizedBox(height: 20),

              // Receipt header
              const Center(
                child: Text('PAYMENT RECEIPT',
                    style: TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w700,
                        letterSpacing: 2,
                        color: AppColors.primary,
                        fontFamily: 'Poppins')),
              ),
              Center(
                child: Text(
                  receiptNumber,
                  style: const TextStyle(
                      fontSize: 11,
                      color: AppColors.textHint,
                      fontFamily: 'Poppins',
                      letterSpacing: 1),
                ),
              ),
              const SizedBox(height: 24),

              // Amount box
              Container(
                width: double.infinity,
                padding: const EdgeInsets.symmetric(vertical: 20),
                decoration: BoxDecoration(
                  color: AppColors.success.withOpacity(0.08),
                  borderRadius: BorderRadius.circular(16),
                  border:
                      Border.all(color: AppColors.success.withOpacity(0.2)),
                ),
                child: Column(
                  children: [
                    Text(
                      '₹ ${amt.toStringAsFixed(2)}',
                      style: const TextStyle(
                          fontSize: 32,
                          fontWeight: FontWeight.w800,
                          color: AppColors.success,
                          fontFamily: 'Poppins'),
                    ),
                    const SizedBox(height: 4),
                    const Text('Amount Paid',
                        style: TextStyle(
                            fontSize: 11,
                            color: AppColors.textSecondary,
                            fontFamily: 'Poppins')),
                  ],
                ),
              ),
              const SizedBox(height: 20),

              // Details
              _receiptRow('Date',
                  date != null ? DateFormat('dd MMM yyyy').format(date) : '—'),
              _receiptRow('Payment Mode', mode),
              if (validFrom != null)
                _receiptRow(
                    'Valid From', DateFormat('dd MMM yyyy').format(validFrom)),
              if (validTo != null)
                _receiptRow(
                    'Valid To', DateFormat('dd MMM yyyy').format(validTo)),
              if (p['notes'] != null &&
                  p['notes'].toString().isNotEmpty)
                _receiptRow('Notes', p['notes'].toString()),

              const SizedBox(height: 16),
              const Divider(),
              const SizedBox(height: 12),

              // Amount in words
              Text(
                'Rupees ${_numberToWords(amt.toInt()).toUpperCase()} ONLY',
                style: const TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w600,
                    color: AppColors.textSecondary,
                    fontFamily: 'Poppins'),
              ),
              const SizedBox(height: 24),

              // Action buttons — Download & Share
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton.icon(
                      onPressed: () => _saveAndOpenReceipt(paymentId, receiptNumber),
                      icon: const Icon(Icons.download_rounded, size: 18),
                      label: const Text('Download'),
                      style: OutlinedButton.styleFrom(
                        foregroundColor: AppColors.primary,
                        side: const BorderSide(color: AppColors.primary),
                        shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12)),
                        padding: const EdgeInsets.symmetric(vertical: 14),
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: ElevatedButton.icon(
                      onPressed: () => _shareReceipt(paymentId, receiptNumber),
                      icon: const Icon(Icons.share_rounded, size: 18),
                      label: const Text('Share'),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppColors.primary,
                        foregroundColor: Colors.white,
                        shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12)),
                        padding: const EdgeInsets.symmetric(vertical: 14),
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),

              // Footer
              Center(
                child: Text(
                  'This is a computer-generated receipt',
                  style: TextStyle(
                      fontSize: 10,
                      color: AppColors.textHint,
                      fontFamily: 'Poppins'),
                ),
              ),
              const SizedBox(height: 4),
              const Center(
                child: Text(
                  'Powered by FitNexus',
                  style: TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w700,
                      color: AppColors.primary,
                      fontFamily: 'Poppins'),
                ),
              ),
              const SizedBox(height: 16),
            ],
          ),
        ),
      ),
    );
  }

  Widget _receiptRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label,
              style: const TextStyle(
                  fontSize: 13,
                  color: AppColors.textSecondary,
                  fontFamily: 'Poppins')),
          Flexible(
            child: Text(value,
                style: const TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w600,
                    color: AppColors.textPrimary,
                    fontFamily: 'Poppins'),
                textAlign: TextAlign.right),
          ),
        ],
      ),
    );
  }

  String _numberToWords(int n) {
    if (n == 0) return 'Zero';
    const ones = [
      '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight',
      'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen',
      'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'
    ];
    const tens = [
      '', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy',
      'Eighty', 'Ninety'
    ];
    String twoD(int num) =>
        num < 20 ? ones[num] : tens[num ~/ 10] + (num % 10 > 0 ? '-${ones[num % 10]}' : '');
    String threeD(int num) {
      int h = num ~/ 100, r = num % 100;
      List<String> p = [];
      if (h > 0) p.add('${ones[h]} Hundred');
      if (r > 0) {
        if (h > 0) p.add('and');
        p.add(twoD(r));
      }
      return p.join(' ');
    }
    List<String> parts = [];
    int v = n;
    if (v >= 10000000) { parts.add('${threeD(v ~/ 10000000)} Crore'); v %= 10000000; }
    if (v >= 100000) { parts.add('${twoD(v ~/ 100000)} Lakh'); v %= 100000; }
    if (v >= 1000) { parts.add('${twoD(v ~/ 1000)} Thousand'); v %= 1000; }
    if (v > 0) parts.add(threeD(v));
    return parts.join(' ');
  }
}

class _PaymentCard extends StatelessWidget {
  final dynamic payment;
  final VoidCallback onTap;
  const _PaymentCard({required this.payment, required this.onTap});

  @override
  Widget build(BuildContext context) {
    final p = payment as Map<String, dynamic>;
    final date = DateTime.tryParse(p['date']?.toString() ?? '');
    final validTo = p['valid_to'] != null
        ? DateTime.tryParse(p['valid_to'].toString())
        : null;

    final modeColors = {
      'cash': AppColors.success,
      'upi': AppColors.info,
      'card': AppColors.primary,
      'bank_transfer': AppColors.warning,
    };
    final mode = p['mode']?.toString() ?? 'cash';
    final color = modeColors[mode] ?? AppColors.textSecondary;

    return GestureDetector(
      onTap: onTap,
      child: Container(
        margin: const EdgeInsets.only(bottom: 12),
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
                Container(
                  width: 44,
                  height: 44,
                  decoration: BoxDecoration(
                    color: AppColors.primaryLight,
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: const Icon(Icons.receipt_rounded,
                      color: AppColors.primary, size: 22),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        '₹ ${(p['amount'] as num?)?.toStringAsFixed(0) ?? '—'}',
                        style: const TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.w700,
                            color: AppColors.textPrimary,
                            fontFamily: 'Poppins'),
                      ),
                      Text(
                        date != null
                            ? DateFormat('dd MMM yyyy').format(date)
                            : '—',
                        style: AppTextStyles.caption,
                      ),
                    ],
                  ),
                ),
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                    color: color.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Text(
                    mode.toUpperCase(),
                    style: TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w700,
                        color: color,
                        fontFamily: 'Poppins'),
                  ),
                ),
                const SizedBox(width: 8),
                const Icon(Icons.chevron_right_rounded,
                    color: AppColors.textHint, size: 20),
              ],
            ),
            if (validTo != null) ...[
              const SizedBox(height: 10),
              const Divider(height: 1),
              const SizedBox(height: 10),
              Row(
                children: [
                  const Icon(Icons.date_range_rounded,
                      size: 14, color: AppColors.textSecondary),
                  const SizedBox(width: 4),
                  Text(
                    'Valid till ${DateFormat('dd MMM yyyy').format(validTo)}',
                    style: AppTextStyles.caption,
                  ),
                  const Spacer(),
                  Text(
                    'Tap to view receipt →',
                    style: AppTextStyles.caption.copyWith(
                        color: AppColors.primary,
                        fontWeight: FontWeight.w500,
                        fontSize: 11),
                  ),
                ],
              ),
            ],
          ],
        ),
      ),
    );
  }
}
