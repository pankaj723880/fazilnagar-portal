// Client Offline & LocalStorage / IndexedDB Caching for Fazilnagar Town Messaging
// Enables rural 2G/3G connectivity persistence, offline chat viewing, and queued message delivery.

const CONVERSATIONS_CACHE_KEY = "fazilnagar_cached_conversations";
const MESSAGES_CACHE_PREFIX = "fazilnagar_cached_messages_";
const QUEUE_CACHE_PREFIX = "fazilnagar_offline_queue_";

/**
 * Retrieve cached conversation list
 */
export function getCachedConversations() {
  try {
    const raw = localStorage.getItem(CONVERSATIONS_CACHE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    console.warn("[Offline Storage] Failed to read cached conversations:", err);
    return [];
  }
}

/**
 * Save conversation list to local cache
 */
export function setCachedConversations(conversations) {
  try {
    if (!Array.isArray(conversations)) return;
    // Keep max 50 recent conversations to respect storage quota
    const truncated = conversations.slice(0, 50);
    localStorage.setItem(CONVERSATIONS_CACHE_KEY, JSON.stringify(truncated));
  } catch (err) {
    console.warn("[Offline Storage] Failed to cache conversations:", err);
  }
}

/**
 * Retrieve cached messages for a specific conversation
 */
export function getCachedMessages(conversationId) {
  if (!conversationId) return [];
  try {
    const raw = localStorage.getItem(`${MESSAGES_CACHE_PREFIX}${conversationId}`);
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    console.warn(`[Offline Storage] Failed to read messages for ${conversationId}:`, err);
    return [];
  }
}

/**
 * Save recent messages for a specific conversation
 */
export function setCachedMessages(conversationId, messages) {
  if (!conversationId || !Array.isArray(messages)) return;
  try {
    // Keep latest 60 messages for fast offline reading
    const latest = messages.slice(-60);
    localStorage.setItem(`${MESSAGES_CACHE_PREFIX}${conversationId}`, JSON.stringify(latest));
  } catch (err) {
    console.warn(`[Offline Storage] Failed to cache messages for ${conversationId}:`, err);
  }
}

/**
 * Get pending offline outgoing message queue for a conversation
 */
export function getQueuedMessages(conversationId) {
  if (!conversationId) return [];
  try {
    const raw = localStorage.getItem(`${QUEUE_CACHE_PREFIX}${conversationId}`);
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    console.warn(`[Offline Storage] Failed to read queue for ${conversationId}:`, err);
    return [];
  }
}

/**
 * Enqueue an outgoing message while offline
 */
export function enqueueOutgoingMessage(conversationId, messageData) {
  if (!conversationId || !messageData) return;
  try {
    const queue = getQueuedMessages(conversationId);
    // Deduplicate by clientMessageId
    const exists = queue.some((m) => m.clientMessageId === messageData.clientMessageId);
    if (!exists) {
      queue.push({
        ...messageData,
        queuedAt: Date.now(),
        status: "queued",
      });
      localStorage.setItem(`${QUEUE_CACHE_PREFIX}${conversationId}`, JSON.stringify(queue));
    }
  } catch (err) {
    console.warn(`[Offline Storage] Failed to enqueue message:`, err);
  }
}

/**
 * Remove a single message from the offline queue after successful send
 */
export function removeQueuedMessage(conversationId, clientMessageId) {
  if (!conversationId || !clientMessageId) return;
  try {
    const queue = getQueuedMessages(conversationId);
    const filtered = queue.filter((m) => m.clientMessageId !== clientMessageId);
    localStorage.setItem(`${QUEUE_CACHE_PREFIX}${conversationId}`, JSON.stringify(filtered));
  } catch (err) {
    console.warn(`[Offline Storage] Failed to remove message from queue:`, err);
  }
}

/**
 * Clear all queued messages for a conversation
 */
export function clearConversationQueue(conversationId) {
  if (!conversationId) return;
  try {
    localStorage.removeItem(`${QUEUE_CACHE_PREFIX}${conversationId}`);
  } catch (err) {
    console.warn(`[Offline Storage] Failed to clear queue for ${conversationId}:`, err);
  }
}

/**
 * Get all queued messages across all conversations
 */
export function getAllQueuedConversations() {
  try {
    const convIds = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(QUEUE_CACHE_PREFIX)) {
        const convId = key.replace(QUEUE_CACHE_PREFIX, "");
        if (convId) convIds.push(convId);
      }
    }
    return convIds;
  } catch {
    return [];
  }
}
