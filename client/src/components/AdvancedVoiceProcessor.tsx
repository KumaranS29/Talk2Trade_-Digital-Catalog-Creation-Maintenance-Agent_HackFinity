import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Mic, MicOff, Volume2, Pause, Play, Square, Loader2, Brain, Zap } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface AdvancedVoiceProcessorProps {
  onTranscriptionComplete: (text: string, language: string) => void;
  isProcessing: boolean;
}

export default function AdvancedVoiceProcessor({ 
  onTranscriptionComplete, 
  isProcessing 
}: AdvancedVoiceProcessorProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [recordingTime, setRecordingTime] = useState(0);
  const [selectedLanguage, setSelectedLanguage] = useState("ta");
  const [confidenceScore, setConfidenceScore] = useState(0);
  const [processingStage, setProcessingStage] = useState("");
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const { toast } = useToast();

  const languages = [
    { code: "ta", name: "Tamil", flag: "🇮🇳" },
    { code: "hi", name: "Hindi", flag: "🇮🇳" },
    { code: "te", name: "Telugu", flag: "🇮🇳" },
    { code: "ml", name: "Malayalam", flag: "🇮🇳" },
    { code: "kn", name: "Kannada", flag: "🇮🇳" },
    { code: "mr", name: "Marathi", flag: "🇮🇳" },
    { code: "gu", name: "Gujarati", flag: "🇮🇳" },
    { code: "bn", name: "Bengali", flag: "🇮🇳" },
    { code: "en", name: "English", flag: "🇺🇸" }
  ];

  // Audio level monitoring
  useEffect(() => {
    if (isRecording && !isPaused && analyserRef.current) {
      const monitor = () => {
        const dataArray = new Uint8Array(analyserRef.current!.frequencyBinCount);
        analyserRef.current!.getByteFrequencyData(dataArray);
        const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
        setAudioLevel(Math.min(100, (average / 128) * 100));
      };
      
      const animationId = setInterval(monitor, 100);
      return () => clearInterval(animationId);
    }
  }, [isRecording, isPaused]);

  // Recording timer
  useEffect(() => {
    if (isRecording && !isPaused) {
      intervalRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isRecording, isPaused]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 16000
        }
      });
      
      streamRef.current = stream;
      
      // Setup audio analysis
      const audioContext = new AudioContext();
      const analyser = audioContext.createAnalyser();
      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);
      analyserRef.current = analyser;
      
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });
      
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      
      mediaRecorder.onstop = handleRecordingStop;
      
      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      
      toast({
        title: "🎤 Recording Started",
        description: "Speak clearly for best results",
      });
    } catch (error) {
      console.error("Error starting recording:", error);
      toast({
        title: "Recording Error",
        description: "Could not access microphone",
        variant: "destructive",
      });
    }
  };

  const pauseRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      if (isPaused) {
        mediaRecorderRef.current.resume();
        setIsPaused(false);
      } else {
        mediaRecorderRef.current.pause();
        setIsPaused(true);
      }
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsPaused(false);
      setAudioLevel(0);
      
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    }
  };

  const handleRecordingStop = async () => {
    const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
    setProcessingStage("Preparing audio...");
    
    try {
      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.webm');
      formData.append('language', selectedLanguage);
      
      setProcessingStage("Transcribing with AI...");
      const response = await fetch('/api/transcribe', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error('Transcription failed');
      }
      
      const data = await response.json();
      setConfidenceScore(data.confidence || 85);
      setProcessingStage("Processing complete!");
      
      onTranscriptionComplete(data.text, selectedLanguage);
      
      toast({
        title: "✅ Transcription Complete",
        description: `Confidence: ${data.confidence || 85}%`,
      });
    } catch (error) {
      console.error('Transcription error:', error);
      toast({
        title: "Transcription Failed",
        description: "Please try again",
        variant: "destructive",
      });
    } finally {
      setProcessingStage("");
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Brain className="w-5 h-5 text-blue-600" />
          <span>Advanced Voice Processor</span>
          <Badge variant="outline" className="ml-2">
            <Zap className="w-3 h-3 mr-1" />
            AI Enhanced
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Language Selection */}
        <div>
          <label className="text-sm font-medium mb-2 block">Select Language</label>
          <div className="grid grid-cols-3 gap-2">
            {languages.map((lang) => (
              <Button
                key={lang.code}
                variant={selectedLanguage === lang.code ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedLanguage(lang.code)}
                className="justify-start"
              >
                <span className="mr-2">{lang.flag}</span>
                {lang.name}
              </Button>
            ))}
          </div>
        </div>

        {/* Recording Controls */}
        <div className="flex items-center justify-center space-x-4">
          {!isRecording ? (
            <Button
              onClick={startRecording}
              size="lg"
              className="bg-red-500 hover:bg-red-600 text-white rounded-full w-16 h-16"
              disabled={isProcessing}
            >
              <Mic className="w-6 h-6" />
            </Button>
          ) : (
            <div className="flex items-center space-x-2">
              <Button
                onClick={pauseRecording}
                size="lg"
                variant="outline"
                className="rounded-full w-12 h-12"
              >
                {isPaused ? <Play className="w-5 h-5" /> : <Pause className="w-5 h-5" />}
              </Button>
              
              <Button
                onClick={stopRecording}
                size="lg"
                className="bg-gray-500 hover:bg-gray-600 text-white rounded-full w-16 h-16"
              >
                <Square className="w-6 h-6" />
              </Button>
            </div>
          )}
        </div>

        {/* Recording Status */}
        {isRecording && (
          <div className="text-center space-y-4">
            <div className="flex items-center justify-center space-x-2">
              <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
              <span className="text-sm font-medium">
                {isPaused ? "Paused" : "Recording"} - {formatTime(recordingTime)}
              </span>
            </div>
            
            {/* Audio Level Meter */}
            <div className="space-y-2">
              <div className="text-xs text-gray-600">Audio Level</div>
              <Progress value={audioLevel} className="h-2" />
            </div>
          </div>
        )}

        {/* Processing Status */}
        {isProcessing && (
          <div className="text-center space-y-4">
            <div className="flex items-center justify-center space-x-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm">{processingStage}</span>
            </div>
            
            {confidenceScore > 0 && (
              <div className="space-y-2">
                <div className="text-xs text-gray-600">Confidence Score</div>
                <Progress value={confidenceScore} className="h-2" />
                <div className="text-xs text-gray-600">{confidenceScore}%</div>
              </div>
            )}
          </div>
        )}

        {/* Tips */}
        <div className="bg-blue-50 p-4 rounded-lg">
          <h4 className="font-medium text-blue-900 mb-2">💡 Tips for Better Results</h4>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Speak clearly and at a normal pace</li>
            <li>• Minimize background noise</li>
            <li>• Hold device 6-12 inches from your mouth</li>
            <li>• Use your native language for best accuracy</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}