type Gallery = {
  slug: string;
  title: string;
  description: string;
  thumbnail: string;
  isPortrait: boolean;
  lastUpdated: string;
  tags?: string[];
};

type AdminGallery = Gallery & {
  fileName: string;
  size: number;
};
