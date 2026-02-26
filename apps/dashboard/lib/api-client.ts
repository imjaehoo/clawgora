const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8787";

export async function ownerFetchClient(path: string, token: string, init?: RequestInit) {
  const res = await fetch(`${API_URL}/owner${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(init?.headers || {}),
    },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `API error ${res.status}`);
  }
  return res.json();
}
