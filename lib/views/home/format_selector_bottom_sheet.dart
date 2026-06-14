import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../models/video_info.dart';
import '../../models/video_format.dart';
import '../../theme/app_colors.dart';
import '../../theme/app_spacing.dart';
import '../../theme/app_typography.dart';
import '../../services/download_service.dart';

class FormatSelectorBottomSheet extends StatefulWidget {
  final VideoInfo videoInfo;
  final List<VideoFormat> formats;
  const FormatSelectorBottomSheet({super.key, required this.videoInfo, required this.formats});

  @override
  State<FormatSelectorBottomSheet> createState() => _FormatSelectorBottomSheetState();
}

class _FormatSelectorBottomSheetState extends State<FormatSelectorBottomSheet> {
  int _selectedTabIndex = 0; // 0 = Video, 1 = Audio
  VideoFormat? _selectedFormat;

  @override
  void initState() {
    super.initState();
    _selectedFormat = widget.formats.firstWhere((f) => !f.isAudio, orElse: () => widget.formats.first);
  }

  @override
  Widget build(BuildContext context) {
    final filtered = widget.formats.where((f) => _selectedTabIndex == 0 ? !f.isAudio : f.isAudio).toList();
    return Padding(
      padding: EdgeInsets.only(
        left: AppSpacing.m, right: AppSpacing.m, top: AppSpacing.m,
        bottom: MediaQuery.of(context).viewInsets.bottom + AppSpacing.l,
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Center(
            child: Container(
              width: 40, height: 4,
              decoration: BoxDecoration(
                color: AppColors.border,
                borderRadius: BorderRadius.circular(2),
              ),
            ),
          ),
          AppSpacing.heightM,
          Text('Choose Format', style: AppTypography.getHeadlineSmall(context)),
          AppSpacing.heightM,
          _buildVideoHeader(),
          AppSpacing.heightM,
          _buildTabs(),
          AppSpacing.heightM,
          ...filtered.map((format) => _buildFormatOption(format)),
          AppSpacing.heightL,
          _buildDownloadButton(context),
        ],
      ),
    );
  }

  Widget _buildVideoHeader() {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        ClipRRect(
          borderRadius: BorderRadius.circular(AppSpacing.radiusS),
          child: Image.network(
            widget.videoInfo.thumbnailUrl, width: 100, height: 56, fit: BoxFit.cover,
            errorBuilder: (_, __, ___) => Container(color: Colors.grey, width: 100, height: 56),
          ),
        ),
        AppSpacing.widthM,
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(widget.videoInfo.title, style: const TextStyle(fontWeight: FontWeight.w500, fontSize: 14),
                  maxLines: 2, overflow: TextOverflow.ellipsis),
              AppSpacing.heightXS,
              Text('${widget.videoInfo.duration} • ${widget.videoInfo.platform}', style: AppTypography.getBodyMedium(context)),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildTabs() {
    return Container(
      decoration: BoxDecoration(
        color: AppColors.background,
        borderRadius: BorderRadius.circular(AppSpacing.radiusM),
      ),
      padding: const EdgeInsets.all(4),
      child: Row(
        children: [_tabButton('Video', 0), _tabButton('Audio (MP3)', 1)],
      ),
    );
  }

  Widget _tabButton(String label, int index) {
    final isSelected = _selectedTabIndex == index;
    return Expanded(
      child: GestureDetector(
        onTap: () => setState(() {
          _selectedTabIndex = index;
          _selectedFormat = widget.formats.firstWhere((f) => index == 0 ? !f.isAudio : f.isAudio, orElse: () => widget.formats.first);
        }),
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 8),
          alignment: Alignment.center,
          decoration: BoxDecoration(
            color: isSelected ? AppColors.surface : Colors.transparent,
            borderRadius: BorderRadius.circular(AppSpacing.radiusS + 2),
            boxShadow: isSelected ? [const BoxShadow(color: Colors.black12, blurRadius: 4)] : [],
          ),
          child: Text(label, style: TextStyle(
            fontWeight: isSelected ? FontWeight.w600 : FontWeight.normal,
            color: isSelected ? AppColors.textPrimary : AppColors.textLight,
          )),
        ),
      ),
    );
  }

  Widget _buildFormatOption(VideoFormat format) {
    return RadioListTile<VideoFormat>(
      value: format,
      groupValue: _selectedFormat,
      onChanged: (val) => setState(() => _selectedFormat = val),
      title: Text(format.quality, style: const TextStyle(fontWeight: FontWeight.w500)),
      subtitle: Text('${format.sizeMb.toStringAsFixed(1)} MB'),
      activeColor: AppColors.primary,
      contentPadding: EdgeInsets.zero,
    );
  }

  Widget _buildDownloadButton(BuildContext context) {
    return SizedBox(
      width: double.infinity, height: 52,
      child: ElevatedButton(
        onPressed: _selectedFormat == null ? null : () {
          Provider.of<DownloadService>(context, listen: false).startDownload(widget.videoInfo, _selectedFormat!);
          Navigator.pop(context);
          ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Download started! Check Downloads tab.')));
        },
        style: ElevatedButton.styleFrom(
          backgroundColor: AppColors.primary,
          foregroundColor: Colors.white,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppSpacing.radiusM)),
        ),
        child: const Text('Download Now', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w500)),
      ),
    );
  }
}
