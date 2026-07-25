export const onRequestGet: PagesFunction = async () => {
  return new Response(JSON.stringify({ status: 'ok', message: 'Data refresh not available in static deployment' }), {
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
};
