export interface PdfParser {
  load(url: string): Promise<void>;
  pageCount(): Promise<number>;
  pageContent(pageIndex: number): Promise<string>;
  pageContents(onProgress?: (progress: number) => void): Promise<string[]>;
}
