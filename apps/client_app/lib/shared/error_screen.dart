import 'package:flutter/material.dart';
import 'package:client_app/l10n/generated/app_localizations.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:mobile_scanner/mobile_scanner.dart';

import '../theme/app_colors.dart';

class ErrorScreen extends StatelessWidget {
  const ErrorScreen({
    super.key,
    required this.message,
  });

  final String message;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);

    return Scaffold(
      backgroundColor: ClientColors.kSurface,
      body: SafeArea(
        child: Center(
          child: Padding(
            padding: const EdgeInsets.all(32),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                // Logo placeholder
                Container(
                  width: 80,
                  height: 80,
                  decoration: BoxDecoration(
                    color: ClientColors.kBrandRedLight,
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: const Icon(
                    Icons.restaurant,
                    size: 40,
                    color: ClientColors.kBrandRed,
                  ),
                ),
                const SizedBox(height: 32),
                Text(
                  l10n.scanQr,
                  style: GoogleFonts.fraunces(
                    fontSize: 22,
                    fontWeight: FontWeight.w600,
                    color: ClientColors.kTextPrimary,
                  ),
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 12),
                Text(
                  message,
                  style: GoogleFonts.dmSans(
                    fontSize: 14,
                    color: ClientColors.kTextHint,
                  ),
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 32),
                GestureDetector(
                  onTap: () {
                    Navigator.of(context).push(
                      MaterialPageRoute(
                        builder: (_) => _QrScannerScreen(
                          onScanned: (uri) {
                            // Navigate using GoRouter after popping the scanner
                            final orgId = uri.queryParameters['org'];
                            final branchId = uri.queryParameters['branch'];
                            final tableId = uri.queryParameters['table'];

                            if (orgId != null &&
                                branchId != null &&
                                tableId != null) {
                              context.go(
                                '/?org=$orgId&branch=$branchId&table=$tableId',
                              );
                            }
                          },
                        ),
                      ),
                    );
                  },
                  child: Container(
                    padding: const EdgeInsets.symmetric(
                        horizontal: 24, vertical: 14),
                    decoration: BoxDecoration(
                      color: ClientColors.kBrandRed,
                      borderRadius: BorderRadius.circular(16),
                      boxShadow: const [
                        BoxShadow(
                          color: Color(0x59C8392B),
                          blurRadius: 20,
                          offset: Offset(0, 6),
                        ),
                      ],
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Icon(Icons.camera_alt,
                            color: Colors.white, size: 18),
                        const SizedBox(width: 8),
                        Text(
                          l10n.openCamera,
                          style: GoogleFonts.dmSans(
                            fontSize: 14,
                            fontWeight: FontWeight.w600,
                            color: Colors.white,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _QrScannerScreen extends StatefulWidget {
  const _QrScannerScreen({required this.onScanned});

  final ValueChanged<Uri> onScanned;

  @override
  State<_QrScannerScreen> createState() => _QrScannerScreenState();
}

class _QrScannerScreenState extends State<_QrScannerScreen> {
  final MobileScannerController _controller = MobileScannerController();
  bool _handled = false;

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  void _handleBarcode(BarcodeCapture capture) {
    if (_handled) return;
    final barcode = capture.barcodes.firstOrNull;
    if (barcode?.rawValue == null) return;

    final uri = Uri.tryParse(barcode!.rawValue!);
    if (uri == null) return;

    _handled = true;

    // Stop the camera before navigating to avoid buffer issues
    _controller.stop().then((_) {
      if (!mounted) return;
      // Pop the scanner screen first
      Navigator.of(context).pop();
      // Then trigger the callback to navigate via GoRouter
      widget.onScanned(uri);
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      appBar: AppBar(
        backgroundColor: Colors.black,
        foregroundColor: Colors.white,
        title: Text(
          AppLocalizations.of(context).scanQr,
          style: GoogleFonts.dmSans(
            fontSize: 16,
            fontWeight: FontWeight.w500,
            color: Colors.white,
          ),
        ),
      ),
      body: MobileScanner(
        controller: _controller,
        onDetect: _handleBarcode,
      ),
    );
  }
}
