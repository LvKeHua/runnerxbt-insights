export const onRequestGet: PagesFunction<{ DATA: KVNamespace }> = async (context) => {
  const data = await context.env.DATA.get('eth_ohlcv_1d', 'json');
  return new Response(JSON.stringify({ data }), {
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*' },
  });
};
