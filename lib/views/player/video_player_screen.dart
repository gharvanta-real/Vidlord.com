import 'package:flutter/material.dart';
import 'package:video_player/video_player.dart';
import '../../theme/app_colors.dart';
import '../../theme/app_spacing.dart';
import '../../services/video_player_helper.dart';

class VideoPlayerScreen extends StatefulWidget {
  final String filePath;
  final String title;
  final String? videoUrl;

  const VideoPlayerScreen({
    super.key,
    required this.filePath,
    required this.title,
    this.videoUrl,
  });

  @override
  State<VideoPlayerScreen> createState() => _VideoPlayerScreenState();
}

class _VideoPlayerScreenState extends State<VideoPlayerScreen> {
  VideoPlayerController? _controller;
  bool _initialized = false;
  bool _isAudio = false;

  @override
  void initState() {
    super.initState();
    _isAudio = widget.filePath.endsWith('.mp3');
    if (!_isAudio) {
      _initVideoPlayer();
    }
  }

  Future<void> _initVideoPlayer() async {
    try {
      _controller = getController(widget.filePath, widget.videoUrl);
      await _controller!.initialize();
      setState(() => _initialized = true);
      _controller!.play();
    } catch (e) {
      // Handle error gracefully
      setState(() => _initialized = false);
    }
  }

  @override
  void dispose() {
    _controller?.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      appBar: AppBar(
        title: Text(widget.title, style: const TextStyle(color: Colors.white, fontSize: 16)),
        backgroundColor: Colors.black,
        iconTheme: const IconThemeData(color: Colors.white),
      ),
      body: _isAudio 
        ? _buildAudioPlaceholder() 
        : (_initialized ? _buildVideoPlayer() : const Center(child: CircularProgressIndicator(color: Colors.white))),
    );
  }

  Widget _buildVideoPlayer() {
    return Column(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        AspectRatio(
          aspectRatio: _controller!.value.aspectRatio,
          child: Stack(
            alignment: Alignment.bottomCenter,
            children: [
              VideoPlayer(_controller!),
              _VideoControlsOverlay(controller: _controller!),
              VideoProgressIndicator(_controller!, allowScrubbing: true),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildAudioPlaceholder() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Container(
            width: 140,
            height: 140,
            decoration: BoxDecoration(
              color: AppColors.primary.withOpacity(0.15),
              shape: BoxShape.circle,
            ),
            child: const Icon(Icons.music_note, size: 64, color: AppColors.primary),
          ),
          AppSpacing.heightL,
          const Text(
            'Playing Audio Track',
            style: TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.w500),
          ),
          AppSpacing.heightS,
          Text(
            widget.title,
            style: const TextStyle(color: Colors.grey, fontSize: 14),
            textAlign: TextAlign.center,
          ),
        ],
      ),
    );
  }
}

class _VideoControlsOverlay extends StatefulWidget {
  final VideoPlayerController controller;
  const _VideoControlsOverlay({required this.controller});

  @override
  State<_VideoControlsOverlay> createState() => _VideoControlsOverlayState();
}

class _VideoControlsOverlayState extends State<_VideoControlsOverlay> {
  @override
  Widget build(BuildContext context) {
    final playing = widget.controller.value.isPlaying;
    return GestureDetector(
      onTap: () {
        setState(() {
          playing ? widget.controller.pause() : widget.controller.play();
        });
      },
      child: Container(
        color: Colors.black26,
        child: Center(
          child: Icon(
            playing ? Icons.pause_circle_filled : Icons.play_circle_filled,
            color: Colors.white,
            size: 64,
          ),
        ),
      ),
    );
  }
}
