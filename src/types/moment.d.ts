type MomentImage = {
  url: string;
  width: number;
  height: number;
  ratio: number;
};

type Moment = {
  id: string;
  createdAt: string;
  content: string;
  image?: MomentImage;
  moodEmoji?: string;
  location?: string;
};
