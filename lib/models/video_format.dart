class VideoFormat {
  final String quality; // e.g. "1080p (Full HD)", "720p (HD)", "Audio (MP3)"
  final double sizeMb; // e.g. 120.5
  final String downloadUrl;
  final bool isAudio;

  VideoFormat({
    required this.quality,
    required this.sizeMb,
    required this.downloadUrl,
    required this.isAudio,
  });

  factory VideoFormat.fromJson(Map<String, dynamic> json) {
    return VideoFormat(
      quality: json['quality'] ?? '',
      sizeMb: (json['sizeMb'] as num?)?.toDouble() ?? 0.0,
      downloadUrl: json['downloadUrl'] ?? '',
      isAudio: json['isAudio'] ?? false,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'quality': quality,
      'sizeMb': sizeMb,
      'downloadUrl': downloadUrl,
      'isAudio': isAudio,
    };
  }
}
