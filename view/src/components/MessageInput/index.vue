<template>
  <div
    class="flex-none flex space-x-2 text-neutral-800 mx-3 my-3 bg-neutral-200 rounded-md flex-row items-center dark:bg-neutral-700 dark:text-neutral-300"
  >
    <input
      type="text"
      id="msg-input"
      class="w-full p-2 grow outline-none text-sm bg-transparent"
      ref="inputRef"
      placeholder="Type your question here..."
      @focus="emit('focus')"
      @blur="emit('blur')"
    />
    <div class="w-7">
      <spin v-if="disabled"></spin>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { Spin } from "@/components";

defineProps<{ disabled: boolean }>();
const emit = defineEmits({
  focus() {},
  blur() {},
});

const inputRef = ref<HTMLInputElement | null>(null);
defineExpose({
  inputRef,
});
</script>

<style scoped></style>
