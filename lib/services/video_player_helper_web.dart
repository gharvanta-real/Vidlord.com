import 'package:video_player/video_player.dart';

VideoPlayerController getController(String filePath, String? networkUrl) {
  final streamUrl = networkUrl ?? 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4';
  return VideoPlayerController.networkUrl(Uri.parse(streamUrl));
}
