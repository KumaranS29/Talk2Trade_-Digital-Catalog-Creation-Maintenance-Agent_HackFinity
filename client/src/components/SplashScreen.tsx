import { useEffect, useState } from "react";
import { Mic, Package, Sparkles } from "lucide-react";

export default function SplashScreen() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(timer);
          return 100;
        }
        return prev + 2;
      });
    }, 50);

    return () => clearInterval(timer);
  }, []);

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-blue-600 via-purple-600 to-indigo-800 flex items-center justify-center">
      <div className="text-center">
        {/* Animated Logo */}
        <div className="relative mb-8">
          <div className="w-24 h-24 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
            <Mic className="w-12 h-12 text-white" />
          </div>
          <div className="absolute -top-2 -right-2 w-8 h-8 bg-yellow-400 rounded-full flex items-center justify-center animate-bounce">
            <Sparkles className="w-4 h-4 text-yellow-800" />
          </div>
        </div>

        {/* App Title */}
        <h1 className="text-4xl font-bold text-white mb-2">
          Talk2Trade
        </h1>
        <p className="text-white/80 text-lg mb-8">
          AI-Powered Voice Catalog Assistant
        </p>

        {/* Features Preview */}
        <div className="flex justify-center space-x-8 mb-8">
          <div className="text-center">
            <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center mb-2">
              <Mic className="w-6 h-6 text-white" />
            </div>
            <p className="text-white/80 text-sm">Voice Input</p>
          </div>
          <div className="text-center">
            <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center mb-2">
              <Package className="w-6 h-6 text-white" />
            </div>
            <p className="text-white/80 text-sm">Smart Catalog</p>
          </div>
          <div className="text-center">
            <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center mb-2">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <p className="text-white/80 text-sm">AI Enhanced</p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-64 mx-auto">
          <div className="w-full bg-white/20 rounded-full h-2 mb-4">
            <div 
              className="bg-white h-2 rounded-full transition-all duration-300 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-white/80 text-sm">
            {progress < 100 ? "Loading..." : "Ready!"}
          </p>
        </div>

        {/* Tagline */}
        <p className="text-white/60 text-xs mt-6">
          Speak in your language • Create digital catalogs effortlessly
        </p>
      </div>
    </div>
  );
}