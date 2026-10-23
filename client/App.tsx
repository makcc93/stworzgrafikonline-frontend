import "./global.css";

import { Toaster } from "@/components/ui/toaster";
import { createRoot } from "react-dom/client";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AppProvider } from "@/context/AppContext";
import Index from "./pages/Index";
import ScheduleEditorPage from "./pages/ScheduleEditorPage";
import AdminPage from "./pages/AdminPage";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import Regulamin from "./pages/Regulamin";
import NotFound from "./pages/NotFound";
import DemoSessionBanner from "@/components/user-page/DemoSessionBanner";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AppProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <DemoSessionBanner />

        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route
              path="/schedule/:storeId/:monthId/:year"
              element={<ScheduleEditorPage />}
            />
            <Route path="/admin" element={<AdminPage />} />
            <Route
              path="/polityka-prywatnosci"
              element={<PrivacyPolicy />}
            />
            <Route path="/regulamin" element={<Regulamin />} />

            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AppProvider>
  </QueryClientProvider>
);

let root = (window as any).__root;

if (!root) {
  root = createRoot(document.getElementById("root")!);
  (window as any).__root = root;
}

root.render(<App />);
