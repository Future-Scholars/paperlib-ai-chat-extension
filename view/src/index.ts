import { createApp } from "vue";
import { RendererRPCService } from "paperlib-api/rpc";
import AppView from "./home.vue";
import { ChatService } from "./services/chat-service";
import { createPinia } from "pinia";

const pinia = createPinia();

async function initialize() {
  const app = createApp(AppView);
  app.use(pinia);

  // ============================================================
  // 1. Initilize the RPC service for current process
  const rpcService = new RendererRPCService(
    "paperlib-ai-chat-extension-window",
  );
  // ============================================================
  // 2. Start the port exchange process.
  await rpcService.initCommunication();

  // ============================================================
  // 3. Wait for the main process to expose its APIs (PLMainAPI)
  const mainAPIExposed = await rpcService.waitForAPI(
    "mainProcess",
    "PLMainAPI",
    5000,
  );

  if (!mainAPIExposed) {
    throw new Error("Main process API is not exposed");
  } else {
    console.log("Main process API is exposed");
  }

  // 4. Wait for the renderer process to expose its APIs (PLRendererAPI)
  const rendererAPIExposed = await rpcService.waitForAPI(
    "rendererProcess",
    "PLAPI",
    5000,
  );

  if (!rendererAPIExposed) {
    throw new Error("Renderer process API is not exposed");
  } else {
    console.log("Renderer process API is exposed");
  }

  // 5. Wait for the extension process to expose its APIs (PLExtAPI)
  const extensionAPIExposed = await rpcService.waitForAPI(
    "extensionProcess",
    "PLExtAPI",
    5000,
  );

  if (!extensionAPIExposed) {
    throw new Error("Extension process API is not exposed");
  } else {
    console.log("Extension process API is exposed");
  }

  const chatService = new ChatService();
  globalThis.chatService = chatService;

  app.mount("#app");
}

initialize();
