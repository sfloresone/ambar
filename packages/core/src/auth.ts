export type Session = {
  userId: string;
  email: string;
  expiresAt: string;
};

/** Contract every platform's auth implementation must satisfy. */
export interface AuthClient {
  signIn(email: string): Promise<void>;
  signOut(): Promise<void>;
  getSession(): Promise<Session | null>;
}
