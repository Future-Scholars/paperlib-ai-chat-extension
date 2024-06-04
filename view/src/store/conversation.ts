import { defineStore } from "pinia";

export interface ConversationItem {
  id: string;
}

export const useConversationStore = defineStore("conversation", {
  state() {
    return {
      entity: {} as Record<string, ConversationItem>,
      currentId: "" as ConversationItem["id"],
    };
  },
  getters: {
    getConversations: (state) => {
      return Object.values(state.entity);
    },
  },
  actions: {
    selectConversation(id: ConversationItem["id"]) {
      this.currentId = id;
    },
  },
});
