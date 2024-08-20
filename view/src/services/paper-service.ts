import { PdfParser } from "@/utils/pdfParser/parser.ts";
import { PLExtAPI } from "paperlib-api/api";
import { newPdfParser, PDF_PARSER_TYPE } from "@/utils/pdfParser";
import { EncoderService } from "@/services/encoder-service.ts";

export default class PaperService {
  private pdfParser?: PdfParser;
  private readonly encoderService: EncoderService;

  constructor() {
    this.encoderService = new EncoderService();
  }

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

  async encode(url: string, onProgress?: (progress: number) => void) {
    const fulltext = (
      await this.parsePdf(url, (progress) => {
        onProgress?.((progress / 100) * 50);
      })
    ).join("\n");

    const embeddings: { text: string; embedding: number[] }[] = [];
    const words = fulltext.split(" ");
    const paragraphs: string[] = [];
    for (let i = 0; i < words.length; i += 256) {
      paragraphs.push(words.slice(i, i + 256).join(" "));
    }

    for (let p = 0; p < paragraphs.length; p++) {
      const embedding = await this.encoderService.encode(paragraphs[p]);
      embeddings.push({ text: paragraphs[p], embedding });
      onProgress?.(50 + ((p + 1) / paragraphs.length) * 100);
    }
    return embeddings;
  }
}
