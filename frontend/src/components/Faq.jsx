import React, { useState } from "react";
import { ArrowDown01Icon, ArrowUp01Icon } from "hugeicons-react";
import "./Faq.css";

function FaqItem({ question, answer }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="faq-item" onClick={() => setIsOpen(!isOpen)}>
      <div className="faq-question-row">
        <span className="faq-question">{question}</span>
        {isOpen ? <ArrowUp01Icon size={16} /> : <ArrowDown01Icon size={16} />}
      </div>
      {isOpen && <p className="faq-answer">{answer}</p>}
    </div>
  );
}

export default function Faq({ faqs }) {
  const faqsList = faqs || [
    {
      question: "How do I download 1080p videos with audio?",
      answer: "YouTube stores high-definition streams (1080p and above) as separate video and audio tracks. To get 1080p with audio, select the 'HD Muxed' format. The downloader will fetch both streams and merge them losslessly using FFmpeg on the server."
    },
    {
      question: "Where are my downloaded files saved?",
      answer: "Files are first compiled and stored on the server's cache folder under './downloads'. Once the server-side process completes, you can save the file directly to your local machine's downloads folder by clicking 'Save to Device'."
    },
    {
      question: "Are there any speed or download limitations?",
      answer: "No. Vidlord uses a segmented parallel downloader with up to 16 concurrent threads to bypass individual connection speed throttles. There are no size limits, but server cache files are cleaned up periodically."
    }
  ];

  return (
    <div className="faq-container">
      <h2 className="faq-title">Frequently Asked Questions</h2>
      <div className="faq-list">
        {faqsList.map((faq, index) => (
          <FaqItem key={index} question={faq.question} answer={faq.answer} />
        ))}
      </div>
    </div>
  );
}
