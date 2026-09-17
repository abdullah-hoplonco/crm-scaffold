/**
 * Rules behind a user's "Today" list: what counts as waiting for a reply, which reply is most urgent,
 * and how long a deal has been idle.
 */

export interface ReplyState {
  channel: "whatsapp" | "email";
  lastInboundAt: string | null;
  lastOutboundAt: string | null;
  serviceWindowExpiresAt: string | null;
}

/** The last message in the conversation came from the customer. */
export function isAwaitingReply(
  conversation: Omit<ReplyState, "channel" | "serviceWindowExpiresAt">,
): boolean {
  if (!conversation.lastInboundAt) return false;
  return !conversation.lastOutboundAt || conversation.lastOutboundAt < conversation.lastInboundAt;
}

/**
 * Most urgent reply first: WhatsApp chats whose 24-hour window closes soonest, then emails that have
 * waited longest, then WhatsApp chats whose window already closed (they need a template), newest first.
 */
export function compareReplyUrgency(a: ReplyState, b: ReplyState, now: Date): number {
  const rank = (c: ReplyState) => {
    if (c.channel === "email") return 1;
    return c.serviceWindowExpiresAt && new Date(c.serviceWindowExpiresAt) > now ? 0 : 2;
  };
  const ra = rank(a);
  const rb = rank(b);
  if (ra !== rb) return ra - rb;
  const inboundA = a.lastInboundAt ?? "";
  const inboundB = b.lastInboundAt ?? "";
  if (ra === 0) return (a.serviceWindowExpiresAt ?? "").localeCompare(b.serviceWindowExpiresAt ?? "");
  if (ra === 1) return inboundA.localeCompare(inboundB);
  return inboundB.localeCompare(inboundA);
}

/** Whole days since the last activity, for "No activity for 5 days". */
export function daysIdle(lastActivityAt: string, now: Date): number {
  return Math.max(0, Math.floor((now.getTime() - new Date(lastActivityAt).getTime()) / 86_400_000));
}
