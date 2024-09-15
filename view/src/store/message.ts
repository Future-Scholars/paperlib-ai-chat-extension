import { PLAPI } from "paperlib-api";
import { defineStore } from "pinia";
import { computed, ref } from "vue";

export const MESSAGE_STORE_ID = "message";

export enum MessageSender {
  User = "user",
  System = "system",
}

const INIT_MESSAGE = {
  content:
    "Hello, you can ask me anything about this paper. I will try my best to anwser you. Please make sure you have set the API key in the preference.",
  sender: MessageSender.System,
};

export interface MessageItem {
  conversationId: string;
  id: ReturnType<typeof crypto.randomUUID>;
  content: string;
  sender: MessageSender;
  timestamp: number;
  fake?: boolean;
}

export interface MessageState {
  entity: Record<ReturnType<typeof crypto.randomUUID>, MessageItem>;
}

export const useMessageStore = defineStore(MESSAGE_STORE_ID, () => {
  const entity = ref<MessageState["entity"]>({});

  function $reset() {
    entity.value = {};
  }

  const getConvMessages = computed(() => {
    return (conversationId: string) => {
      const rawMessages = Object.values(entity.value).filter(
        (item) => item.conversationId === conversationId,
      );
      rawMessages.sort((a, b) => {
        return a.timestamp - b.timestamp;
      });
      return [
        {
          id: crypto.randomUUID(),
          conversationId,
          timestamp: 0,
          ...INIT_MESSAGE,
        },
        ...rawMessages,
      ];
    };
  });

  function updateMessage(msg: MessageItem) {
    entity.value[msg.id] = msg;
  }
  function delMessage(msgId: string) {
    delete entity.value[msgId];
  }
  function sendMessage(
    msg: Pick<MessageItem, "content" | "sender" | "conversationId" | "fake">,
  ) {
    const id = crypto.randomUUID();
    const newMessage = {
      id,
      timestamp: new Date().valueOf(),
      ...msg,
    };
    entity.value[id] = newMessage;
    return newMessage;
  }
  async function sendLLMMessage(
    msg: Pick<MessageItem, "content" | "sender" | "conversationId">,
  ) {
    sendMessage(msg);

    const loadingMsg = sendMessage({
      conversationId: msg.conversationId,
      content: "I am thinking...",
      sender: MessageSender.System,
    });

    const errMsg = "Something wrong!";

    try {
      const lang = chatService.detectTextLang(msg.content);

      const translatedMsgContent =
        lang.code === chatService.embeddingLangCode
          ? msg.content
          : await chatService.translateText(
              msg.content,
              chatService.embeddingLangCode,
            );
      const context = await chatService.retrieveContext(translatedMsgContent);
      const answer = await chatService.queryLLM(
        translatedMsgContent,
        context,
        lang.name,
      );
      updateMessage({
        ...loadingMsg,
        content: answer || errMsg,
      });
    } catch (e) {
      updateMessage({
        ...loadingMsg,
        content: errMsg,
      });
    }
  }
  return {
    entity,
    getConvMessages,
    delMessage,
    updateMessage,
    sendMessage,
    sendLLMMessage,
    $reset,
  };
});
