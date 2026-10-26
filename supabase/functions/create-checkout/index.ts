// Supabase Edge Function: create-checkout
// Set STRIPE_SECRET_KEY and SITE_ORIGIN in Supabase secrets before deploying.
const prices: Record<string, string> = {
  "trucking-pro": "price_1UUosMEOyjnKIwMtz5TuvTql",
  "freight-broker-training": "price_1UUosPEOyjnKIwMtHnKT1BaX",
  "dispatcher-training": "price_1UUosSEOyjnKIwMtv9K8wZLX",
  "time-management": "price_1UUosVEOyjnKIwMtmRzmy4PF",
};
Deno.serve(async (request: Request) => {
  const origin = Deno.env.get("SITE_ORIGIN");
  const cors = {"Access-Control-Allow-Origin": origin ?? "null", "Access-Control-Allow-Headers": "content-type", "Access-Control-Allow-Methods": "POST, OPTIONS", Vary: "Origin"};
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
  if (request.method !== "POST") return new Response("Method not allowed", { status: 405, headers: cors });
  if (!origin || request.headers.get("origin") !== origin) return new Response("Origin not allowed", { status: 403, headers: cors });
  const key = Deno.env.get("STRIPE_SECRET_KEY");
  if (!key || !key.startsWith("sk_test_")) return new Response("Checkout is not configured in test mode", { status: 503, headers: cors });
  let slug: string;
  try { const body = await request.json(); slug = body.slug; } catch { return new Response("Invalid JSON", { status: 400, headers: cors }); }
  const price = prices[slug];
  if (!price) return new Response("Unknown course", { status: 400, headers: cors });
  const params = new URLSearchParams({
    mode: "payment",
    "line_items[0][price]": price,
    "line_items[0][quantity]": "1",
    success_url: origin + "/checkout-success.html?session_id={CHECKOUT_SESSION_ID}",
    cancel_url: origin + "/courses.html",
    "metadata[course_slug]": slug
  });
  const response = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method:"POST",
    headers: {"Authorization": "Bearer " + key, "Content-Type":"application/x-www-form-urlencoded"},
    body: params
  });
  const result = await response.json();
  if (!response.ok || !result.url) return new Response("Checkout unavailable", {status: 502, headers: cors});
  return Response.json({url: result.url}, {headers: cors});
});
