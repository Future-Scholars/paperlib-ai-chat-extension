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

  async parsePdf() {}
}
