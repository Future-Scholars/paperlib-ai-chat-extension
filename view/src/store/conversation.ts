import { defineStore } from "pinia";
import { computed, ref } from "vue";

export const CONVERSATION_STORE_ID = "conversation";

export interface ConversationItem {
  id: ReturnType<typeof crypto.randomUUID>;
  timestamp: number;
  embeddings: { text: string; embedding: number[] }[];
  embeddingLangCode: string;
}

export interface ConversationState {
  entity: Record<ReturnType<typeof crypto.randomUUID>, ConversationItem>;
}

export const useConversationStore = defineStore(CONVERSATION_STORE_ID, () => {
  const entity = ref<ConversationState["entity"]>({});

  const getConversation = computed(() => {
    return (id: string) => entity.value[id];
  });

  const setConversation = (
    convItem: Pick<ConversationItem, "id" | "embeddings" | "embeddingLangCode">,
  ) => {
    entity.value[convItem.id] = {
      ...convItem,
      timestamp: new Date().valueOf(),
    };
  };

  const updateConversation = (
    id: string,
    convItem: Partial<Pick<ConversationItem, "timestamp" | "embeddings">>,
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
