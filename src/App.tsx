import { useState } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import PasswordGate from "./pages/PasswordGate";
import Index from "./pages/Index";
import News from "./pages/News";
import Insights from "./pages/Insights";
import TrendBriefing from "./pages/TrendBriefing";
import Research from "./pages/Research";
import Patents from "./pages/Patents";
import Feedback from "./pages/Feedback";
import Guide from "./pages/Guide";
import Changelog from "./pages/Changelog";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => {
  const [authenticated, setAuthenticated] = useState(
    () => sessionStorage.getItem("ax_authenticated") === "true"
  );

  if (!authenticated) {
    return (
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <PasswordGate onAuthenticated={() => setAuthenticated(true)} />
        </TooltipProvider>
      </QueryClientProvider>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<TrendBriefing />} />
            <Route path="/guide" element={<Guide />} />
            <Route path="/charts" element={<Index />} />
            <Route path="/news" element={<News />} />
            <Route path="/insights" element={<Insights />} />
            <Route path="/research" element={<Research />} />
            <Route path="/patents" element={<Patents />} />
            <Route path="/feedback" element={<Feedback />} />
            <Route path="/changelog" element={<Changelog />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
