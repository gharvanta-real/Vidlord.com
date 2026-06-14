import 'package:flutter/material.dart';
import '../../theme/app_colors.dart';
import '../../theme/app_spacing.dart';
import '../../theme/app_typography.dart';
import '../../services/extractor_service.dart';
import 'format_selector_bottom_sheet.dart';

class HomeTab extends StatefulWidget {
  const HomeTab({super.key});

  @override
  State<HomeTab> createState() => _HomeTabState();
}

class _HomeTabState extends State<HomeTab> {
  final TextEditingController _urlController = TextEditingController();
  final ExtractorService _extractor = ExtractorService();
  bool _isLoading = false;

  Future<void> _handleExtract() async {
    final url = _urlController.text.trim();
    if (url.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please paste a link first')),
      );
      return;
    }

    setState(() => _isLoading = true);

    try {
      final data = await _extractor.extract(url);
      if (!mounted) return;
      
      showModalBottomSheet(
        context: context,
        isScrollControlled: true,
        builder: (_) => FormatSelectorBottomSheet(
          videoInfo: data['info'],
          formats: data['formats'],
        ),
      );
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Error: ${e.toString()}')),
      );
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  void _pasteDemoLink(String url) {
    _urlController.text = url;
    _handleExtract();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Vidlord', style: TextStyle(fontWeight: FontWeight.w500)),
        backgroundColor: Colors.transparent,
        elevation: 0,
      ),
      body: SingleChildScrollView(
        padding: AppSpacing.paddingAllM,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Link to Video/MP3\nDownloader', style: AppTypography.getHeadlineLarge(context)),
            AppSpacing.heightS,
            Text('Paste link and download video or audio from any supported platform.', 
                style: AppTypography.getBodyMedium(context)),
            AppSpacing.heightL,
            TextField(
              controller: _urlController,
              decoration: InputDecoration(
                hintText: 'Paste video link here...',
                suffixIcon: IconButton(
                  icon: const Icon(Icons.clear),
                  onPressed: () => _urlController.clear(),
                ),
              ),
            ),
            AppSpacing.heightM,
            SizedBox(
              width: double.infinity,
              height: 52,
              child: ElevatedButton(
                onPressed: _isLoading ? null : _handleExtract,
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.primary,
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppSpacing.radiusM)),
                ),
                child: _isLoading 
                  ? const CircularProgressIndicator(color: Colors.white) 
                  : const Text('Analyze Link', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w500)),
              ),
            ),
            AppSpacing.heightL,
            _buildQuickActions(),
            AppSpacing.heightL,
            _buildSupportedPlatforms(),
          ],
        ),
      ),
    );
  }

  Widget _buildQuickActions() {
    return Row(
      children: [
        Expanded(
          child: _quickActionButton(
            icon: Icons.video_library,
            label: 'Video Demo',
            onTap: () => _pasteDemoLink('https://www.youtube.com/watch?v=dQw4w9WgXcQ'),
          ),
        ),
        AppSpacing.widthM,
        Expanded(
          child: _quickActionButton(
            icon: Icons.music_note,
            label: 'Audio Demo',
            onTap: () => _pasteDemoLink('https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3'),
          ),
        ),
      ],
    );
  }

  Widget _quickActionButton({required IconData icon, required String label, required VoidCallback onTap}) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(AppSpacing.radiusM),
      child: Container(
        padding: AppSpacing.paddingAllM,
        decoration: BoxDecoration(
          color: AppColors.surface,
          borderRadius: BorderRadius.circular(AppSpacing.radiusM),
        ),
        child: Row(
          children: [
            Icon(icon, color: AppColors.primary),
            AppSpacing.widthS,
            Expanded(child: Text(label, style: const TextStyle(fontWeight: FontWeight.w500))),
          ],
        ),
      ),
    );
  }

  Widget _buildSupportedPlatforms() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text('Supported Platforms', style: TextStyle(fontWeight: FontWeight.w500, fontSize: 16)),
        AppSpacing.heightM,
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceAround,
          children: [
            _platformIcon(Icons.video_collection, 'YouTube', Colors.red),
            _platformIcon(Icons.facebook, 'Facebook', Colors.blue),
            _platformIcon(Icons.camera_alt, 'Instagram', Colors.purple),
            _platformIcon(Icons.close, 'X', Colors.black),
          ],
        ),
      ],
    );
  }

  Widget _platformIcon(IconData icon, String label, Color color) {
    return Column(
      children: [
        CircleAvatar(
          radius: 26,
          backgroundColor: color.withOpacity(0.1),
          child: Icon(icon, color: color, size: 28),
        ),
        AppSpacing.heightXS,
        Text(label, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w500)),
      ],
    );
  }
}
