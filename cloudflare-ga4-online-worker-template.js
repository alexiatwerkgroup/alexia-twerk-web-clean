export default {
  async fetch(request, env) {
    const propertyId = env.GA4_PROPERTY_ID;
    const token = env.GOOGLE_ACCESS_TOKEN;
    if (!propertyId || !token) {
      return new Response(JSON.stringify({ error: 'Missing GA4 config' }), {
        status: 500,
        headers: { 'content-type': 'application/json' }
      });
    }
    const api = `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runRealtimeReport`;
    const res = await fetch(api, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ metrics: [{ name: 'activeUsers' }] })
    });
    const data = await res.text();
    return new Response(data, { headers: { 'content-type': 'application/json' } });
  }
};
