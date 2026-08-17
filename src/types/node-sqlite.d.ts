/**
 * Minimális típusdeklaráció a beépített `node:sqlite` modulhoz.
 * A @types/node 20-as verziója még nem tartalmazza — Node 22.5+ futtatókörnyezet kell hozzá.
 */
declare module "node:sqlite" {
  type SQLBindValue = string | number | bigint | null | Uint8Array;

  interface StatementSync {
    run(...params: SQLBindValue[]): unknown;
    get(...params: SQLBindValue[]): Record<string, unknown> | undefined;
    all(...params: SQLBindValue[]): Record<string, unknown>[];
  }

  class DatabaseSync {
    constructor(path: string, options?: unknown);
    exec(sql: string): void;
    prepare(sql: string): StatementSync;
    close(): void;
  }
}
