// Minimal REST client for backend integration. Auto-disables if no base URL.

const BASE = (import.meta as any).env?.VITE_API_BASE_URL?.replace(/\/+$/, "") || "";
export const apiEnabled = Boolean(BASE);
const u = (p: string) => `${BASE}${p}`;

async function j<T>(res: Response): Promise<T> {
  if (!res.ok) throw new Error(`${res.status}`);
  const ct = res.headers.get("content-type") || "";
  if (ct.includes("application/json")) return (await res.json()) as T;
  // @ts-ignore
  return undefined;
}

function authHeaders() {
  try {
    // Use localStorage token if present, otherwise env token
    const ls = typeof localStorage !== 'undefined' ? localStorage.getItem('auth_token') : null;
    const token = ls || (import.meta as any).env?.VITE_API_TOKEN;
    return token ? { Authorization: `Bearer ${token}` } : {};
  } catch {
    return {};
  }
}

export type CreateGroupInput = {
  name: string;
  description?: string;
  mode: 'manual' | 'auto';
  color?: string;
  funnelId: string;
};

export async function getFunnels<T = any[]>(): Promise<T> {
  if (!apiEnabled) throw new Error("API disabled");
  const res = await fetch(u("/funnels"), { headers: { ...authHeaders() } });
  return j<T>(res);
}

export async function createGroup(input: CreateGroupInput): Promise<any> {
  if (!apiEnabled) throw new Error("API disabled");
  const res = await fetch(u("/groups"), {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(input),
  });
  return j<any>(res);
}

export async function renameGroupApi(id: string, name: string): Promise<void> {
  if (!apiEnabled) throw new Error("API disabled");
  await fetch(u(`/groups/${id}`), {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ name }),
  });
}

export async function deleteGroupApi(id: string): Promise<void> {
  if (!apiEnabled) throw new Error("API disabled");
  await fetch(u(`/groups/${id}`), { method: "DELETE", headers: { ...authHeaders() } });
}

export async function moveGroupToFunnelApi(id: string, funnelId: string): Promise<void> {
  if (!apiEnabled) throw new Error("API disabled");
  await fetch(u(`/groups/${id}`), {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ funnelId }),
  });
}

export async function reorderCardsApi(groupId: string, cardIds: string[]): Promise<void> {
  if (!apiEnabled) throw new Error("API disabled");
  await fetch(u(`/groups/${groupId}`), {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ cardOrder: cardIds }),
  });
}

export async function moveCardApi(cardId: string, groupId: string, position: number): Promise<void> {
  if (!apiEnabled) throw new Error("API disabled");
  await fetch(u(`/cards/${cardId}`), {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ groupId, position }),
  });
}
