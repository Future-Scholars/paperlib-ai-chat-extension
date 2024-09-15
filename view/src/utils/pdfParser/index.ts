import { MupdfParser } from "./mupdf";
import { LlamaParser } from "./llama.ts";
import { PdfParser } from "./parser.ts";

export enum PDF_PARSER_TYPE {
  LLM_PARSER,
  MUPDF,
}
export function newPdfParser(type: PDF_PARSER_TYPE): PdfParser {
  if (type === PDF_PARSER_TYPE.MUPDF) {
    return new MupdfParser();
  }

  return new LlamaParser();
}
