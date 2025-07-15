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
        
        // Create transcription request
        const transcriptionRequest = await assemblyai.transcripts.transcribe({
          audio_url: uploadResponse,
          language_detection: true,
          speech_model: "best"
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

      // Language detection with franc-min
      let detectedLanguage = 'ta'; // Default to Tamil
      try {
        const detected = franc(transcription);
        
        // Map franc language codes to our supported languages
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
        
        console.log('Detected language code:', detected, 'mapped to:', detectedLanguage);
      } catch (detectionError) {
        console.log('Language detection failed, using default Tamil:', detectionError);
      }

      // Translate to English
      try {
        const translatedText = await translate(transcription, { 
          from: detectedLanguage, 
          to: 'en' 
        });
        
        console.log('Translation successful:', translatedText);
        
        res.json({
          detected_language: detectedLanguage,
          translated_text: translatedText
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
