import { setAuthTokenGetter } from "@workspace/api-client-react";

const TOKEN_KEY = "cyberverse_token";

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function removeToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

// Setup the API client to use the token
setAuthTokenGetter(() => getToken());
