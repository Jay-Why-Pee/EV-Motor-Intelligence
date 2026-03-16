import { Header } from "@/components/Header";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { ChartsView } from "@/components/ChartsView";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <Navigation activeView="charts" />
      
      <main className="container mx-auto px-4 py-6 md:py-8 max-w-7xl">
        <ChartsView />
      </main>

      <Footer />
    </div>
  );
};

export default Index;
