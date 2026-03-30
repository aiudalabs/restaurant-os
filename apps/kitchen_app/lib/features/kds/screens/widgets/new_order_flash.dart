import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:just_audio/just_audio.dart';

import '../../providers/kds_settings_provider.dart';

/// Displays a visual flash and plays an audio alert when a new ticket arrives.
class NewOrderFlash extends ConsumerStatefulWidget {
  const NewOrderFlash({
    required this.previousCount,
    required this.currentCount,
    required this.child,
    super.key,
  });

  final int previousCount;
  final int currentCount;
  final Widget child;

  @override
  ConsumerState<NewOrderFlash> createState() => _NewOrderFlashState();
}

class _NewOrderFlashState extends ConsumerState<NewOrderFlash>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller;
  late final Animation<double> _opacity;
  AudioPlayer? _audioPlayer;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 600),
    );
    _opacity = Tween<double>(begin: 0.0, end: 0.4).animate(
      CurvedAnimation(parent: _controller, curve: Curves.easeInOut),
    );
  }

  @override
  void didUpdateWidget(covariant NewOrderFlash oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.currentCount > oldWidget.currentCount) {
      _flash();
    }
  }

  Future<void> _flash() async {
    // Visual flash
    await _controller.forward();
    await _controller.reverse();

    // Audio alert
    try {
      final volume = ref.read(kdsSettingsProvider).valueOrNull ?? 0.8;
      if (volume > 0) {
        _audioPlayer?.dispose();
        _audioPlayer = AudioPlayer();
        await _audioPlayer!.setVolume(volume); // safe: just created above
        await _audioPlayer!.setAsset('assets/sounds/new_order.mp3'); // safe
        await _audioPlayer!.play(); // safe
      }
    } catch (_) {
      // Audio failure is non-critical; do not block UI
    }
  }

  @override
  void dispose() {
    _controller.dispose();
    _audioPlayer?.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Stack(
      children: [
        widget.child,
        AnimatedBuilder(
          animation: _opacity,
          builder: (context, _) {
            if (_opacity.value == 0) return const SizedBox.shrink();
            return IgnorePointer(
              child: Container(
                color: Colors.green.withValues(alpha: _opacity.value),
              ),
            );
          },
        ),
      ],
    );
  }
}
