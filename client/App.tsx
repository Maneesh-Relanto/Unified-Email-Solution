import "./global.css";

import { Toaster } from "@/components/ui/toaster";
import { createRoot } from "react-dom/client";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Dashboard from "./pages/Dashboard";
import UnifiedInbox from "./pages/UnifiedInbox";
import Settings from "./pages/Settings";
import OAuthIntegration from "./pages/OAuthIntegration";
import NotFound from "./pages/NotFound";
import { ThemeProvider } from "@/hooks/use-theme";
import { SecurityProvider } from "@/hooks/use-security";
import { SecurityOverlay } from "@/components/SecurityOverlay";
import { ErrorBoundary } from "@/components/ErrorBoundary";

const queryClient = new QueryClient();

const App = () => (
  <ErrorBoundary>
    <ThemeProvider>
      <SecurityProvider>
        <QueryClientProvider client={queryClient}>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <SecurityOverlay />
            <BrowserRouter>
              <div
                className="h-screen w-screen overflow-hidden"
                data-page-wrapper
              >
                <Routes>
                  <Route path="/" element={<Index />} />
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/unified-inbox" element={<UnifiedInbox />} />
                  <Route path="/settings" element={<Settings />} />
                  <Route path="/oauth-integration" element={<OAuthIntegration />} />
                  {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </div>
            </BrowserRouter>
          </TooltipProvider>
        </QueryClientProvider>
      </SecurityProvider>
    </ThemeProvider>
  </ErrorBoundary>
);

declare global {
  interface Window {
    __appRoot?: ReturnType<typeof createRoot>;
  }
}

function initializeApp() {
  const rootElement = document.getElementById("root");
  if (!rootElement) return;

  try {
    // Try to create a new root - if it fails, the root already exists
    if (!globalThis.__appRoot) {
      globalThis.__appRoot = createRoot(rootElement);
    }
  } catch (e) {
    // If createRoot fails because root already exists, log and continue
    console.warn('Root already exists, reusing existing root:', e);
  }

  // Render with the root (either newly created or existing)
  if (globalThis.__appRoot) {
    globalThis.__appRoot.render(<App />);
  }
}

initializeApp();
