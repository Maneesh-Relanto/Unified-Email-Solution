import dotenv from "dotenv";
import path from "path";

// Load environment variables from confidential/.env
// This keeps actual credentials outside of Git tracking
dotenv.config({ path: path.resolve(process.cwd(), "confidential/.env") });

import express from "express";
import { applySecurityMiddleware } from "./middleware/security";
import { handleDemo } from "./routes/demo";
import authRoutes, { handleAuthStatus, handleAuthDisconnect, handleOAuthConfigStatus } from "./routes/auth";
import {
  initializeProviders,
  getAllEmails,
  getEmailsByProvider,
  getAccounts,
  getConfiguredAccounts,
  getAccountsByProvider,
  addEmailAccount,
  removeEmailAccount,
  testConnection,
  testConnectionWithProgress,
  clearCache,
  disconnectAll,
  getOAuthEmails,
  getAllOAuthEmails,
  getEmailDetail,
  markEmailAsRead,
  archiveEmail,
  deleteEmail,
} from "./routes/email";

export function createServer() {
  const app = express();

  // Apply comprehensive security middleware FIRST
  // This includes: Helmet headers, CORS whitelist, rate limiting, HTTPS enforcement
  applySecurityMiddleware(app);

  // Then apply JSON parsing middleware
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Example API routes
  app.get("/api/ping", (_req, res) => {
    const ping = process.env.PING_MESSAGE ?? "ping";
    res.json({ message: ping });
  });

  app.get("/api/demo", handleDemo);

  // OAuth2 Authentication routes
  app.use("/auth", authRoutes);

  // OAuth auth status and management endpoints
  app.get("/api/email/auth/status", handleAuthStatus);
  app.get("/api/email/oauth-config", handleOAuthConfigStatus);
  app.post("/api/email/auth/disconnect", handleAuthDisconnect);

  // Email API routes (IMAP/OAuth/etc)
  // IMPORTANT: Specific routes must come BEFORE parameterized routes
  app.post("/api/email/init", initializeProviders);
  app.get("/api/email/all", getAllEmails);
  app.get("/api/email/accounts", getAccounts);
  
  // OAuth email fetching - specific before parameterized
  app.get("/api/email/oauth/all", getAllOAuthEmails);
  app.get("/api/email/oauth/provider/:email", getOAuthEmails);
  
  // Settings endpoints - specific before parameterized
  app.get("/api/email/configured", getConfiguredAccounts);
  app.post("/api/email/add", addEmailAccount);
  app.post("/api/email/test", testConnection);
  app.post("/api/email/test-with-progress", testConnectionWithProgress);
  app.post("/api/email/cache/clear", clearCache);
  app.post("/api/email/disconnect-all", disconnectAll);
  app.delete("/api/email/account/:email", removeEmailAccount);
  
  // Parameterized routes come LAST
  app.get("/api/email/provider/:provider", getAccountsByProvider);
  app.get("/api/email/:provider/:emailId", getEmailDetail);  // Email detail - must be before generic :emailAddress
  app.put("/api/email/:provider/:emailId/read", markEmailAsRead);
  app.post("/api/email/:provider/:emailId/archive", archiveEmail);
  app.delete("/api/email/:provider/:emailId", deleteEmail);
  app.get("/api/email/:emailAddress", getEmailsByProvider);

  return app;
}
