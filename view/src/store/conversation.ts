import { defineStore } from "pinia";
import { computed, ref } from "vue";

export const CONVERSATION_STORE_ID = "conversation";

export interface ConversationItem {
  id: ReturnType<typeof crypto.randomUUID>;
  fulltext: string;
  timestamp: number;
}

export const useConversationStore = defineStore(CONVERSATION_STORE_ID, () => {
  const entity = ref<Record<string, ConversationItem>>({});

  const getConversation = computed(() => {
    return (id: string) => entity.value[id];
  });

  const setConversation = (
    convItem: Pick<ConversationItem, "id" | "fulltext">,
  ) => {
    entity.value[convItem.id] = {
      ...convItem,
      timestamp: new Date().valueOf(),
    };
  };

  const updateConversation = (
    id: string,
    convItem: Partial<Pick<ConversationItem, "timestamp" | "fulltext">>,
  ) => {
    const oldItem = entity.value[id];
    if (oldItem) {
      entity.value[id] = {
        ...oldItem,
        ...convItem,
      };
    }
  };

  return { entity, setConversation, updateConversation, getConversation };
});
