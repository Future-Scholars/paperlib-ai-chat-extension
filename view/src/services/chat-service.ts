import { getFullText } from "@/utils/pdfjs/utils";
import { PLAPI, PLMainAPI } from "paperlib-api/api";
import { PaperEntity } from "paperlib-api/model";
import { EncoderService } from "./encoder-service";
import { LLMService } from "./llm-service";

export class ChatService {
  paperEntity?: PaperEntity;
  private _embeddings: { text: string; embedding: number[] }[] = [];

  private readonly _encoderService: EncoderService;
  private readonly _llmService: LLMService;

  constructor() {
    this._encoderService = new EncoderService();
    this._llmService = new LLMService();
  }

  async loadPaperEntity(paperEntityId: string) {
    const loadResults = await PLAPI.paperService.loadByIds([paperEntityId]);
    const paperEntity = loadResults.length > 0 ? loadResults[0] : undefined;

    if (!paperEntity) {
      throw new Error("Paper entity not found");
    }

    this.paperEntity = paperEntity;
  }

  async initializeEncoder() {
    if (!this.paperEntity) {
      throw new Error("Paper entity not loaded");
    }

    // 1. Load fulltext of the paper.
    const url = await PLAPI.fileService.access(this.paperEntity.mainURL, false);
    if (!url) {
      PLAPI.logService.error(
        "Failed to access the main URL of the paper entity.",
        this.paperEntity.mainURL,
        true,
        "AIChatExt",
      );
      return;
    }

    const pagetexts = await getFullText(url);

    console.log(pagetexts);

    this._embeddings = [];
    for (const pagetext of pagetexts) {
      const words = pagetext.split(" ");
      const paragraphs: string[] = [];
      for (let i = 0; i < words.length; i += 256) {
        paragraphs.push(words.slice(i, i + 256).join(" "));
      }

      for (const paragraph of paragraphs) {
        const embedding = await this._encoderService.encode(paragraph);
        this._embeddings.push({ text: paragraph, embedding });
      }
    }

    console.log(this._embeddings);
  }

  async retrieveContext(text: string) {
    if (!this.paperEntity) {
      throw new Error("Paper entity not loaded");
    }

    return await this._encoderService.retrieve(text, this._embeddings);
  }

  async queryLLM(msg: string, context: string) {
    return await this._llmService.query(msg, context);
  }
}
