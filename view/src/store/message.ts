import { defineStore } from "pinia";

const INIT_MESSAGE = {
  content:
    "Hello, you can ask me anything about this paper. I will try my best to anwser you. Please make sure you have set the API key in the preference.",
  sender: "system",
};

export interface MessageItem {
  conversationId: string;
  id: ReturnType<typeof crypto.randomUUID>;
  content: string;
  sender: string;
  timestamp: number;
}

export const useMessageStore = defineStore("message", {
  state() {
    return {
      entity: {} as Record<string, MessageItem>,
    };
  },
  getters: {
    getConvMessages: (state) => {
      return (conversationId: string) => {
        const rawMessages = Object.values(state.entity).filter(
          (item) => item.conversationId === conversationId,
        );
        return rawMessages.sort((a, b) => {
          return a.timestamp - b.timestamp;
        });
      };
    },
  },
  actions: {
    updateMessage(msg: MessageItem) {
      this.entity[msg.id] = msg;
    },
    sendMessage(
      msg: Pick<MessageItem, "content" | "sender" | "conversationId">,
    ) {
      const convMessages = this.getConvMessages(msg.conversationId);
      if (convMessages.length === 0) {
        const initMsgId = crypto.randomUUID();
        this.entity[initMsgId] = {
          id: initMsgId,
          conversationId: msg.conversationId,
          timestamp: new Date().valueOf(),
          ...INIT_MESSAGE,
        };
      }

      const id = crypto.randomUUID();
      const newMessage = {
        id,
        timestamp: new Date().valueOf(),
        ...msg,
      };
      this.entity[id] = newMessage;
      return newMessage;
    },
    async sendLLMMessage(
      msg: Pick<MessageItem, "content" | "sender" | "conversationId">,
    ) {
      this.sendMessage(msg);

      const loadingMsg = this.sendMessage({
        conversationId: msg.conversationId,
        content: "I am thinking...",
        sender: "system",
      });
      const context = await chatService.retrieveContext(msg.content);
      const answer = await chatService.queryLLM(msg.content, context);
      this.updateMessage({
        ...loadingMsg,
        content: answer || "Something wrong!",
      });
    },
  },
});
