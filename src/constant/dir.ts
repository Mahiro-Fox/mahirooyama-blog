import path from 'path';

export const DATA_DIR = path.join(process.cwd(), 'data');
export const UPLOADS_DIR = path.join(process.cwd(), 'uploads');
export const BLOG_DIR = path.join(UPLOADS_DIR, 'content', 'blog');
export const GALLERY_DIR = path.join(UPLOADS_DIR, 'content', 'gallery');
export const AVATAR_DIR = path.join(UPLOADS_DIR, 'images', 'avatar');
export const PHOTO_DIR = path.join(UPLOADS_DIR, 'images', 'gallery');
export const MIDI_DIR = path.join(UPLOADS_DIR, 'midisongs');
export const MUSIC_DIR = path.join(UPLOADS_DIR, 'music');

export const TAGS_FILE = path.join(DATA_DIR, 'tags.json');
export const BUGS_FILE = path.join(DATA_DIR, 'bugs.json');
export const USERS_FILE = path.join(DATA_DIR, 'users.json');
export const MUSIC_FILE = path.join(DATA_DIR, 'music.json');
export const MOVIES_FILE = path.join(DATA_DIR, 'movies.json');
export const MOMENTS_FILE = path.join(DATA_DIR, 'moments.json');
export const GUESTBOOK_FILE = path.join(DATA_DIR, 'guestbook.json');
export const ANALYTICS_FILE = path.join(DATA_DIR, 'analytics.json');
export const ROLE_PERMISSIONS_FILE = path.join(
  DATA_DIR,
  'role-permissions.json'
);

export const ANALYTICS_RETENTION_DAYS = 30;
