import { PdfParser } from "./parser.ts";
import { MupdfParser } from "./mupdf";
import { PLExtAPI } from "paperlib-api/api";

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
    const pageContent = await this.mupdf.extractPages([pageIndex]);
    return (await PLExtAPI.extensionManagementService.callExtensionMethod(
      "@future-scholars/paperlib-ai-chat-extension",
      "llamaParse",
      pageContent,
    )) as string;
  }
}
