import 'dart:async';

import 'package:flutter/material.dart';

import '../../models/kds_ticket.dart';

class TicketTimerBadge extends StatefulWidget {
  const TicketTimerBadge({
    required this.receivedAt,
    super.key,
  });

  final DateTime receivedAt;

  @override
  State<TicketTimerBadge> createState() => _TicketTimerBadgeState();
}

class _TicketTimerBadgeState extends State<TicketTimerBadge> {
  late Timer _timer;

  @override
  void initState() {
    super.initState();
    _timer = Timer.periodic(const Duration(seconds: 1), (_) {
      if (mounted) setState(() {});
    });
  }

  @override
  void dispose() {
    _timer.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final elapsed = DateTime.now().difference(widget.receivedAt);
    final mins = elapsed.inMinutes;
    final secs = elapsed.inSeconds % 60;
    final label = '${mins.toString().padLeft(2, '0')}:'
        '${secs.toString().padLeft(2, '0')}';

    final urgency = _urgencyFromMinutes(mins);
    final color = _timerColor(urgency, context);

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.2),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: color),
      ),
      child: Text(
        label,
        style: TextStyle(
          color: color,
          fontWeight: FontWeight.bold,
          fontSize: 16,
          fontFeatures: const [FontFeature.tabularFigures()],
        ),
      ),
    );
  }

  static TicketUrgency _urgencyFromMinutes(int mins) {
    if (mins >= 15) return TicketUrgency.critical;
    if (mins >= 8) return TicketUrgency.warning;
    return TicketUrgency.normal;
  }

  static Color _timerColor(TicketUrgency urgency, BuildContext context) =>
      switch (urgency) {
        TicketUrgency.normal => Theme.of(context).colorScheme.tertiary,
        TicketUrgency.warning => Colors.amber,
        TicketUrgency.critical => Theme.of(context).colorScheme.error,
      };
}
