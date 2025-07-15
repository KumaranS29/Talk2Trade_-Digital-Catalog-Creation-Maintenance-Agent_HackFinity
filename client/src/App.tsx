import { Switch, Route, Link, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import TranscriptionPage from "@/pages/transcription";
import CatalogPage from "@/pages/catalog";
import NotFound from "@/pages/not-found";
import SplashScreen from "@/components/SplashScreen";
import { useOfflineStorage } from "@/hooks/useOfflineStorage";
import { Mic, Package, Wifi, WifiOff, Clock } from "lucide-react";
import { useState, useEffect } from "react";

function Navigation() {
  const [location] = useLocation();
  const { isOnline, pendingSync } = useOfflineStorage();
  
  return (
    <nav className="bg-white border-b border-slate-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-8">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                <Mic className="text-white text-sm" />
              </div>
              <span className="font-bold text-xl bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Talk2Trade
              </span>
            </div>
            
            <div className="flex items-center space-x-1">
              <Link href="/">
                <Button 
                  variant={location === "/" ? "default" : "ghost"} 
                  size="sm"
                  className="flex items-center space-x-2"
                >
                  <Mic className="w-4 h-4" />
                  <span>Voice Input</span>
                </Button>
              </Link>
              
              <Link href="/catalog">
                <Button 
                  variant={location === "/catalog" ? "default" : "ghost"} 
                  size="sm"
                  className="flex items-center space-x-2"
                >
                  <Package className="w-4 h-4" />
                  <span>Product Catalog</span>
                </Button>
              </Link>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            {/* Sync Status */}
            {pendingSync && (
              <div className="flex items-center space-x-1 text-orange-600">
                <Clock className="w-4 h-4 animate-spin" />
                <span className="text-sm">Syncing...</span>
              </div>
            )}
            
            {/* Online/Offline Status */}
            <div className="flex items-center space-x-2">
              {isOnline ? (
                <>
                  <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
                  <Wifi className="w-4 h-4 text-emerald-600" />
                  <span className="text-sm text-emerald-600">Online</span>
                </>
              ) : (
                <>
                  <div className="w-2 h-2 bg-orange-400 rounded-full animate-pulse"></div>
                  <WifiOff className="w-4 h-4 text-orange-600" />
                  <span className="text-sm text-orange-600">Offline</span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}

function Router() {
  return (
    <div className="min-h-screen bg-slate-50">
      <Navigation />
      <Switch>
        <Route path="/" component={TranscriptionPage} />
        <Route path="/catalog" component={CatalogPage} />
        <Route component={NotFound} />
      </Switch>
    </div>
  );
}

function App() {
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  if (showSplash) {
    return <SplashScreen />;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
