export const onRequestGet: PagesFunction<{ DATA: KVNamespace }> = async (context) => {
  const data = await context.env.DATA.get('messages_enriched', 'json');
  const msgs = data as any[];
  return new Response(JSON.stringify({ data: msgs, total: msgs?.length || 0 }), {
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*' },
  });
};
