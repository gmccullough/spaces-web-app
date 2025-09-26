# TODO-supabase-auth-google-sso

## Executive Summary
**Objective**: Implement Supabase authentication with Google SSO and gate the `/demo` app behind auth.
**Impact**: Provides a secure baseline to control access to the realtime demo while keeping the root namespace open for future homepage and onboarding.
**Approach**: Use Supabase Auth (hosted) with RLS-ready project; configure Google provider; add Next.js middleware for route protection; add client-side session awareness; secure server routes.

## Scope & Constraints
### In Scope
- [ ] Supabase project integration (keys + URL via env)
- [ ] Google SSO provider configuration in Supabase
- [ ] Next.js App Router integration using Supabase JS (server + client helpers)
- [ ] Route protection for `/demo/**` via middleware and layout guard
- [ ] Secure `/api/session` and `/api/responses` behind auth
- [ ] Minimal signed-in header (avatar/email) and sign-in/out flows

### Out of Scope
- [ ] Database schemas beyond auth (RLS, nodes/edges/etc.)
- [ ] Role-based authorization (RBAC) beyond basic user gate
- [ ] Multi-tenant org/workspace constructs

### Success Criteria
- [ ] Unauthenticated users visiting `/demo` are redirected to `/login`
- [ ] Authenticated users can access `/demo` and the realtime client works
- [ ] `/api/session` and `/api/responses` return 401 when unauthenticated
- [ ] Sign-in with Google works end-to-end locally

## Implementation Plan

### Phase 1: Foundation (Day 1)
**Goal**: Wire Supabase into the Next.js app (server + client) and configure Google SSO.

- [ ] **Configure** **Supabase Project & Env Vars** - Connect app to Supabase
  - **Files**: `.env.local` add `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
  - **Dependencies**: Supabase project created; keys available
  - **Validation**: SDK can connect; health check prints authenticated user when present
  - **Context**: Required for auth and future DB features

- [ ] **Enable** **Google Provider** - Set up OAuth in Supabase dashboard
  - **Files**: Supabase dashboard (no code)
  - **Dependencies**: Google OAuth credentials; callback URL set to Supabase default
  - **Validation**: Provider shows as enabled; test user can start OAuth
  - **Context**: Single provider MVP to reduce complexity

- [ ] **Create** **Supabase Client Helpers** - Server/client instances
  - **Files**: `src/app/lib/supabase/server.ts`, `src/app/lib/supabase/client.ts`
  - **Dependencies**: `@supabase/supabase-js`
  - **Validation**: Server component can read session from cookies; client can getSession
  - **Context**: Consolidates auth logic in one place

### Phase 2: Auth UI + Route Gating (Day 2)
**Goal**: Provide a minimal login route and protect `/demo`.

- [ ] **Add** **/login Route** - Minimal page with “Continue with Google”
  - **Files**: `src/app/login/page.tsx`
  - **Dependencies**: Supabase client; `auth.signInWithOAuth({ provider: 'google' })`
  - **Validation**: Redirects to Google OAuth and returns to app signed in
  - **Context**: MVP UX only; can refine later

- [ ] **Add** **Logout Action** - Minimal sign-out
  - **Files**: `src/app/account/actions.ts` (server action) or API route; header button
  - **Dependencies**: Supabase server client; cookie clearing
  - **Validation**: User returns to logged-out state; `/demo` redirects again

- [ ] **Implement** **Middleware Gate** - Protect `/demo/**` and selected APIs
  - **Files**: `src/middleware.ts`
  - **Dependencies**: Supabase server helper for `getUser()` from cookies
  - **Validation**: Unauthed → 302 to `/login?next=/demo`; authed → pass
  - **Context**: Centralized protection; complements API-side checks

- [ ] **Guard** **Demo Layout** - Secondary guard and session context
  - **Files**: `src/app/demo/layout.tsx` (server component)
  - **Dependencies**: Supabase server client; redirects if no session
  - **Validation**: Direct navigation still blocked even if middleware is bypassed
  - **Context**: Defense in depth and SSR-friendly session checks

### Phase 3: Secure Server APIs (Day 2)
**Goal**: Ensure `/api/session` and `/api/responses` require auth.

- [ ] **Update** **/api/session** - Check auth before creating ephemeral session
  - **Files**: `src/app/api/session/route.ts`
  - **Dependencies**: Supabase server client; 401 if no user
  - **Validation**: Unauthed request returns 401; authed works as before

- [ ] **Update** **/api/responses** - Require auth before proxying
  - **Files**: `src/app/api/responses/route.ts`
  - **Dependencies**: Supabase server client; 401 if no user
  - **Validation**: Unauthed returns 401; authed functions unchanged

## Technical Architecture

### Env Vars
```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=           # server-only
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

### Supabase Client Helpers (signatures only)
```ts
// src/app/lib/supabase/server.ts
export function createServerSupabase(): SupabaseClient { /* reads cookies */ }

// src/app/lib/supabase/client.ts
export function createBrowserSupabase(): SupabaseClient { /* uses anon key */ }
```

### Middleware Gate (concept)
```ts
// src/middleware.ts
// if request.path.startsWith('/demo') || request.path.startsWith('/api/session') || request.path.startsWith('/api/responses')
//   check user via server supabase client
//   if no user → redirect('/login?next=' + encodeURIComponent(req.nextUrl.pathname + req.nextUrl.search))
// else next()
```

### Demo Layout Guard (concept)
```tsx
// src/app/demo/layout.tsx (server)
// const { user } = await createServerSupabase().auth.getUser();
// if (!user) redirect('/login?next=/demo');
// return (<html><body>{children}</body></html>)
```

### API Auth Checks (concept)
```ts
// src/app/api/session/route.ts
// const { data: { user } } = await createServerSupabase().auth.getUser();
// if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
```

## Testing Strategy

### Tests That Must Pass for Completion
- [ ] Navigate to `/demo` unauthenticated → redirected to `/login`
- [ ] Login with Google → returns to `/demo` (or `next` param)
- [ ] `/api/session` and `/api/responses` return 401 when unauthenticated
- [ ] Demo works end-to-end once authenticated

### New Tests Required
- [ ] Unit: helper functions for server/browser Supabase clients
- [ ] Integration: middleware redirects; API 401s; login flow callback
- [ ] E2E: visit `/demo` → login → back to `/demo` → can connect

### Test Documentation Updates
- [ ] Update `specs/product/example-domain/tests.md` with auth gating notes for the demo (if referenced)

## Risk Assessment

### High Risk: OAuth misconfiguration
- **Risk**: Incorrect redirect URIs cause login failures
- **Mitigation**: Follow Supabase provider setup; document local/prod URIs
- **Contingency**: Fall back to email magic links temporarily

### Medium Risk: WebRTC behind auth
- **Risk**: Session creation blocked or CORS/auth mismatch
- **Mitigation**: Keep APIs at root; verify cookies passed in SSR; explicit 401s
- **Contingency**: Temporarily allow `/api/session` for authenticated domains only (origin check)

### Low Risk: Middleware performance
- **Risk**: Slight latency on gated routes
- **Mitigation**: Narrow matcher to `/demo` and required APIs only

## Dependencies & Integration Points

### Critical Dependencies
- [ ] Supabase project + Google OAuth credentials
  - **Status**: To be configured
  - **Timeline**: Phase 1
  - **Contingency**: Local email OTP provider for dev

### Integration Points
- [ ] `/demo` UI → `/api/session` + `/api/responses` guarded by auth
  - **Interface**: Cookie-based Supabase session
  - **Testing**: E2E and integration checks

## Timeline & Deliverables

### Day 1: Foundation
- [ ] Env wired; Google provider enabled; clients implemented

### Day 2: Gating & API Security
- [ ] Middleware + layout guard; secure APIs; smoke tests

## Final Completion Criteria
- [ ] `/demo` behind auth; login/logout works; guarded APIs return 401 unauthenticated; demo functional when authenticated


