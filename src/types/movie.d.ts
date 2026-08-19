type MovieSource = {
  name: string;
  url: string;
};

type Movie = {
  id: string;
  title: string;
  poster: string;
  year: string;
  tags: string[];
  summary: string;
  created_at: string;
  updated_at: string;
  sources: MovieSource[];
};
