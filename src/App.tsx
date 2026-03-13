import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import News from "./pages/News";
import Insights from "./pages/Insights";
import DiyInsights from "./pages/DiyInsights";
import DiyNews from "./pages/DiyNews";
import TrendBriefing from "./pages/TrendBriefing";
import Research from "./pages/Research";
import Patents from "./pages/Patents";
import Feedback from "./pages/Feedback";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<TrendBriefing />} />
          <Route path="/charts" element={<Index />} />
          <Route path="/news" element={<News />} />
          <Route path="/insights" element={<Insights />} />
          <Route path="/diy-news" element={<DiyNews />} />
          <Route path="/diy-insights" element={<DiyInsights />} />
          <Route path="/research" element={<Research />} />
          <Route path="/patents" element={<Patents />} />
          <Route path="/feedback" element={<Feedback />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
