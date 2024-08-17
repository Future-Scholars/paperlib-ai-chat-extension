import fs from "fs";
import { PdfParser } from "../parser.ts";

interface Block {
  type: string;
  lines: { text?: string }[];
}

export class MupdfParser implements PdfParser {
  private url: string;
  private document: mupdf.Document;

  constructor(url: string) {
    this.url = url;
    this.document = mupdf.Document.openDocument(
      fs.readFileSync(url),
      "application/pdf",
    );
  }

  pageCount(): number {
    return this.document.countPages();
  }
  pageContent(pageIndex: number): string {
    const page = this.document.loadPage(pageIndex);
    const structuredPage = JSON.parse(page.toStructuredText().asJSON()) as {
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
