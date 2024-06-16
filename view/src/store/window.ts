import { defineStore } from "pinia";
import { ref } from "vue";

export const useWindowStore = defineStore("window", () => {
  const pinned = ref<boolean>(true);

  const setPinned = (value: boolean) => {
    pinned.value = value;
  };

  return { pinned, setPinned };
});
