import path from 'path';

export const DATA_DIR = path.join(process.cwd(), 'data');
export const PUBLIC_DIR = path.join(process.cwd(), 'public');
export const UPLOADS_DIR = path.join(process.cwd(), 'uploads');
export const BLOG_DIR = path.join(PUBLIC_DIR, 'content', 'blog');
export const GALLERY_DIR = path.join(PUBLIC_DIR, 'content', 'gallery');
export const AVATAR_DIR = path.join(PUBLIC_DIR, 'images', 'avatar');
export const PHOTO_DIR = path.join(PUBLIC_DIR, 'images', 'gallery');
export const MIDI_DIR = path.join(UPLOADS_DIR, 'midisongs');
export const MOMENTS_FILE = path.join(DATA_DIR, 'moments.json');
export const GUESTBOOK_FILE = path.join(DATA_DIR, 'guestbook.json');
