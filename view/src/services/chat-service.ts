import { getFullText } from "@/utils/pdfjs/utils";
import { PLAPI, PLExtAPI } from "paperlib-api/api";
import { PaperEntity } from "paperlib-api/model";
import { EncoderService } from "./encoder-service";
import { LLMService } from "./llm-service";
import { useConversationStore } from "@/store/conversation.ts";

export class ChatService {
  paperEntity?: PaperEntity;
  private _embeddings: { text: string; embedding: number[] }[] = [];

  private readonly _encoderService: EncoderService;
  private readonly _llmService: LLMService;

  constructor() {
    this._encoderService = new EncoderService();
    this._llmService = new LLMService();
  }

  async loadPaperEntity(paperEntity: PaperEntity) {
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
    const fulltext = await this.getFullTextWithCache(
      url,
      `${this.paperEntity._id as string}`,
    );

    this._embeddings = [];
    const words = fulltext.split(" ");
    const paragraphs: string[] = [];
    for (let i = 0; i < words.length; i += 256) {
      paragraphs.push(words.slice(i, i + 256).join(" "));
    }

    for (const paragraph of paragraphs) {
      const embedding = await this._encoderService.encode(paragraph);
      this._embeddings.push({ text: paragraph, embedding });
    }
  }

  async getFullTextWithCache(url: string, id: string) {
    const conversationStore = useConversationStore();
    const cachedConversation = conversationStore.getConversation(id);
    console.log("cachedConversation:", cachedConversation);
    if (cachedConversation?.fulltext) {
      conversationStore.updateConversation(id, {
        timestamp: new Date().valueOf(),
      });
      return cachedConversation.fulltext;
    }
    const fulltext = await this.getFullText(url);
    conversationStore.setConversation({
      id: id as ReturnType<typeof crypto.randomUUID>,
      fulltext,
    });
    return fulltext;
  }

  async getFullText(url: string) {
    const useLLAMAParse = (await PLExtAPI.extensionPreferenceService.get(
      "@future-scholars/paperlib-ai-chat-extension",
      "llama-parse",
    )) as boolean;
    const llamaParseAPIKey = (await PLExtAPI.extensionPreferenceService.get(
      "@future-scholars/paperlib-ai-chat-extension",
      "llama-parse-api-key",
    )) as string;

    let text = "";
    if (useLLAMAParse && llamaParseAPIKey) {
      text = await PLExtAPI.extensionManagementService.callExtensionMethod(
        "@future-scholars/paperlib-ai-chat-extension",
        "llamaParse",
        url,
      );
    } else {
      text = (await getFullText(url)).join("\n");
    }

    return text;
  }

  async retrieveContext(text: string) {
    if (!this.paperEntity) {
      throw new Error("Paper entity not loaded");
    }

    const model = (await PLExtAPI.extensionPreferenceService.get(
      "@future-scholars/paperlib-ai-chat-extension",
      "ai-model",
    )) as string;

    let contextParagNum = 0;
    if (model === "gpt-3.5-turbo") {
      contextParagNum = 1;
    } else {
      contextParagNum = 2;
    }

    return await this._encoderService.retrieve(
      text,
      this._embeddings,
      contextParagNum,
    );
  }

  async queryLLM(msg: string, context: string) {
    return await this._llmService.query(msg, context);
  }
}
