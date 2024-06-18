<template>
  <div class="grow px-3 text-sm space-y-2 overflow-y-scroll" ref="listRef">
    <div v-for="msg in items" :key="msg.id" class="flex space-x-2">
      <div
        v-if="msg.sender === 'system'"
        class="flex-none flex justify-start w-full"
      >
        <div
          class="flex-none bg-neutral-200 p-2 rounded-t-lg rounded-br-lg lg:max-w-[60%] md:max-w-[75%] max-w-[90%] dark:bg-neutral-700 dark:text-white"
        >
          <span v-html="msg.content"></span>
        </div>
      </div>
      <div v-else class="flex-none flex justify-end w-full">
        <div
          class="flex-none bg-neutral-500 p-2 rounded-t-lg rounded-bl-lg lg:max-w-[60%] md:max-w-[75%] max-w-[90%] text-neutral-50 dark:text-white dark:bg-neutral-600"
        >
          <span v-html="msg.content"></span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { MessageItem } from "@/store/message.ts";

defineProps<{ items: MessageItem[] }>();
const listRef = ref<HTMLDivElement | null>(null);
defineExpose({ listRef });
</script>

<style>
ul {
  list-style-type: disc !important;
  margin-left: 2em;
  margin-top: 0.5em;
  margin-bottom: 0.5em;
}

ol {
  list-style-type: decimal !important;
  margin-left: 2em;
  margin-top: 0.5em;
  margin-bottom: 0.5em;
}
</style>