<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { PaperEntity } from "paperlib-api/model";
import { disposable } from "@/base/dispose.ts";
import { processId } from "paperlib-api/utils";
import { BIconX } from "bootstrap-icons-vue";
import {
  MessageInput,
  MessageList,
  WindowPin,
  PaperSelector,
} from "./components";
import { PLAPI, PLMainAPI } from "paperlib-api/api";
import { MessageSender, useMessageStore } from "@/store/message.ts";
import { storeToRefs } from "pinia";
import { useConversationStore } from "@/store/conversation.ts";

const messageStore = useMessageStore();
useConversationStore();

// Show some information about the paper
const curPaperEntity = ref<
  Pick<PaperEntity, "title" | "authors" | "publication" | "pubTime">
>({
  title: "",
  authors: "",
  publication: "",
  pubTime: "",
});

const curConversationId = ref("");

const { getConvMessages } = storeToRefs(messageStore);
const messageItems = computed(() =>
  getConvMessages.value(curConversationId.value),
);
const msgInputRef = ref<{ inputRef: HTMLInputElement | null } | null>(null);
const msgListRef = ref<{ listRef: HTMLDivElement | null } | null>(null);
const windowPinRef = ref<{ pinned: boolean }>({ pinned: false });
const ready = ref(false);
const loading = ref(false);

const scrollMsgListToBottom = () => {
  if (msgListRef.value?.listRef) {
    msgListRef.value.listRef.scrollTop = msgListRef.value.listRef.scrollHeight;
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

function cleanFakedMessage(conversationId) {
  const curMessageItems = messageStore.getConvMessages(conversationId);
  curMessageItems.forEach((item) => {
    if (item.fake) {
      messageStore.delMessage(item.id);
    }
  });
}

const loadPaperText = async () => {
  ready.value = false;
  const selectedPaperEntities = (await PLAPI.uiStateService.getState(
    "selectedPaperEntities",
  )) as PaperEntity[];

  const paperEntity =
    selectedPaperEntities.length > 0 ? selectedPaperEntities[0] : undefined;
  if (!paperEntity) {
    return;
  }
  //Template string to ensure the id is string
  curConversationId.value = `${paperEntity._id as string}`;
  cleanFakedMessage(curConversationId.value);
  const loadingMessage = messageStore.sendMessage({
    fake: true,
    conversationId: curConversationId.value,
    content:
      "I'm loading this paper... It may take a few seconds to several minutes to embed the paper's content...",
    sender: MessageSender.System,
  });

  if (paperEntity) {
    curPaperEntity.value = paperEntity;
    await chatService.loadPaperEntity(paperEntity);
    await chatService.initializeEncoderWithCache();
    ready.value = true;
    messageStore.updateMessage({
      ...loadingMessage,
      content:
        "The paper has been loaded successfully! You can start asking questions now.",
    });
  }
};

const closeWindow = () => {
  PLMainAPI.windowProcessManagementService.forceClose(
    "paperlib-ai-chat-extension-window",
  );
  if (windowPinRef.value?.pinned) {
    PLMainAPI.windowProcessManagementService.focus(processId.renderer);
  }
};

const sendMessage = async (event: KeyboardEvent) => {
  try {
    loading.value = true;
    const msg = (event.target as HTMLInputElement).value;
    if (msg === "") return;
    (event.target as HTMLInputElement).value = "";
    await messageStore.sendLLMMessage({
      conversationId: curConversationId.value,
      content: msg,
      sender: MessageSender.User,
    });
    setTimeout(scrollMsgListToBottom, 200);
  } finally {
    loading.value = false;
  }
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
      <paper-selector
        :cur-paper-entity="curPaperEntity"
        :pinned="windowPinRef.pinned"
      ></paper-selector>
      <div class="flex space-x-1 font-semibold text-neutral-700 flex-none">
        <window-pin></window-pin>
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
    <message-list :items="messageItems" ref="msgListRef"></message-list>
    <message-input
      :disabled="loading || !ready"
      @focus="handleMsgInputFocus"
      @blur="handleMsgInputBlur"
      ref="msgInputRef"
    />
  </div>
</template>

<style>
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
