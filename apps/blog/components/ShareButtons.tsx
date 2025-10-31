'use client';

import React, { useState, useEffect } from 'react';
import {
  Twitter,
  Facebook,
  Linkedin,
  Mail,
  Link2,
  Share2,
  MessageCircle,
} from 'lucide-react';

export interface ShareButtonsProps {
  url: string;
  title: string;
  description?: string;
  hashtags?: string[];
  via?: string;
  onShare?: (platform: string) => void;
  showCounts?: boolean;
  vertical?: boolean;
  className?: string;
}

interface ShareCount {
  twitter?: number;
  facebook?: number;
  linkedin?: number;
  reddit?: number;
}

export const ShareButtons: React.FC<ShareButtonsProps> = ({
  url,
  title,
  description = '',
  hashtags = [],
  via = '',
  onShare,
  showCounts = false,
  vertical = false,
  className = '',
}) => {
  const [copied, setCopied] = useState(false);
  const [shareCounts, setShareCounts] = useState<ShareCount>({});
  const [showNativeShare, setShowNativeShare] = useState(false);

  useEffect(() => {
    // Check if native share API is available
    if (typeof navigator !== 'undefined' && 'share' in navigator) {
      setShowNativeShare(true);
    }

    // Fetch share counts if enabled
    if (showCounts) {
      fetchShareCounts();
    }
  }, [url, showCounts]);

  const fetchShareCounts = async () => {
    try {
      // Facebook share count (requires app ID)
      // Note: This is a simplified example. In production, you'd need a backend proxy
      // to fetch counts due to CORS restrictions

      // Twitter removed public share count API
      // LinkedIn doesn't provide public share count API
      // Reddit share count can be fetched from their JSON API

      const redditResponse = await fetch(
        `https://www.reddit.com/api/info.json?url=${encodeURIComponent(url)}`
      ).catch(() => null);

      if (redditResponse?.ok) {
        const data = await redditResponse.json();
        const score = data?.data?.children?.[0]?.data?.score || 0;
        setShareCounts((prev) => ({ ...prev, reddit: score }));
      }
    } catch (error) {
      console.error('Error fetching share counts:', error);
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      onShare?.('copy-link');
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy link:', error);
    }
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title,
          text: description,
          url,
        });
        onShare?.('native-share');
      } catch (error) {
        if ((error as Error).name !== 'AbortError') {
          console.error('Error sharing:', error);
        }
      }
    }
  };

  const shareOnTwitter = () => {
    const params = new URLSearchParams({
      url,
      text: title,
      ...(hashtags.length > 0 && { hashtags: hashtags.join(',') }),
      ...(via && { via }),
    });
    window.open(
      `https://twitter.com/intent/tweet?${params.toString()}`,
      '_blank',
      'width=550,height=420'
    );
    onShare?.('twitter');
  };

  const shareOnFacebook = () => {
    const params = new URLSearchParams({
      u: url,
      quote: title,
    });
    window.open(
      `https://www.facebook.com/sharer/sharer.php?${params.toString()}`,
      '_blank',
      'width=550,height=420'
    );
    onShare?.('facebook');
  };

  const shareOnLinkedIn = () => {
    const params = new URLSearchParams({
      url,
      title,
      summary: description,
    });
    window.open(
      `https://www.linkedin.com/sharing/share-offsite/?${params.toString()}`,
      '_blank',
      'width=550,height=420'
    );
    onShare?.('linkedin');
  };

  const shareOnReddit = () => {
    const params = new URLSearchParams({
      url,
      title,
    });
    window.open(
      `https://reddit.com/submit?${params.toString()}`,
      '_blank',
      'width=550,height=420'
    );
    onShare?.('reddit');
  };

  const shareViaEmail = () => {
    const subject = encodeURIComponent(title);
    const body = encodeURIComponent(`${description}\n\n${url}`);
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
    onShare?.('email');
  };

  const buttonBaseClass =
    'group relative flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium transition-all duration-200 hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-offset-2';

  const iconClass = 'w-5 h-5 transition-transform group-hover:rotate-12';

  const containerClass = `share-buttons flex ${
    vertical ? 'flex-col' : 'flex-row flex-wrap'
  } gap-2 ${className}`;

  return (
    <div className={containerClass}>
      {/* Native Share (Mobile) */}
      {showNativeShare && (
        <button
          onClick={handleNativeShare}
          className={`${buttonBaseClass} bg-gray-600 hover:bg-gray-700 text-white focus:ring-gray-500`}
          aria-label="Share via device"
        >
          <Share2 className={iconClass} />
          <span>Share</span>
        </button>
      )}

      {/* Twitter */}
      <button
        onClick={shareOnTwitter}
        className={`${buttonBaseClass} bg-[#1DA1F2] hover:bg-[#1a8cd8] text-white focus:ring-blue-500`}
        aria-label="Share on Twitter"
      >
        <Twitter className={iconClass} />
        <span>Twitter</span>
        {showCounts && shareCounts.twitter && (
          <span className="text-xs opacity-80">({shareCounts.twitter})</span>
        )}
      </button>

      {/* Facebook */}
      <button
        onClick={shareOnFacebook}
        className={`${buttonBaseClass} bg-[#4267B2] hover:bg-[#365899] text-white focus:ring-blue-600`}
        aria-label="Share on Facebook"
      >
        <Facebook className={iconClass} />
        <span>Facebook</span>
        {showCounts && shareCounts.facebook && (
          <span className="text-xs opacity-80">({shareCounts.facebook})</span>
        )}
      </button>

      {/* LinkedIn */}
      <button
        onClick={shareOnLinkedIn}
        className={`${buttonBaseClass} bg-[#0077B5] hover:bg-[#006399] text-white focus:ring-blue-700`}
        aria-label="Share on LinkedIn"
      >
        <Linkedin className={iconClass} />
        <span>LinkedIn</span>
        {showCounts && shareCounts.linkedin && (
          <span className="text-xs opacity-80">({shareCounts.linkedin})</span>
        )}
      </button>

      {/* Reddit */}
      <button
        onClick={shareOnReddit}
        className={`${buttonBaseClass} bg-[#FF4500] hover:bg-[#e03d00] text-white focus:ring-orange-500`}
        aria-label="Share on Reddit"
      >
        <MessageCircle className={iconClass} />
        <span>Reddit</span>
        {showCounts && shareCounts.reddit && (
          <span className="text-xs opacity-80">({shareCounts.reddit})</span>
        )}
      </button>

      {/* Email */}
      <button
        onClick={shareViaEmail}
        className={`${buttonBaseClass} bg-gray-700 hover:bg-gray-800 text-white focus:ring-gray-600`}
        aria-label="Share via Email"
      >
        <Mail className={iconClass} />
        <span>Email</span>
      </button>

      {/* Copy Link */}
      <button
        onClick={handleCopyLink}
        className={`${buttonBaseClass} ${
          copied
            ? 'bg-green-600 hover:bg-green-700 focus:ring-green-500'
            : 'bg-gray-600 hover:bg-gray-700 focus:ring-gray-500'
        } text-white`}
        aria-label="Copy link to clipboard"
      >
        <Link2 className={iconClass} />
        <span>{copied ? 'Copied!' : 'Copy Link'}</span>
      </button>
    </div>
  );
};

export default ShareButtons;
