# Andre Erving Stripe checkout — integration status

The Andre Erving Stripe **test-mode** account has four course Prices:

| Course | Stripe Price ID | Amount |
| --- | --- | --- |
| Trucking Pro | price_1UUosMEOyjnKIwMtz5TuvTql | $225 |
| Freight Broker Training | price_1UUosPEOyjnKIwMtHnKT1BaX | $145 |
| Dispatcher Training | price_1UUosSEOyjnKIwMtv9K8wZLX | $125 |
| Time Management | price_1UUosVEOyjnKIwMtmRzmy4PF | $125 |

The repository contains `supabase/functions/create-checkout/index.ts`, a test-only hosted Checkout Session endpoint with an allowlisted course slug and fixed server-side Price IDs. It is **not deployed** and the website enrollment buttons have **not been switched**: checkout must not go live without secrets, a verified webhook, and enrollment fulfillment.

Before deployment:
1. Configure `STRIPE_SECRET_KEY` for **Andre Erving test account**, and `SITE_ORIGIN` for the exact staging domain in Supabase Edge Function secrets. Never commit a secret.
2. Deploy `create-checkout` with suitable public access and test it with the intended staging domain. Verify request authorization, throttling/abuse controls, and CORS.
3. Implement a Stripe-signed webhook and idempotent order/enrollment processing; create orders only after verified payment.
4. Connect the enrollment buttons to the checkout endpoint only when 1–3 work.
5. Exercise successful, canceled, declined and duplicate-webhook tests.
6. Reconcile production pricing and live-mode Stripe products separately before launch.

The `checkout-success.html` page clearly states payment verification is still pending. It is not proof of payment.

DOT specimen collector training is excluded.
