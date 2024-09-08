import { PLAPI, PLExtAPI, PLExtension, PLMainAPI } from "paperlib-api/api";
import { PaperEntity } from "paperlib-api/model";
import { processId } from "paperlib-api/utils";
import path from "path";

const extID = "@future-scholars/paperlib-ai-chat-extension";

const windowID = "paperlib-ai-chat-extension-window";

const openChatMenuItemId = "open-ai-chat";

class PaperlibAIChatExtension extends PLExtension {
  disposeCallbacks: (() => void)[];
  private parentWindowHeaderHeight = 36;
  private timer: NodeJS.Timeout | null = null;

  constructor() {
    super({
      id: extID,
      defaultPreference: {
        "llama-parse": {
          type: "boolean",
          name: "Enable Llama Parse",
          description: "Use Llama Parse to extract text from PDFs.",
          value: false,
          order: 0,
        },
        "llama-parse-api-key": {
          type: "string",
          name: "Llama Parse API Key",
          description:
            "The API key for Llama Parse. Obtain from https://cloud.llamaindex.ai/parse",
          value: "",
          order: 0,
        },
        "reset-cache": {
          type: "button",
          name: "Clear Cache",
          description:
            "Remove all cached messages and papers. Use this with caution.",
          value: false,
          order: 1,
        },
        "ai-model": {
          type: "options",
          name: "LLM Model",
          description: "The LLM model to use.",
          options: {
            "glm-3-turbo": "ChatGLM 3 Turbo",
            "glm-4": "ChatGLM 4",
            "glm-4-air": "ChatGLM 4 Air",
            "glm-4-flash": "ChatGLM 4 Flash",
            "glm-4v": "ChatGLM 4v",
            "glm-4-0520": "ChatGLM 4 0520",
            "gemini-1.0-pro": "Gemini 1.0 Pro",
            "gemini-1.5-pro-latest": "Gemini 1.5 Pro",
            "gemini-1.5-flash-latest": "Gemini 1.5 Flash",
            "gpt-3.5-turbo": "GPT-3.5 Turbo",
            "gpt-3.5-turbo-16k": "GPT-3.5 Turbo 16K",
            "gpt-3.5-turbo-1106": "GPT-3.5 Turbo 1106",
            "gpt-4": "GPT-4",
            "gpt-4-32k": "GPT-4 32K",
            "gpt-4-1106-preview": "GPT-4 1106 Preview",
            "gpt-4-turbo": "GPT-4 Turbo",
            "gpt-4o": "GPT-4o",
            "gpt-4o-mini": "GPT-4o Mini",
            "codellama-70b-instruct": "Perplexity codellama-70b",
            "mistral-7b-instruct": "Perplexity mistral-7b",
            "mixtral-8x7b-instruct": "Perplexity mistral-8x7b",
            "sonar-small-chat": "Perplexity sonar-small-chat",
            "sonar-medium-chat": "Perplexity sonar-medium-chat",
          },
          value: "gpt-4o-mini",
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
        "perplexity-api-key": {
          type: "string",
          name: "Perplexity API Key",
          description: "The API key for Perplexity.",
          value: "",
          order: 2,
        },
        "zhipu-api-key": {
          type: "string",
          name: "Zhipu ChatGLM API Key",
          description: "The API key for ChatGLMs.",
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
        customModelCode: {
          type: "string",
          name: "Custom Model Code",
          description:
            "The custom model code. If not empty, use the custom model. Otherwise, use the selected model.",
          value: "",
          order: 6,
        },
      },
    });

    this.disposeCallbacks = [];
  }

  async debounceSetTopRightPosition() {
    if (this.timer) {
      clearTimeout(this.timer);
    }
    this.timer = setTimeout(() => {
      this.setTopBottomPosition();
      this.timer = null;
    }, 300);
  }

  async setTopBottomPosition() {
    const isChildWindow =
      await PLMainAPI.windowProcessManagementService.hasParentWindow(windowID);

    if (!isChildWindow) {
      return;
    }

    const parentBounds =
      await PLMainAPI.windowProcessManagementService.getBounds(
        processId.renderer,
      );
    const currentBounds =
      await PLMainAPI.windowProcessManagementService.getBounds(windowID);
    if (parentBounds && currentBounds) {
      let x = 0;
      let y = parentBounds.y + this.parentWindowHeaderHeight - 10;
      x = parentBounds.x + parentBounds.width - currentBounds.width - 10;
      await PLMainAPI.windowProcessManagementService.setBounds(windowID, {
        x,
        y,
        height: parentBounds.height - this.parentWindowHeaderHeight,
      });
    }
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

    PLMainAPI.contextMenuService.registerContextMenu(this.id, [
      {
        id: openChatMenuItemId,
        label: "AIChatExt - open",
      },
    ]);

    this.disposeCallbacks.push(
      PLMainAPI.contextMenuService.on(
        "dataContextMenuFromExtensionsClicked",
        (value) => {
          const { extID, itemID } = value.value;
          if (extID === this.id && itemID === openChatMenuItemId) {
            this._startChat();
          }
        },
      ),
    );
  }

  private async _createChatWindow(paperEntity: PaperEntity) {
    const existed =
      await PLMainAPI.windowProcessManagementService.exist(windowID);

    if (existed) {
      await PLMainAPI.windowProcessManagementService.show(windowID);
      await PLMainAPI.windowProcessManagementService.focus(windowID);
      return;
    }

    await PLMainAPI.windowProcessManagementService.create(
      windowID,
      {
        entry: path.resolve(__dirname, "./view/index.html"),
        title: "Discuss with LLM",
        width: 300,
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
      },
      undefined,
      {
        "Cross-Origin-Opener-Policy": "same-origin",
        "Cross-Origin-Embedder-Policy": "require-corp",
      },
    );

    await PLMainAPI.windowProcessManagementService.setParentWindow(
      processId.renderer,
      windowID,
    );

    await this.setTopBottomPosition();

    const disposeCallback = PLMainAPI.windowProcessManagementService.on(
      windowID as any,
      (newValues: { value: string }) => {
        if (newValues.value === "close") {
          PLMainAPI.windowProcessManagementService.destroy(windowID);
          disposeCallback();
          disposeMoveCallback();
          disposePinCallback();
        }
      },
    );

    const disposeMoveCallback = PLMainAPI.windowProcessManagementService.on(
      processId.renderer as any,
      (newValues: { value: string }) => {
        if (newValues.value === "move" || newValues.value === "resize") {
          this.debounceSetTopRightPosition();
        }
      },
    );

    const disposePinCallback = PLMainAPI.windowProcessManagementService.on(
      windowID,
      (newValues: { value: string }) => {
        if (newValues.value === "pin-window") {
          this.setTopBottomPosition();
        }
      },
    );

    this.disposeCallbacks.push(disposeCallback);
    this.disposeCallbacks.push(disposeMoveCallback);
    this.disposeCallbacks.push(disposePinCallback);
  }

  async dispose() {
    for (const disposeCallback of this.disposeCallbacks) {
      disposeCallback();
    }
    PLMainAPI.contextMenuService.unregisterContextMenu(extID);
    PLExtAPI.extensionPreferenceService.unregister(extID);
    await PLMainAPI.windowProcessManagementService.destroy(windowID);
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
