import { PdfParser } from "@/utils/pdfParser/parser.ts";
import { PLExtAPI } from "paperlib-api/api";
import { newPdfParser, PDF_PARSER_TYPE } from "@/utils/pdfParser";

export default class PaperService {
  private pdfParser?: PdfParser;
  async init() {
    const useLLAMAParse = (await PLExtAPI.extensionPreferenceService.get(
      "@future-scholars/paperlib-ai-chat-extension",
      "llama-parse",
    )) as boolean;
    const llamaParseAPIKey = (await PLExtAPI.extensionPreferenceService.get(
      "@future-scholars/paperlib-ai-chat-extension",
      "llama-parse-api-key",
    )) as string;
    let pdfParserType = PDF_PARSER_TYPE.MUPDF;
    if (useLLAMAParse && llamaParseAPIKey) {
      pdfParserType = PDF_PARSER_TYPE.LLM_PARSER;
    }
    this.pdfParser = newPdfParser(pdfParserType);
  }

  async parsePdf(
    url: string,
    onProgress?: (progress: number) => void,
  ): Promise<string[]> {
    if (!this.pdfParser) throw new Error("Paper service not init");
    await this.pdfParser.load(url);
    const len = await this.pdfParser.pageCount();
    let contents: string[] = [];
    for (let i = 0; i < len; i++) {
      contents.push(await this.pdfParser.pageContent(i));
      const progress = ((i + 1) / len) * 100;
      onProgress?.(progress);
    }
    return contents;
  }
}
