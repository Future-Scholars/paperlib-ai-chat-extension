import { defineStore } from "pinia";

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
    },
  },
  actions: {
    updateMessage(msg: MessageItem) {
      this.entity[msg.id] = msg;
    },
    delMessage(msgId: string) {
      delete this.entity[msgId];
    },
    sendMessage(
      msg: Pick<MessageItem, "content" | "sender" | "conversationId" | "fake">,
    ) {
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
        sender: MessageSender.System,
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
