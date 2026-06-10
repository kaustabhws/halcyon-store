export type ActorKind = "customer" | "admin" | "system";

export interface AuthSession {
  actorKind: ActorKind;
  actorId: string;
  email?: string;
  expiresAt: Date;
}

/**
 * Provider-agnostic surface used by both apps. Storefront wires Auth.js,
 * admin wires Clerk. Domain code only depends on this interface.
 */
export interface IAuthAdapter {
  getSession(): Promise<AuthSession | null>;
  requireSession(): Promise<AuthSession>;
}
