import { LLMsAPI } from "@future-scholars/llms-api-service"
import { PLAPI, PLExtAPI } from "paperlib-api/api";
import { PaperEntity } from "paperlib-api/model";

import { getFullText } from "@/utils/pdfjs/utils";
import { EncoderService } from "./encoder-service";

export class ChatService {
  paperEntity?: PaperEntity;
  private _embeddings: { text: string; embedding: number[] }[] = [];

  private readonly _encoderService: EncoderService;

  constructor() {
    this._encoderService = new EncoderService();
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
    const fulltext = await this.getFullText(url);

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
        url
      )
    } else {
      text = (await getFullText(url)).join("\n");
    }

    return text
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

    return await this._encoderService.retrieve(text, this._embeddings, contextParagNum);
  }

  async queryLLM(msg: string, context: string) {
    const model = (await PLExtAPI.extensionPreferenceService.get(
      "@future-scholars/paperlib-ai-chat-extension",
      "ai-model",
    )) as string;

    const customAPIURL = (await PLExtAPI.extensionPreferenceService.get(
      "@future-scholars/paperlib-ai-chat-extension",
      "customAPIURL",
    )) as string;

    let apiKey = "";

    const modelServiceProvider = LLMsAPI.modelServiceProvider(model);
    if (modelServiceProvider === "Gemini") {
      apiKey = (await PLExtAPI.extensionPreferenceService.get(
        "@future-scholars/paperlib-ai-chat-extension",
        "gemini-api-key",
      )) as string;
    } else if (modelServiceProvider === "OpenAI") {
      apiKey = (await PLExtAPI.extensionPreferenceService.get(
        "@future-scholars/paperlib-ai-chat-extension",
        "openai-api-key",
      )) as string;
    } else if (modelServiceProvider === "Perplexity") {
      apiKey = (await PLExtAPI.extensionPreferenceService.get(
        "@future-scholars/paperlib-ai-chat-extension",
        "perplexity-api-key",
      )) as string;
    }

    const query = `I'm reading a paper, I have a question: ${msg}. Please help me answer it with the following context: ${context}.`;

    const answer = await LLMsAPI.model(model)
      .setSystemInstruction("You are a academic paper explainer, skilled in explaining content of a paper.")
      .setAPIKey(apiKey)
      .setAPIURL(customAPIURL)
      .query(query);

    return answer;
  }
}
