export interface MessageItem {
  id: ReturnType<typeof crypto.randomUUID>;
  content: string;
  sender: string;
  time: string;
}
