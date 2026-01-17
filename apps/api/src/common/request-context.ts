import { AsyncLocalStorage } from "async_hooks";

const storage = new AsyncLocalStorage<Map<string, any>>();

export function requestContextMiddleware(req: any, _res: any, next: () => void) {
  const store = new Map<string, any>();
  store.set("ip", req.ip);
  store.set("userAgent", req.headers["user-agent"] || "");
  storage.run(store, () => next());
}

export function getRequestContextValue<T = any>(key: string): T | undefined {
  return storage.getStore()?.get(key);
}
