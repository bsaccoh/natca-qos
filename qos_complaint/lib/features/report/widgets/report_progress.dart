import 'package:flutter/material.dart';
import '../../../app/theme/app_theme.dart';

class ReportProgressBar extends StatelessWidget {
  final int currentStep; // 1–4
  const ReportProgressBar({super.key, required this.currentStep});

  static const _labels = ['Details', 'Location', 'Contact', 'Review'];

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 20),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          for (int i = 0; i < 4; i++) ...[
            _StepNode(step: i + 1, current: currentStep, label: _labels[i]),
            if (i < 3)
              Expanded(
                child: Container(
                  margin: const EdgeInsets.only(top: 12),
                  height: 1.5,
                  color: i + 1 < currentStep
                      ? AppColors.primaryBlue
                      : AppColors.dynamicBorder,
                ),
              ),
          ],
        ],
      ),
    );
  }
}

class _StepNode extends StatelessWidget {
  final int step, current;
  final String label;
  const _StepNode({required this.step, required this.current, required this.label});

  @override
  Widget build(BuildContext context) {
    final done = step < current;
    final active = step == current;
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        AnimatedContainer(
          duration: const Duration(milliseconds: 200),
          width: 26,
          height: 26,
          decoration: BoxDecoration(
            color: done || active ? AppColors.primaryBlue : Colors.transparent,
            shape: BoxShape.circle,
            border: Border.all(
              color: done || active ? AppColors.primaryBlue : AppColors.textLight,
              width: 1.5,
            ),
          ),
          alignment: Alignment.center,
          child: done
              ? const Icon(Icons.check_rounded, size: 13, color: Colors.white)
              : Text(
                  '$step',
                  style: TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.bold,
                    color: active ? Colors.white : AppColors.textLight,
                  ),
                ),
        ),
        const SizedBox(height: 3),
        Text(
          label,
          style: TextStyle(
            fontSize: 9,
            fontWeight: active ? FontWeight.bold : FontWeight.normal,
            color: done || active ? AppColors.primaryBlue : AppColors.textLight,
          ),
        ),
      ],
    );
  }
}
