import { MupdfParser } from "./mupdf";
import { LlamaParser } from "./llama.ts";

export enum PDF_PARSER_TYPE {
  LLM_PARSER,
  MUPDF,
}
export async function newPdfParser(type: PDF_PARSER_TYPE) {
  if (type === PDF_PARSER_TYPE.MUPDF) {
    return new MupdfParser();
  }

  return new LlamaParser();
}
