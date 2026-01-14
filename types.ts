
export interface Book {
  id: string;
  title: string;
  fileName: string;
  blob: Blob;
  thumbnail?: string;
  lastPage: number;
  addedAt: number;
  summary?: string;
  isMarked?: boolean;
}

export enum AppView {
  LIBRARY = 'library',
  READER = 'reader'
}
