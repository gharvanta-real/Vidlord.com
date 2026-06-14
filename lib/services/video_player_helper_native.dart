import 'dart:io';
import 'package:video_player/video_player.dart';

VideoPlayerController getController(String filePath, String? networkUrl) {
  final file = File(filePath);
  if (file.existsSync()) {
    return VideoPlayerController.file(file);
  } else {
    final streamUrl = networkUrl ?? 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4';
    return VideoPlayerController.networkUrl(Uri.parse(streamUrl));
  }
}
