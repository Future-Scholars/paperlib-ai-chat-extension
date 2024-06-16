<template>
  <div
    class="flex w-8 h-8 rounded-md hover:bg-neutral-300 transition-colors cursor-pointer bg-neutral-200 dark:bg-neutral-700 dark:border-neutral-600 dark:text-white hover:dark:bg-neutral-500"
    @click="closeWindow"
  >
    <BIconX class="text-lg m-auto" />
  </div>
</template>

<script setup lang="ts">
import { BIconX } from "bootstrap-icons-vue";
import { processId } from "paperlib-api/utils";
import { PLMainAPI } from "paperlib-api/api";
import { storeToRefs } from "pinia";
import { useWindowStore } from "@/store/window.ts";

const windowStore = useWindowStore();

const { pinned } = storeToRefs(windowStore);

const closeWindow = () => {
  PLMainAPI.windowProcessManagementService.forceClose(
    "paperlib-ai-chat-extension-window",
  );
  if (pinned) {
    PLMainAPI.windowProcessManagementService.focus(processId.renderer);
  }
};
</script>

<style lang="scss" scoped></style>
