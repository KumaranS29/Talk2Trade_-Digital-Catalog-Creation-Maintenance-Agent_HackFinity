import type { Express, Request } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertTranscriptionSchema } from "@shared/schema";
import multer from "multer";
import OpenAI from "openai";
import fs from "fs";
import path from "path";

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

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY || process.env.OPENAI_KEY || ""
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
      if (!req.file) {
        return res.status(400).json({ error: "No audio file provided" });
      }

      const audioFilePath = req.file.path;
      
      // Check if OpenAI API key is configured
      if (!process.env.OPENAI_API_KEY && !process.env.OPENAI_KEY) {
        // Clean up uploaded file
        fs.unlinkSync(audioFilePath);
        return res.status(500).json({ 
          error: "OpenAI API key not configured. Please add OPENAI_API_KEY to your environment variables." 
        });
      }

      try {
        const audioReadStream = fs.createReadStream(audioFilePath);

        const transcription = await openai.audio.transcriptions.create({
          file: audioReadStream,
          model: "whisper-1",
          response_format: "verbose_json",
        });

        // Clean up uploaded file
        fs.unlinkSync(audioFilePath);

        // Save transcription to storage
        const savedTranscription = await storage.createTranscription({
          text: transcription.text,
          language: transcription.language || "unknown",
          confidence: null, // Whisper doesn't provide confidence scores
          duration: transcription.duration || null,
        });

        res.json({
          id: savedTranscription.id,
          text: transcription.text,
          language: transcription.language || "unknown",
          duration: transcription.duration || 0,
          createdAt: savedTranscription.createdAt,
        });

      } catch (openaiError: any) {
        // Clean up uploaded file on error
        fs.unlinkSync(audioFilePath);
        
        console.error("OpenAI API Error:", openaiError);
        
        if (openaiError.status === 401) {
          return res.status(401).json({ 
            error: "Invalid OpenAI API key. Please check your OPENAI_API_KEY environment variable." 
          });
        }
        
        if (openaiError.status === 429) {
          return res.status(429).json({ 
            error: "OpenAI API rate limit exceeded. Please try again later." 
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

  const httpServer = createServer(app);
  return httpServer;
}
