import 'package:flutter_test/flutter_test.dart';
import 'package:vidlord/models/video_info.dart';
import 'package:vidlord/models/video_format.dart';
import 'package:vidlord/models/download_task.dart';

void main() {
  group('Model Serialization Tests', () {
    test('VideoInfo serialization and deserialization', () {
      final info = VideoInfo(
        title: 'Test Title',
        thumbnailUrl: 'https://thumbnail.url',
        sourceUrl: 'https://source.url',
        duration: '02:30',
        platform: 'TestPlatform',
      );

      final json = info.toJson();
      expect(json['title'], 'Test Title');
      expect(json['thumbnailUrl'], 'https://thumbnail.url');
      expect(json['sourceUrl'], 'https://source.url');
      expect(json['duration'], '02:30');
      expect(json['platform'], 'TestPlatform');

      final parsed = VideoInfo.fromJson(json);
      expect(parsed.title, 'Test Title');
      expect(parsed.thumbnailUrl, 'https://thumbnail.url');
      expect(parsed.sourceUrl, 'https://source.url');
      expect(parsed.duration, '02:30');
      expect(parsed.platform, 'TestPlatform');
    });

    test('VideoFormat serialization and deserialization', () {
      final format = VideoFormat(
        quality: '1080p',
        sizeMb: 50.5,
        downloadUrl: 'https://download.url',
        isAudio: false,
      );

      final json = format.toJson();
      expect(json['quality'], '1080p');
      expect(json['sizeMb'], 50.5);
      expect(json['downloadUrl'], 'https://download.url');
      expect(json['isAudio'], false);

      final parsed = VideoFormat.fromJson(json);
      expect(parsed.quality, '1080p');
      expect(parsed.sizeMb, 50.5);
      expect(parsed.downloadUrl, 'https://download.url');
      expect(parsed.isAudio, false);
    });

    test('DownloadTask serialization and deserialization', () {
      final info = VideoInfo(
        title: 'Test Title',
        thumbnailUrl: 'https://thumbnail.url',
        sourceUrl: 'https://source.url',
        duration: '02:30',
        platform: 'TestPlatform',
      );
      final format = VideoFormat(
        quality: '1080p',
        sizeMb: 50.5,
        downloadUrl: 'https://download.url',
        isAudio: false,
      );
      final task = DownloadTask(
        id: '12345',
        videoInfo: info,
        format: format,
        progress: 0.5,
        speedMbMs: 1.2,
        localFilePath: '/local/path',
        status: DownloadStatus.downloading,
      );

      final json = task.toJson();
      expect(json['id'], '12345');
      expect(json['progress'], 0.5);
      expect(json['speedMbMs'], 1.2);
      expect(json['localFilePath'], '/local/path');
      expect(json['status'], DownloadStatus.downloading.index);

      final parsed = DownloadTask.fromJson(json);
      expect(parsed.id, '12345');
      expect(parsed.progress, 0.5);
      expect(parsed.speedMbMs, 1.2);
      expect(parsed.localFilePath, '/local/path');
      expect(parsed.status, DownloadStatus.downloading);
      expect(parsed.downloadedSize, 25.25);
    });
  });
}
