import 'dart:io';
import 'dart:async';
import 'package:http/http.dart' as http;
import '../models/download_task.dart';

Future<void> executePlatformDownload(
  DownloadTask task,
  Map<String, bool> activeCancelTokens,
  Function() notifyListeners,
) async {
  final client = http.Client();
  try {
    final request = http.Request('GET', Uri.parse(task.format.downloadUrl));
    final response = await client.send(request);
    final totalBytes = response.contentLength ?? (task.format.sizeMb * 1024 * 1024).toInt();
    final file = File(task.localFilePath);
    final sink = file.openWrite();

    int downloadedBytes = 0;
    final startTime = DateTime.now();
    
    await for (var chunk in response.stream) {
      if (activeCancelTokens[task.id] == true) {
        await sink.close();
        await file.delete();
        task.status = DownloadStatus.failed;
        notifyListeners();
        return;
      }

      sink.add(chunk);
      downloadedBytes += chunk.length;
      
      final elapsedMs = DateTime.now().difference(startTime).inMilliseconds;
      task.progress = downloadedBytes / totalBytes;
      task.speedMbMs = elapsedMs > 0 ? (downloadedBytes / (1024 * 1024)) / (elapsedMs / 1000) : 0.0;
      
      notifyListeners();
    }

    await sink.close();
    task.status = DownloadStatus.completed;
    task.progress = 1.0;
    task.speedMbMs = 0.0;
    notifyListeners();
  } catch (e) {
    task.status = DownloadStatus.failed;
    notifyListeners();
  } finally {
    client.close();
    activeCancelTokens.remove(task.id);
  }
}

Future<void> deletePlatformFile(String path) async {
  try {
    final file = File(path);
    if (await file.exists()) {
      await file.delete();
    }
  } catch (e) {
    print('Failed to delete file: $e');
  }
}
