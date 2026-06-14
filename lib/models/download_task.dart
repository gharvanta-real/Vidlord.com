import 'video_info.dart';
import 'video_format.dart';

enum DownloadStatus {
  queued,
  downloading,
  paused,
  completed,
  failed,
}

class DownloadTask {
  final String id;
  final VideoInfo videoInfo;
  final VideoFormat format;
  double progress; // 0.0 to 1.0
  double speedMbMs; // Download speed in MB/s
  String localFilePath;
  DownloadStatus status;
  DateTime timestamp;

  DownloadTask({
    required this.id,
    required this.videoInfo,
    required this.format,
    this.progress = 0.0,
    this.speedMbMs = 0.0,
    this.localFilePath = '',
    this.status = DownloadStatus.queued,
    DateTime? timestamp,
  }) : timestamp = timestamp ?? DateTime.now();

  double get downloadedSize => format.sizeMb * progress;

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'videoInfo': videoInfo.toJson(),
      'format': format.toJson(),
      'progress': progress,
      'speedMbMs': speedMbMs,
      'localFilePath': localFilePath,
      'status': status.index,
      'timestamp': timestamp.toIso8601String(),
    };
  }

  factory DownloadTask.fromJson(Map<String, dynamic> json) {
    return DownloadTask(
      id: json['id'],
      videoInfo: VideoInfo.fromJson(json['videoInfo']),
      format: VideoFormat.fromJson(json['format']),
      progress: (json['progress'] as num).toDouble(),
      speedMbMs: (json['speedMbMs'] as num).toDouble(),
      localFilePath: json['localFilePath'] ?? '',
      status: DownloadStatus.values[json['status'] ?? 0],
      timestamp: DateTime.parse(json['timestamp']),
    );
  }
}
