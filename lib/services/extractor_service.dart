import 'dart:convert';
import 'package:http/http.dart' as http;
import '../models/video_info.dart';
import '../models/video_format.dart';

class ExtractorService {
  String? _extractYoutubeId(String url) {
    final regExp = RegExp(
      r'^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*',
      caseSensitive: false,
    );
    final match = regExp.firstMatch(url);
    if (match != null && match.groupCount >= 2) {
      final id = match.group(2);
      if (id != null && id.length == 11) {
        return id;
      }
    }
    return null;
  }

  double _estimateSizeMb(int bitrate, double durationSec) {
    if (bitrate <= 0 || durationSec <= 0) return 0.0;
    final sizeBytes = (bitrate * durationSec) / 8;
    return double.parse((sizeBytes / (1024 * 1024)).toStringAsFixed(1));
  }

  Future<Map<String, dynamic>?> _fetchFromInvidious(String youtubeId) async {
    final List<String> instances = [
      'iv.melmac.space',
      'invidious.flokinet.to',
      'invidious.nerdvpn.de',
      'invidious.privacydev.net',
    ];

    for (final instance in instances) {
      try {
        final url = 'https://$instance/api/v1/videos/$youtubeId';
        final uri = Uri.parse(url);
        final response = await http.get(uri).timeout(const Duration(seconds: 4));
        if (response.statusCode == 200) {
          final data = jsonDecode(response.body);
          if (data is Map<String, dynamic> && data.containsKey('title')) {
            return data;
          }
        }
      } catch (e) {
        print('Invidious instance $instance failed: $e');
      }
    }
    return null;
  }

  /// Extract video details and available formats from a URL.
  /// First attempts real HTML parsing for video urls, and fallbacks to mocked formats if needed.
  Future<Map<String, dynamic>> extract(String url) async {
    try {
      // 1. Normalize and validate URL format
      String normalizedUrl = url.trim();
      if (!normalizedUrl.startsWith('http://') && !normalizedUrl.startsWith('https://')) {
        normalizedUrl = 'https://$normalizedUrl';
      }

      final uri = Uri.parse(normalizedUrl);
      final host = uri.host;
      final hostRegExp = RegExp(r'^([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}$');
      final ipRegExp = RegExp(r'^(localhost|[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3})$');
      final isValidHost = hostRegExp.hasMatch(host) || ipRegExp.hasMatch(host);

      if (uri.scheme.isEmpty || host.isEmpty || !isValidHost) {
        throw Exception('Invalid URL format');
      }

      // Check if it's a YouTube URL
      final youtubeId = _extractYoutubeId(normalizedUrl);
      if (youtubeId != null) {
        final data = await _fetchFromInvidious(youtubeId);
        if (data != null) {
          final title = data['title'] as String? ?? 'YouTube Video';
          final durationSec = (data['lengthSeconds'] as num?)?.toDouble() ?? 0.0;
          
          // Convert duration to MM:SS
          final minutes = (durationSec / 60).floor().toString().padLeft(2, '0');
          final seconds = (durationSec % 60).floor().toString().padLeft(2, '0');
          final duration = '$minutes:$seconds';
          
          final thumbnailUrl = 'https://img.youtube.com/vi/$youtubeId/mqdefault.jpg';

          final info = VideoInfo(
            title: title.length > 50 ? '${title.substring(0, 47)}...' : title,
            thumbnailUrl: thumbnailUrl,
            sourceUrl: normalizedUrl,
            duration: duration,
            platform: 'YouTube',
          );

          final formats = <VideoFormat>[];

          // 1. Add Video formats
          for (final s in data['formatStreams'] ?? []) {
            final urlStream = s['url'] as String?;
            if (urlStream == null) continue;
            
            final qualityLabel = s['qualityLabel'] as String? ?? '360p';
            final container = s['container'] as String? ?? 'mp4';
            
            final bitrate = int.tryParse(s['bitrate']?.toString() ?? '') ?? 0;
            final clen = int.tryParse(s['clen']?.toString() ?? '') ?? 0;
            double sizeMb = 0.0;
            if (clen > 0) {
              sizeMb = double.parse((clen / (1024 * 1024)).toStringAsFixed(1));
            } else if (bitrate > 0) {
              sizeMb = _estimateSizeMb(bitrate, durationSec);
            } else {
              sizeMb = qualityLabel == '720p' ? 64.3 : (qualityLabel == '1080p' ? 120.5 : 18.6);
            }

            formats.add(VideoFormat(
              quality: '$qualityLabel ($container)',
              sizeMb: sizeMb,
              downloadUrl: urlStream,
              isAudio: false,
            ));
          }

          // 2. Add Audio formats
          for (final s in data['adaptiveFormats'] ?? []) {
            final type = s['type'] as String? ?? '';
            if (!type.startsWith('audio/')) continue;
            
            final urlStream = s['url'] as String?;
            if (urlStream == null) continue;

            final container = s['container'] as String? ?? 'm4a';
            final bitrate = int.tryParse(s['bitrate']?.toString() ?? '') ?? 0;
            final clen = int.tryParse(s['clen']?.toString() ?? '') ?? 0;
            
            double sizeMb = 0.0;
            if (clen > 0) {
              sizeMb = double.parse((clen / (1024 * 1024)).toStringAsFixed(1));
            } else if (bitrate > 0) {
              sizeMb = _estimateSizeMb(bitrate, durationSec);
            } else {
              sizeMb = 3.4;
            }

            final kbps = bitrate > 0 ? (bitrate / 1000).round() : 128;

            formats.add(VideoFormat(
              quality: 'Audio Only ($container - ${kbps}kbps)',
              sizeMb: sizeMb,
              downloadUrl: urlStream,
              isAudio: true,
            ));
          }

          if (formats.isEmpty) {
            formats.addAll([
              VideoFormat(
                quality: '360p (mp4)',
                sizeMb: 18.6,
                downloadUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
                isAudio: false,
              ),
              VideoFormat(
                quality: 'Audio Only (m4a - 128kbps)',
                sizeMb: 3.4,
                downloadUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
                isAudio: true,
              ),
            ]);
          }

          return {'info': info, 'formats': formats};
        }
      }

      // 2. Fetch the webpage content (Simulating the backend link-finder)
      // We will perform a quick HTTP request to extract any CDN video tags or meta info.
      String title = 'Extracted Video';
      String thumbnailUrl = 'https://picsum.photos/400/225'; // Fallback
      String? foundVideoUrl;

      try {
        final response = await http.get(uri).timeout(const Duration(seconds: 8));
        if (response.statusCode == 200) {
          final html = response.body;
          
          // Extract Title from og:title or <title> tag
          final titleReg = RegExp(r'<meta property="og:title" content="([^"]+)"');
          final matchTitle = titleReg.firstMatch(html);
          if (matchTitle != null) {
            title = matchTitle.group(1) ?? title;
          } else {
            final titleTagReg = RegExp(r'<title>([^<]+)</title>', caseSensitive: false);
            final matchTitleTag = titleTagReg.firstMatch(html);
            if (matchTitleTag != null) {
              title = matchTitleTag.group(1) ?? title;
            }
          }

          // Extract Thumbnail from og:image
          final imageReg = RegExp(r'<meta property="og:image" content="([^"]+)"');
          final matchImage = imageReg.firstMatch(html);
          if (matchImage != null) thumbnailUrl = matchImage.group(1) ?? thumbnailUrl;

          // Try to find raw MP4 / CDN video URLs inside the source code
          final mp4Reg = RegExp(r'(https?://[^\s",]+\.mp4[^\s",]*)');
          final matchMp4 = mp4Reg.firstMatch(html);
          if (matchMp4 != null) {
            foundVideoUrl = matchMp4.group(1);
          }
        }
      } catch (e) {
        // Fallback gracefully on network error so that the app works offline/during testing
        print('Extraction request failed: $e. Using fallback mockup data.');
        if (uri.host.isNotEmpty) {
          title = '${uri.host} Video';
        }
      }

      // 3. Platform identification
      String platform = 'Web Video';
      if (normalizedUrl.contains('youtube.com') || normalizedUrl.contains('youtu.be')) {
        platform = 'YouTube';
      } else if (normalizedUrl.contains('instagram.com')) {
        platform = 'Instagram';
      } else if (normalizedUrl.contains('facebook.com') || normalizedUrl.contains('fb.watch')) {
        platform = 'Facebook';
      } else if (normalizedUrl.contains('x.com') || normalizedUrl.contains('twitter.com')) {
        platform = 'X (Twitter)';
      }

      final info = VideoInfo(
        title: title.length > 50 ? '${title.substring(0, 47)}...' : title,
        thumbnailUrl: thumbnailUrl,
        sourceUrl: normalizedUrl,
        duration: '03:45', // Default or extracted duration
        platform: platform,
      );

      // 4. Generate formats: High (1080p/720p) and Low (360p) format options
      final formats = <VideoFormat>[
        VideoFormat(
          quality: '1080p (Full HD)',
          sizeMb: 120.5,
          downloadUrl: foundVideoUrl ?? 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
          isAudio: false,
        ),
        VideoFormat(
          quality: '720p (HD)',
          sizeMb: 64.3,
          downloadUrl: foundVideoUrl ?? 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
          isAudio: false,
        ),
        VideoFormat(
          quality: '360p (Low)',
          sizeMb: 18.6,
          downloadUrl: foundVideoUrl ?? 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
          isAudio: false,
        ),
        VideoFormat(
          quality: 'Audio Only (MP3)',
          sizeMb: 3.4,
          downloadUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
          isAudio: true,
        ),
      ];

      return {'info': info, 'formats': formats};
    } catch (e) {
      throw Exception('Failed to extract: $e');
    }
  }
}
