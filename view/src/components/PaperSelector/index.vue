<template>
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
</template>

<script setup lang="ts">
import { PaperEntity } from "paperlib-api/model";
defineProps<{
  curPaperEntity: Pick<
    PaperEntity,
    "title" | "authors" | "publication" | "pubTime"
  >;
  pinned: boolean;
}>();
</script>

<style scoped></style>
