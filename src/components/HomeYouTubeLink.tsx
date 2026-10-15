"use client";

// The iTV YouTube link in the footer, beside Privacy (16 Oct 2026). The
// YouTube API audit and quota form asks for a home-page screenshot showing
// where the Privacy Policy link is, with YouTube branding visible; this is
// that branding, and it sends home-page visitors to the channel where
// Shishya's Shorts and podcasts go (tools/upload_shishya.py in shishya-data).
//
// YouTube API Services Branding Guidelines: the icon is YouTube's own
// (the masthead icon's paths, unaltered, #FF0000 and white), at the brand
// site's 20 px digital minimum, with clear space beside it; it links only to
// a YouTube channel (the one place a YouTube icon may be a link); and the
// label never puts the icon next to our product's name, so it reads "Our
// videos on YouTube", not "Shishya videos ...".
//
// Home page only (English "/"): the footer is on every page, and Class 1-7
// school pages and kids' exams must not send children to YouTube. On the
// /hi and /te twins it would add English letters (SITE_FRAME_LATIN in
// src/lib/twin-localisation.ts counts SiteFooter's own text, not this file).
// usePathname is read during server rendering too, so the HTML is right
// for each page and there is no hydration mismatch.

import { usePathname } from "next/navigation";

export const ITV_CHANNEL_URL = "https://www.youtube.com/@itv-tech";

export function HomeYouTubeLink() {
  const pathname = usePathname();
  if (pathname !== "/") return null;
  return (
    <a
      href={ITV_CHANNEL_URL}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-2.5 hover:text-ink-800"
    >
      <svg aria-hidden="true" viewBox="0 0 28.57 20" width="29" height="20">
        <path
          fill="#FF0000"
          d="M27.9727 3.12324C27.6435 1.89323 26.6768 0.926623 25.4468 0.597366C23.2197 2.24288e-07 14.285 0 14.285 0C14.285 0 5.35042 2.24288e-07 3.12323 0.597366C1.89323 0.926623 0.926623 1.89323 0.597366 3.12324C2.24288e-07 5.35042 0 10 0 10C0 10 2.24288e-07 14.6496 0.597366 16.8768C0.926623 18.1068 1.89323 19.0734 3.12323 19.4026C5.35042 20 14.285 20 14.285 20C14.285 20 23.2197 20 25.4468 19.4026C26.6768 19.0734 27.6435 18.1068 27.9727 16.8768C28.5701 14.6496 28.5701 10 28.5701 10C28.5701 10 28.5677 5.35042 27.9727 3.12324Z"
        />
        <path fill="#FFFFFF" d="M11.4253 14.2854L18.8477 10.0004L11.4253 5.71533V14.2854Z" />
      </svg>
      Our videos on YouTube
    </a>
  );
}
