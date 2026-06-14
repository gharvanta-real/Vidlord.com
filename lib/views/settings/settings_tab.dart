import 'package:flutter/material.dart';
import '../../theme/app_colors.dart';
import '../../theme/app_spacing.dart';
import '../../theme/app_typography.dart';
import '../../services/storage_service.dart';

class SettingsTab extends StatefulWidget {
  const SettingsTab({super.key});

  @override
  State<SettingsTab> createState() => _SettingsTabState();
}

class _SettingsTabState extends State<SettingsTab> {
  final StorageService _storageService = StorageService();
  String _storagePath = 'Loading...';

  @override
  void initState() {
    super.initState();
    _loadStoragePath();
  }

  Future<void> _loadStoragePath() async {
    final dir = await _storageService.getDownloadDir();
    setState(() {
      _storagePath = dir.path;
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Settings', style: TextStyle(fontWeight: FontWeight.w500)),
        backgroundColor: Colors.transparent,
        elevation: 0,
      ),
      body: ListView(
        padding: AppSpacing.paddingAllM,
        children: [
          _buildSectionHeader('Storage Config'),
          _buildSettingTile(
            icon: Icons.folder,
            title: 'Download Folder Path',
            subtitle: _storagePath,
          ),
          AppSpacing.heightM,
          _buildSectionHeader('Info & Help'),
          _buildSettingTile(
            icon: Icons.info_outline,
            title: 'App Version',
            subtitle: 'v1.0.0 Stable (iOS-First Design Edition)',
          ),
          _buildSettingTile(
            icon: Icons.help_outline,
            title: 'Supported Sites',
            subtitle: 'YouTube, Facebook, Instagram, Twitter/X, CDN video links, etc.',
          ),
          _buildSettingTile(
            icon: Icons.code,
            title: 'Style Config',
            subtitle: 'CSS Design Tokens & Modular Layout System Active',
          ),
        ],
      ),
    );
  }

  Widget _buildSectionHeader(String title) {
    return Padding(
      padding: const EdgeInsets.only(bottom: AppSpacing.s, left: AppSpacing.xs),
      child: Text(
        title.toUpperCase(),
        style: const TextStyle(
          fontSize: 12,
          fontWeight: FontWeight.w500,
          color: Colors.grey,
          letterSpacing: 1.0,
        ),
      ),
    );
  }

  Widget _buildSettingTile({
    required IconData icon,
    required String title,
    required String subtitle,
  }) {
    return Card(
      margin: const EdgeInsets.only(bottom: AppSpacing.s),
      child: ListTile(
        leading: Icon(icon, color: AppColors.primary),
        title: Text(title, style: const TextStyle(fontWeight: FontWeight.w500, fontSize: 14)),
        subtitle: Padding(
          padding: const EdgeInsets.only(top: 4.0),
          child: Text(subtitle, style: AppTypography.getBodyMedium(context)),
        ),
      ),
    );
  }
}
