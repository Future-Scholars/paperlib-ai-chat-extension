import { MupdfParser } from "@/utils/pdfParser/mupdf";

export enum PDF_PARSER_TYPE {
  LLM_PARSER,
  MUPDF,
}
export async function newPdfParser(type: PDF_PARSER_TYPE, url: string) {
  if (type === PDF_PARSER_TYPE.MUPDF) {
    return new MupdfParser();
  }

  return new MupdfParser();
}
