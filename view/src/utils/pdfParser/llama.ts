import { PdfParser } from "./parser.ts";
import { MupdfParser } from "./mupdf";
import { PLExtAPI } from "paperlib-api/api";
import axios from "axios";

export class LlamaParser implements PdfParser {
  private mupdf: MupdfParser;
  private apiKey?:string

  constructor() {
    this.mupdf = new MupdfParser();
  }
  async load(url: string) {
    return this.mupdf.load(url);
  }
  pageCount() {
    return this.mupdf.pageCount();
  }
  async llamaParse(content:Uint8Array){
    if (!this.apiKey){
      this.apiKey = (await PLExtAPI.extensionPreferenceService.get(
          "@future-scholars/paperlib-ai-chat-extension",
          "llama-parse-api-key",
      )) as string;
    }


    const formData = new FormData();

    formData.append("file",new Blob([content]))

    const url= "https://api.cloud.llamaindex.ai/api/parsing/upload"

    const results = await axios.post(url, formData, {
      headers: {
        'accept': 'application/json',
        'Content-Type': 'multipart/form-data',
        'Authorization': `Bearer ${this.apiKey}`,
      },
    });
  }

  async pageContent(pageIndex: number) {
    const pageContent = await this.mupdf.extractPages([pageIndex]);
    return (await PLExtAPI.extensionManagementService.callExtensionMethod(
      "@future-scholars/paperlib-ai-chat-extension",
      "llamaParse",
      Array.from(pageContent.values()),
    )) as string;
  }
}
