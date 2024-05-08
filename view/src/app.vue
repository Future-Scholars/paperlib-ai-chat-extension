<script setup lang="ts">
import { nextTick, onMounted, ref } from "vue";
import { PLAPI, PLMainAPI } from "paperlib-api/api";
import { PaperEntity } from "paperlib-api/model";
import { disposable } from "@/base/dispose.ts";
import { processId } from "paperlib-api/utils";
import {
  BIconX,
  BIconBoxArrowUpRight,
  BIconBoxArrowInDownLeft,
} from "bootstrap-icons-vue";

const windowID = "paperlib-ai-chat-extension-window";

const INIT_MESSAGE_LIST = [
  {
    id: crypto.randomUUID(),
    content:
      "Hello, you can ask me anything about this paper. I will try my best to anwser you. Please make sure you have set the API key in the settings.",
    sender: "system",
    time: "2021-10-10 10:10:10",
  },
];

// Show some information about the paper
const curPaperEntity = ref<
  Pick<PaperEntity, "title" | "authors" | "publication" | "pubTime">
>({
  title: "",
  authors: "",
  publication: "",
  pubTime: "",
});

const messageList = ref([...INIT_MESSAGE_LIST]);

const msgInputRef = ref<HTMLInputElement | null>(null);
const msgListRef = ref<HTMLDivElement | null>(null);

const pinned = ref(true);
const ready = ref(false);
const loading = ref(false);

const scrollMsgListToBottom = () => {
  if (msgListRef.value) {
    msgListRef.value.scrollTop = msgListRef.value.scrollHeight;
  }
};

const handleKeyDown = (event: KeyboardEvent) => {
  if (ready.value && !loading.value) {
    if (event.code === "Enter") {
      sendMessage(event);
    }
  }
};

const handleMsgInputFocus = () => {
  if (msgInputRef.value) {
    msgInputRef.value.addEventListener("keydown", handleKeyDown);
  }
};

const handleMsgInputBlur = () => {
  if (msgInputRef.value) {
    msgInputRef.value.removeEventListener("keydown", handleKeyDown);
  }
};

const loadPaperText = async () => {
  ready.value = false;
  messageList.value = [...INIT_MESSAGE_LIST];
  messageList.value.push({
    id: crypto.randomUUID(),
    content:
      "I'm loading this pape... It may take a few seconds to several minutes to embed the paper's content...",
    sender: "system",
    time: new Date().toLocaleString(),
  });

  const selectedPaperEntities = (await PLAPI.uiStateService.getState(
    "selectedPaperEntities"
  )) as PaperEntity[];

  const paperEntity =
    selectedPaperEntities.length > 0 ? selectedPaperEntities[0] : undefined;

  if (paperEntity) {
    curPaperEntity.value = paperEntity;
    await chatService.loadPaperEntity(paperEntity);
    await chatService.initializeEncoder();

    ready.value = true;
    messageList.value.push({
      id: crypto.randomUUID(),
      content:
        "The paper has been loaded successfully! You can start asking questions now.",
      sender: "system",
      time: new Date().toLocaleString(),
    });
  }
};

const closeWindow = () => {
  PLMainAPI.windowProcessManagementService.forceClose(
    "paperlib-ai-chat-extension-window"
  );
  if (pinned.value) {
    PLMainAPI.windowProcessManagementService.focus(processId.renderer);
  }
};

const sendMessage = async (event: KeyboardEvent) => {
  try {
    loading.value = true;
    const msg = (event.target as HTMLInputElement).value;
    if (msg === "") return;
    (event.target as HTMLInputElement).value = "";
    messageList.value.push({
      id: crypto.randomUUID(),
      content: msg,
      sender: "user",
      time: new Date().toLocaleString(),
    });
    const receivedMsgId = crypto.randomUUID();
    messageList.value.push({
      id: receivedMsgId,
      content: "I am thinking...",
      sender: "system",
      time: new Date().toLocaleString(),
    });

    scrollMsgListToBottom();

    const context = await chatService.retrieveContext(msg);

    const answer = await chatService.queryLLM(msg, context);
    const targetIndex = messageList.value.findIndex(
      (item) => item.id === receivedMsgId
    );
    if (targetIndex !== -1) {
      messageList.value[targetIndex] = {
        id: crypto.randomUUID(),
        content: answer || "Something wrong!",
        sender: "system",
        time: new Date().toLocaleString(),
      };
    }
  } finally {
    loading.value = false;
  }
};

const unpin = async () => {
  pinned.value = false;
  await nextTick(async () => {
    await PLMainAPI.windowProcessManagementService.setParentWindow(
      null,
      windowID
    );
    await PLMainAPI.windowProcessManagementService.center(windowID);
    await PLMainAPI.windowProcessManagementService.setAlwaysOnTop(
      windowID,
      true
    );
  });
};

const pin = async () => {
  pinned.value = true;
  await PLMainAPI.windowProcessManagementService.setParentWindow(
    processId.renderer,
    windowID
  );
  await PLMainAPI.windowProcessManagementService.fire({
    [windowID]: "pin-window",
  });
  await PLMainAPI.windowProcessManagementService.setAlwaysOnTop(
    windowID,
    false
  );
};

disposable(
  PLAPI.uiStateService.onChanged(["selectedPaperEntities"], loadPaperText)
);

onMounted(() => {
  loadPaperText();
});
</script>

<template>
  <div class="h-screen flex flex-col bg-neutral-50 dark:bg-neutral-800">
    <div id="title-bar" class="flex flex-none space-x-2 w-full pt-3 pl-3 pr-3">
      <div
        id="paper-info-bar"
        class="text-neutral-800 grow truncate bg-neutral-300 rounded-md h-8 items-center flex cursor-pointer select-none dark:bg-neutral-700 dark:border-neutral-600 dark:placeholder-neutral-400 dark:text-white"
        :class="pinned ? '' : 'draggable'"
        :title="`${curPaperEntity.authors} - ${curPaperEntity.publication} - ${curPaperEntity.pubTime}`"
      >
        <span class="font-medium truncate text-sm px-2">{{
          curPaperEntity.title
        }}</span>
      </div>
      <div class="flex space-x-1 font-semibold text-neutral-700 flex-none">
        <div
          v-if="pinned"
          class="flex w-8 h-8 rounded-md hover:bg-neutral-300 transition-colors cursor-pointer bg-neutral-200 dark:bg-neutral-700 dark:border-neutral-600 dark:text-white hover:dark:bg-neutral-500"
          @click="unpin"
        >
          <BIconBoxArrowUpRight class="text-xs m-auto" />
        </div>
        <div
          v-else
          class="flex w-8 h-8 rounded-md hover:bg-neutral-300 transition-colors cursor-pointer bg-neutral-200 dark:bg-neutral-700 dark:border-neutral-600 dark:text-white hover:dark:bg-neutral-500"
          @click="pin"
        >
          <BIconBoxArrowInDownLeft class="text-sm m-auto" />
        </div>
        <div
          class="flex w-8 h-8 rounded-md hover:bg-neutral-300 transition-colors cursor-pointer bg-neutral-200 dark:bg-neutral-700 dark:border-neutral-600 dark:text-white hover:dark:bg-neutral-500"
          @click="closeWindow"
        >
          <BIconX class="text-lg m-auto" />
        </div>
      </div>
    </div>
    <hr
      class="my-3 mx-3 flex-none dark:bg-neutral-600 h-px bg-gray-200 border-0"
    />
    <div
      id="msg-list"
      class="grow px-3 text-sm space-y-2 overflow-scroll"
      ref="msgListRef"
    >
      <div v-for="msg in messageList" :key="msg.id" class="flex space-x-2">
        <div
          v-if="msg.sender === 'system'"
          class="flex-none flex justify-start w-full"
        >
          <div
            class="flex-none bg-neutral-200 p-2 rounded-t-lg rounded-br-lg max-w-[75%] dark:bg-neutral-700 dark:text-white"
          >
            <span>{{ msg.content }}</span>
          </div>
        </div>
        <div v-else class="flex-none flex justify-end w-full">
          <div
            class="flex-none bg-neutral-500 p-2 rounded-t-lg rounded-bl-lg max-w-[75%] text-neutral-50 dark:text-white dark:bg-neutral-600"
          >
            <span>{{ msg.content }}</span>
          </div>
        </div>
      </div>
    </div>
    <div
      id="input-box "
      class="flex-none flex space-x-2 text-neutral-800 mx-3 my-3 bg-neutral-200 rounded-md flex-row items-center dark:bg-neutral-700 dark:text-neutral-300"
    >
      <input
        type="text"
        id="msg-input"
        class="w-full p-2 grow outline-none text-sm bg-transparent"
        ref="msgInputRef"
        placeholder="Type your question here..."
        @focus="handleMsgInputFocus"
        @blur="handleMsgInputBlur"
      />
      <div class="w-7">
        <svg
          role="status"
          class="animate-spin w-3.5 h-3.5 text-neutral-400 fill-neutral-700"
          viewBox="0 0 100 101"
          fill="none"
          v-if="loading || !ready"
        >
          <path
            d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z"
            fill="currentColor"
          />
          <path
            d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z"
            fill="currentFill"
          />
        </svg>
      </div>
    </div>
  </div>
</template>

<style>
.draggable {
  user-select: none;
  -webkit-app-region: drag;
}
</style>
