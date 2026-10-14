import { StorageUnavailable } from "./storage-policy.ts";
export class SupabaseDatabaseError extends StorageUnavailable {
  readonly code: string;
  constructor(code: string) {
    super();
    this.code = code;
  }
}
export async function supabaseRequest(path: string, init: RequestInit = {}) {
  const url = process.env.BLIES_SUPABASE_URL;
  const key = process.env.BLIES_SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key || !/^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(url))
    throw new StorageUnavailable();
  try {
    const response = await fetch(`${url}${path}`, {
      ...init,
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
        ...init.headers,
      },
      cache: "no-store",
      signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) {
      const code = await response
        .json()
        .then((body) => (typeof body.code === "string" ? body.code : ""))
        .catch(() => "");
      if (["23505", "23503", "P0002"].includes(code))
        throw new SupabaseDatabaseError(code);
      throw new StorageUnavailable();
    }
    return response;
  } catch (error) {
    if (error instanceof SupabaseDatabaseError) throw error;
    throw new StorageUnavailable();
  }
}
export async function rpc(name: string, args: Record<string, unknown>) {
  const response = await supabaseRequest(`/rest/v1/rpc/${name}`, {
    method: "POST",
    body: JSON.stringify(args),
  });
  return response.json();
}
