export interface PdfParser {
  pageCount(): number;
  pageContent(pageIndex: number): string;
  pageContents(): string[];
}
