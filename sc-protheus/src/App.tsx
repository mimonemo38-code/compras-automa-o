import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import Home from "@/pages/Home";
import Rules from "@/pages/Rules";
import Portfolio from "@/pages/Portfolio";

const queryClient = new QueryClient();

type Page = "home" | "rules" | "portfolio";

function AppRouter() {
  const [page, setPage] = useState<Page>("home");

  if (page === "rules") return <Rules onBack={() => setPage("home")} />;
  if (page === "portfolio") return <Portfolio onBack={() => setPage("home")} />;
  return (
    <Home
      onRules={() => setPage("rules")}
      onPortfolio={() => setPage("portfolio")}
    />
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppRouter />
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;
