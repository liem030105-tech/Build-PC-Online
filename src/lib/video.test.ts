import { describe, expect, it } from 'vitest';
import { parseVideo } from './video';

const EMBED = 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ';

describe('parseVideo', () => {
  it('nhận các dạng link YouTube và tạo link nhúng', () => {
    for (const url of [
      'https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=30s',
      'https://youtu.be/dQw4w9WgXcQ?si=abc',
      'https://m.youtube.com/watch?v=dQw4w9WgXcQ',
      'https://youtube.com/shorts/dQw4w9WgXcQ',
      ' https://www.youtube.com/live/dQw4w9WgXcQ ',
    ]) {
      expect(parseVideo(url)).toEqual({ platform: 'youtube', embedUrl: EMBED });
    }
  });

  it('nhận TikTok, Facebook, Google Drive nhưng không nhúng', () => {
    expect(parseVideo('https://www.tiktok.com/@abc/video/123')).toEqual({ platform: 'tiktok', embedUrl: null });
    expect(parseVideo('https://vt.tiktok.com/ZSabc/')).toEqual({ platform: 'tiktok', embedUrl: null });
    expect(parseVideo('https://fb.watch/abc/')).toEqual({ platform: 'facebook', embedUrl: null });
    expect(parseVideo('https://www.facebook.com/watch/?v=1')).toEqual({ platform: 'facebook', embedUrl: null });
    expect(parseVideo('https://drive.google.com/file/d/x/view')).toEqual({ platform: 'drive', embedUrl: null });
  });

  it('từ chối link lạ, http, YouTube thiếu hoặc sai id', () => {
    expect(parseVideo('https://vimeo.com/123')).toBeNull();
    expect(parseVideo('http://youtu.be/dQw4w9WgXcQ')).toBeNull();
    expect(parseVideo('https://www.youtube.com/watch')).toBeNull();
    expect(parseVideo('https://youtu.be/short')).toBeNull();
    expect(parseVideo('khong phai link')).toBeNull();
    expect(parseVideo('https://evil.com/youtube.com/watch?v=dQw4w9WgXcQ')).toBeNull();
  });
});
