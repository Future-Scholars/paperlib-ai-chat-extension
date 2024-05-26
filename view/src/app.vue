<script setup lang="ts">
import { nextTick, onMounted, Ref, ref } from "vue";
import { PLAPI, PLMainAPI } from "paperlib-api/api";
import { PaperEntity } from "paperlib-api/model";
import { disposable } from "@/base/dispose.ts";
import { processId } from "paperlib-api/utils";
import {
  BIconX,
  BIconBoxArrowUpRight,
  BIconBoxArrowInDownLeft,
} from "bootstrap-icons-vue";
import { MessageInput } from "./components";

const windowID = "paperlib-ai-chat-extension-window";

const INIT_MESSAGE_LIST = [
  {
    id: crypto.randomUUID(),
    content:
      "Hello, you can ask me anything about this paper. I will try my best to anwser you. Please make sure you have set the API key in the preference.",
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

const msgInputRef = ref<{ inputRef: HTMLInputElement | null } | null>(null);

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
  if (msgInputRef.value?.inputRef) {
    msgInputRef.value.inputRef.addEventListener("keydown", handleKeyDown);
  }
};

const handleMsgInputBlur = () => {
  if (msgInputRef.value?.inputRef) {
    msgInputRef.value.inputRef.removeEventListener("keydown", handleKeyDown);
  }
};

const loadPaperText = async () => {
  ready.value = false;
  messageList.value = [...INIT_MESSAGE_LIST];
  messageList.value.push({
    id: crypto.randomUUID(),
    content:
      "I'm loading this paper... It may take a few seconds to several minutes to embed the paper's content...",
    sender: "system",
    time: new Date().toLocaleString(),
  });

  const selectedPaperEntities = (await PLAPI.uiStateService.getState(
    "selectedPaperEntities",
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
    "paperlib-ai-chat-extension-window",
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

    setTimeout(scrollMsgListToBottom, 200);

    const context = await chatService.retrieveContext(msg);

    const answer = await chatService.queryLLM(msg, context);
    const targetIndex = messageList.value.findIndex(
      (item) => item.id === receivedMsgId,
    );
    if (targetIndex !== -1) {
      messageList.value[targetIndex] = {
        id: crypto.randomUUID(),
        content: answer || "Something wrong!",
        sender: "system",
        time: new Date().toLocaleString(),
      };
    }

    setTimeout(scrollMsgListToBottom, 200);
  } finally {
    loading.value = false;
  }
};

const unpin = async () => {
  pinned.value = false;
  await nextTick(async () => {
    await PLMainAPI.windowProcessManagementService.setParentWindow(
      null,
      windowID,
    );
    await PLMainAPI.windowProcessManagementService.center(windowID);
    await PLMainAPI.windowProcessManagementService.setAlwaysOnTop(
      windowID,
      true,
    );
  });
};

const pin = async () => {
  pinned.value = true;
  await PLMainAPI.windowProcessManagementService.setParentWindow(
    processId.renderer,
    windowID,
  );
  await PLMainAPI.windowProcessManagementService.fire({
    [windowID]: "pin-window",
  });
  await PLMainAPI.windowProcessManagementService.setAlwaysOnTop(
    windowID,
    false,
  );
};

disposable(
  PLAPI.uiStateService.onChanged(["selectedPaperEntities"], loadPaperText),
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
      class="grow px-3 text-sm space-y-2 overflow-y-scroll"
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
    <message-input
      :disabled="loading || !ready"
      @focus="handleMsgInputFocus"
      @blur="handleMsgInputBlur"
      ref="msgInputRef"
    />
  </div>
</template>

<style>
.draggable {
  user-select: none;
  -webkit-app-region: drag;
}

/* Track */
::-webkit-scrollbar-track {
  background: var(--q-bg-secondary);
  border-radius: 2px;
}
/* Handle */
::-webkit-scrollbar-thumb {
  background: #888;
  border-radius: 2px;
}
/* Handle on hover */
::-webkit-scrollbar-thumb:hover {
  background: #555;
}
::-webkit-scrollbar {
  width: 4px;
  height: 4px;
}

::-webkit-scrollbar-corner {
  background: transparent;
  width: 0 !important;
  height: 0 !important;
}

.sidebar-windows-bg {
  background-color: #efefef;
}

.splitpanes__splitter {
  background-color: #efefef;
}

@media (prefers-color-scheme: dark) {
  .sidebar-windows-bg {
    background-color: rgb(50, 50, 50);
  }
  .splitpanes__splitter {
    background-color: rgb(50, 50, 50);
  }
  .plugin-windows-bg {
    background-color: rgb(50, 50, 50);
  }
}
</style>
