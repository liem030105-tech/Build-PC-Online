export type VideoPlatform = 'youtube' | 'tiktok' | 'facebook' | 'drive';

export interface ParsedVideo {
  platform: VideoPlatform;
  /** Link nhúng được (chỉ YouTube); các nền tảng khác thì mở link gốc. */
  embedUrl: string | null;
}

export const PLATFORM_LABEL: Record<VideoPlatform, string> = {
  youtube: 'YouTube',
  tiktok: 'TikTok',
  facebook: 'Facebook',
  drive: 'Google Drive',
};

const YT_ID = /^[\w-]{11}$/;

function youtubeId(u: URL): string | null {
  const host = u.hostname.replace(/^(www\.|m\.)/, '');
  if (host === 'youtu.be') return u.pathname.slice(1).split('/')[0] || null;
  if (host !== 'youtube.com' && host !== 'youtube-nocookie.com') return null;
  if (u.pathname === '/watch') return u.searchParams.get('v');
  const m = u.pathname.match(/^\/(shorts|embed|live)\/([^/]+)/);
  return m ? m[2] : null;
}

/** Nhận diện link video; trả về null nếu không phải nền tảng được hỗ trợ hoặc không phải https. */
export function parseVideo(raw: string): ParsedVideo | null {
  let u: URL;
  try {
    u = new URL(raw.trim());
  } catch {
    return null;
  }
  if (u.protocol !== 'https:') return null;
  const host = u.hostname.replace(/^(www\.|m\.|vm\.|vt\.)/, '');

  const yt = youtubeId(u);
  if (yt !== null) {
    return YT_ID.test(yt) ? { platform: 'youtube', embedUrl: `https://www.youtube-nocookie.com/embed/${yt}` } : null;
  }
  if (host === 'tiktok.com' || host.endsWith('.tiktok.com')) return { platform: 'tiktok', embedUrl: null };
  if (host === 'facebook.com' || host === 'fb.watch' || host.endsWith('.facebook.com')) {
    return { platform: 'facebook', embedUrl: null };
  }
  if (host === 'drive.google.com') return { platform: 'drive', embedUrl: null };
  return null;
}

export const VIDEO_HINT = 'Chỉ nhận link YouTube, TikTok, Facebook hoặc Google Drive (bắt đầu bằng https://).';
