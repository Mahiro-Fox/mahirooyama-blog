type MidiFile = {
  name: string;
  path: string;
  duration: number; // duration in seconds
};
type MidiAdminFile = {
  slug: string;
  fileName: string;
  name: string;
  size: number;
  lastModified: string;
};

/** MIDI 管理列表分页响应 */
type MidiAdminFilesPage = {
  files: MidiAdminFile[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  };
};
