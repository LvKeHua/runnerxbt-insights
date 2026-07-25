export const onRequestGet: PagesFunction<{ DATA: KVNamespace }> = async (context) => {
  // Use 'text' type to avoid parsing the large JSON (~1MB) in the Pages Function
  // The pre-formatted response {data: [...], total: N} is stored in KV as 'messages_response'
  const value = await context.env.DATA.get('messages_response', 'text');

  if (!value) {
    return new Response(JSON.stringify({ data: [], total: 0 }), {
      headers: { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*' },
    });
  }

  return new Response(value, {
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*' },
  });
};
