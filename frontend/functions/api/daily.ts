export const onRequestGet: PagesFunction<{ DATA: KVNamespace }> = async (context) => {
  // Use pre-computed daily data from KV to avoid parsing the large messages_enriched JSON
  const value = await context.env.DATA.get('messages_daily_response', 'text');

  if (!value) {
    return new Response(JSON.stringify({ data: {}, total_days: 0 }), {
      headers: { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*' },
    });
  }

  return new Response(value, {
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*' },
  });
};
