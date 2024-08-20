import { PdfParser } from "./parser.ts";
import { MupdfParser } from "./mupdf";

export class LlamaParser implements PdfParser {
  private mupdf: MupdfParser;

  constructor() {
    this.mupdf = new MupdfParser();
  }
  async load(url: string) {
    return this.mupdf.load(url);
  }
  pageCount() {
    return this.mupdf.pageCount();
  }
  async pageContent(pageIndex: number) {
    return "";
  }

  async pageContents(onProgress?: (progress: number) => void) {
    return [""];
  }
}
