import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../models/download_task.dart';
import '../../theme/app_colors.dart';
import '../../theme/app_spacing.dart';
import '../../theme/app_typography.dart';
import '../../services/download_service.dart';
import 'file_info_sheet.dart';

class FilesTab extends StatefulWidget {
  const FilesTab({super.key});

  @override
  State<FilesTab> createState() => _FilesTabState();
}

class _FilesTabState extends State<FilesTab> {
  int _activeFilterIndex = 0; // 0=All, 1=Video, 2=Audio

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Files/Library', style: TextStyle(fontWeight: FontWeight.w500)),
        backgroundColor: Colors.transparent,
        elevation: 0,
      ),
      body: Consumer<DownloadService>(
        builder: (context, downloadService, child) {
          final completed = downloadService.completedTasks;
          final filtered = _getFilteredFiles(completed);

          return Column(
            children: [
              _buildFilterBar(),
              Expanded(
                child: filtered.isEmpty
                    ? _buildEmptyState()
                    : ListView.builder(
                        padding: AppSpacing.paddingAllM,
                        itemCount: filtered.length,
                        itemBuilder: (context, index) {
                          final task = filtered[index];
                          return _buildFileItem(task);
                        },
                      ),
              ),
            ],
          );
        },
      ),
    );
  }

  List<DownloadTask> _getFilteredFiles(List<DownloadTask> tasks) {
    switch (_activeFilterIndex) {
      case 1: // Video
        return tasks.where((t) => !t.format.isAudio).toList();
      case 2: // Audio
        return tasks.where((t) => t.format.isAudio).toList();
      case 0:
      default:
        return tasks;
      }
  }

  Widget _buildFilterBar() {
    final filters = ['All', 'Video', 'Audio'];
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

  Widget _buildFileItem(DownloadTask task) {
    return Card(
      margin: const EdgeInsets.only(bottom: AppSpacing.m),
      child: ListTile(
        contentPadding: AppSpacing.paddingAllS,
        leading: ClipRRect(
          borderRadius: BorderRadius.circular(AppSpacing.radiusS),
          child: Image.network(
            task.videoInfo.thumbnailUrl,
            width: 80,
            height: 45,
            fit: BoxFit.cover,
            errorBuilder: (_, __, ___) => Container(color: Colors.grey, width: 80, height: 45),
          ),
        ),
        title: Text(
          task.videoInfo.title,
          style: const TextStyle(fontWeight: FontWeight.w500, fontSize: 13),
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
        ),
        subtitle: Text(
          '${task.format.quality} • ${task.format.sizeMb.toStringAsFixed(1)} MB',
          style: AppTypography.getBodyMedium(context),
        ),
        trailing: const Icon(Icons.more_vert),
        onTap: () {
          showModalBottomSheet(
            context: context,
            isScrollControlled: true,
            builder: (_) => FileInfoSheet(task: task),
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
          Icon(Icons.folder_open, size: 64, color: AppColors.textLight.withOpacity(0.5)),
          AppSpacing.heightM,
          Text('No local files found', style: AppTypography.getHeadlineSmall(context)),
          AppSpacing.heightS,
          Text('Downloaded items will show up here.', 
              style: AppTypography.getBodyMedium(context), textAlign: TextAlign.center),
        ],
      ),
    );
  }
}
