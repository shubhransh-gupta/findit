import type { MessagePayload } from '../shared/types';

type MessageHandler = (payload: unknown, sender: chrome.runtime.MessageSender) => Promise<unknown>;

const handlers = new Map<string, MessageHandler>();

export function registerHandler(type: string, handler: MessageHandler): void {
  handlers.set(type, handler);
}

export function setupMessageRouter(): void {
  chrome.runtime.onMessage.addListener((message: MessagePayload, sender, sendResponse) => {
    const handler = handlers.get(message.type);
    if (!handler) return false;

    handler(message.payload, sender)
      .then((result) => sendResponse({ success: true, data: result }))
      .catch((error) => sendResponse({ success: false, error: error.message }));

    return true;
  });
}
