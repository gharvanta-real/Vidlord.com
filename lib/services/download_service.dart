import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:path/path.dart' as p;
import '../models/download_task.dart';
import '../models/video_format.dart';
import '../models/video_info.dart';
import 'storage_service.dart';
import 'download_helper.dart';

class DownloadService extends ChangeNotifier {
  final StorageService _storageService = StorageService();
  final List<DownloadTask> _tasks = [];
  final Map<String, bool> _activeCancelTokens = {}; // taskID -> cancel status

  List<DownloadTask> get tasks => _tasks;
  List<DownloadTask> get activeTasks => _tasks.where((t) => t.status == DownloadStatus.downloading).toList();
  List<DownloadTask> get completedTasks => _tasks.where((t) => t.status == DownloadStatus.completed).toList();

  Future<void> startDownload(VideoInfo info, VideoFormat format) async {
    final taskId = DateTime.now().millisecondsSinceEpoch.toString();
    final ext = format.isAudio ? '.mp3' : '.mp4';
    final sanitizedTitle = info.title.replaceAll(RegExp(r'[<>:"/\\|?*]'), '');

    String localPath;
    if (kIsWeb) {
      localPath = 'virtual_downloads/$sanitizedTitle-$taskId$ext';
    } else {
      final dir = await _storageService.getDownloadDir();
      localPath = p.join(dir.path, '$sanitizedTitle-$taskId$ext');
    }

    final task = DownloadTask(
      id: taskId,
      videoInfo: info,
      format: format,
      localFilePath: localPath,
      status: DownloadStatus.downloading,
    );
    _tasks.insert(0, task);
    _activeCancelTokens[taskId] = false;
    notifyListeners();

    // Start downloading in background
    _executeDownload(task);
  }

  Future<void> _executeDownload(DownloadTask task) async {
    await executePlatformDownload(task, _activeCancelTokens, notifyListeners);
  }

  void cancelDownload(String taskId) {
    if (_activeCancelTokens.containsKey(taskId)) {
      _activeCancelTokens[taskId] = true;
    }
  }

  void removeTask(DownloadTask task) {
    cancelDownload(task.id);
    deletePlatformFile(task.localFilePath);
    _tasks.removeWhere((t) => t.id == task.id);
    notifyListeners();
  }
}
