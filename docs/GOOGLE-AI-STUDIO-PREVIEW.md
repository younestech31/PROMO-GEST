# Google AI Studio Preview Workspace

PROMO GEST has a development-only preview API implemented by `apps/local-web/dev-api-middleware.ts`. It is used only when Vite is serving the frontend and `ASPNETCORE_URL` is not configured. It is not part of the production frontend bundle or the ASP.NET Core API.

## Opening the demo workspace

When the app is running against the Vite preview API, the setup and sign-in screens show **Open demo workspace**. Use that action to create a temporary sample organization and sign in without using the first-run `POST /api/setup/initialize` request.

The demo workspace contains:
- One sample organization in Oran.
- One temporary system-administrator session.
- Two fictional real-estate projects for screen and navigation review.

## Important limitations

- All preview data is held in process memory and is lost when the Vite preview server restarts.
- The demo workspace contains fictional data only. Do not enter real organization, employee, customer, financial, or contract information.
- The demo entry route is available only in the Vite development middleware. It is not present in the ASP.NET Core production API.
- The preview entry route refuses to elevate an already initialized non-demo organization.
- If the embedded preview host also blocks other state-changing requests (`POST`, `PUT`, `PATCH`, or `DELETE`), you can still inspect pages and seeded records, but full create/update workflows must be tested against the local ASP.NET Core 10 API and PostgreSQL 18 runtime.

## Testing the real installation

To validate the actual first-run installation, authentication, persistence, and data changes, run the published/local ASP.NET Core API with PostgreSQL 18 and serve the built SPA from that API. The Vite demo workspace is only a UI-preview aid and is not a substitute for that production-like test.
