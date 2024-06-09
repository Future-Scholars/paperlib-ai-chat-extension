import localForage from "localforage";
import { Store } from "pinia";
import { MESSAGE_STORE_ID, MessageItem } from "@/store/message.ts";

localForage.config({
  driver: [localForage.INDEXEDDB],
  name: "ai-chat-extension",
});

export async function indexDbPlugin({ store }: { store: Store }) {
  if (store.$id === MESSAGE_STORE_ID) {
    const stored = await localForage.getItem<{
      entity?: Record<string, MessageItem>;
    } | null>(store.$id + "-state");
    if (stored) {
      //Delete fake messages
      if (stored.entity) {
        for (const id in stored.entity) {
          if (stored.entity[id].fake) {
            delete stored.entity[id];
          }
        }
      }
      store.$patch(stored);
    }
    store.$subscribe(() => {
      localForage.setItem(
        store.$id + "-state",
        JSON.parse(JSON.stringify(store.$state)),
      ); // Destructure to transform to plain object
    });
  }
}
