import type { ChannelConnection } from "./entities";
import type { InboundEvent, LeadReceived, MessageReceived } from "./events";

/** A webhook request as adapters see it: raw body bytes are kept for signature checks. */
export interface WebhookRequest {
  method: string;
  headers: Record<string, string | undefined>;
  query: Record<string, string | undefined>;
  rawBody: string;
}

export interface WebhookVerification {
  /** For GET verification handshakes (e.g. Meta hub.challenge), the body to echo. */
  challenge?: string;
  ok: boolean;
}

/** Secrets resolved by the server for one adapter (app secret, verify token). Never sent to browsers. */
export interface AdapterSecrets {
  appSecret?: string;
  verifyToken?: string;
}

export interface InboundAdapter {
  name: string;
  verifyWebhook(req: WebhookRequest, secrets: AdapterSecrets): WebhookVerification;
  /** Pure: no I/O, no database. Big numeric ids must be kept as strings. */
  parseWebhook(req: WebhookRequest): InboundEvent[];
  /** I/O allowed. Runs in the worker for "hydrate" events (fetch lead by id, download media, read Gmail history). */
  hydrate?(
    event: Extract<InboundEvent, { type: "hydrate" }>,
    connection: ChannelConnection,
    secrets: Record<string, string>,
  ): Promise<Array<LeadReceived | MessageReceived>>;
}

export type OutboundMessage =
  | { kind: "text"; to: string; body: string }
  | { kind: "template"; to: string; templateName: string; language: string; variables: string[] }
  | { kind: "document"; to: string; fileUrl: string; fileName: string; caption: string | null }
  | {
      kind: "email";
      to: string;
      subject: string;
      body: string;
      threadId: string | null;
      attachments: Array<{ fileUrl: string; fileName: string }>;
    };

export interface OutboundAdapter {
  name: string;
  sendMessage(
    connection: ChannelConnection,
    message: OutboundMessage,
    secrets: Record<string, string>,
  ): Promise<{ externalId: string }>;
}

export class NotImplementedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NotImplementedError";
  }
}
