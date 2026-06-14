import 'dart:io';
import 'package:path_provider/path_provider.dart';
import 'package:path/path.dart' as p;

class StorageService {
  /// Gets the directory where downloads will be stored.
  Future<Directory> getDownloadDir() async {
    Directory? extDir;
    if (Platform.isAndroid) {
      extDir = await getExternalStorageDirectory(); // Android: /storage/emulated/0/Android/data/...
    } else {
      extDir = await getApplicationDocumentsDirectory(); // iOS: Documents directory
    }
    
    final downloadPath = p.join(extDir!.path, 'VidlordDownloads');
    final dir = Directory(downloadPath);
    if (!await dir.exists()) {
      await dir.create(recursive: true);
    }
    return dir;
  }

  /// Deletes a file at the given path.
  Future<bool> deleteFile(String path) async {
    try {
      final file = File(path);
      if (await file.exists()) {
        await file.delete();
        return true;
      }
      return false;
    } catch (e) {
      return false;
    }
  }

  /// Renames a file at the given path to a new display name.
  Future<String?> renameFile(String oldPath, String newName) async {
    try {
      final oldFile = File(oldPath);
      if (!await oldFile.exists()) return null;

      final directory = oldFile.parent.path;
      final extension = p.extension(oldPath);
      
      // Clean name from special chars
      final sanitizedName = newName.replaceAll(RegExp(r'[<>:"/\\|?*]'), '');
      final newPath = p.join(directory, '$sanitizedName$extension');

      final newFile = await oldFile.rename(newPath);
      return newFile.path;
    } catch (e) {
      return null;
    }
  }

  /// Check if file exists.
  Future<bool> fileExists(String path) async {
    if (path.isEmpty) return false;
    return await File(path).exists();
  }
}
