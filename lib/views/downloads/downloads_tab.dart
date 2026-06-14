import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../models/download_task.dart';
import '../../theme/app_colors.dart';
import '../../theme/app_spacing.dart';
import '../../theme/app_typography.dart';
import '../../services/download_service.dart';
import 'download_item_widget.dart';
import 'completed_item_widget.dart';

class DownloadsTab extends StatefulWidget {
  const DownloadsTab({super.key});

  @override
  State<DownloadsTab> createState() => _DownloadsTabState();
}

class _DownloadsTabState extends State<DownloadsTab> {
  int _activeFilterIndex = 0; // 0=All, 1=Video, 2=Audio, 3=Completed

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Downloads', style: TextStyle(fontWeight: FontWeight.w500)),
        backgroundColor: Colors.transparent,
        elevation: 0,
      ),
      body: Consumer<DownloadService>(
        builder: (context, downloadService, child) {
          final filteredTasks = _getFilteredTasks(downloadService.tasks);

          return Column(
            children: [
              _buildFilterBar(),
              Expanded(
                child: filteredTasks.isEmpty
                    ? _buildEmptyState()
                    : ListView.builder(
                        padding: AppSpacing.paddingAllM,
                        itemCount: filteredTasks.length,
                        itemBuilder: (context, index) {
                          final task = filteredTasks[index];
                          if (task.status == DownloadStatus.completed) {
                            return CompletedItemWidget(task: task);
                          }
                          return DownloadItemWidget(task: task);
                        },
                      ),
              ),
            ],
          );
        },
      ),
    );
  }

  List<DownloadTask> _getFilteredTasks(List<DownloadTask> tasks) {
    switch (_activeFilterIndex) {
      case 1: // Video
        return tasks.where((t) => !t.format.isAudio).toList();
      case 2: // Audio
        return tasks.where((t) => t.format.isAudio).toList();
      case 3: // Completed
        return tasks.where((t) => t.status == DownloadStatus.completed).toList();
      case 0:
      default:
        return tasks;
    }
  }

  Widget _buildFilterBar() {
    final filters = ['All', 'Video', 'Audio', 'Completed'];
    return Container(
      height: 40,
      margin: const EdgeInsets.symmetric(vertical: AppSpacing.s),
      child: ListView.builder(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: AppSpacing.m),
        itemCount: filters.length,
        itemBuilder: (context, index) {
          final isSelected = _activeFilterIndex == index;
          return Padding(
            padding: const EdgeInsets.only(right: AppSpacing.s),
            child: ChoiceChip(
              label: Text(filters[index]),
              selected: isSelected,
              onSelected: (val) {
                if (val) setState(() => _activeFilterIndex = index);
              },
              showCheckmark: false,
              backgroundColor: AppColors.border,
              selectedColor: AppColors.textSecondary,
              side: BorderSide.none,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(AppSpacing.radiusM),
              ),
              labelStyle: TextStyle(
                color: isSelected ? Colors.white : AppColors.textPrimary,
                fontWeight: FontWeight.normal,
              ),
            ),
          );
        },
      ),
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.download_for_offline, size: 64, color: AppColors.textLight.withOpacity(0.5)),
          AppSpacing.heightM,
          Text('No downloads yet', style: AppTypography.getHeadlineSmall(context)),
          AppSpacing.heightS,
          Text('Paste a link on the Home tab to download videos.', 
              style: AppTypography.getBodyMedium(context), textAlign: TextAlign.center),
        ],
      ),
    );
  }
}
