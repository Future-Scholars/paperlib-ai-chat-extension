<template>
  <home v-if="!loading" />
  <div class="fixed h-full w-full flex items-center justify-center" v-else>
    <div class="absolute top-3 right-3">
      <close-window-btn></close-window-btn>
    </div>
    <Spin class="h-8 w-8" />
  </div>
</template>

<script setup lang="ts">
import Home from "@/home.vue";
import { usePersistState } from "@/utils/persist";
import { Spin, CloseWindowBtn } from "@/components";

const { loading } = usePersistState();
</script>

<style lang="scss" scoped></style>
