import { ChatService } from "./services/chat-service";

declare global {
  var chatService: ChatService;
}
