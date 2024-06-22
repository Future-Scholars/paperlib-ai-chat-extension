import { LLMsAPI } from "@future-scholars/llms-api-service";
import { franc } from "franc";
import { PLAPI, PLExtAPI } from "paperlib-api/api";
import { PaperEntity } from "paperlib-api/model";

import { getFullText } from "@/utils/pdfjs/utils";
import { langCodes } from "@/utils/iso-639-3";
import { EncoderService } from "./encoder-service";
import { useConversationStore } from "@/store/conversation.ts";

export class ChatService {
  paperEntity?: PaperEntity;
  private _embeddings: { text: string; embedding: number[] }[] = [];
  embeddingLangCode = "eng";

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

  async initializeEncoderWithCache() {
    const id = `${this.paperEntity?._id}`;
    const conversationStore = useConversationStore();
    const cachedConversation = conversationStore.getConversation(id);
    console.log("cachedConversation:", cachedConversation);
    if (
      cachedConversation?.embeddings &&
      cachedConversation.embeddingLangCode
    ) {
      conversationStore.updateConversation(id, {
        timestamp: new Date().valueOf(),
      });
      this._embeddings = cachedConversation.embeddings;
      this.embeddingLangCode = cachedConversation.embeddingLangCode;
      return;
    }
    const encodeResult = await this.initializeEncoder();
    if (encodeResult) {
      const { embeddings, embeddingLangCode } = encodeResult;
      conversationStore.setConversation({
        id: id as ReturnType<typeof crypto.randomUUID>,
        embeddings,
        embeddingLangCode,
      });
      this._embeddings = embeddings;
      this.embeddingLangCode = embeddingLangCode;
    }
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

    const embeddings: { text: string; embedding: number[] }[] = [];
    let embeddingLangCode: string;
    // 2. Get the language of the paper.
    const lang = franc(fulltext.slice(0, 200), { minLength: 10 });
    if (lang === "und") {
      embeddingLangCode = "eng";
    } else {
      embeddingLangCode = lang;
    }

    this._embeddings = [];
    const words = fulltext.split(" ");
    const paragraphs: string[] = [];
    for (let i = 0; i < words.length; i += 256) {
      paragraphs.push(words.slice(i, i + 256).join(" "));
    }

    for (const paragraph of paragraphs) {
      const embedding = await this._encoderService.encode(paragraph);
      embeddings.push({ text: paragraph, embedding });
    }
    return { embeddingLangCode, embeddings };
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

    const translatedText = await this.translateText(text);

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
      translatedText,
      this._embeddings,
      contextParagNum,
    );
  }

  async llmConfig() {
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
    } else if (modelServiceProvider === "Zhipu") {
      apiKey = (await PLExtAPI.extensionPreferenceService.get(
        "@future-scholars/paperlib-ai-chat-extension",
        "zhipu-api-key",
      )) as string;
    }

    return { model, customAPIURL, apiKey };
  }

  async queryLLM(msg: string, context: string, anwserLang: string = "English") {
    const { model, customAPIURL, apiKey } = await this.llmConfig();

    const query = `I'm reading a paper, I have a question: ${msg}. Please help me answer it with the following context: ${context}.`;

    const answer = await LLMsAPI.model(model)
      .setSystemInstruction(
        `You are a academic paper explainer, skilled in explaining content of a paper. You should answer the question in ${anwserLang}.`,
      )
      .setAPIKey(apiKey)
      .setAPIURL(customAPIURL)
      .query(
        query,
        undefined,
        async (url: string, headers: Record<string, string>, body: any) => {
          const response = (await PLExtAPI.networkTool.post(
            url,
            body,
            headers,
            0,
            300000,
            false,
            true,
          )) as any;

          if (
            response.body instanceof String ||
            typeof response.body === "string"
          ) {
            return JSON.parse(response.body);
          } else {
            return response.body;
          }
        },
        true,
      );

    return answer;
  }

  detectTextLang(text: string) {
    const langCode = franc(text, { minLength: 10 });

    return { code: langCode, name: langCodes[langCode] };
  }

  async translateText(text: string, target: string = "English") {
    const { model, customAPIURL, apiKey } = await this.llmConfig();

    let additionalArgs: any = undefined;
    if (LLMsAPI.modelServiceProvider(model) === "Gemini") {
      additionalArgs = {
        generationConfig: { responseMimeType: "application/json" },
      };
    } else if (
      LLMsAPI.modelServiceProvider(model) === "OpenAI" &&
      (model === "gpt-3.5-turbo-1106" ||
        model === "gpt-4-turbo" ||
        model === "gpt-4o")
    ) {
      additionalArgs = {
        response_format: { type: "json_object" },
      };
    }

    const query = `Translate the following text to ${target}: ${text}`;

    try {
      const response = await LLMsAPI.model(model)
        .setSystemInstruction(
          `You are a professional translator. Please just give me a JSON stringified string like {"translationResult": "..."} without any other content, which can be directly parsed by JSON.parse().`,
        )
        .setAPIKey(apiKey)
        .setAPIURL(customAPIURL)
        .query(
          query,
          additionalArgs,
          async (url: string, headers: Record<string, string>, body: any) => {
            const response = (await PLExtAPI.networkTool.post(
              url,
              body,
              headers,
              0,
              300000,
              false,
              true,
            )) as any;

            if (
              response.body instanceof String ||
              typeof response.body === "string"
            ) {
              return JSON.parse(response.body);
            } else {
              return response.body;
            }
          },
          true,
        );

      const translation = LLMsAPI.parseJSON(response)
        .translationResult as string;
      return translation;
    } catch (error) {
      PLAPI.logService.error(
        "Failed to translate the question.",
        error as Error,
        true,
        "AIChatExt",
      );
      return text;
    }
  }
}
