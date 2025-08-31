// Minimal REST client that activates only when VITE_API_BASE_URL is set.
const BASE = (import.meta as any).env?.VITE_API_BASE_URL?.replace(/\/+$/, "") || "";
export const apiEnabled = Boolean(BASE);
const url = (p: string) => `${BASE}${p}`;

function authHeaders(): Record<string, string> {
  const h: Record<string, string> = {};
  try {
    const ls = typeof localStorage !== 'undefined' ? localStorage.getItem('auth_token') : null;
    const token = ls || (import.meta as any).env?.VITE_API_TOKEN;
    if (token) h['Authorization'] = `Bearer ${token}`;
  } catch {}
  return h;
}

async function json<T>(res: Response): Promise<T> {
  if (!res.ok) throw new Error(`${res.status}`);
  return res.json() as Promise<T>;
}

export async function getFunnels<T = any[]>(): Promise<T> {
  if (!apiEnabled) throw new Error('API disabled');
  const res = await fetch(url('/funnels'), { headers: authHeaders() });
  return json<T>(res);
}

export async function createGroup(input: { name: string; description?: string; mode: 'manual'|'auto'; color?: string; funnelId: string; }): Promise<any> {
  if (!apiEnabled) throw new Error('API disabled');
  const res = await fetch(url('/groups'), {
    method: 'POST',
    headers: { ...authHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  return json<any>(res);
}

export async function renameGroupApi(id: string, name: string): Promise<void> {
  if (!apiEnabled) throw new Error('API disabled');
  await fetch(url(`/groups/${id}`), {
    method: 'PATCH',
    headers: { ...authHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  });
}

export async function deleteGroupApi(id: string): Promise<void> {
  if (!apiEnabled) throw new Error('API disabled');
  await fetch(url(`/groups/${id}`), { method: 'DELETE', headers: authHeaders() });
}

export async function moveGroupToFunnelApi(id: string, funnelId: string): Promise<void> {
  if (!apiEnabled) throw new Error('API disabled');
  await fetch(url(`/groups/${id}`), {
    method: 'PATCH',
    headers: { ...authHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ funnelId }),
  });
}

export async function reorderCardsApi(groupId: string, cardIds: string[]): Promise<void> {
  if (!apiEnabled) throw new Error('API disabled');
  await fetch(url(`/groups/${groupId}`), {
    method: 'PATCH',
    headers: { ...authHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ cardOrder: cardIds }),
  });
}

export async function moveCardApi(cardId: string, groupId: string, position: number): Promise<void> {
  if (!apiEnabled) throw new Error('API disabled');
  await fetch(url(`/cards/${cardId}`), {
    method: 'PATCH',
    headers: { ...authHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ groupId, position }),
  });
}
