export const SERVICE_WINDOW_HOURS = 24;

export interface ServiceWindowState {
  open: boolean;
  expiresAt: string | null;
  /** Milliseconds left, 0 when closed. */
  remainingMs: number;
}

export function serviceWindowExpiry(lastInboundAt: string | null): string | null {
  if (!lastInboundAt) return null;
  return new Date(new Date(lastInboundAt).getTime() + SERVICE_WINDOW_HOURS * 3_600_000).toISOString();
}

/** WhatsApp free-form messages are allowed only while now < expiresAt. Email has no window. */
export function serviceWindowState(
  conversation: { channel: "whatsapp" | "email"; serviceWindowExpiresAt: string | null },
  now: Date,
): ServiceWindowState {
  if (conversation.channel === "email")
    return { open: true, expiresAt: null, remainingMs: Number.POSITIVE_INFINITY };
  const expiresAt = conversation.serviceWindowExpiresAt;
  if (!expiresAt) return { open: false, expiresAt: null, remainingMs: 0 };
  const remainingMs = new Date(expiresAt).getTime() - now.getTime();
  return remainingMs > 0
    ? { open: true, expiresAt, remainingMs }
    : { open: false, expiresAt, remainingMs: 0 };
}
