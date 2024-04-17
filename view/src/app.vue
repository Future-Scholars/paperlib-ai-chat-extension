<script setup lang="ts">
import { nextTick, onMounted, ref } from "vue";
import { PLAPI, PLMainAPI } from "paperlib-api/api";
import { PaperEntity } from "paperlib-api/model";
import { disposable } from "@/base/dispose.ts";
import { processId } from "paperlib-api/utils";

const windowID = "paperlib-ai-chat-extension-window";

const INIT_MESSAGE_LIST = [
  {
    id: crypto.randomUUID(),
    content:
      "Hello, you can ask me anything about this paper. I will try my best to anwser you.",
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

const scrollMsgListToBottom = () => {
  if (msgListRef.value) {
    msgListRef.value.scrollTop = msgListRef.value.scrollHeight;
  }
};

const handleKeyDown = (event: KeyboardEvent) => {
  if (event.code === "Enter") {
    sendMessage(event);
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
  messageList.value = [...INIT_MESSAGE_LIST];
  const selectedIds = (await PLAPI.uiStateService.getState(
    "selectedIds",
  )) as string[];

  const loadResults = await PLAPI.paperService.loadByIds(selectedIds);
  const paperEntity = loadResults.length > 0 ? loadResults[0] : undefined;

  if (paperEntity) {
    curPaperEntity.value = paperEntity;
    await chatService.loadPaperEntity(paperEntity);
    await chatService.initializeEncoder();
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
  PLAPI.uiStateService.onChanged(
    ["selectedIndex", "entitiesReloaded"],
    loadPaperText,
  ),
);

onMounted(() => {
  loadPaperText();
});
</script>

<template>
  <div class="h-screen flex flex-col">
    <div
      class="flex h-8 bg-neutral-200 justify-center items-center w-full text-xs font-semibold"
    >
      <div class="flex-1 justify-center items-center draggable">
        <div class="pl-1">AI Chat</div>
      </div>
      <div class="flex flex-row justify-center items-center">
        <div @click="pin">Pin</div>
        <div @click="unpin">Unpin</div>
        <div @click="closeWindow">Close</div>
      </div>
    </div>
    <div class="flex flex-col p-4 bg-neutral-50 flex-1">
      <div
        id="paper-info-bar"
        class="flex flex-col flex-none bg-neutral-200 px-2 py-2 text-neutral-800 rounded-md space-y-1"
      >
        <span class="font-semibold truncate">{{ curPaperEntity.title }}</span>
        <span class="text-xs truncate">{{ curPaperEntity.authors }}</span>
        <div class="flex space-x-2 text-xs">
          <span>{{ curPaperEntity.pubTime }}</span>
          <span class="italic truncate">{{ curPaperEntity.publication }}</span>
        </div>
      </div>
      <div
        id="msg-list"
        class="grow py-2 text-sm space-y-2 overflow-scroll"
        ref="msgListRef"
      >
        <div v-for="msg in messageList" :key="msg.id" class="flex space-x-2">
          <div
            v-if="msg.sender === 'system'"
            class="flex-none flex justify-start w-full"
          >
            <div
              class="flex-none bg-neutral-200 p-2 rounded-t-lg rounded-br-lg max-w-[75%]"
            >
              <span>{{ msg.content }}</span>
            </div>
          </div>
          <div v-else class="flex-none flex justify-end w-full">
            <div
              class="flex-none bg-cyan-100 p-2 rounded-t-lg rounded-bl-lg max-w-[75%]"
            >
              <span>{{ msg.content }}</span>
            </div>
          </div>
        </div>
      </div>
      <div id="input-box " class="flex-none flex space-x-2 text-neutral-800">
        <input
          type="text"
          id="msg-input"
          class="w-full p-2 bg-neutral-200 rounded-md grow outline-none text-sm"
          ref="msgInputRef"
          @focus="handleMsgInputFocus"
          @blur="handleMsgInputBlur"
        />
      </div>
    </div>
  </div>
</template>

<style>
.draggable {
  -webkit-user-select: none;
  -webkit-app-region: drag;
}
</style>
