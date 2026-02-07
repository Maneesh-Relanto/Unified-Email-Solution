# Fusion Starter

A production-ready full-stack React application template with integrated Express server, featuring React Router 6 SPA mode, TypeScript, Vitest, Zod and modern tooling.

While the starter comes with a express server, only create endpoint when strictly neccesary, for example to encapsulate logic that must leave in the server, such as private keys handling, or certain DB operations, db...

## Tech Stack

- **PNPM**: Prefer pnpm
- **Frontend**: React 18 + React Router 6 (spa) + TypeScript + Vite + TailwindCSS 3
- **Backend**: Express server integrated with Vite dev server
- **Testing**: Vitest
- **UI**: Radix UI + TailwindCSS 3 + Lucide React icons

## Project Structure

```
client/                                  # React SPA frontend
├── pages/                               # Route components (Index.tsx = home)
├── components/ui/                       # Pre-built UI component library
├── App.tsx                              # App entry point and with SPA routing setup
└── global.css                           # TailwindCSS 3 theming and global styles

server/                                  # Express API backend
├── index.ts                             # Main server setup (express config + routes)
├── routes/
│   ├── auth.ts                          # OAuth2 authentication (6 endpoints)
│   ├── email.ts                         # Email fetching endpoints
│   └── demo.ts                          # Demo endpoints
├── services/
│   ├── email-service.ts                 # Email fetching service
│   ├── oauth/
│   │   ├── types.ts                     # OAuth2 type definitions
│   │   ├── oauth-utils.ts               # PKCE, state, URL builders
│   │   ├── google-oauth.ts              # Google OAuth implementation
│   │   └── microsoft-oauth.ts           # Microsoft OAuth implementation
│   └── email/
│       ├── types.ts                     # Email provider types
│       ├── imap-provider.ts             # IMAP email implementation
│       ├── oauth-provider.ts            # OAuth email provider (Gmail/Outlook APIs)
│       └── index.ts                     # Provider factory
├── config/
│   └── email-config.ts                  # Credential storage (IMAP + OAuth)
└── utils/
    └── crypto.ts                        # AES-256-CBC encryption

shared/                                  # Types used by both client & server
└── api.ts                               # Shared API interfaces
```

## Key Features

### OAuth2 Authentication
- ✅ **Google OAuth** - Gmail account integration
- ✅ **Microsoft OAuth** - Outlook account integration
- ✅ **PKCE Security** - S256 authorization code flow
- ✅ **Token Encryption** - AES-256-CBC at-rest token storage
- ✅ **Token Refresh** - Automatic token rotation
- ✅ **CSRF Protection** - State token validation

### Email Service
- ✅ **Multi-Provider** - Gmail and Outlook support
- ✅ **OAuth Integration** - Secure token-based access
- ✅ **Email Fetching** - Read emails from providers
- ✅ **Caching** - Optimized email caching with TTL
- ✅ **Unified View** - Combine emails from multiple accounts

### SPA Routing System

The routing system is powered by React Router 6:

- `client/pages/Index.tsx` represents the home page.
- Routes are defined in `client/App.tsx` using the `react-router-dom` import
- Route files are located in the `client/pages/` directory

For example, routes can be defined with:

```typescript
import { BrowserRouter, Routes, Route } from "react-router-dom";

<Routes>
  <Route path="/" element={<Index />} />
  {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
  <Route path="*" element={<NotFound />} />
</Routes>;
```

### Styling System

- **Primary**: TailwindCSS 3 utility classes
- **Theme and design tokens**: Configure in `client/global.css` 
- **UI components**: Pre-built library in `client/components/ui/`
- **Utility**: `cn()` function combines `clsx` + `tailwind-merge` for conditional classes

```typescript
// cn utility usage
className={cn(
  "base-classes",
  { "conditional-class": condition },
  props.className  // User overrides
)}
```

### Express Server Integration

- **Development**: Single port (8080) for both frontend/backend
- **Hot reload**: Both client and server code
- **API endpoints**: Prefixed with `/api/`

#### Example API Routes
- `GET /api/ping` - Simple ping api
- `GET /api/demo` - Demo endpoint  

### Shared Types
Import consistent types in both client and server:
```typescript
import { DemoResponse } from '@shared/api';
```

Path aliases:
- `@shared/*` - Shared folder
- `@/*` - Client folder

## Development Commands

```bash
pnpm dev        # Start dev server (client + server)
pnpm build      # Production build
pnpm start      # Start production server
pnpm typecheck  # TypeScript validation
pnpm test          # Run Vitest tests
```

## Adding Features

### Add new colors to the theme

Open `client/global.css` and `tailwind.config.ts` and add new tailwind colors.

### New API Route
1. **Optional**: Create a shared interface in `shared/api.ts`:
```typescript
export interface MyRouteResponse {
  message: string;
  // Add other response properties here
}
```

2. Create a new route handler in `server/routes/my-route.ts`:
```typescript
import { RequestHandler } from "express";
import { MyRouteResponse } from "@shared/api"; // Optional: for type safety

export const handleMyRoute: RequestHandler = (req, res) => {
  const response: MyRouteResponse = {
    message: 'Hello from my endpoint!'
  };
  res.json(response);
};
```

3. Register the route in `server/index.ts`:
```typescript
import { handleMyRoute } from "./routes/my-route";

// Add to the createServer function:
app.get("/api/my-endpoint", handleMyRoute);
```

4. Use in React components with type safety:
```typescript
import { MyRouteResponse } from '@shared/api'; // Optional: for type safety

const response = await fetch('/api/my-endpoint');
const data: MyRouteResponse = await response.json();
```

### New Page Route
1. Create component in `client/pages/MyPage.tsx`
2. Add route in `client/App.tsx`:
```typescript
<Route path="/my-page" element={<MyPage />} />
```

## OAuth2 Authentication

**See**: [OAUTH_IMPLEMENTATION.md](./OAUTH_IMPLEMENTATION.md) for complete OAuth2 setup and usage guide.

Quick start:
```bash
# 1. Set up credentials in .env (Google + Microsoft)
# 2. Dev server runs on http://localhost:8080

# 3. Start OAuth flow
GET http://localhost:8080/auth/google/login
# Returns authorization URL for user to click

# 4. Check authenticated providers
GET http://localhost:8080/api/email/auth/status
```

Features:
- ✅ Google OAuth (Gmail)
- ✅ Microsoft OAuth (Outlook)
- ✅ PKCE security (S256)
- ✅ Token encryption (AES-256-CBC)
- ✅ Automatic token refresh
- ✅ State-based CSRF protection

## Email Service

**See**: [IMAP_QUICKSTART.md](./IMAP_QUICKSTART.md) for IMAP email fetching and [OAUTH_IMPLEMENTATION.md](./OAUTH_IMPLEMENTATION.md) for OAuth email integration.

Supports both IMAP (Gmail, Yahoo, etc.) and OAuth (Gmail API, Microsoft Graph API) providers.

## Production Deployment

- **Standard**: `pnpm build`
- **Binary**: Self-contained executables (Linux, macOS, Windows)
- **Cloud Deployment**: Use either Netlify or Vercel via their MCP integrations for easy deployment. Both providers work well with this starter template.

## Architecture Notes

- Single-port development with Vite + Express integration
- TypeScript throughout (client, server, shared)
- Full hot reload for rapid development
- Production-ready with multiple deployment options
- Comprehensive UI component library included
- Type-safe API communication via shared interfaces
