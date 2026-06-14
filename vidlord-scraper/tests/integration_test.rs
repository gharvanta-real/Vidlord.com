use vidlord_scraper::extractor::youtube::YoutubeExtractor;

#[test]
fn test_youtube_id_extraction() {
    let extractor = YoutubeExtractor::new();
    
    let urls = vec![
        ("https://www.youtube.com/watch?v=dQw4w9WgXcQ", Some("dQw4w9WgXcQ")),
        ("https://youtu.be/dQw4w9WgXcQ?si=abcdef", Some("dQw4w9WgXcQ")),
        ("www.youtube.com/watch?v=dQw4w9WgXcQ", Some("dQw4w9WgXcQ")),
        ("https://youtube.com/embed/dQw4w9WgXcQ", Some("dQw4w9WgXcQ")),
        ("https://invalid-url.com", None),
    ];

    for (url, expected) in urls {
        let extracted = extractor.extract_youtube_id(url);
        assert_eq!(extracted.as_deref(), expected);
    }
}
