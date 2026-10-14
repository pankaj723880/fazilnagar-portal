import Notification from "../models/Notification.js";

/**
 * Dispatches a system/broadcast notification to all citizens and visitors.
 */
export async function createBroadcastNotification({
  type = "broadcast_news",
  title,
  message,
  link = "/",
  icon = "",
  data = {},
}) {
  try {
    if (!title || !message) return null;
    const notification = await Notification.create({
      recipient: null,
      recipientPhone: null,
      referenceId: null,
      type,
      title: title.trim(),
      message: message.trim(),
      link,
      icon,
      data,
    });
    return notification;
  } catch (err) {
    console.warn("[Notify] Failed to dispatch broadcast notification:", err.message);
    return null;
  }
}

/**
 * Dispatches a targeted notification to a submitter regarding their post, story, news, place, or submission.
 */
export async function createSubmissionNotification({
  recipient = null,
  recipientPhone = null,
  referenceId = null,
  type = "submission_approved",
  title,
  message,
  link = "/directory",
  icon = "",
  data = {},
}) {
  try {
    if (!title || !message) return null;
    const notification = await Notification.create({
      recipient,
      recipientPhone: recipientPhone ? String(recipientPhone).trim() : null,
      referenceId: referenceId ? String(referenceId).trim() : null,
      type,
      title: title.trim(),
      message: message.trim(),
      link,
      icon,
      data,
    });
    return notification;
  } catch (err) {
    console.warn("[Notify] Failed to dispatch user submission notification:", err.message);
    return null;
  }
}
