import { Header } from "@/components/Header";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { NewsView } from "@/components/NewsView";

const News = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <Navigation activeView="news" />
      
      <main className="container mx-auto px-4 py-6 md:py-8 max-w-7xl">
        <NewsView />
      </main>

      <Footer />
    </div>
  );
};

export default News;
