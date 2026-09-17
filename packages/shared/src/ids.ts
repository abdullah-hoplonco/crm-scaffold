import { uuidv7 } from "uuidv7";

/** New UUIDv7 id. Time-ordered, safe to generate on any tier. */
export function newId(): string {
  return uuidv7();
}
