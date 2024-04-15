import { PLAPI, PLExtAPI, PLExtension, PLMainAPI } from "paperlib-api/api";
import { PaperEntity } from "paperlib-api/model";
import path from "path";

class PaperlibAIChatExtension extends PLExtension {
  disposeCallbacks: (() => void)[];
  private windowID = "paperlib-ai-chat-extension-window";

  constructor() {
    super({
      id: "@future-scholars/paperlib-ai-chat-extension",
      defaultPreference: {
        "ai-model": {
          type: "options",
          name: "LLM Model",
          description: "The LLM model to use.",
          options: {
            "gemini-pro": "Gemini Pro",
            "gpt-3.5-turbo": "GPT-3.5 Turbo",
            "gpt-3.5-turbo-16k": "GPT-3.5 Turbo 16K",
            "gpt-3.5-turbo-1106": "GPT-3.5 Turbo 1106",
            "gpt-4": "GPT-4",
            "gpt-4-32k": "GPT-4 32K",
            "gpt-4-1106-preview": "GPT-4 1106 Preview",
          },
          value: "gemini-pro",
          order: 1,
        },
        "gemini-api-key": {
          type: "string",
          name: "Gemini API Key",
          description: "The API key for Gemini.",
          value: "",
          order: 2,
        },
        "openai-api-key": {
          type: "string",
          name: "OpenAI API Key",
          description: "The API key for OpenAI.",
          value: "",
          order: 2,
        },
        customAPIURL: {
          type: "string",
          name: "Custom API URL",
          description: "The proxied API URL.",
          value: "",
          order: 5,
        },
      },
    });

    this.disposeCallbacks = [];
  }

  async initialize() {
    await PLExtAPI.extensionPreferenceService.register(
      this.id,
      this.defaultPreference,
    );

    this.disposeCallbacks.push(
      PLAPI.commandService.on(
        "@future-scholars/paperlib-ai-chat-extension:start" as any,
        () => {
          this._startChat();
        },
      ),
    );

    this.disposeCallbacks.push(
      PLAPI.commandService.registerExternel({
        id: `aichat`,
        description: "Discuss the paper with LLM.",
        event: "@future-scholars/paperlib-ai-chat-extension:start",
      }),
    );
  }

  private async _createChatWindow(paperEntity: PaperEntity) {
    await PLMainAPI.windowProcessManagementService.create(this.windowID, {
      entry: path.resolve(__dirname, "./view/index.html"),
      title: "Discuss with LLM",
      width: 900,
      height: 800,
      useContentSize: true,
      center: true,
      resizable: true,
      skipTaskbar: true,
      webPreferences: {
        webSecurity: false,
        nodeIntegration: true,
        contextIsolation: false,
      },
      frame: false,
      show: true,
    });

    const disposeCallback = PLMainAPI.windowProcessManagementService.on(
      this.windowID as any,
      (newValues: { value: string }) => {
        if (newValues.value === "close") {
          PLMainAPI.windowProcessManagementService.destroy(this.windowID);
          disposeCallback();
        }
      },
    );

    this.disposeCallbacks.push(disposeCallback);
  }

  async dispose() {
    for (const disposeCallback of this.disposeCallbacks) {
      disposeCallback();
    }
    PLExtAPI.extensionPreferenceService.unregister(this.id);
    await PLMainAPI.windowProcessManagementService.destroy(this.windowID);
  }

  private async _startChat() {
    const selectedPaperEntities = (await PLAPI.uiStateService.getState(
      "selectedPaperEntities",
    )) as PaperEntity[];

    if (selectedPaperEntities.length !== 1) {
      PLAPI.logService.warn(
        "Please select a single paper to start the chat.",
        "",
        true,
        "AIChatExt",
      );
      return;
    }

    const selectedPaperEntity = selectedPaperEntities[0];
    PLAPI.logService.info(
      "Starting chat with LLM",
      selectedPaperEntity.title,
      true,
      "AIChatExt",
    );

    this._createChatWindow(selectedPaperEntity);
  }
}

async function initialize() {
  const extension = new PaperlibAIChatExtension();
  await extension.initialize();

  return extension;
}

export { initialize };