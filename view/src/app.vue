<template>
  <home v-if="!loading" />
</template>

<script setup lang="ts">
import Home from "@/home.vue";
import { usePersistState } from "@/utils/persist";
const { loading } = usePersistState();
</script>

<style lang="scss" scoped></style>
