export type CsrfToken = string | null;

type CsrfTokenListener = (token: CsrfToken) => void;

let currentCsrfToken: CsrfToken = null;
const listeners = new Set<CsrfTokenListener>();

export const getCsrfTokenMemory = (): CsrfToken => currentCsrfToken;

export const setCsrfTokenMemory = (token: CsrfToken): void => {
  currentCsrfToken = token;
  listeners.forEach((listener) => listener(currentCsrfToken));
};

export const clearCsrfTokenMemory = (): void => {
  setCsrfTokenMemory(null);
};

export const subscribeCsrfTokenMemory = (listener: CsrfTokenListener): (() => void) => {
  listeners.add(listener);
  listener(currentCsrfToken);

  return () => {
    listeners.delete(listener);
  };
};