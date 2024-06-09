import localForage from "localforage";
import { Store } from "pinia";
import { MESSAGE_STORE_ID, MessageItem } from "@/store/message.ts";
import {
  CONVERSATION_STORE_ID,
  ConversationItem,
} from "@/store/conversation.ts";

const MAX_CONVERSATION_NUM = 5;

localForage.config({
  driver: [localForage.INDEXEDDB],
  name: "ai-chat-extension",
});

export async function indexDbPlugin({ store }: { store: Store }) {
  if ([MESSAGE_STORE_ID, CONVERSATION_STORE_ID].includes(store.$id)) {
    const stored = await localForage.getItem(store.$id + "-state");

    if (stored) {
      if (store.$id === MESSAGE_STORE_ID) {
        const storedMessage = stored as {
          entity?: Record<string, MessageItem>;
        };
        //Delete fake messages
        if (storedMessage.entity) {
          for (const id in storedMessage.entity) {
            if (storedMessage.entity[id].fake) {
              delete storedMessage.entity[id];
            }
          }
        }

        store.$patch(storedMessage);
      }

      if (store.$id === CONVERSATION_STORE_ID) {
        let storedConversation = stored as {
          entity?: Record<
            ReturnType<typeof crypto.randomUUID>,
            ConversationItem
          >;
        };
        if (storedConversation.entity) {
          const conversations = Object.values(storedConversation.entity);
          if (conversations.length > MAX_CONVERSATION_NUM) {
            conversations.sort((a, b) => {
              return a.timestamp - b.timestamp;
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
        }
        store.$patch(storedConversation);
      }
    }

    store.$subscribe(() => {
      localForage.setItem(
        store.$id + "-state",
        JSON.parse(JSON.stringify(store.$state)),
      ); // Destructure to transform to plain object
    });
  }
}
