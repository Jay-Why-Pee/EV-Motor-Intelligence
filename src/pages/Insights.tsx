import { Header } from "@/components/Header";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { InsightsSection } from "@/components/InsightsSection";

const Insights = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <Navigation activeView="insights" onViewChange={() => {}} />
      
      <main className="container mx-auto px-4 py-6 md:py-8 max-w-7xl">
        <InsightsSection />
      </main>

      <Footer />
    </div>
  );
};

export default Insights;
