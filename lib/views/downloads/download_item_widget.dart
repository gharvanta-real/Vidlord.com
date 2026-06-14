import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../models/download_task.dart';
import '../../theme/app_colors.dart';
import '../../theme/app_spacing.dart';
import '../../theme/app_typography.dart';
import '../../services/download_service.dart';

class DownloadItemWidget extends StatelessWidget {
  final DownloadTask task;

  const DownloadItemWidget({super.key, required this.task});

  @override
  Widget build(BuildContext context) {
    final speedText = '${task.speedMbMs.toStringAsFixed(2)} MB/s';
    final progressPct = '${(task.progress * 100).toStringAsFixed(0)}%';
    final sizeProgress = '${task.downloadedSize.toStringAsFixed(1)} MB / ${task.format.sizeMb.toStringAsFixed(1)} MB';

    return Container(
      margin: const EdgeInsets.only(bottom: AppSpacing.m),
      padding: AppSpacing.paddingAllM,
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(AppSpacing.radiusM),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              ClipRRect(
                borderRadius: BorderRadius.circular(AppSpacing.radiusS),
                child: Image.network(
                  task.videoInfo.thumbnailUrl,
                  width: 80,
                  height: 45,
                  fit: BoxFit.cover,
                  errorBuilder: (_, __, ___) => Container(color: Colors.grey, width: 80, height: 45),
                ),
              ),
              AppSpacing.widthM,
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      task.videoInfo.title,
                      style: const TextStyle(fontWeight: FontWeight.w500, fontSize: 13),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    AppSpacing.heightXS,
                    Text(
                      '${task.format.quality} • $speedText',
                      style: AppTypography.getBodyMedium(context),
                    ),
                  ],
                ),
              ),
              IconButton(
                icon: const Icon(Icons.cancel, color: Colors.grey, size: 22),
                onPressed: () {
                  Provider.of<DownloadService>(context, listen: false).removeTask(task);
                },
              ),
            ],
          ),
          AppSpacing.heightM,
          LinearProgressIndicator(
            value: task.progress,
            backgroundColor: AppColors.background,
            valueColor: const AlwaysStoppedAnimation<Color>(AppColors.primary),
          ),
          AppSpacing.heightS,
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(sizeProgress, style: AppTypography.getCaption(context)),
              Text(progressPct, style: AppTypography.getCaption(context).copyWith(fontWeight: FontWeight.w600)),
            ],
          ),
        ],
      ),
    );
  }
}
