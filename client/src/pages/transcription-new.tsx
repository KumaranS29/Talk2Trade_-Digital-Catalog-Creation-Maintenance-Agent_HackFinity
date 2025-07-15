import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Brain, Sparkles, Volume2, Copy, ArrowRight, Loader2, Package, Zap } from "lucide-react";
import type { Transcription } from "@/../../shared/schema";
import AdvancedVoiceProcessor from "@/components/AdvancedVoiceProcessor";
import { useOfflineStorage } from "@/hooks/useOfflineStorage";

export default function TranscriptionPage() {
  const [transcribedText, setTranscribedText] = useState("");
  const [translatedText, setTranslatedText] = useState("");
  const [detectedLanguage, setDetectedLanguage] = useState("");
  const [isTranslating, setIsTranslating] = useState(false);
  const [productCreated, setProductCreated] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { isOnline, addPendingAction } = useOfflineStorage();

  const { data: transcriptions, isLoading } = useQuery({
    queryKey: ["/api/transcriptions"],
    queryFn: async () => {
      const response = await fetch("/api/transcriptions");
      if (!response.ok) throw new Error("Failed to fetch transcriptions");
      return response.json() as Promise<Transcription[]>;
    },
    enabled: isOnline,
  });

  const handleTranscriptionComplete = (text: string, language: string) => {
    setTranscribedText(text);
    setDetectedLanguage(language);
    setIsProcessing(false);
    
    // Auto-translate after transcription
    if (text.trim()) {
      handleTranslate(text);
    }
  };

  const handleTranslate = async (textToTranslate?: string) => {
    const text = textToTranslate || transcribedText;
    if (!text.trim()) return;
    
    setIsTranslating(true);
    setProductCreated(null);
    
    try {
      if (!isOnline) {
        // Store for offline processing
        addPendingAction("translate", { transcription: text });
        toast({
          title: "Offline Mode",
          description: "Translation will be processed when online",
        });
        return;
      }
      
      const response = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcription: text }),
      });
      
      if (!response.ok) {
        throw new Error("Translation failed");
      }
      
      const data = await response.json();
      setTranslatedText(data.translated_text);
      setDetectedLanguage(data.detected_language);
      
      // Show product creation notification
      if (data.product_created) {
        setProductCreated(data.product_created);
        toast({
          title: "Product Auto-Created!",
          description: `"${data.product_created.title}" added to catalog`,
        });
        
        // Invalidate products query to refresh catalog
        queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      }
      
      toast({
        title: "Translation Complete",
        description: `Translated from ${data.detected_language} to English`,
      });
    } catch (error) {
      toast({
        title: "Translation Failed",
        description: "Please try again",
        variant: "destructive",
      });
    } finally {
      setIsTranslating(false);
    }
  };

  const speakText = (text: string) => {
    if ('speechSynthesis' in window) {
      // Stop any current speech
      speechSynthesis.cancel();
      
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'en-US';
      utterance.rate = 0.9;
      utterance.pitch = 1;
      utterance.volume = 1;
      
      speechSynthesis.speak(utterance);
    } else {
      toast({
        title: "Speech not supported",
        description: "Your browser doesn't support text-to-speech",
        variant: "destructive",
      });
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied!",
      description: "Text copied to clipboard",
    });
  };

  const resetSession = () => {
    setTranscribedText("");
    setTranslatedText("");
    setDetectedLanguage("");
    setProductCreated(null);
    setIsProcessing(false);
    setIsTranslating(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="max-w-6xl mx-auto p-6 space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center space-x-2">
            <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
              <Brain className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Talk2Trade Voice Input
            </h1>
          </div>
          <p className="text-slate-600 text-lg">
            Advanced AI-powered voice recognition and translation system
          </p>
          <div className="flex items-center justify-center space-x-4">
            <Badge variant="outline" className="bg-blue-50 text-blue-700">
              <Zap className="w-3 h-3 mr-1" />
              AI Enhanced
            </Badge>
            <Badge variant="outline" className="bg-green-50 text-green-700">
              Multi-Language Support
            </Badge>
            <Badge variant="outline" className="bg-purple-50 text-purple-700">
              Real-time Processing
            </Badge>
          </div>
        </div>

        {/* Advanced Voice Processor */}
        <AdvancedVoiceProcessor
          onTranscriptionComplete={handleTranscriptionComplete}
          isProcessing={isProcessing}
        />

        {/* Transcription Results */}
        {transcribedText && (
          <Card className="border-2 border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Brain className="w-5 h-5 text-blue-600" />
                <span>Transcription Result</span>
                <Badge variant="secondary">{detectedLanguage}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-4 bg-white rounded-lg shadow-sm border">
                  <p className="text-slate-800 font-medium">{transcribedText}</p>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    onClick={() => copyToClipboard(transcribedText)}
                    className="bg-white"
                  >
                    <Copy className="w-4 h-4 mr-2" />
                    Copy
                  </Button>
                  
                  <Button
                    onClick={() => handleTranslate()}
                    disabled={isTranslating}
                    className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800"
                  >
                    {isTranslating ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <ArrowRight className="w-4 h-4 mr-2" />
                    )}
                    Translate & Process
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Translation Results */}
        {translatedText && (
          <Card className="border-2 border-green-200 bg-gradient-to-r from-green-50 to-emerald-50">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Sparkles className="w-5 h-5 text-green-600" />
                <span>English Translation</span>
                <Badge variant="secondary" className="bg-green-100 text-green-800">
                  AI Processed
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-4 bg-white rounded-lg shadow-sm border">
                  <p className="text-slate-800 font-medium">{translatedText}</p>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    onClick={() => speakText(translatedText)}
                    className="bg-white"
                  >
                    <Volume2 className="w-4 h-4 mr-2" />
                    Listen
                  </Button>
                  
                  <Button
                    variant="outline"
                    onClick={() => copyToClipboard(translatedText)}
                    className="bg-white"
                  >
                    <Copy className="w-4 h-4 mr-2" />
                    Copy
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Product Creation Notification */}
        {productCreated && (
          <Card className="border-2 border-purple-200 bg-gradient-to-r from-purple-50 to-pink-50">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 text-purple-800">
                <Package className="w-5 h-5" />
                <span>Product Auto-Created!</span>
                <Badge variant="secondary" className="bg-purple-100 text-purple-800">
                  New
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="p-4 bg-white rounded-lg shadow-sm border">
                  <h3 className="font-semibold text-purple-900 mb-2">
                    "{productCreated.title}"
                  </h3>
                  <p className="text-sm text-purple-700 mb-3">
                    {productCreated.description}
                  </p>
                  <div className="flex items-center space-x-3">
                    <Badge variant="outline" className="text-purple-700 border-purple-300">
                      {productCreated.category}
                    </Badge>
                    {productCreated.price && (
                      <Badge variant="outline" className="text-green-700 border-green-300">
                        ₹{productCreated.price}
                      </Badge>
                    )}
                  </div>
                </div>
                
                <p className="text-sm text-purple-600">
                  ✨ This product has been automatically added to your catalog based on your voice input!
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Action Buttons */}
        <div className="flex justify-center space-x-4">
          <Button
            onClick={resetSession}
            variant="outline"
            className="bg-white"
          >
            Start New Session
          </Button>
          
          <Button
            onClick={() => window.location.href = '/catalog'}
            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
          >
            <Package className="w-4 h-4 mr-2" />
            View Catalog
          </Button>
        </div>

        {/* Recent Transcriptions */}
        {transcriptions && transcriptions.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Brain className="w-5 h-5 text-slate-600" />
                <span>Recent Voice Sessions</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-8">
                  <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-slate-400" />
                  <p className="text-slate-600">Loading previous sessions...</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {transcriptions.slice(0, 5).map((transcription, index) => (
                    <div key={index} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
                      <div className="flex-1">
                        <p className="text-slate-800 font-medium">{transcription.text}</p>
                        <p className="text-sm text-slate-500 mt-1">
                          {transcription.language} • {new Date(transcription.timestamp).toLocaleString()}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(transcription.text)}
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}