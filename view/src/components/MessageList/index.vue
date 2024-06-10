<template>
  <div class="grow px-3 text-sm space-y-2 overflow-y-scroll" ref="listRef">
    <div v-for="msg in items" :key="msg.id" class="flex space-x-2">
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
</template>

<script setup lang="ts">
import { ref } from "vue";
import { MessageItem } from "@/store/message.ts";

defineProps<{ items: MessageItem[] }>();
const listRef = ref<HTMLDivElement | null>(null);
defineExpose({ listRef });
</script>

<style scoped></style>
