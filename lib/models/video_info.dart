class VideoInfo {
  final String title;
  final String thumbnailUrl;
  final String sourceUrl;
  final String duration;
  final String platform;

  VideoInfo({
    required this.title,
    required this.thumbnailUrl,
    required this.sourceUrl,
    required this.duration,
    required this.platform,
  });

  factory VideoInfo.fromJson(Map<String, dynamic> json) {
    return VideoInfo(
      title: json['title'] ?? '',
      thumbnailUrl: json['thumbnailUrl'] ?? '',
      sourceUrl: json['sourceUrl'] ?? '',
      duration: json['duration'] ?? '0:00',
      platform: json['platform'] ?? 'Unknown',
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'title': title,
      'thumbnailUrl': thumbnailUrl,
      'sourceUrl': sourceUrl,
      'duration': duration,
      'platform': platform,
    };
  }
}
