<script setup lang="ts">
import { onMounted, ref } from "vue";
import { PLAPI, PLExtAPI, PLExtension, PLMainAPI } from "paperlib-api/api";
import { PaperEntity } from "paperlib-api/model";

// Show some information about the paper
const paperEntity = ref({
  title: "Deep Residual Network",
  authors: "Kaiming He, Xiangyu Zhang, Shaoqing Ren, Jian Sun",
  year: "2015",
  publication: "Computer Vision and Pattern Recognition (CVPR)",
});

const messageList = ref([
  {
    id: 1,
    content:
      "Hello, you can ask me anything about this paper. I will try my best to anwser you.",
    sender: "system",
    time: "2021-10-10 10:10:10",
  },
]);

const loadPaperText = async () => {
  const selectedIds = (await PLAPI.uiStateService.getState(
    "selectedIds",
  )) as string[];

  await chatService.loadPaperEntity(selectedIds[0]);
  await chatService.initializeEncoder();
};

const closeWindow = () => {};

const sendMessage = async (event: Event) => {
  const msg = (event.target as HTMLInputElement).value;
  if (msg === "") return;
  (event.target as HTMLInputElement).value = "";

  messageList.value.push({
    id: messageList.value.length + 1,
    content: msg,
    sender: "user",
    time: new Date().toLocaleString(),
  });
  messageList.value.push({
    id: messageList.value.length + 1,
    content: "I am thinking...",
    sender: "system",
    time: new Date().toLocaleString(),
  });

  const context = await chatService.retrieveContext(msg);

  const anwser = await chatService.queryLLM(msg, context);

  messageList.value.pop();
  messageList.value.push({
    id: messageList.value.length + 1,
    content: anwser,
    sender: "system",
    time: new Date().toLocaleString(),
  });
};

onMounted(() => {
  loadPaperText();
});
</script>

<template>
  <div class="flex flex-col p-4 bg-neutral-50 h-screen">
    <div
      id="paper-info-bar"
      class="flex flex-col flex-none bg-neutral-200 px-2 py-2 text-neutral-800 rounded-md space-y-1"
    >
      <span class="font-semibold truncate">{{ paperEntity.title }}</span>
      <span class="text-xs truncate">{{ paperEntity.authors }}</span>
      <div class="flex space-x-2 text-xs">
        <span>{{ paperEntity.year }}</span>
        <span class="italic truncate">{{ paperEntity.publication }}</span>
      </div>
    </div>
    <div id="msg-list" class="grow py-2 text-sm space-y-2 overflow-scroll">
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
        @keypress.enter="sendMessage($event)"
      />
      <div
        class="flex-none flex content-center items-center px-3 bg-neutral-200 rounded-md text-sm"
        @click="loadPaperText"
      >
        <span>Close</span>
      </div>
    </div>
  </div>
</template>
