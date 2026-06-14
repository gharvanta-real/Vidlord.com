import 'dart:async';
import '../models/download_task.dart';

Future<void> executePlatformDownload(
  DownloadTask task,
  Map<String, bool> activeCancelTokens,
  Function() notifyListeners,
) async {
  try {
    double currentProgress = 0.0;
    final totalSize = task.format.sizeMb;
    final startTime = DateTime.now();

    while (currentProgress < 1.0) {
      if (activeCancelTokens[task.id] == true) {
        task.status = DownloadStatus.failed;
        notifyListeners();
        return;
      }

      await Future.delayed(const Duration(milliseconds: 150));
      currentProgress += 0.05;
      if (currentProgress > 1.0) currentProgress = 1.0;

      final elapsedMs = DateTime.now().difference(startTime).inMilliseconds;
      task.progress = currentProgress;
      task.speedMbMs = elapsedMs > 0 ? (totalSize * currentProgress) / (elapsedMs / 1000) : 0.0;

      notifyListeners();
    }

    task.status = DownloadStatus.completed;
    task.progress = 1.0;
    task.speedMbMs = 0.0;
    notifyListeners();
  } catch (e) {
    task.status = DownloadStatus.failed;
    notifyListeners();
  } finally {
    activeCancelTokens.remove(task.id);
  }
}

Future<void> deletePlatformFile(String path) async {
  // No-op on web
}
