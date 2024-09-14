import localForage from "localforage";
import {
  MESSAGE_STORE_ID,
  MessageState,
  useMessageStore,
} from "@/store/message.ts";
import {
  CONVERSATION_STORE_ID,
  ConversationState,
  useConversationStore,
} from "@/store/conversation.ts";
import { onMounted, ref } from "vue";
import { PLExtAPI } from "paperlib-api/api";

const MAX_CONVERSATION_NUM = 5;

const EXT_ID = "@future-scholars/paperlib-ai-chat-extension";

const RESET_CACHE_KEY = "reset-cache";

localForage.config({
  driver: [localForage.INDEXEDDB],
  name: "ai-chat-extension",
});

const MESSAGE_PERSIST_ID = MESSAGE_STORE_ID + "-state";
const CONVERSATION_PERSIST_ID = CONVERSATION_STORE_ID + "-state";

export function usePersistState() {
  const messageStore = useMessageStore();
  const conversationStore = useConversationStore();
  const loading = ref(true);

  async function resetCache() {
    messageStore.$reset();
    conversationStore.$reset();
    await localForage.clear();
    PLExtAPI.extensionPreferenceService.set(EXT_ID, {
      [RESET_CACHE_KEY]: false,
    });
  }

  async function persistMessage() {
    const storedMessage =
      await localForage.getItem<MessageState>(MESSAGE_PERSIST_ID);
    //Delete fake messages
    if (storedMessage?.entity) {
      for (const id in storedMessage.entity) {
        if (storedMessage.entity[id].fake) {
          delete storedMessage.entity[id];
        }
      }

      messageStore.$patch(storedMessage);
    }

    messageStore.$subscribe(() => {
      localForage.setItem(
        MESSAGE_PERSIST_ID,
        JSON.parse(JSON.stringify(messageStore.$state)),
      ); // Destructure to transform to plain object
    });
  }

  async function persistConversation() {
    const storedConversation = await localForage.getItem<ConversationState>(
      CONVERSATION_PERSIST_ID,
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

    conversationStore.$subscribe(() => {
      localForage.setItem(
        CONVERSATION_PERSIST_ID,
        JSON.parse(JSON.stringify(conversationStore.$state)),
      ); // Destructure to transform to plain object
    });
  }

  onMounted(async () => {
    try {
      PLExtAPI.extensionPreferenceService.on(
        `${EXT_ID}:${RESET_CACHE_KEY}`,
        (event) => {
          const value = event.value.value;
          if (value) {
            resetCache();
          }
        },
      );

      const disableCache = (await PLExtAPI.extensionPreferenceService.get(
        EXT_ID,
        RESET_CACHE_KEY,
      )) as boolean;

      if (disableCache) {
        await resetCache();
      }

      await persistMessage();
      await persistConversation();
    } finally {
      loading.value = false;
    }
  });

  return { loading };
}
