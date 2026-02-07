import "dotenv/config";
import express from "express";
import cors from "cors";
import { handleDemo } from "./routes/demo";
import authRoutes from "./routes/auth";
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
} from "./routes/email";

export function createServer() {
  const app = express();

  // Middleware
  app.use(cors());
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
  app.get("/api/email/:emailAddress", getEmailsByProvider);

  return app;
}
