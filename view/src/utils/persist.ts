import localForage from "localforage";
import { MessageState, useMessageStore } from "@/store/message.ts";
import {
  ConversationState,
  useConversationStore,
} from "@/store/conversation.ts";
import { onMounted, ref } from "vue";

const MAX_CONVERSATION_NUM = 5;

localForage.config({
  driver: [localForage.INDEXEDDB],
  name: "ai-chat-extension",
});

export function usePersistState() {
  const messageStore = useMessageStore();
  const conversationStore = useConversationStore();
  const loading = ref(true);

  onMounted(async () => {
    try {
      const storedMessage = await localForage.getItem<MessageState>(
        messageStore.$id + "-state",
      );
      //Delete fake messages
      if (storedMessage?.entity) {
        for (const id in storedMessage.entity) {
          if (storedMessage.entity[id].fake) {
            delete storedMessage.entity[id];
          }
        }

        messageStore.$patch(storedMessage);
      }

      const storedConversation = await localForage.getItem<ConversationState>(
        conversationStore.$id + "-state",
      );

      if (storedConversation?.entity) {
        const conversations = Object.values(storedConversation.entity);
        if (conversations.length > MAX_CONVERSATION_NUM) {
          conversations.sort((a, b) => {
            return b.timestamp - a.timestamp;
          });
          const newConversationIds = conversations
            .slice(0, MAX_CONVERSATION_NUM)
            .map((item) => item.id);

          for (const id in storedConversation.entity) {
            if (
              !newConversationIds.includes(
                id as ReturnType<typeof crypto.randomUUID>,
              )
            ) {
              delete storedConversation.entity[id];
            }
          }
        }
        conversationStore.$patch(storedConversation);
      }

      [messageStore, conversationStore].forEach((store) => {
        store.$subscribe(() => {
          localForage.setItem(
            store.$id + "-state",
            JSON.parse(JSON.stringify(store.$state)),
          ); // Destructure to transform to plain object
        });
      });
    } finally {
      loading.value = false;
    }
  });

  return { loading };
}
