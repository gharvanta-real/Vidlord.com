import '../models/download_task.dart';

Future<void> executePlatformDownload(
  DownloadTask task,
  Map<String, bool> activeCancelTokens,
  Function() notifyListeners,
) {
  throw UnsupportedError('Platform not supported');
}

Future<void> deletePlatformFile(String path) {
  throw UnsupportedError('Platform not supported');
}
