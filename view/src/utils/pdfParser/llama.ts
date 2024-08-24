import { PdfParser } from "./parser.ts";
import { MupdfParser } from "./mupdf";
import { PLExtAPI } from "paperlib-api/api";
import axios from "axios";

export class LlamaParser implements PdfParser {
  private mupdf: MupdfParser;
  private apiKey?: string;

  constructor() {
    this.mupdf = new MupdfParser();
  }
  async load(url: string) {
    return this.mupdf.load(url);
  }
  pageCount() {
    return this.mupdf.pageCount();
  }
  async llamaParse(content: Uint8Array) {
    if (!this.apiKey) {
      this.apiKey = (await PLExtAPI.extensionPreferenceService.get(
        "@future-scholars/paperlib-ai-chat-extension",
        "llama-parse-api-key",
      )) as string;
    }

    const formData = new FormData();

    formData.append("file", new Blob([content]));

    const url = "https://api.cloud.llamaindex.ai/api/parsing/upload";

    const results = await axios.post(url, formData, {
      headers: {
        accept: "application/json",
        "Content-Type": "multipart/form-data",
        Authorization: `Bearer ${this.apiKey}`,
      },
    });

    const id = results.data.id;

    // Wait for the parsing to finish, check every 1 seconds
    let status = "PENDING";
    while (status === "PENDING") {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      const statusRes = await axios.get(
        `https://api.cloud.llamaindex.ai/api/parsing/job/${id}`,
        {
          headers: {
            accept: "application/json",
            Authorization: `Bearer ${this.apiKey}`,
          },
        },
      );
      status = statusRes.data.status;
    }

    if (status === "ERROR") {
      throw new Error("Llama Parse failed");
    }

    if (status === "SUCCESS") {
      console.log("Parsing successful");
      const textRes = await axios.get(
        `https://api.cloud.llamaindex.ai/api/parsing/job/${id}/result/markdown`,
        {
          headers: {
            accept: "application/json",
            Authorization: `Bearer ${this.apiKey}`,
          },
        },
      );
      console.log(textRes.data);
      return textRes.data.markdown;
    }
  }

  async pageContent(pageIndex: number) {
    const pageContent = await this.mupdf.extractPages([pageIndex]);
    return (await this.llamaParse(pageContent)) as string;
  }

  async pageContents(pageIndexes: number[]) {
    const pageContent = await this.mupdf.extractPages(pageIndexes);
    return (await this.llamaParse(pageContent)) as string;
  }

  async parse(url: string, onProgress?: (progress: number) => void) {
    await this.load(url);
    let step = 2;
    const len = await this.pageCount();
    const maxStep = Math.ceil(len / 3);
    if (maxStep > step) {
      step = maxStep;
    }
    let contents: string[] = [];
    const allPageIndexes = Array.from({ length: len }, (_, index) => index);
    for (let i = 0; i < len; i += step) {
      const pageIndexes = allPageIndexes.slice(i, i + step);
      const pageContents = await this.pageContents(pageIndexes);
      contents.push(pageContents);
      const progress = ((i + step) / len) * 100;
      onProgress?.(progress);
    }
    return contents;
  }
}
