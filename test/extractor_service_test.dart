import 'package:flutter_test/flutter_test.dart';
import 'package:vidlord/services/extractor_service.dart';

void main() {
  group('ExtractorService Tests', () {
    late ExtractorService extractor;

    setUp(() {
      extractor = ExtractorService();
    });

    test('should extract info and formats from a valid URL with scheme', () async {
      // Use an offline fallback or valid address. Even if offline, it should recover gracefully and return the mock data.
      final result = await extractor.extract('https://youtube.com');
      
      expect(result, isNotNull);
      expect(result['info'], isNotNull);
      expect(result['formats'], isNotEmpty);
      expect(result['info'].platform, equals('YouTube'));
    });

    test('should normalize URL without scheme and extract successfully', () async {
      final result = await extractor.extract('www.youtube.com/watch?v=dQw4w9WgXcQ');
      
      expect(result, isNotNull);
      expect(result['info'], isNotNull);
      expect(result['formats'], isNotEmpty);
      expect(result['info'].platform, equals('YouTube'));
      expect(result['info'].sourceUrl, equals('https://www.youtube.com/watch?v=dQw4w9WgXcQ'));
    });

    test('should throw an exception for invalid URL format', () async {
      expect(
        () async => await extractor.extract('hello'),
        throwsA(isA<Exception>()),
      );
    });

    test('should gracefully handle network failure and return mock details', () async {
      // A host that does not exist
      final result = await extractor.extract('https://this-does-not-exist-at-all-1234567.com/video.mp4');
      
      expect(result, isNotNull);
      expect(result['info'], isNotNull);
      expect(result['info'].title, equals('this-does-not-exist-at-all-1234567.com Video'));
      expect(result['formats'], isNotEmpty);
    });
  });
}
