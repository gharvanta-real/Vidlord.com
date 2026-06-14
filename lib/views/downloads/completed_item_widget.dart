import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../models/download_task.dart';
import '../../theme/app_colors.dart';
import '../../theme/app_spacing.dart';
import '../../theme/app_typography.dart';
import '../../services/download_service.dart';

class CompletedItemWidget extends StatelessWidget {
  final DownloadTask task;

  const CompletedItemWidget({super.key, required this.task});

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: AppSpacing.m),
      padding: AppSpacing.paddingAllM,
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(AppSpacing.radiusM),
      ),
      child: Row(
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
                  '${task.format.quality} • ${task.format.sizeMb.toStringAsFixed(1)} MB',
                  style: AppTypography.getBodyMedium(context),
                ),
                AppSpacing.heightXS,
                Row(
                  children: [
                    const Icon(Icons.check_circle, color: AppColors.success, size: 14),
                    AppSpacing.widthXS,
                    Text(
                      'Completed',
                      style: AppTypography.getCaption(context).copyWith(
                        color: AppColors.success,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
          IconButton(
            icon: const Icon(Icons.delete_outline, color: AppColors.error, size: 22),
            onPressed: () {
              Provider.of<DownloadService>(context, listen: false).removeTask(task);
            },
          ),
        ],
      ),
    );
  }
}
