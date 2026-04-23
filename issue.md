2. The billing fetch has no Authorization header. The fetch("/api/billing/status") calls in dashboard, billing, and admin pages don't pass the JWT token. Your API uses authenticateRequest as a preHandler — these calls will return 401 silently, billing will be undefined, and currentPlan will always fall back to EVIDENTIS_PLANS[0] (Starter). The dynamic plan display will never actually work. Fix in all three pages:
typescriptqueryFn: () => fetch("/api/billing/status", {
  headers: {
    Authorization: `Bearer ${localStorage.getItem("evidentis_access_token") ?? ""}`,
  },
}).then(r => r.json()),
Or better — route it through your existing api.ts helper which already handles auth headers, the same way every other API call in the codebase works.