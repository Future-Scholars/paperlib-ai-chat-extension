import GPT3Tokenizer from "@/utils/openai/gpt3-tokenizer/index";
import { PLAPI, PLExtAPI } from "paperlib-api/api";

export interface IGeminiResponse {
  candidates: [
    {
      content: {
        parts: [
          {
            text: string;
          },
        ];
      };
    },
  ];
}

export interface IOpenAIResponse {
  choices: [
    {
      message: {
        content: string;
      };
    },
  ];
}

export const GEMINIModels = {
  "gemini-pro": -1,
  "gemini-1.5-pro-latest": -1,
}

export const OPENAIModels = {
  "gpt-3.5-turbo": 4096,
  "gpt-3.5-turbo-16k": 16385,
  "gpt-3.5-turbo-1106": 16385,
  "gpt-4": 8192,
  "gpt-4-32k": 32768,
  "gpt-4-1106-preview": 128000,
};

export const PerplexityModels = {
  "codellama-70b-instruct": 16384,
  "mistral-7b-instruct": 16385,
  "mixtral-8x7b-instruct": 16385,
  "sonar-small-chat": 16385,
  "sonar-medium-chat": 16385,
};

export class LLMService {
  async query(
    text: string,
    context: string,
  ) {

    const model = (await PLExtAPI.extensionPreferenceService.get(
      "@future-scholars/paperlib-ai-chat-extension",
      "ai-model",
    )) as string;
    let apiKey = "";
    const customAPIURL = (await PLExtAPI.extensionPreferenceService.get(
      "@future-scholars/paperlib-ai-chat-extension",
      "customAPIURL",
    )) as string;
    if (GEMINIModels.hasOwnProperty(model)) {
      apiKey = (await PLExtAPI.extensionPreferenceService.get(
        "@future-scholars/paperlib-ai-chat-extension",
        "gemini-api-key",
      )) as string;
    } else if (OPENAIModels.hasOwnProperty(model)) {
      apiKey = (await PLExtAPI.extensionPreferenceService.get(
        "@future-scholars/paperlib-ai-chat-extension",
        "openai-api-key",
      )) as string;
    } else if (PerplexityModels.hasOwnProperty(model)) {
      apiKey = (await PLExtAPI.extensionPreferenceService.get(
        "@future-scholars/paperlib-ai-chat-extension",
        "perplexity-api-key",
      )) as string;
    }

    const prompt = `I'm reading a paper. I have a question about it: ${text}. Please help me answer it with the following context: ${context}.`;

    let anwser = "";
    if (GEMINIModels.hasOwnProperty(model)) {
      anwser = await this.requestGeminiPro(text, prompt, apiKey, model, customAPIURL);
    } else if (OPENAIModels.hasOwnProperty(model)) {
      anwser = await this.requestGPT(
        text,
        prompt,
        apiKey,
        model,
        customAPIURL,
      );
    } else if (PerplexityModels.hasOwnProperty(model)) {
      anwser = await this.requestPerplexity(
        text,
        prompt,
        apiKey,
        model,
        customAPIURL,
      );
    } else {
      PLAPI.logService.warn("Unknown model.", model, true, "AIChatExt");
    }

    if (anwser === "") {
      PLAPI.logService.warn("Anwser is empty.", "", true, "AIChatExt");
    }

    return anwser;
  }

  private async requestGeminiPro(
    text: string,
    prompt: string,
    apiKey: string,
    model: string,
    customAPIURL: string,
  ) {
    try {
      const apiEndpoint =
        customAPIURL || "https://generativelanguage.googleapis.com/";
      const url = new URL(
        `v1beta/models/${model}:generateContent?key=${apiKey}`,
        apiEndpoint,
      ).href;

      PLAPI.logService.info(url, "", false, "AIChatExt");
      const content = {
        contents: [
          {
            parts: [
              {
                text: this._minimize(prompt + text),
              },
            ],
          },
        ],
      };

      const response = (await PLExtAPI.networkTool.post(
        url,
        content,
        {
          "Content-Type": "application/json",
        },
        0,
        300000,
        false,
        true,
      )) as any;

      if (
        response.body instanceof String ||
        typeof response.body === "string"
      ) {
        response.body = JSON.parse(response.body);
      }

      const summary = (response.body as IGeminiResponse).candidates[0].content
        .parts[0].text;

      return summary;
    } catch (e) {
      PLAPI.logService.error(
        "Failed to request Gemini Pro.",
        e as Error,
        true,
        "AIChatExt",
      );
      return "";
    }
  }

  private async requestGPT(
    text: string,
    prompt: string,
    apiKey: string,
    model: string,
    customAPIURL: string,
  ) {
    try {
      const max_tokens = OPENAIModels[model];

      let msg = this._limitTokens(this._minimize(prompt + text), max_tokens);

      const apiEndpoint = customAPIURL || "https://api.openai.com/";
      const url = new URL(`v1/chat/completions`, apiEndpoint).href;

      PLAPI.logService.info(url, "", false, "AIChatExt");
      const content = {
        model: model,
        messages: [
          {
            role: "system",
            content:
              "You are a academic paper explainer, skilled in explaining content of a paper.",
          },
          {
            role: "user",
            content: msg,
          },
        ],
      };

      const response = (await PLExtAPI.networkTool.post(
        url,
        content,
        {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        0,
        300000,
        false,
        true,
      )) as any;

      if (
        response.body instanceof String ||
        typeof response.body === "string"
      ) {
        response.body = JSON.parse(response.body);
      }

      const summary = (response.body as IOpenAIResponse).choices[0].message
        .content;

      return summary;
    } catch (e) {
      PLAPI.logService.error(
        "Failed to request OPENAI GPT.",
        e as Error,
        true,
        "AIChatExt",
      );
      return "";
    }
  }

  private async requestPerplexity(
    text: string,
    prompt: string,
    apiKey: string,
    model: string,
    customAPIURL: string,
  ) {
    try {
      const max_tokens = PerplexityModels[model];

      let msg = this._limitTokens(this._minimize(prompt + text), max_tokens);

      const apiEndpoint = customAPIURL || "https://api.perplexity.ai/";
      const url = new URL(`chat/completions`, apiEndpoint).href;

      PLAPI.logService.info(url, "", true, "AIChatExt");
      const content = {
        model: model,
        messages: [
          {
            role: "system",
            content:
              "You are a academic paper explainer, skilled in explaining content of a paper.",
          },
          {
            role: "user",
            content: msg,
          },
        ],
      };

      const response = (await PLExtAPI.networkTool.post(
        url,
        content,
        {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        0,
        300000,
        false,
        true,
      )) as any;

      if (
        response.body instanceof String ||
        typeof response.body === "string"
      ) {
        response.body = JSON.parse(response.body);
      }

      const summary = (response.body as IOpenAIResponse).choices[0].message
        .content;

      return summary;
    } catch (e) {
      PLAPI.logService.error(
        "Failed to request Perplexity.",
        e as Error,
        true,
        "AIChatExt",
      );
      return "";
    }
  }

  private _minimize(text: string) {
    // Remove all the new lines
    text = text.replace(/(\r\n|\n|\r)/gm, "");
    // Remove all the multiple spaces
    text = text.replace(/ +(?= )/g, "");
    // Remove all the tabs
    text = text.replace(/\t/g, "");
    // Remove all the spaces at the beginning
    text = text.replace(/^ /, "");
    // Remove all the spaces at the end
    text = text.replace(/ $/, "");

    return text;
  }

  private _limitTokens(text: string, max_tokens: number) {
    const tokens = new GPT3Tokenizer({ type: "gpt3" }).encode(text);
    const tokenCount = tokens.bpe.length;
    if ((tokenCount as number) < max_tokens) {
      return text;
    } else {
      const textList = text.split(" ");
      const ratio = (max_tokens / (tokenCount as number)) * 0.9;
      return textList.slice(0, Math.floor(textList.length * ratio)).join(" ");
    }
  }
}
