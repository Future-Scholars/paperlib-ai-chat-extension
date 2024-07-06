<template>
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
</template>

<script setup lang="ts">
import {
  BIconBoxArrowInDownLeft,
  BIconBoxArrowUpRight,
} from "bootstrap-icons-vue";

import { PLMainAPI } from "paperlib-api/api";

import { nextTick } from "vue";
import { processId } from "paperlib-api/utils";

const windowID = "paperlib-ai-chat-extension-window";

import { useWindowStore } from "@/store/window.ts";
import { storeToRefs } from "pinia";

const windowStore = useWindowStore();

const { pinned } = storeToRefs(windowStore);

const unpin = async () => {
  windowStore.setPinned(false);
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
  windowStore.setPinned(true);
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

defineExpose({
  pinned,
});
</script>

<style scoped></style>
