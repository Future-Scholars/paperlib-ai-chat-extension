export interface PdfParser {
  parse(
    url: string,
    onProgress?: (progress: number) => void,
  ): Promise<string[]>;
}
