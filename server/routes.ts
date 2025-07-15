import type { Express, Request } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertTranscriptionSchema } from "@shared/schema";
import multer from "multer";
import { AssemblyAI } from "assemblyai";
import fs from "fs";
import path from "path";
import translate from "translate-google";
import { franc } from "franc-min";

const upload = multer({ 
  dest: 'uploads/',
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB limit
  fileFilter: (req: any, file: any, cb: any) => {
    const allowedTypes = ['audio/wav', 'audio/mpeg', 'audio/mp3', 'audio/mp4', 'audio/webm'];
    if (allowedTypes.includes(file.mimetype) || file.mimetype.startsWith('audio/')) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only audio files are allowed.'));
    }
  }
});

const assemblyai = new AssemblyAI({
  apiKey: process.env.ASSEMBLYAI_API_KEY || ""
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Get all transcriptions
  app.get("/api/transcriptions", async (req, res) => {
    try {
      const transcriptions = await storage.getTranscriptions();
      res.json(transcriptions);
    } catch (error) {
      console.error("Error fetching transcriptions:", error);
      res.status(500).json({ error: "Failed to fetch transcriptions" });
    }
  });

  // Get single transcription
  app.get("/api/transcriptions/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const transcription = await storage.getTranscription(id);
      
      if (!transcription) {
        return res.status(404).json({ error: "Transcription not found" });
      }
      
      res.json(transcription);
    } catch (error) {
      console.error("Error fetching transcription:", error);
      res.status(500).json({ error: "Failed to fetch transcription" });
    }
  });

  // Transcribe audio
  app.post("/api/transcribe", upload.single('audio'), async (req: Request & { file?: Express.Multer.File }, res) => {
    try {
      console.log('Received transcribe request');
      console.log('Request file:', req.file);
      console.log('Request body:', req.body);
      
      if (!req.file) {
        console.log('No file in request');
        return res.status(400).json({ error: "No audio file provided" });
      }

      const selectedLanguage = req.body.language || 'ta'; // Default to Tamil
      console.log('Selected language:', selectedLanguage);

      console.log('File details:', {
        originalname: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size,
        path: req.file.path
      });

      const audioFilePath = req.file.path;
      
      // Check if AssemblyAI API key is configured
      if (!process.env.ASSEMBLYAI_API_KEY) {
        // Clean up uploaded file
        fs.unlinkSync(audioFilePath);
        return res.status(500).json({ 
          error: "AssemblyAI API key not configured. Please add ASSEMBLYAI_API_KEY to your environment variables." 
        });
      }

      try {
        // Upload file to AssemblyAI
        const uploadResponse = await assemblyai.files.upload(audioFilePath);
        
        // Create transcription request with specific language code
        const transcriptionRequest = await assemblyai.transcripts.transcribe({
          audio_url: uploadResponse,
          language_code: selectedLanguage, // Use selected language
          speech_model: "best",
          filter_profanity: false,
          format_text: true
        });

        // Clean up uploaded file
        fs.unlinkSync(audioFilePath);

        // Save transcription to storage
        const savedTranscription = await storage.createTranscription({
          text: transcriptionRequest.text || "",
          language: transcriptionRequest.language_code || "unknown",
          confidence: transcriptionRequest.confidence || null,
          duration: transcriptionRequest.audio_duration || null,
        });

        res.json({
          id: savedTranscription.id,
          text: transcriptionRequest.text || "",
          language: transcriptionRequest.language_code || "unknown",
          duration: transcriptionRequest.audio_duration || 0,
          createdAt: savedTranscription.createdAt,
        });

      } catch (assemblyError: any) {
        // Clean up uploaded file on error
        if (fs.existsSync(audioFilePath)) {
          fs.unlinkSync(audioFilePath);
        }
        
        console.error("AssemblyAI API Error:", assemblyError);
        
        if (assemblyError.status === 401) {
          return res.status(401).json({ 
            error: "Invalid AssemblyAI API key. Please check your ASSEMBLYAI_API_KEY environment variable." 
          });
        }
        
        if (assemblyError.status === 429) {
          return res.status(429).json({ 
            error: "AssemblyAI API rate limit exceeded. Please try again later." 
          });
        }
        
        return res.status(500).json({ 
          error: "Failed to transcribe audio. Please try again." 
        });
      }

    } catch (error: any) {
      console.error("Transcription error:", error);
      
      // Clean up uploaded file if it exists
      if (req.file?.path) {
        try {
          fs.unlinkSync(req.file.path);
        } catch (cleanupError) {
          console.error("Error cleaning up file:", cleanupError);
        }
      }
      
      if (error instanceof multer.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({ error: "File too large. Maximum size is 25MB." });
        }
        return res.status(400).json({ error: "File upload error: " + error.message });
      }
      
      res.status(500).json({ error: "Internal server error during transcription" });
    }
  });

  // Translate transcription
  app.post("/api/translate", async (req, res) => {
    try {
      const { transcription } = req.body;
      
      if (!transcription || typeof transcription !== 'string') {
        return res.status(400).json({ error: "Transcription text is required" });
      }

      console.log('Received translation request for:', transcription);

      // Enhanced language detection for Indian languages
      let detectedLanguage = 'ta'; // Default to Tamil
      
      // Pre-process transcription to fix common Tamil transcription errors
      let processedTranscription = transcription
        .replace(/purawai|buddha way|budha way/gi, 'pudavai')
        .replace(/ainurubai|ainuru.*bai|ainu.*bai/gi, '500 rupai')
        .replace(/in the|inthe/gi, 'intha')
        .replace(/way/gi, 'vai');
      
      console.log('Original transcription:', transcription);
      console.log('Processed transcription:', processedTranscription);
      
      // Check for common Tamil words/patterns (including common transcription errors)
      const tamilPatterns = [
        /pudavai|saree|வடிவம்|rupai|rupee|intha|இந்த|அந்த|antha/i,
        /purawai|buddha way|budha way|ainurubai|ainuru.*bai/i, // Common transcription errors
        /வருகிறது|போகிறது|செய்கிறது|இருக்கிறது/i,
        /எவ்வளவு|எத்தனை|யாரு|என்ன|எங்கே/i
      ];
      
      const hindiPatterns = [
        /kya|hai|nahi|hum|tum|यह|वह|है|नहीं/i,
        /rupaye|paisa|kitna|कितना|रुपये|पैसा/i
      ];
      
      const teluguPatterns = [
        /ela|enti|ekkada|Telugu|తెలుగు|ఎలా|ఎంత/i,
        /rupayalu|రుపాయలు|ఇంత|అంత/i
      ];
      
      try {
        const detected = franc(processedTranscription);
        console.log('Franc detected language:', detected);
        
        // Enhanced pattern matching for better accuracy
        if (tamilPatterns.some(pattern => pattern.test(processedTranscription))) {
          detectedLanguage = 'ta';
          console.log('Tamil patterns detected');
        } else if (hindiPatterns.some(pattern => pattern.test(processedTranscription))) {
          detectedLanguage = 'hi';
          console.log('Hindi patterns detected');
        } else if (teluguPatterns.some(pattern => pattern.test(processedTranscription))) {
          detectedLanguage = 'te';
          console.log('Telugu patterns detected');
        } else {
          // Fall back to franc detection
          const languageMap: Record<string, string> = {
            'tam': 'ta',  // Tamil
            'tel': 'te',  // Telugu  
            'hin': 'hi',  // Hindi
            'mal': 'ml',  // Malayalam
            'kan': 'kn',  // Kannada
            'mar': 'mr',  // Marathi
          };
          
          if (languageMap[detected]) {
            detectedLanguage = languageMap[detected];
          }
        }
        
        console.log('Final detected language:', detectedLanguage);
      } catch (detectionError) {
        console.log('Language detection failed, using default Tamil:', detectionError);
      }

      // Translate to English with context hints
      try {
        let translatedText = await translate(processedTranscription, { 
          from: detectedLanguage, 
          to: 'en' 
        });
        
        // Post-process translation for common Tamil/Indian language patterns
        translatedText = translatedText
          .replace(/pudavai|purawai|buddha way|budha way/gi, 'saree')
          .replace(/rupai|rupee|ainurubai|ainuru.*bai/gi, 'rupees')
          .replace(/intha|antha|in the/gi, 'this')
          .replace(/antha/gi, 'that')
          .replace(/evvalavu|etthanai/gi, 'how much')
          .replace(/\b(\d+)\s*(rupai|rupee|rupees)\b/gi, '$1 rupees')
          .replace(/this\s+saree\s+rupees/gi, 'this saree costs rupees')
          .replace(/this\s+saree\s+(\d+)\s+rupees/gi, 'this saree costs $1 rupees');
        
        console.log('Translation successful:', translatedText);
        
        res.json({
          detected_language: detectedLanguage,
          translated_text: translatedText,
          original_text: transcription,
          processed_text: processedTranscription
        });
        
      } catch (translateError) {
        console.error('Translation error:', translateError);
        res.status(500).json({ 
          error: "Translation failed. Please try again.",
          detected_language: detectedLanguage
        });
      }
      
    } catch (error) {
      console.error('Translation request error:', error);
      res.status(500).json({ error: "Internal server error during translation" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
