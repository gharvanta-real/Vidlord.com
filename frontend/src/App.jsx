import React, { useState, useEffect, useRef } from "react";
import Navbar from "./components/Navbar";
import DownloadInput from "./components/DownloadInput";
import MetadataView from "./components/MetadataView";
import ProgressView from "./components/ProgressView";
import Footer from "./components/Footer";
import DocModal from "./components/DocModal";
import SponsorCard from "./components/SponsorCard";
import MetadataSkeleton from "./components/MetadataSkeleton";
import BottomNav from "./components/BottomNav";
import HistoryView from "./components/HistoryView";
import "./App.css";
import AdminLayout from "./admin/AdminLayout";
import { downloadHlsStream, downloadAndMuxHlsStream } from "./services/hls/hlsService";

const API_BASE = import.meta.env.DEV 
  ? `http://${window.location.hostname}:8080` 
  : "";

const saveToHistory = (info, format, customTitle) => {
  try {
    const historyJSON = localStorage.getItem("vidlord_history") || "[]";
    const history = JSON.parse(historyJSON);
    
    const originalUrl = info.source_url;
    const filtered = history.filter(item => item.originalUrl !== originalUrl);
    
    const newItem = {
      id: Date.now() + "_" + Math.floor(Math.random() * 1000),
      title: customTitle || info.title,
      originalUrl: originalUrl,
      platform: info.platform,
      thumbnail: info.thumbnail_url || "",
      quality: format.quality || "HD",
      isAudio: format.is_audio || false,
      timestamp: Date.now()
    };
    
    const nextHistory = [newItem, ...filtered].slice(0, 20);
    localStorage.setItem("vidlord_history", JSON.stringify(nextHistory));
  } catch (e) {
    console.error("Failed to save download history", e);
  }
};

const PLATFORM_CONFIGS = {
  "/": {
    id: "generic",
    title: "Universal Video Downloader",
    subtitle: "Download high-quality video and audio streams from YouTube and other platforms instantly",
    placeholder: "Paste video URL here...",
    metaTitle: "Vidlord | Universal High-Speed Video Downloader",
    metaDesc: "Download high-speed video and audio streams from YouTube, Instagram, Vimeo, and more. Free, fast, and secure.",
    steps: [
      { num: "01", title: "Paste Link", desc: "Copy the video URL and paste it into the field above.", iconType: "link" },
      { num: "02", title: "Choose Format", desc: "Select your target quality (e.g. 1080p HD, 720p, or M4A Audio).", iconType: "format" },
      { num: "03", title: "Save File", desc: "Click save to download the file directly to your device.", iconType: "download" }
    ],
    faqs: [
      {
        question: "How do I download videos from YouTube, Instagram, or TikTok?",
        answer: "Simply copy the link to the video, paste it in the search input above, click Download, select your desired resolution/format, and click Save to Device."
      },
      {
        question: "Can I save high-definition (1080p, 2K, 4K) videos with audio?",
        answer: "Yes! Some platforms separate HD video and audio streams. Vidlord fetches both streams and muxes them losslessly on the server using FFmpeg, giving you full HD with sound."
      },
      {
        question: "Is Vidlord free and safe to use?",
        answer: "Absolutely. Vidlord is 100% free, has no bandwidth caps, requires no user registration, and doesn't store tracking cookies on your device."
      }
    ]
  },
  "/youtube-downloader": {
    id: "youtube",
    title: "YouTube Video Downloader",
    subtitle: "Download YouTube videos in high quality MP4 formats instantly",
    placeholder: "Paste YouTube video URL here...",
    metaTitle: "YouTube Video Downloader - Download YouTube Videos in HD | Vidlord",
    metaDesc: "Download YouTube videos in high quality MP4. Fast, free, and anonymous YouTube downloader.",
    steps: [
      { num: "01", title: "Copy YouTube Link", desc: "Open the YouTube video and copy the address bar link or share URL.", iconType: "link" },
      { num: "02", title: "Select Quality", desc: "Choose your preferred video resolution, like 1080p Full HD or 720p.", iconType: "format" },
      { num: "03", title: "Download MP4", desc: "Click save to trigger the download directly onto your local storage.", iconType: "download" }
    ],
    faqs: [
      {
        question: "How do I download YouTube videos in 1080p with audio?",
        answer: "Select the format labeled 'HD Muxed'. This triggers server-side merging of the HD video track and high-quality audio track using FFmpeg."
      },
      {
        question: "Does Vidlord support downloading YouTube Shorts?",
        answer: "Yes! Copy the link to any YouTube Short, paste it above, and download it instantly in MP4 format."
      },
      {
        question: "Why does the video extraction fail sometimes?",
        answer: "YouTube occasionally updates its encryption layers. If extraction fails, wait a few seconds and try again, or check if the video is private or region-blocked."
      }
    ]
  },
  "/youtube-to-mp3": {
    id: "youtube-to-mp3",
    title: "YouTube to MP3 Converter",
    subtitle: "Convert and download YouTube videos to high-quality MP3 audio files instantly",
    placeholder: "Paste YouTube video URL here to convert to MP3...",
    metaTitle: "YouTube to MP3 Converter - Free Audio Downloader | Vidlord",
    metaDesc: "Convert and download YouTube videos to high-quality MP3 audio files. Fast and free YouTube to MP3 converter.",
    steps: [
      { num: "01", title: "Copy YouTube Link", desc: "Copy the URL of the YouTube video you want to convert into MP3.", iconType: "link" },
      { num: "02", title: "Paste Above", desc: "Paste the link into the converter input field at the top of this page.", iconType: "format" },
      { num: "03", title: "Save MP3 Audio", desc: "Click the download button and select the audio option to save your MP3.", iconType: "download" }
    ],
    faqs: [
      {
        question: "What is the maximum audio quality for YouTube to MP3 conversion?",
        answer: "Vidlord extracts the highest quality audio stream available from the source video (usually up to 256kbps/320kbps equivalent AAC/M4A/MP3) and packages it with zero quality loss."
      },
      {
        question: "Can I convert a full YouTube playlist to MP3?",
        answer: "Currently, you can convert videos one-by-one to ensure maximum processing speed and avoid server timeouts."
      },
      {
        question: "Does this work on mobile phones (Android / iOS)?",
        answer: "Yes. You can convert and download MP3 files directly on your Android phone or iOS (iPhone/iPad) using Safari or Chrome browsers."
      }
    ]
  },
  "/instagram-downloader": {
    id: "instagram",
    title: "Instagram Video Downloader",
    subtitle: "Download Instagram reels, videos, and IGTV posts in high quality instantly",
    placeholder: "Paste Instagram video/reel URL here...",
    metaTitle: "Instagram Video Downloader - Download Reels & Videos | Vidlord",
    metaDesc: "Download Instagram reels, videos, and stories in high quality. Fast, free, and secure Instagram downloader.",
    steps: [
      { num: "01", title: "Copy Instagram URL", desc: "Open the Reel or video on Instagram, tap the three dots or share icon, and copy link.", iconType: "link" },
      { num: "02", title: "Paste URL", desc: "Paste the link into the search box above to fetch video metadata.", iconType: "format" },
      { num: "03", title: "Download Reel", desc: "Click download to save the high-resolution watermark-free MP4 to your gallery.", iconType: "download" }
    ],
    faqs: [
      {
        question: "Can I download Instagram Reels without watermarks?",
        answer: "Yes! Instagram videos downloaded via Vidlord are saved in their original source quality without any added watermark."
      },
      {
        question: "Does the owner get notified if I download their Reel?",
        answer: "No. Vidlord fetches data anonymously directly from public APIs. The video creator will not receive any notification or view indicator."
      },
      {
        question: "Can I download videos from private Instagram accounts?",
        answer: "No. For security and privacy compliance, Vidlord only accesses public Instagram videos and Reels."
      }
    ]
  },
  "/tiktok-video-download": {
    id: "tiktok",
    title: "TikTok Video Downloader",
    subtitle: "Download TikTok videos without watermark in high quality instantly",
    placeholder: "Paste TikTok video URL here...",
    metaTitle: "TikTok Video Downloader - Download TikToks Without Watermark | Vidlord",
    metaDesc: "Download TikTok videos without watermark in high quality. Free and fast TikTok downloader.",
    steps: [
      { num: "01", title: "Copy TikTok Link", desc: "Open TikTok, tap the Share button on the video, and copy the link.", iconType: "link" },
      { num: "02", title: "Paste in Vidlord", desc: "Paste the TikTok link in the field above to extract the clean stream.", iconType: "format" },
      { num: "03", title: "Save Clean Video", desc: "Download the video without watermarks directly to your desktop or mobile.", iconType: "download" }
    ],
    faqs: [
      {
        question: "How do I download TikTok videos without watermarks?",
        answer: "Vidlord automatically scrapes the raw video stream from TikTok's CDN that doesn't contain the floating logo, giving you a clean video."
      },
      {
        question: "Does this support downloading TikTok slideshows or photos?",
        answer: "Yes! If a TikTok post contains images, Vidlord will fetch the individual high-resolution images or compile them into a slideshow format."
      },
      {
        question: "Can I download TikTok music tracks as MP3?",
        answer: "Yes. Paste the TikTok link and select the audio-only option from the formats list to download it."
      }
    ]
  },
  "/x-downloader": {
    id: "x",
    title: "X Video Downloader",
    subtitle: "Download videos and GIFs from X (Twitter) in high quality instantly",
    placeholder: "Paste X/Twitter video URL here...",
    metaTitle: "X / Twitter Video Downloader - Download X Videos | Vidlord",
    metaDesc: "Download videos and GIFs from X (Twitter) in high quality. Free, fast, and secure X video downloader.",
    steps: [
      { num: "01", title: "Copy Post URL", desc: "Click share on the X/Twitter post and copy the URL of the tweet.", iconType: "link" },
      { num: "02", title: "Paste Link", desc: "Paste the URL into the search box above to identify the media files.", iconType: "format" },
      { num: "03", title: "Save Video/GIF", desc: "Select the desired MP4 quality option and save it to your device.", iconType: "download" }
    ],
    faqs: [
      {
        question: "Can I download Twitter/X GIFs as MP4 files?",
        answer: "Yes! Twitter renders GIFs as looped video clips. Vidlord lets you download them as clean, shareable MP4 video files."
      },
      {
        question: "How do I choose video resolution for X videos?",
        answer: "Vidlord displays all available resolutions (e.g. 720p, 480p, 360p) provided by X for that specific post."
      },
      {
        question: "Is there any limit on downloading Twitter videos?",
        answer: "No. There are no daily limits or quotas. You can download as many videos as you want."
      }
    ]
  },
  "/facebook-downloader": {
    id: "facebook",
    title: "Facebook Video Downloader",
    subtitle: "Download Facebook videos in high quality MP4 formats instantly",
    placeholder: "Paste Facebook video URL here...",
    metaTitle: "Facebook Video Downloader - Download FB Videos | Vidlord",
    metaDesc: "Download Facebook videos in high quality MP4. Free, fast, and secure Facebook downloader.",
    steps: [
      { num: "01", title: "Copy FB Link", desc: "Open Facebook video or Reel, click Share, and click Copy Link.", iconType: "link" },
      { num: "02", title: "Analyze Link", desc: "Paste the link above to extract SD and HD formats from the video page.", iconType: "format" },
      { num: "03", title: "Download MP4", desc: "Choose HD or SD quality and save the Facebook video to your system.", iconType: "download" }
    ],
    faqs: [
      {
        question: "How do I download Facebook Reels and stories?",
        answer: "Simply copy the Reel or story link from your Facebook app, paste it above, and select download."
      },
      {
        question: "What is the difference between HD and SD options?",
        answer: "HD (High Definition) provides the best resolution (720p or 1080p) but has a larger file size, while SD (Standard Definition) is smaller and downloads faster."
      },
      {
        question: "Does Vidlord require a Facebook login?",
        answer: "No. You never need to enter your Facebook credentials or link your account."
      }
    ]
  },
  "/vimeo-downloader": {
    id: "vimeo",
    title: "Vimeo Video Downloader",
    subtitle: "Download Vimeo videos in high quality MP4 formats instantly",
    placeholder: "Paste Vimeo video URL here...",
    metaTitle: "Vimeo Video Downloader - Download Vimeo Videos | Vidlord",
    metaDesc: "Download Vimeo videos in high quality MP4. Free, fast, and secure Vimeo downloader.",
    steps: [
      { num: "01", title: "Copy Vimeo URL", desc: "Copy the Vimeo video page URL directly from your web browser address bar.", iconType: "link" },
      { num: "02", title: "Paste above", desc: "Paste the URL into the input field above to parse the quality files.", iconType: "format" },
      { num: "03", title: "Save Video", desc: "Select resolution (up to 4K if available) and download the MP4.", iconType: "download" }
    ],
    faqs: [
      {
        question: "Can I download Vimeo videos that have download disabled by the author?",
        answer: "Yes. Vidlord extracts the raw video stream from the video player source directly, bypassing author-restricted download blockades."
      },
      {
        question: "Does this support private or password-protected Vimeo videos?",
        answer: "No. Password-protected or private videos require session authentication. Vidlord only processes public videos."
      },
      {
        question: "What formats are available for Vimeo downloads?",
        answer: "Vimeo files are saved in standard MP4 formats, fully compatible with all players and editing software."
      }
    ]
  },
  "/missav-downloader": {
    id: "missav",
    title: "MissAV Video Downloader",
    subtitle: "Download MissAV Japanese Adult Videos (JAV) in HD quality instantly",
    placeholder: "Paste MissAV video link here...",
    metaTitle: "MissAV Video Downloader - Save MissAV JAV Videos HD | Vidlord",
    metaDesc: "Free online MissAV video downloader. Save Japanese adult videos from MissAV to your iPhone, Android, or PC in high quality MP4 instantly.",
    steps: [
      { num: "01", title: "Copy MissAV URL", desc: "Open the MissAV page and copy the URL from your browser address bar.", iconType: "link" },
      { num: "02", title: "Paste above", desc: "Paste the link into the search box above to parse the HLS segments.", iconType: "format" },
      { num: "03", title: "Save HD Video", desc: "Click download to stream and merge the video directly to your storage.", iconType: "download" }
    ],
    faqs: [
      {
        question: "How does the MissAV downloader work without crashes?",
        answer: "MissAV streams are segmented via HLS. Vidlord uses a client-side streaming write queue that writes chunks immediately to disk, preventing mobile memory crashes."
      },
      {
        question: "Can I download MissAV videos on iOS Safari?",
        answer: "Yes! Using our integrated StreamSaver service worker technology, iOS Safari downloads the file directly to your Files app instead of loading it in a tab."
      },
      {
        question: "Are MissAV downloads private and anonymous?",
        answer: "Absolutely. All traffic passes through browser-side fetches or encrypted backend proxy loops, and no download records are linked to your profile."
      }
    ]
  },
  "/javhd-downloader": {
    id: "javhd",
    title: "JAVHD Video Downloader",
    subtitle: "Convert and download JAVHD streaming videos for free online",
    placeholder: "Paste JAVHD video link here...",
    metaTitle: "JAVHD Video Downloader - Save Japanese Adult Videos Online | Vidlord",
    metaDesc: "Convert and download JAVHD videos to high quality MP4 online. Free, fast, and anonymous JAVHD downloader.",
    steps: [
      { num: "01", title: "Copy JAVHD Link", desc: "Copy the page link of the JAVHD video you wish to save.", iconType: "link" },
      { num: "02", title: "Analyze Link", desc: "Paste the link in the input box to parse the stream sources.", iconType: "format" },
      { num: "03", title: "Download MP4", desc: "Choose HD resolution and click save to download the video.", iconType: "download" }
    ],
    faqs: [
      {
        question: "Do I need a premium JAVHD account to use this?",
        answer: "No. Our downloader reads the public player manifest data, allowing you to download available video feeds completely free."
      },
      {
        question: "Is there any limit on JAVHD downloads?",
        answer: "No, Vidlord provides unlimited, high-speed JAVHD video downloads with no bandwidth limits."
      }
    ]
  },
  "/japanese-av-downloader": {
    id: "japanese-av",
    title: "Japanese AV Downloader",
    subtitle: "Download JAV videos and clips from major streaming platforms in HD quality",
    placeholder: "Paste JAV video URL here...",
    metaTitle: "Japanese AV Downloader - Save JAV Videos Free | Vidlord",
    metaDesc: "Download Japanese adult videos (JAV) from online platforms. Fast, free, and secure JAV video downloader tool.",
    steps: [
      { num: "01", title: "Copy JAV Link", desc: "Copy the JAV streaming link from any supported website.", iconType: "link" },
      { num: "02", title: "Paste URL", desc: "Paste it above to identify the video formats and download options.", iconType: "format" },
      { num: "03", title: "Save to Device", desc: "Select high quality MP4 and save the video instantly.", iconType: "download" }
    ],
    faqs: [
      {
        question: "What platforms are supported by the Japanese AV downloader?",
        answer: "We support major streaming portals including MissAV, JAVHD, Surrit, and general video hosting backends."
      },
      {
        question: "Are downloaded videos watermarked?",
        answer: "No, all videos are downloaded in their raw format without any branding or watermark."
      }
    ]
  },
  "/surrit-downloader": {
    id: "surrit",
    title: "Surrit Video Downloader",
    subtitle: "Save and mux Surrit HLS video streams in Full HD for free",
    placeholder: "Paste Surrit video link here...",
    metaTitle: "Surrit Video Downloader - Save Surrit Streams online | Vidlord",
    metaDesc: "Fast and secure online Surrit video downloader. Bypass player restrictions and save Surrit HLS playlists as clean MP4 videos.",
    steps: [
      { num: "01", title: "Copy Surrit Link", desc: "Copy the player page URL from the Surrit website.", iconType: "link" },
      { num: "02", title: "Extract Streams", desc: "Paste it above. Our backend will resolve headers and fetch the playlist structure.", iconType: "format" },
      { num: "03", title: "Save MP4 Video", desc: "Mux and download the completed MP4 video directly to your downloads.", iconType: "download" }
    ],
    faqs: [
      {
        question: "Why do Surrit downloads fail on normal downloaders?",
        answer: "Surrit uses restricted HLS streaming with referrer checks. Vidlord proxies segment requests to bypass authentication walls."
      },
      {
        question: "Is this tool safe for mobile devices?",
        answer: "Yes, our HLS parser processes files directly inside browser streaming pipelines, saving device memory."
      }
    ]
  },
  "/twitter-video-downloader": {
    id: "twitter-seo",
    title: "Twitter Video Downloader",
    subtitle: "Download X/Twitter videos and GIFs in HD quality instantly",
    placeholder: "Paste X/Twitter link here...",
    metaTitle: "Twitter Video Downloader - Save Twitter Videos & GIFs online | Vidlord",
    metaDesc: "Download X/Twitter videos and GIFs online in high quality. Free, fast, and secure Twitter video downloader.",
    steps: [
      { num: "01", title: "Copy Tweet Link", desc: "Tap the share button on the tweet and copy the link.", iconType: "link" },
      { num: "02", title: "Extract Media", desc: "Paste it above to identify the MP4 files or looped GIFs.", iconType: "format" },
      { num: "03", title: "Download", desc: "Select HD resolution and download the video to your gallery.", iconType: "download" }
    ],
    faqs: [
      {
        question: "How to save Twitter GIFs as MP4?",
        answer: "Twitter converts all GIFs to looped MP4 files. Vidlord allows you to download these loop files directly."
      }
    ]
  },
  "/reddit-video-downloader": {
    id: "reddit-seo",
    title: "Reddit Video Downloader",
    subtitle: "Download Reddit videos with audio in High Quality for free",
    placeholder: "Paste Reddit video URL here...",
    metaTitle: "Reddit Video Downloader - Save Reddit Videos with Audio | Vidlord",
    metaDesc: "Download Reddit videos with audio online in high quality. Fast, free, and secure Reddit downloader with voice tracks.",
    steps: [
      { num: "01", title: "Copy Reddit Link", desc: "Click Share on the Reddit post and copy the link.", iconType: "link" },
      { num: "02", title: "Mux Tracks", desc: "Paste the URL above. Our engine will read the DASH feed and merge audio+video tracks.", iconType: "format" },
      { num: "03", title: "Save Video", desc: "Download the complete multiplexed MP4 with sound.", iconType: "download" }
    ],
    faqs: [
      {
        question: "Why do some downloaded Reddit videos have no sound?",
        answer: "Reddit stores audio and video separately. Vidlord automatically merges the separate audio and video streams together so you get complete sound."
      }
    ]
  },
  "/tiktok-downloader": {
    id: "tiktok-seo",
    title: "TikTok Downloader",
    subtitle: "Download TikTok videos without watermark in HD quality online",
    placeholder: "Paste TikTok video link here...",
    metaTitle: "TikTok Downloader - Download TikToks Without Watermark | Vidlord",
    metaDesc: "Free online TikTok video downloader. Download TikTok videos without watermark in high quality MP4 instantly.",
    steps: [
      { num: "01", title: "Copy TikTok Link", desc: "Open TikTok, click Share, and click Copy Link.", iconType: "link" },
      { num: "02", title: "Extract Video", desc: "Paste the link above to retrieve the raw watermark-free source address.", iconType: "format" },
      { num: "03", title: "Save MP4", desc: "Save the clean video directly to your local file gallery.", iconType: "download" }
    ],
    faqs: [
      {
        question: "Is it legal to download TikTok videos without a watermark?",
        answer: "Yes, you can download public TikTok videos for personal, educational, or offline archive purposes."
      }
    ]
  }
};

export default function App() {
  const [theme, setTheme] = useState(() => localStorage.getItem("theme") || "dark");
  const [view, setView] = useState("input"); // 'input' | 'selector' | 'downloading'
  const [isLoading, setIsLoading] = useState(false);
  const [videoData, setVideoData] = useState(null); // { info, formats }
  
  const [clientConfig, setClientConfig] = useState({
    popunder_enabled: false,
    popunder_script: "",
    banner_enabled: false,
    banner_script: "",
    header_script: ""
  });

  useEffect(() => {
    fetch(`${API_BASE}/api/client/config`)
      .then((res) => {
        if (!res.ok) throw new Error("Client config response not ok");
        return res.json();
      })
      .then((data) => {
        setClientConfig(data);

        // 1. Inject header script
        let existingHeader = document.getElementById("vidlord-custom-header");
        if (existingHeader) existingHeader.remove();
        if (data.header_script) {
          const div = document.createElement("div");
          div.id = "vidlord-custom-header";
          div.style.display = "none";
          const range = document.createRange();
          const frag = range.createContextualFragment(data.header_script);
          div.appendChild(frag);
          document.head.appendChild(div);
        }

        // 2. Inject popunder script
        let existingPopunder = document.getElementById("vidlord-custom-popunder");
        if (existingPopunder) existingPopunder.remove();
        if (data.popunder_enabled && data.popunder_script) {
          const div = document.createElement("div");
          div.id = "vidlord-custom-popunder";
          div.style.display = "none";
          const range = document.createRange();
          const frag = range.createContextualFragment(data.popunder_script);
          div.appendChild(frag);
          document.body.appendChild(div);
        }
      })
      .catch((err) => console.error("Failed to load client config:", err));
  }, []);

  // PWA & Mobile Navigation
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [activeTab, setActiveTab] = useState("home");
  
  const [history, setHistory] = useState([]);
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedItems, setSelectedItems] = useState(new Set());
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    if (view !== "history") {
      setIsSelectMode(false);
      setSelectedItems(new Set());
      setIsMenuOpen(false);
    }
  }, [view]);

  const handleToggleSelectItem = (itemId) => {
    setSelectedItems(prev => {
      const next = new Set(prev);
      if (next.has(itemId)) {
        next.delete(itemId);
      } else {
        next.add(itemId);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedItems.size === history.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(history.map(item => item.id)));
    }
  };

  const handleDeleteSelected = () => {
    if (selectedItems.size === 0) return;
    const updated = history.filter(item => !selectedItems.has(item.id));
    localStorage.setItem("vidlord_history", JSON.stringify(updated));
    setHistory(updated);
    setSelectedItems(new Set());
    setIsSelectMode(false);
    setIsMenuOpen(false);
  };

  useEffect(() => {
    try {
      const saved = localStorage.getItem("vidlord_history") || "[]";
      setHistory(JSON.parse(saved));
    } catch (e) {
      console.error(e);
    }
  }, [view]);

  const handleClearHistory = () => {
    localStorage.removeItem("vidlord_history");
    setHistory([]);
  };

  const handleDeleteHistoryItem = (itemId) => {
    const updated = history.filter(item => item.id !== itemId);
    localStorage.setItem("vidlord_history", JSON.stringify(updated));
    setHistory(updated);
  };

  // Share-to-unlock viral model
  const [showShareModal, setShowShareModal] = useState(false);
  const [pendingDownloadArgs, setPendingDownloadArgs] = useState(null);

  const [downloadProgress, setDownloadProgress] = useState(null);
  const [downloadStatus, setDownloadStatus] = useState(""); // 'downloading' | 'muxing' | 'completed' | 'error'
  const [downloadUrl, setDownloadUrl] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [activeModal, setActiveModal] = useState(null); // 'privacy' | 'terms' | null
  const [extractionError, setExtractionError] = useState(""); // extraction error guide state
  const [activeAbortController, setActiveAbortController] = useState(null);
  const activeEventSource = useRef(null);

  const [currentPath, setCurrentPath] = useState(window.location.pathname);
  const [adCount, setAdCount] = useState(() => {
    const saved = sessionStorage.getItem("vidlord_ad_count");
    return saved ? parseInt(saved, 10) : 0;
  });

  const navigate = (path) => {
    if (path !== window.location.pathname) {
      window.history.pushState({}, "", path);
      setCurrentPath(path);
      
      // Page changes: Increment the ad counter
      setAdCount(prev => {
        const next = prev + 1;
        sessionStorage.setItem("vidlord_ad_count", next.toString());
        return next;
      });
    }
  };

  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname);
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    return () => window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
  }, []);

  const handleInstallPWA = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      console.log(`PWA installation outcome: ${outcome}`);
      setDeferredPrompt(null);
    }
  };

  useEffect(() => {
    const isAdminHost = window.location.hostname === "admin.vidlord.xyz";
    const isAdmin = currentPath.startsWith("/admin") || isAdminHost;
    if (isAdmin) {
      const normalizedPath = currentPath.replace(/^\/admin/, "");
      let adminSubTitle = "Admin Dashboard";
      if (normalizedPath === "/scrapers") adminSubTitle = "Scraper Health Room";
      else if (normalizedPath === "/monetization") adminSubTitle = "Ads & Sponsors";
      else if (normalizedPath === "/cache") adminSubTitle = "Cache & Storage";
      else if (normalizedPath === "/settings") adminSubTitle = "System Vault";
      
      document.title = `Vidlord - ${adminSubTitle}`;
      
      let scriptTag = document.getElementById("jsonld-schema");
      if (scriptTag) scriptTag.textContent = "";
      return;
    }

    const activeConfig = PLATFORM_CONFIGS[currentPath] || PLATFORM_CONFIGS["/"];
    document.title = activeConfig.metaTitle;
    
    let metaDesc = document.querySelector('meta[name="description"]');
    if (!metaDesc) {
      metaDesc = document.createElement("meta");
      metaDesc.setAttribute("name", "description");
      document.head.appendChild(metaDesc);
    }
    metaDesc.setAttribute("content", activeConfig.metaDesc);

    // Inject dynamic self-referential canonical tag
    let canonicalTag = document.querySelector('link[rel="canonical"]');
    if (!canonicalTag) {
      canonicalTag = document.createElement("link");
      canonicalTag.setAttribute("rel", "canonical");
      document.head.appendChild(canonicalTag);
    }
    canonicalTag.setAttribute("href", `https://vidlord.xyz${currentPath === '/' ? '' : currentPath}`);

    // Helper to inject/update social meta tags
    const setMetaTag = (property, content, attrName = "property") => {
      let tag = document.querySelector(`meta[${attrName}="${property}"]`);
      if (!tag) {
        tag = document.createElement("meta");
        tag.setAttribute(attrName, property);
        document.head.appendChild(tag);
      }
      tag.setAttribute("content", content);
    };

    // Open Graph (Facebook/WhatsApp/Telegram previews)
    setMetaTag("og:url", `https://vidlord.xyz${currentPath === '/' ? '' : currentPath}`);
    setMetaTag("og:title", activeConfig.metaTitle);
    setMetaTag("og:description", activeConfig.metaDesc);
    setMetaTag("og:type", "website");
    setMetaTag("og:image", "https://vidlord.xyz/logo-dark.png");

    // Twitter Card Previews
    setMetaTag("twitter:card", "summary", "name");
    setMetaTag("twitter:title", activeConfig.metaTitle, "name");
    setMetaTag("twitter:description", activeConfig.metaDesc, "name");
    setMetaTag("twitter:image", "https://vidlord.xyz/logo-dark.png", "name");

    // Inject dynamic JSON-LD structured schemas (SoftwareApplication, WebSite, FAQPage)
    let schemaData = {
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "SoftwareApplication",
          "@id": `https://vidlord.xyz${currentPath}#software`,
          "name": activeConfig.title,
          "url": `https://vidlord.xyz${currentPath}`,
          "operatingSystem": "Windows, macOS, iOS, Android, Linux",
          "applicationCategory": "DownloadApplication",
          "description": activeConfig.metaDesc,
          "offers": {
            "@type": "Offer",
            "price": "0.00",
            "priceCurrency": "USD"
          }
        },
        {
          "@type": "WebSite",
          "@id": "https://vidlord.xyz/#website",
          "name": "Vidlord",
          "url": "https://vidlord.xyz/",
          "description": "Universal High-Speed Video Downloader"
        },
        {
          "@type": "FAQPage",
          "@id": `https://vidlord.xyz${currentPath}#faq`,
          "mainEntity": activeConfig.faqs.map(faq => ({
            "@type": "Question",
            "name": faq.question,
            "acceptedAnswer": {
              "@type": "Answer",
              "text": faq.answer
            }
          }))
        }
      ]
    };

    let scriptTag = document.getElementById("jsonld-schema");
    if (!scriptTag) {
      scriptTag = document.createElement("script");
      scriptTag.id = "jsonld-schema";
      scriptTag.type = "application/ld+json";
      document.head.appendChild(scriptTag);
    }
    scriptTag.textContent = JSON.stringify(schemaData);

    // Also reset view back to input when path changes
    setView("input");
    setVideoData(null);
    setDownloadProgress(null);
    setDownloadStatus("");
    setDownloadUrl("");
    setErrorMsg("");
    setExtractionError("");
  }, [currentPath]);

  const handleNavigateHowTo = (e) => {
    if (e) e.preventDefault();
    if (window.location.pathname !== "/") {
      navigate("/");
      setTimeout(() => {
        document.getElementById("how-to")?.scrollIntoView({ behavior: "smooth" });
      }, 150);
    } else {
      setView("input");
      setExtractionError("");
      setTimeout(() => {
        document.getElementById("how-to")?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    }
  };

  const handleAdClick = (sponsor) => {
    if (sponsor && sponsor.badge) {
      fetch(`${API_BASE}/api/ads/click?sponsor=${encodeURIComponent(sponsor.badge)}`, { method: "POST" })
        .catch((err) => console.error("Failed to log ad click:", err));
    }
    setAdCount(prev => {
      const next = prev + 1;
      sessionStorage.setItem("vidlord_ad_count", next.toString());
      return next;
    });
  };

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("theme", theme);
  }, [theme]);

  const toggleTheme = () => setTheme(prev => (prev === "dark" ? "light" : "dark"));

  const handleExtract = async (url) => {
    setIsLoading(true);
    setExtractionError("");
    const controller = new AbortController();
    setActiveAbortController(controller);
    try {
      const response = await fetch(`${API_BASE}/api/extract`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
        signal: controller.signal,
      });
      if (!response.ok) {
        const errText = await response.text();
        throw new Error(errText || "Metadata extraction failed");
      }
      const data = await response.json();
      setVideoData(data);
      setView("selector");
    } catch (err) {
      if (err.name !== "AbortError") {
        setExtractionError(err.message);
      }
    } finally {
      setIsLoading(false);
      setActiveAbortController(null);
    }
  };

  const handleCancelExtract = () => {
    if (activeAbortController) {
      activeAbortController.abort();
    }
    setIsLoading(false);
    setView("input");
  };

  const executeDownload = async (format, customTitle) => {
    const uniqueId = Date.now() + "_" + Math.floor(Math.random() * 1000);
    const ext = format.is_audio ? "m4a" : "mp4";
    
    const safeTitle = (customTitle || "vidlord")
      .trim()
      .replace(/[^a-zA-Z0-9_\-]/g, "_")
      .substring(0, 50);

    const fileName = `${safeTitle}_${uniqueId}.${ext}`;

    const lowerDownloadUrl = format.download_url.toLowerCase();
    
    const isHls = lowerDownloadUrl.includes(".m3u8") || 
                  lowerDownloadUrl.includes("m3u8") || 
                  lowerDownloadUrl.includes(".txt") || 
                  lowerDownloadUrl.includes("master.txt") || 
                  lowerDownloadUrl.includes("index-v1-a1.txt") || 
                  lowerDownloadUrl.includes("hls3") || 
                  lowerDownloadUrl.includes("4flhlv") || 
                  lowerDownloadUrl.includes("surrit.com") || 
                  lowerDownloadUrl.includes("missav");

    const isDirect = !format.audio_download_url && !isHls;

    if (isDirect) {
      const directUrl = `${API_BASE}/api/download/direct?url=${encodeURIComponent(format.download_url)}&filename=${encodeURIComponent(fileName)}`;
      const link = document.createElement("a");
      link.href = directUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      handleReset();
      return;
    }

    setView("downloading");
    setDownloadStatus("downloading");
    setDownloadProgress(null);
    setErrorMsg("");

    // If it has separate video and audio streams but is NOT HLS (e.g. YouTube), download and merge on the server!
    if (format.audio_download_url && !isHls) {
      const outputPath = `./downloads/${fileName}`;
      let sseUrl = `${API_BASE}/api/download?url=${encodeURIComponent(format.download_url)}&output_path=${encodeURIComponent(outputPath)}`;
      sseUrl += `&audio_url=${encodeURIComponent(format.audio_download_url)}`;
      if (videoData && videoData.info && videoData.info.source_url) {
        sseUrl += `&video_page_url=${encodeURIComponent(videoData.info.source_url)}`;
      }
      if (format.quality) {
        sseUrl += `&quality=${encodeURIComponent(format.quality)}`;
      }
      if (format.is_audio !== undefined) {
        sseUrl += `&is_audio=${format.is_audio}`;
      }

      const eventSource = new EventSource(sseUrl);
      activeEventSource.current = eventSource;
      const startTime = Date.now();

      eventSource.onmessage = (event) => {
        const msg = JSON.parse(event.data);
        if (msg.status === "downloading") {
          setDownloadStatus("downloading");
          const elapsed = (Date.now() - startTime) / 1000;
          const speed = elapsed > 0.1 ? msg.current / elapsed : 0;
          const eta = speed > 0 ? (msg.total - msg.current) / speed : 0;

          setDownloadProgress({
            percentage: msg.percentage,
            current: msg.current,
            total: msg.total,
            speed,
            eta,
          });
        } else if (msg.status === "muxing") {
          setDownloadStatus("muxing");
        } else if (msg.status === "completed") {
          setDownloadStatus("completed");
          setDownloadUrl(`${API_BASE}/downloads/${fileName}`);
          activeEventSource.current = null;
          eventSource.close();
        } else if (msg.status === "error") {
          setDownloadStatus("error");
          setErrorMsg(msg.message || "Failed to download");
          activeEventSource.current = null;
          eventSource.close();
        }
      };

      eventSource.onerror = () => {
        setDownloadStatus("error");
        setErrorMsg("SSE stream connection lost.");
        activeEventSource.current = null;
        eventSource.close();
      };
      return;
    }

    // Otherwise, it is an HLS stream (download client-side)
    try {
      let finalBlobUrl = "";
      if (format.audio_download_url) {
        finalBlobUrl = await downloadAndMuxHlsStream(format.download_url, format.audio_download_url, {
          filename: fileName,
          onProgress: (status, percent, bytesDownloaded, bytesTotal) => {
            if (status === "loading_ffmpeg") {
              setDownloadStatus("downloading");
              setDownloadProgress({ percentage: 0, current: 0, total: 100, speed: 0, eta: 0 });
            } else if (status === "downloading_video") {
              setDownloadStatus("downloading");
              setDownloadProgress({
                percentage: Math.round(percent * 0.8),
                current: bytesDownloaded,
                total: bytesTotal,
                speed: 0,
                eta: 0
              });
            } else if (status === "downloading_audio") {
              setDownloadStatus("downloading");
              setDownloadProgress({
                percentage: 80 + Math.round(percent * 0.2),
                current: bytesDownloaded,
                total: bytesTotal,
                speed: 0,
                eta: 0
              });
            } else if (status === "muxing") {
              setDownloadStatus("muxing");
              setDownloadProgress({ percentage: 100, current: 0, total: 100, speed: 0, eta: 0 });
            }
          }
        });
      } else {
        finalBlobUrl = await downloadHlsStream(format.download_url, {
          filename: fileName,
          onProgress: (current, total, bytesDownloaded, bytesTotal) => {
            const percentage = total > 0 ? Math.round((current / total) * 100) : 0;
            setDownloadProgress({
              percentage,
              current: bytesDownloaded,
              total: bytesTotal,
              speed: 0,
              eta: 0
            });
          }
        });
      }
      setDownloadUrl(finalBlobUrl);
      setDownloadStatus("completed");
    } catch (err) {
      console.error("Client side HLS download failed:", err);
      setDownloadStatus("error");
      setErrorMsg(err.message || "Failed to download stream.");
    }
  };

  const handleSelectFormat = (format, customTitle) => {
    // Save to local download history
    if (videoData && videoData.info) {
      saveToHistory(videoData.info, format, customTitle);
    }

    executeDownload(format, customTitle);
  };

  const handleShareSuccess = () => {
    localStorage.setItem("vidlord_unlocked_hd", "true");
    setShowShareModal(false);
    if (pendingDownloadArgs) {
      const { format, customTitle } = pendingDownloadArgs;
      setPendingDownloadArgs(null);
      // Wait a brief moment to let focus return and start download
      setTimeout(() => {
        executeDownload(format, customTitle);
      }, 500);
    }
  };

  const handleReset = () => {
    if (activeEventSource.current) {
      activeEventSource.current.close();
      activeEventSource.current = null;
    }
    if (downloadUrl && downloadUrl.startsWith("blob:")) {
      URL.revokeObjectURL(downloadUrl);
    }
    setView("input");
    setVideoData(null);
    setDownloadProgress(null);
    setDownloadStatus("");
    setDownloadUrl("");
    setErrorMsg("");
  };

  const config = PLATFORM_CONFIGS[currentPath] || PLATFORM_CONFIGS["/"];

  const isAdminHost = window.location.hostname === "admin.vidlord.xyz";
  const isAdminPath = currentPath.startsWith("/admin") || isAdminHost;
  if (isAdminPath) {
    return (
      <AdminLayout
        theme={theme}
        toggleTheme={toggleTheme}
        currentPath={currentPath}
        navigate={navigate}
      />
    );
  }

  return (
    <>
      <Navbar 
        theme={theme} 
        toggleTheme={toggleTheme} 
        onOpenPrivacy={() => setActiveModal("privacy")}
        onOpenTerms={() => setActiveModal("terms")}
        onNavigateHowTo={handleNavigateHowTo}
        navigate={navigate}
        platform={config.id}
        view={view}
        onBack={handleReset}
        onOpenMenu={() => setIsMenuOpen(true)}
      />
      <div className="main-scroll-content">
        <main className="container">
          {isLoading && (
            <div className="view-active">
              <MetadataSkeleton onBack={handleCancelExtract} />
            </div>
          )}
          {!isLoading && view === "input" && (
            <div className="view-active">
              <DownloadInput 
                onExtract={handleExtract} 
                isLoading={isLoading} 
                error={extractionError}
                onClearError={() => setExtractionError("")}
                title={config.title}
                subtitle={config.subtitle}
                placeholder={config.placeholder}
                navigate={navigate}
                currentPath={currentPath}
                adCount={adCount}
                onAdClick={handleAdClick}
                steps={config.steps}
                faqs={config.faqs}
                bannerEnabled={clientConfig.banner_enabled}
                bannerScript={clientConfig.banner_script}
              />
            </div>
          )}
          {!isLoading && view === "selector" && videoData && (
            <div className="view-active">
              <MetadataView
                info={videoData.info}
                formats={videoData.formats}
                onSelectFormat={handleSelectFormat}
                onBack={handleReset}
              />
            </div>
          )}
          {!isLoading && view === "downloading" && (
            <div className="view-active">
              <ProgressView
                progress={downloadProgress}
                status={downloadStatus}
                downloadUrl={downloadUrl}
                error={errorMsg}
                onReset={handleReset}
              />
            </div>
          )}
          {!isLoading && view === "history" && (
            <div className="view-active">
              <HistoryView
                history={history}
                onBack={handleReset}
                onClear={handleClearHistory}
                onDeleteItem={handleDeleteHistoryItem}
                onExtract={(targetUrl) => {
                  setView("input");
                  setActiveTab("home");
                  handleExtract(targetUrl);
                }}
                isSelectMode={isSelectMode}
                selectedItems={selectedItems}
                onToggleSelectItem={handleToggleSelectItem}
              />
            </div>
          )}
        </main>
        <Footer 
          theme={theme}
          onOpenPrivacy={() => setActiveModal("privacy")}
          onOpenTerms={() => setActiveModal("terms")}
          navigate={navigate}
        />
      </div>
      <DocModal type={activeModal} onClose={() => setActiveModal(null)} />

      {/* 5. Sticky Bottom Navigation for mobile screens */}
      <BottomNav
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        deferredPrompt={deferredPrompt}
        onInstall={handleInstallPWA}
        view={view}
        onNavigateHome={() => {
          setView("input");
          if (window.location.pathname !== "/") {
            navigate("/");
          }
        }}
        onNavigateHistory={() => {
          setView("history");
        }}
      />

      {/* 6. Viral Share-to-Unlock Modal */}
      {showShareModal && (
        <div className="dm-overlay" onClick={() => setShowShareModal(false)}>
          <div className="dm-modal" onClick={e => e.stopPropagation()}>
            <div className="dm-header">
              <h3 className="dm-title">⚡ Unlock HD Muxing Speed</h3>
              <button onClick={() => setShowShareModal(false)} className="dm-close-btn" aria-label="Close modal">×</button>
            </div>
            <div className="dm-content" style={{ display: 'flex', flexDirection: 'column', gap: '16px', textAlign: 'center', padding: '24px' }}>
              <p style={{ fontSize: '14px', lineHeight: '1.6', color: 'var(--text-dim)' }}>
                Muxing separate audio & video tracks in high quality (1080p+) uses high server-side CPU resources.
              </p>
              <p style={{ fontSize: '15px', fontWeight: '600', color: 'var(--color-accent)' }}>
                Share Vidlord with friends on WhatsApp or Telegram to unlock instant processing!
              </p>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '10px' }}>
                <a
                  href={`https://api.whatsapp.com/send?text=${encodeURIComponent("Hey! Check out Vidlord.xyz - download YouTube, Instagram reels & TikTok videos in HD with high speed and NO popup ads! Try it here: https://vidlord.xyz")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={handleShareSuccess}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    padding: '12px',
                    backgroundColor: '#25D366',
                    color: '#ffffff',
                    borderRadius: '12px',
                    textDecoration: 'none',
                    fontWeight: '600',
                    fontSize: '15px',
                    boxShadow: '0 4px 12px rgba(37, 211, 102, 0.25)',
                    transition: 'transform 0.2s'
                  }}
                >
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.662c1.746.953 3.71 1.458 5.704 1.459h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                  </svg>
                  Share via WhatsApp
                </a>
                
                <a
                  href={`https://t.me/share/url?url=${encodeURIComponent("https://vidlord.xyz")}&text=${encodeURIComponent("Hey! Check out Vidlord.xyz - download YouTube, Instagram reels & TikTok videos in HD with high speed and NO popup ads!")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={handleShareSuccess}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    padding: '12px',
                    backgroundColor: '#0088cc',
                    color: '#ffffff',
                    borderRadius: '12px',
                    textDecoration: 'none',
                    fontWeight: '600',
                    fontSize: '15px',
                    boxShadow: '0 4px 12px rgba(0, 136, 204, 0.25)',
                    transition: 'transform 0.2s'
                  }}
                >
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-1-.65-.35-1 .22-1.62.15-.15 2.72-2.5 2.77-2.7.01-.03.01-.14-.05-.2-.06-.06-.15-.04-.21-.03-.09.02-1.49.94-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.53 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z" />
                  </svg>
                  Share via Telegram
                </a>
              </div>
              
              <button
                onClick={() => setShowShareModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  fontSize: '13px',
                  marginTop: '12px',
                  textDecoration: 'underline'
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 7. History Controls Bottom Sheet Drawer */}
      {isMenuOpen && (
        <div className="bottom-sheet-overlay" onClick={() => setIsMenuOpen(false)}>
          <div className="bottom-sheet-content" onClick={e => e.stopPropagation()}>
            <div className="bottom-sheet-header">
              <div className="bottom-sheet-drag-handle"></div>
              <h3 className="bottom-sheet-title">History Options</h3>
            </div>
            <div className="bottom-sheet-list">
              <button 
                className="bottom-sheet-item" 
                onClick={() => {
                  setIsSelectMode(!isSelectMode);
                  setSelectedItems(new Set());
                  setIsMenuOpen(false);
                }}
              >
                <span className="bottom-sheet-item-icon">
                  {isSelectMode ? (
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="3" width="18" height="18" rx="2" />
                      <polyline points="9 11 12 14 22 4" />
                    </svg>
                  )}
                </span>
                <span className="bottom-sheet-item-text">
                  {isSelectMode ? "Cancel Selection" : "Select Items"}
                </span>
              </button>

              {isSelectMode && history.length > 0 && (
                <button 
                  className="bottom-sheet-item" 
                  onClick={() => {
                    handleSelectAll();
                    setIsMenuOpen(false);
                  }}
                >
                  <span className="bottom-sheet-item-icon">
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="7 12 12 17 22 7" />
                      <polyline points="2 12 7 17 12 12" />
                    </svg>
                  </span>
                  <span className="bottom-sheet-item-text">
                    {selectedItems.size === history.length ? "Deselect All" : "Select All"}
                  </span>
                </button>
              )}

              {isSelectMode && selectedItems.size > 0 && (
                <button 
                  className="bottom-sheet-item danger" 
                  onClick={handleDeleteSelected}
                >
                  <span className="bottom-sheet-item-icon">
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    </svg>
                  </span>
                  <span className="bottom-sheet-item-text">
                    Remove Selected ({selectedItems.size})
                  </span>
                </button>
              )}

              {history.length > 0 && (
                <button 
                  className="bottom-sheet-item danger" 
                  onClick={() => {
                    if (window.confirm("Are you sure you want to clear all history?")) {
                      handleClearHistory();
                      setIsMenuOpen(false);
                    }
                  }}
                >
                  <span className="bottom-sheet-item-icon">
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                      <line x1="10" y1="11" x2="10" y2="17" />
                      <line x1="14" y1="11" x2="14" y2="17" />
                    </svg>
                  </span>
                  <span className="bottom-sheet-item-text">Clear All History</span>
                </button>
              )}

              <button 
                className="bottom-sheet-item" 
                onClick={() => {
                  setIsMenuOpen(false);
                  handleReset();
                }}
              >
                <span className="bottom-sheet-item-icon">
                  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="19" y1="12" x2="5" y2="12" />
                    <polyline points="12 19 5 12 12 5" />
                  </svg>
                </span>
                <span className="bottom-sheet-item-text">Hide History</span>
              </button>
            </div>
            <button className="bottom-sheet-cancel-btn" onClick={() => setIsMenuOpen(false)}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </>
  );
}
