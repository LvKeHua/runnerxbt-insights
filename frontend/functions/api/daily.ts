export const onRequestGet: PagesFunction<{ DATA: KVNamespace }> = async (context) => {
  const msgs = (await context.env.DATA.get('messages_enriched', 'json')) as any[];
  const map: Record<string, number> = {};
  if (msgs) for (const m of msgs) { if (m.date) map[m.date] = (map[m.date] || 0) + 1; }
  return new Response(JSON.stringify({ data: map, total_days: Object.keys(map).length }), {
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*' },
  });
};
