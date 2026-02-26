// Server-side helper: append ?agent= filter to API calls
export function agentFilter(searchParams: Record<string, string | undefined>): string {
  const agent = searchParams.agent;
  return agent ? `&agent=${encodeURIComponent(agent)}` : "";
}

// Client-side helper: filter arrays by agent ID
export function filterByAgent<T extends Record<string, any>>(
  items: T[],
  agentId: string | undefined,
  fields: string[]
): T[] {
  if (!agentId) return items;
  return items.filter((item) =>
    fields.some((f) => item[f] === agentId)
  );
}
