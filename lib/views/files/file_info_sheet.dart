import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:share_plus/share_plus.dart';
import '../../models/download_task.dart';
import '../../theme/app_colors.dart';
import '../../theme/app_spacing.dart';
import '../../theme/app_typography.dart';
import '../../services/download_service.dart';
import '../player/video_player_screen.dart';

class FileInfoSheet extends StatelessWidget {
  final DownloadTask task;

  const FileInfoSheet({super.key, required this.task});

  void _handlePlay(BuildContext context) {
    Navigator.pop(context);
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => VideoPlayerScreen(
          filePath: task.localFilePath,
          title: task.videoInfo.title,
          videoUrl: task.format.downloadUrl,
        ),
      ),
    );
  }

  void _handleShare(BuildContext context) {
    Navigator.pop(context);
    Share.shareXFiles(
      [XFile(task.localFilePath)],
      text: task.videoInfo.title,
    );
  }

  void _handleDelete(BuildContext context) {
    Provider.of<DownloadService>(context, listen: false).removeTask(task);
    Navigator.pop(context);
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('File deleted successfully')),
    );
  }
  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: AppSpacing.paddingAllM,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
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
          AppSpacing.heightM,
          Text('File Info', style: AppTypography.getHeadlineSmall(context)),
          AppSpacing.heightM,
          _buildInfoRow('Title', task.videoInfo.title),
          _buildInfoRow('Quality', task.format.quality),
          _buildInfoRow('Size', '${task.format.sizeMb.toStringAsFixed(1)} MB'),
          _buildInfoRow('Duration', task.videoInfo.duration),
          _buildInfoRow('Path', task.localFilePath),
          AppSpacing.heightL,
          _actionButton(
            context: context,
            icon: Icons.play_arrow,
            label: 'Play File',
            onTap: () => _handlePlay(context),
          ),
          _actionButton(
            context: context,
            icon: Icons.share,
            label: 'Share File',
            onTap: () => _handleShare(context),
          ),
          _actionButton(
            context: context,
            icon: Icons.delete,
            label: 'Delete',
            color: AppColors.error,
            onTap: () => _handleDelete(context),
          ),
        ],
      ),
    );
  }

  Widget _buildInfoRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4.0),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 80,
            child: Text(label, style: const TextStyle(fontWeight: FontWeight.w600, color: Colors.grey)),
          ),
          Expanded(child: Text(value, style: const TextStyle(fontWeight: FontWeight.w500))),
        ],
      ),
    );
  }

  Widget _actionButton({
    required BuildContext context,
    required IconData icon,
    required String label,
    required VoidCallback onTap,
    Color? color,
  }) {
    final displayColor = color ?? AppColors.primary;

    return InkWell(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 12.0),
        child: Row(
          children: [
            Icon(icon, color: displayColor),
            AppSpacing.widthM,
            Text(label, style: TextStyle(fontWeight: FontWeight.w500, color: displayColor, fontSize: 15)),
          ],
        ),
      ),
    );
  }
}
