import "./global.css";

import { Toaster } from "@/components/ui/toaster";
import { createRoot } from "react-dom/client";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Dashboard from "./pages/Dashboard";
import NotFound from "./pages/NotFound";
import { ThemeProvider } from "@/hooks/use-theme";
import { SecurityProvider } from "@/hooks/use-security";
import { SecurityOverlay } from "@/components/SecurityOverlay";

const queryClient = new QueryClient();

const App = () => (
  <ThemeProvider>
    <SecurityProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <SecurityOverlay />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/dashboard" element={<Dashboard />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </QueryClientProvider>
    </SecurityProvider>
  </ThemeProvider>
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
    if (!window.__appRoot) {
      window.__appRoot = createRoot(rootElement);
    }
  } catch (e) {
    // If createRoot fails because root already exists, that's fine
    // The existing root will be used for render
  }

  // Render with the root (either newly created or existing)
  if (window.__appRoot) {
    window.__appRoot.render(<App />);
  }
}

initializeApp();
