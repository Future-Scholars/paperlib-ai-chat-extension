import fs from "fs";
import { PdfParser } from "../parser.ts";
import * as Comlink from "comlink";
import { MupdfWorker } from "./mupdf.worker.ts";

interface Block {
  type: string;
  lines: { text?: string }[];
}

const worker = new Worker(new URL("./mupdf.worker", import.meta.url), {
  type: "module",
});
const mupdfWorker = Comlink.wrap<MupdfWorker>(worker);

export class MupdfParser implements PdfParser {
  private url: string;

  constructor(url: string) {
    this.url = url;
  }

  pageCount(): number {
    return 0;
  }
  pageContent(pageIndex: number): string {
    const pageJson = "{}";
    const structuredPage = JSON.parse(pageJson) as {
      blocks: Block[];
    };
    return structuredPage.blocks
      .map((block) => {
        if (block.type === "text") {
          return block.lines
            .map((line) => line.text)
            .filter(Boolean)
            .join("\n");
        }
      })
      .filter(Boolean)
      .join("\n");
  }
  pageContents(): string[] {
    return [];
  }
}
