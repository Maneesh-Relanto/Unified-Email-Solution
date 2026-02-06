import "dotenv/config";
import express from "express";
import cors from "cors";
import { handleDemo } from "./routes/demo";
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

  // Email API routes (IMAP/OAuth/etc)
  app.post("/api/email/init", initializeProviders);
  app.get("/api/email/all", getAllEmails);
  app.get("/api/email/:emailAddress", getEmailsByProvider);
  app.get("/api/email/accounts", getAccounts);
  
  // Settings endpoints
  app.get("/api/email/configured", getConfiguredAccounts);
  app.get("/api/email/provider/:provider", getAccountsByProvider);
  app.post("/api/email/add", addEmailAccount);
  app.delete("/api/email/account/:email", removeEmailAccount);
  app.post("/api/email/test", testConnection);
  app.post("/api/email/test-with-progress", testConnectionWithProgress);
  
  // Utility endpoints
  app.post("/api/email/cache/clear", clearCache);
  app.post("/api/email/disconnect-all", disconnectAll);

  return app;
}
