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

  const { data: transcriptions = [], isLoading: transcriptionsLoading } = useQuery({
    queryKey: ["/api/transcriptions"],
  });

  const transcribeMutation = useMutation({
    mutationFn: async (audioBlob: Blob) => {
      console.log('Audio blob size:', audioBlob.size, 'type:', audioBlob.type);
      
      if (audioBlob.size === 0) {
        throw new Error('No audio data recorded');
      }
      
      const formData = new FormData();
      // Use appropriate file extension based on MIME type
      let filename = "recording.webm";
      if (audioBlob.type.includes('mp4')) {
        filename = "recording.mp4";
      } else if (audioBlob.type.includes('wav')) {
        filename = "recording.wav";
      }
      
      formData.append("audio", audioBlob, filename);
      formData.append("language", selectedLanguage); // Add selected language
      
      const response = await apiRequest("POST", "/api/transcribe", formData);
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/transcriptions"] });
      toast({
        title: "Transcription Complete",
        description: `Successfully transcribed audio in ${data.language}`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Transcription Failed",
        description: error.message || "Failed to transcribe audio. Please try again.",
        variant: "destructive",
      });
    },
  });

  const translateMutation = useMutation({
    mutationFn: async (transcriptionText: string) => {
      const response = await apiRequest("POST", "/api/translate", {
        transcription: transcriptionText
      });
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Translation Complete",
        description: `Translated from ${data.detected_language} to English`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Translation Failed", 
        description: error.message || "Failed to translate text. Please try again.",
        variant: "destructive",
      });
    },
  });

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 16000,
        } 
      });
      
      // Try different MIME types in order of preference
      let mimeType = 'audio/webm';
      if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
        mimeType = 'audio/webm;codecs=opus';
      } else if (MediaRecorder.isTypeSupported('audio/webm')) {
        mimeType = 'audio/webm';
      } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
        mimeType = 'audio/mp4';
      }

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: mimeType
      });
      
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };
      
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType });
        setAudioBlob(blob);
        stream.getTracks().forEach(track => track.stop());
      };
      
      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      
      // Start timer
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
      
    } catch (error) {
      toast({
        title: "Recording Failed",
        description: "Could not access microphone. Please check permissions.",
        variant: "destructive",
      });
    }
  }, [toast]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  }, [isRecording]);

  const handleTranscribe = useCallback(() => {
    if (audioBlob) {
      transcribeMutation.mutate(audioBlob);
    }
  }, [audioBlob, transcribeMutation, selectedLanguage]);

  const handleTranslate = useCallback((text: string) => {
    translateMutation.mutate(text);
  }, [translateMutation]);

  const handleTextToSpeech = useCallback((text: string) => {
    if (isSpeaking) {
      // Stop current speech
      speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    // Check if speech synthesis is supported
    if (!('speechSynthesis' in window)) {
      toast({
        title: "Not Supported",
        description: "Text-to-speech is not supported in this browser.",
        variant: "destructive",
      });
      return;
    }

    try {
      const utterance = new SpeechSynthesisUtterance(text);
      speechSynthesisRef.current = utterance;
      
      // Configure speech settings
      utterance.rate = 0.8; // Slightly slower for better clarity
      utterance.pitch = 1.0;
      utterance.volume = 1.0;
      utterance.lang = 'en-US'; // English for translated text
      
      // Event listeners
      utterance.onstart = () => {
        setIsSpeaking(true);
      };
      
      utterance.onend = () => {
        setIsSpeaking(false);
      };
      
      utterance.onerror = (event) => {
        console.error('Speech synthesis error:', event);
        setIsSpeaking(false);
        toast({
          title: "Speech Error",
          description: "Failed to play text-to-speech.",
          variant: "destructive",
        });
      };
      
      // Start speaking
      speechSynthesis.speak(utterance);
      
    } catch (error) {
      console.error('Text-to-speech error:', error);
      toast({
        title: "Speech Error",
        description: "Failed to initialize text-to-speech.",
        variant: "destructive",
      });
    }
  }, [isSpeaking, toast]);

  const copyToClipboard = useCallback((text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied",
      description: "Text copied to clipboard",
    });
  }, [toast]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const latestTranscription = transcriptions[0];
  const translationData = translateMutation.data;
  
  // Language options for selection
  const languageOptions = [
    { value: 'ta', label: 'Tamil (தமிழ்)', assemblyCode: 'ta' },
    { value: 'hi', label: 'Hindi (हिंदी)', assemblyCode: 'hi' },
    { value: 'te', label: 'Telugu (తెలుగు)', assemblyCode: 'te' },
    { value: 'ml', label: 'Malayalam (മലയാളം)', assemblyCode: 'ml' },
    { value: 'kn', label: 'Kannada (ಕನ್ನಡ)', assemblyCode: 'kn' },
    { value: 'mr', label: 'Marathi (मराठी)', assemblyCode: 'mr' },
    { value: 'gu', label: 'Gujarati (ગુજરાતી)', assemblyCode: 'gu' },
    { value: 'bn', label: 'Bengali (বাংলা)', assemblyCode: 'bn' },
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Recording Interface */}
        <Card className="mb-8">
          <CardContent className="p-8">
            <div className="text-center">
              <div className="mb-6">
                <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 transition-all duration-300 ${
                  isRecording ? 'bg-red-100' : 'bg-slate-100'
                }`}>
                  <Mic className={`text-2xl ${isRecording ? 'text-red-500' : 'text-slate-400'}`} />
                </div>
                <h2 className="text-2xl font-semibold text-slate-900 mb-2">Voice Recording</h2>
                <p className="text-slate-600">Select your language and speak clearly</p>
              </div>

              {/* Language Selection */}
              <div className="mb-6">
                <div className="flex items-center justify-center space-x-2 mb-3">
                  <Languages className="w-5 h-5 text-slate-600" />
                  <span className="text-sm font-medium text-slate-700">Language to Speak:</span>
                </div>
                <div className="max-w-md mx-auto">
                  <Select value={selectedLanguage} onValueChange={setSelectedLanguage}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Choose your language" />
                    </SelectTrigger>
                    <SelectContent>
                      {languageOptions.map((lang) => (
                        <SelectItem key={lang.value} value={lang.value}>
                          {lang.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Recording Controls */}
              <div className="flex justify-center space-x-4 mb-6">
                <Button
                  onClick={startRecording}
                  disabled={isRecording}
                  className="px-6 py-3"
                >
                  <Play className="w-4 h-4 mr-2" />
                  Start Recording
                </Button>
                <Button
                  onClick={stopRecording}
                  disabled={!isRecording}
                  variant="destructive"
                  className="px-6 py-3"
                >
                  <Square className="w-4 h-4 mr-2" />
                  Stop Recording
                </Button>
              </div>

              {/* Recording Status */}
              <div className="bg-slate-50 rounded-lg p-4 mb-4">
                <div className="flex items-center justify-center space-x-2">
                  <div className={`w-2 h-2 rounded-full ${
                    isRecording ? 'bg-red-500 animate-pulse' : 'bg-slate-400'
                  }`} />
                  <span className={`text-sm ${
                    isRecording ? 'text-red-600 font-medium' : 'text-slate-600'
                  }`}>
                    {isRecording ? `Recording... ${formatTime(recordingTime)}` : 'Ready to record'}
                  </span>
                </div>
              </div>

              {/* Audio Visualization */}
              {isRecording && (
                <div className="bg-slate-50 rounded-lg p-8 mb-4">
                  <div className="flex items-center justify-center space-x-1">
                    {[...Array(5)].map((_, i) => (
                      <div
                        key={i}
                        className="w-1 bg-primary rounded-full animate-pulse"
                        style={{
                          height: `${Math.random() * 24 + 16}px`,
                          animationDelay: `${i * 0.1}s`
                        }}
                      />
                    ))}
                  </div>
                  <p className="text-sm text-slate-600 mt-2">Recording in progress...</p>
                </div>
              )}

              {/* Transcribe Button */}
              {audioBlob && !isRecording && (
                <Button
                  onClick={handleTranscribe}
                  disabled={transcribeMutation.isPending}
                  className="mb-4"
                >
                  {transcribeMutation.isPending ? 'Processing...' : 'Transcribe Audio'}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Transcription Results */}
        <Card className="mb-8">
          <CardContent className="p-8">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-slate-900">Transcription Results</h3>
              {latestTranscription && (
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-slate-500">Language:</span>
                  <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                    {latestTranscription.language}
                  </Badge>
                </div>
              )}
            </div>

            {/* Loading State */}
            {transcribeMutation.isPending && (
              <div className="flex items-center justify-center p-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                <span className="ml-3 text-slate-600">Processing transcription...</span>
              </div>
            )}

            {/* Transcription Output */}
            {!transcribeMutation.isPending && (
              <div className="bg-slate-50 rounded-lg p-6 min-h-32">
                {latestTranscription ? (
                  <div className="border-l-4 border-emerald-500 pl-4">
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0 mt-1">
                        <Check className="text-emerald-500 w-5 h-5" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm text-slate-600 mb-2">Latest Transcription:</p>
                        <p className="text-slate-900 font-medium leading-relaxed">
                          {latestTranscription.text}
                        </p>
                        <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-200">
                          <span className="text-xs text-slate-500">
                            {latestTranscription.duration && `Duration: ${Math.round(latestTranscription.duration)}s`}
                          </span>
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => handleTranslate(latestTranscription.text)}
                              disabled={translateMutation.isPending}
                              className="text-xs text-blue-600 hover:text-blue-500 font-medium"
                            >
                              {translateMutation.isPending ? 'Translating...' : 'Translate'}
                            </button>
                            <button
                              onClick={() => copyToClipboard(latestTranscription.text)}
                              className="text-xs text-primary hover:text-primary/80 font-medium"
                            >
                              <Copy className="w-3 h-3 mr-1 inline" />
                              Copy
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <p className="text-slate-500">Your transcribed text will appear here</p>
                  </div>
                )}
                
                {/* Translation Results */}
                {translationData && (
                  <div className="mt-6 border-l-4 border-green-500 pl-4">
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0 mt-1">
                        <Check className="text-green-500 w-5 h-5" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <p className="text-sm text-slate-600">English Translation:</p>
                          <Badge variant="secondary" className="bg-green-100 text-green-800">
                            {translationData.detected_language === 'ta' ? 'Tamil' : 
                             translationData.detected_language === 'hi' ? 'Hindi' :
                             translationData.detected_language === 'te' ? 'Telugu' :
                             translationData.detected_language === 'ml' ? 'Malayalam' :
                             translationData.detected_language === 'kn' ? 'Kannada' :
                             translationData.detected_language === 'mr' ? 'Marathi' :
                             translationData.detected_language}
                          </Badge>
                        </div>
                        <p className="text-slate-900 font-medium leading-relaxed">
                          {translationData.translated_text}
                        </p>
                        {translationData.original_text && (
                          <div className="mt-2 text-xs text-slate-500">
                            <p>Original: {translationData.original_text}</p>
                            {translationData.processed_text && translationData.processed_text !== translationData.original_text && (
                              <p>Processed: {translationData.processed_text}</p>
                            )}
                          </div>
                        )}
                        <div className="flex items-center justify-end mt-3 pt-2 border-t border-slate-200 space-x-3">
                          <button
                            onClick={() => handleTextToSpeech(translationData.translated_text)}
                            className="text-xs text-green-600 hover:text-green-500 font-medium flex items-center"
                          >
                            {isSpeaking ? (
                              <>
                                <VolumeX className="w-3 h-3 mr-1" />
                                Stop
                              </>
                            ) : (
                              <>
                                <Volume2 className="w-3 h-3 mr-1" />
                                Play
                              </>
                            )}
                          </button>
                          <button
                            onClick={() => copyToClipboard(translationData.translated_text)}
                            className="text-xs text-primary hover:text-primary/80 font-medium"
                          >
                            <Copy className="w-3 h-3 mr-1 inline" />
                            Copy Translation
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Extracted Details Section */}
                {translationData && translationData.extracted_details && (
                  <div className="mt-6 border-l-4 border-purple-500 pl-4">
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0 mt-1">
                        <Check className="text-purple-500 w-5 h-5" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <p className="text-sm text-slate-600">Extracted Details:</p>
                          <Badge variant="secondary" className="bg-purple-100 text-purple-800">
                            AI Analysis
                          </Badge>
                        </div>
                        <div className="space-y-2">
                          {translationData.extracted_details.success ? (
                            <div className="space-y-2">
                              {Object.entries(translationData.extracted_details.details).map(([key, value]) => (
                                <div key={key} className="flex items-start space-x-2">
                                  <span className="text-xs text-purple-600 bg-purple-100 px-2 py-1 rounded capitalize min-w-fit">
                                    {key.replace(/_/g, ' ')}:
                                  </span>
                                  <span className="text-slate-900 text-sm">
                                    {Array.isArray(value) ? value.join(', ') : String(value)}
                                  </span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-slate-600 text-sm">
                              {translationData.extracted_details.error || 'No details could be extracted'}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center justify-end mt-3 pt-2 border-t border-slate-200">
                          <button
                            onClick={() => copyToClipboard(JSON.stringify(translationData.extracted_details, null, 2))}
                            className="text-xs text-purple-600 hover:text-purple-500 font-medium"
                          >
                            <Copy className="w-3 h-3 mr-1 inline" />
                            Copy Details
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* System Status */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-lg font-semibold text-slate-900">System Status</h4>
                <Badge variant="secondary" className="bg-emerald-100 text-emerald-800">
                  <Circle className="w-2 h-2 mr-1 fill-current text-emerald-400" />
                  Online
                </Badge>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">Microphone Access</span>
                  <Check className="w-4 h-4 text-emerald-500" />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">Transcription Service</span>
                  <Check className="w-4 h-4 text-emerald-500" />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">Translation Service</span>
                  <Check className="w-4 h-4 text-emerald-500" />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">Text-to-Speech</span>
                  <Check className="w-4 h-4 text-emerald-500" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-lg font-semibold text-slate-900">Supported Languages</h4>
                <span className="text-xs text-slate-500">50+ languages</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {['Tamil', 'Hindi', 'Telugu', 'Bengali', 'Malayalam'].map((lang) => (
                  <Badge key={lang} variant="secondary" className="bg-blue-100 text-blue-800">
                    {lang}
                  </Badge>
                ))}
                <Badge variant="secondary" className="bg-slate-100 text-slate-600">
                  +45 more
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Instructions */}
        <Card>
          <CardContent className="p-8">
            <h3 className="text-lg font-semibold text-slate-900 mb-6">How to Use</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Mic className="text-primary w-6 h-6" />
                </div>
                <h4 className="font-medium text-slate-900 mb-2">1. Start Recording</h4>
                <p className="text-sm text-slate-600">Click the "Start Recording" button to begin capturing your voice input.</p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Circle className="text-primary w-6 h-6" />
                </div>
                <h4 className="font-medium text-slate-900 mb-2">2. Speak Clearly</h4>
                <p className="text-sm text-slate-600">Speak in your preferred local language. The system supports Tamil, Hindi, and many others.</p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <FileText className="text-primary w-6 h-6" />
                </div>
                <h4 className="font-medium text-slate-900 mb-2">3. Get Transcription</h4>
                <p className="text-sm text-slate-600">Stop recording and receive your transcribed text in English instantly.</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Real-time Product Creation Notification */}
        {translateMutation.data?.product_created && (
          <Card className="mb-8 border-green-200 bg-green-50">
            <CardContent className="p-6">
              <div className="flex items-start space-x-3">
                <Package className="w-6 h-6 text-green-600 mt-1" />
                <div className="flex-1">
                  <h3 className="font-medium text-green-900 mb-2">Product Catalog Entry Created!</h3>
                  <p className="text-green-800 mb-3">
                    Automatically extracted product details and created catalog entry from your voice input.
                  </p>
                  <div className="bg-white rounded-lg p-3 border border-green-200">
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div><strong>Name:</strong> {translateMutation.data.product_created.name}</div>
                      <div><strong>Category:</strong> {translateMutation.data.product_created.category}</div>
                      {translateMutation.data.product_created.price && (
                        <div><strong>Price:</strong> {translateMutation.data.product_created.currency} {translateMutation.data.product_created.price}</div>
                      )}
                      <div><strong>Status:</strong> {translateMutation.data.product_created.status}</div>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center space-x-2">
                    <Button variant="outline" size="sm" onClick={() => window.location.href = '/catalog'}>
                      <Package className="w-4 h-4 mr-1" />
                      View in Catalog
                    </Button>
                    <span className="text-sm text-green-700">Product ID: #{translateMutation.data.product_created.id}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Footer */}
        <footer className="bg-white border-t border-slate-200 mt-12 -mx-4">
          <div className="max-w-4xl mx-auto px-4 py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <span className="text-sm text-slate-500">Powered by AssemblyAI & Google Translate</span>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-emerald-400 rounded-full"></div>
                  <span className="text-xs text-slate-500">API Status: Active</span>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <button className="text-sm text-slate-500 hover:text-slate-700">
                  <Settings className="w-4 h-4 mr-1 inline" />
                  Settings
                </button>
                <button className="text-sm text-slate-500 hover:text-slate-700">
                  <HelpCircle className="w-4 h-4 mr-1 inline" />
                  Help
                </button>
              </div>
            </div>
          </div>
        </footer>
      </div>
  );
}
