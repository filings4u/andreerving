# Checkout readiness

The website currently links course purchase buttons to the previous website. Payment processing has not been verified in this repository.

Next steps: connect the dedicated Andre Erving Stripe account, verify the product catalog and pricing, implement a server-side Stripe Checkout session and signed webhook using Supabase Edge Functions, then test payment and enrollment before enabling live transactions.

Do not use the screenings4u Stripe account for this website. Do not publish payment secrets in frontend code.
