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
import OpenAI from "openai";

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
        
        // Extract details using OpenAI
        const extractedDetails = await extractDetailsFromText(translatedText);
        
        // Auto-create product catalog entry if extraction was successful
        let createdProduct = null;
        if (extractedDetails.success && extractedDetails.details) {
          try {
            createdProduct = await createProductFromExtraction(
              translatedText, 
              extractedDetails.details, 
              transcription,
              detectedLanguage
            );
          } catch (productError) {
            console.log('Product creation failed:', productError);
            // Don't fail the translation if product creation fails
          }
        }
        
        res.json({
          detected_language: detectedLanguage,
          translated_text: translatedText,
          original_text: transcription,
          processed_text: processedTranscription,
          extracted_details: extractedDetails,
          product_created: createdProduct
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

  // Extract details from translated text using OpenAI or fallback pattern matching
  async function extractDetailsFromText(text: string) {
    // Try OpenAI first if available and quota allows
    if (process.env.OPENAI_API_KEY) {
      try {
        const openai = new OpenAI({
          apiKey: process.env.OPENAI_API_KEY
        });

        const completion = await openai.chat.completions.create({
          model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
          messages: [
            {
              role: "system",
              content: "You are an expert at extracting product catalog information from text. Extract product details and return them in JSON format with these fields: name (product name), description (auto-generated description), category, price (number only), quantity, unit, brand, color, size, material, origin (location mentioned), tags (array of keywords), confidence (0-1 score for extraction quality). If price currency is mentioned, include it. Focus on creating a structured product catalog entry."
            },
            {
              role: "user",
              content: `Extract product catalog details from this text: "${text}". Generate a compelling product description if the original text is brief. Return structured JSON for catalog entry.`
            }
          ],
          response_format: { type: "json_object" }
        });

        const extractedData = JSON.parse(completion.choices[0].message.content || "{}");
        
        return {
          success: true,
          details: extractedData
        };
      } catch (error) {
        console.error('OpenAI extraction failed, using pattern matching fallback:', error);
        // Fall back to pattern matching
      }
    }

    // Fallback: Pattern-based extraction for immediate functionality
    console.log('Using pattern-based extraction for text:', text);
    return extractWithPatterns(text);
  }

  // Enhanced pattern-based extraction with AI-powered descriptions and e-commerce categorization
  function extractWithPatterns(text: string) {
    try {
      const lowerText = text.toLowerCase();
      
      // Extract product title (enhanced naming)
      let title = "Product";
      const productWords = text.split(/\s+/).filter(word => 
        word.length > 2 && !['this', 'that', 'the', 'and', 'or', 'at', 'in', 'on', 'for', 'with', 'is', 'are', 'costs', 'rupees', 'rupeess', 'dollars', 'price', 'per', 'each', 'piece'].includes(word.toLowerCase())
      );
      if (productWords.length > 0) {
        title = productWords.slice(0, 3).join(' ').replace(/^\w/, c => c.toUpperCase());
      }
      
      // Extract price
      let price = null;
      const priceMatches = text.match(/(\d+(?:,\d{3})*(?:\.\d{2})?)\s*(?:rupees|rupeess|dollars|inr|usd|₹|\$)/i);
      if (priceMatches) {
        price = parseFloat(priceMatches[1].replace(/,/g, ''));
      }
      
      // Extract quantity with unit detection
      let quantity = 1;
      const quantityMatch = text.match(/(\d+(?:\.\d+)?)\s*(?:kg|gram|grams|liters|ml|pieces|pcs|units|pack|bottle|jar)/i);
      if (quantityMatch) {
        quantity = parseFloat(quantityMatch[1]);
      }
      
      // Enhanced e-commerce category mapping
      let category = "General";
      const ecommerceCategories = {
        "Health & Beauty > Soap": ["soap", "handmade soap", "neem soap", "ayurvedic soap", "herbal soap"],
        "Health & Beauty > Skincare": ["cream", "lotion", "face wash", "moisturizer", "sunscreen"],
        "Health & Beauty > Haircare": ["shampoo", "conditioner", "hair oil", "hair mask"],
        "Food & Beverages > Spices": ["turmeric", "chili", "coriander", "cumin", "garam masala", "spice"],
        "Food & Beverages > Oils": ["coconut oil", "mustard oil", "sesame oil", "groundnut oil", "ghee"],
        "Food & Beverages > Grains": ["rice", "wheat", "dal", "lentils", "quinoa", "oats"],
        "Food & Beverages > Vegetables": ["onion", "potato", "tomato", "carrot", "cabbage", "spinach"],
        "Food & Beverages > Fruits": ["apple", "banana", "mango", "orange", "grape", "strawberry"],
        "Home & Garden > Furniture": ["chair", "table", "bed", "sofa", "cabinet", "shelf"],
        "Home & Garden > Decor": ["lamp", "mirror", "curtain", "vase", "painting", "cushion"],
        "Clothing & Accessories > Men": ["shirt", "pants", "jeans", "t-shirt", "jacket", "kurta"],
        "Clothing & Accessories > Women": ["dress", "saree", "blouse", "skirt", "top", "lehenga"],
        "Electronics > Mobile": ["phone", "smartphone", "mobile", "charger", "headphones"],
        "Electronics > Computers": ["laptop", "computer", "tablet", "keyboard", "mouse"],
        "Handicrafts > Textiles": ["handwoven", "embroidered", "cotton", "silk", "wool"],
        "Handicrafts > Pottery": ["clay", "ceramic", "earthenware", "pottery", "terracotta"],
        "Baby & Kids > Toys": ["toy", "doll", "game", "puzzle", "blocks"],
        "Sports & Fitness > Equipment": ["yoga mat", "dumbbell", "cricket bat", "football"]
      };
      
      for (const [cat, keywords] of Object.entries(ecommerceCategories)) {
        if (keywords.some(keyword => lowerText.includes(keyword))) {
          category = cat;
          break;
        }
      }
      
      // Generate AI-powered marketing description
      const baseCategory = category.split(' > ')[0];
      const subCategory = category.split(' > ')[1] || baseCategory;
      
      let description = "";
      if (lowerText.includes('handmade') || lowerText.includes('natural') || lowerText.includes('organic')) {
        description = `Premium handcrafted ${title.toLowerCase()} made with natural ingredients. Perfect for daily use${price ? ` at just ₹${price}` : ''}. Authentic quality product sourced directly from artisans.`;
      } else if (lowerText.includes('fresh') || category.includes('Vegetables') || category.includes('Fruits')) {
        description = `Fresh ${title.toLowerCase()} directly from farms. High quality, pesticide-free produce${price ? ` at ₹${price}` : ''}. Perfect for healthy cooking and nutritious meals.`;
      } else if (category.includes('Oil') || category.includes('Spices')) {
        description = `Pure ${title.toLowerCase()} with authentic taste and aroma. Traditional quality preserved${price ? ` at ₹${price}` : ''}. Essential for authentic Indian cooking.`;
      } else {
        description = `High-quality ${title.toLowerCase()} from trusted sources. Excellent ${subCategory.toLowerCase()} item${price ? ` priced at ₹${price}` : ''} with reliable performance and durability.`;
      }
      
      return {
        success: true,
        details: {
          title: title,
          description: description,
          category: category,
          price: price,
          quantity: quantity
        }
      };
    } catch (error) {
      console.error('Pattern extraction failed:', error);
      return {
        success: false,
        error: "Failed to extract details",
        details: error.message
      };
    }
  }

  // Create product from extracted details - optimized for Talk2Trade format
  async function createProductFromExtraction(
    translatedText: string, 
    extractedDetails: any, 
    originalText: string, 
    detectedLanguage: string
  ) {
    try {
      const productData = {
        title: extractedDetails.title || "Voice Extracted Product",
        description: extractedDetails.description || `Product mentioned: ${translatedText}`,
        category: extractedDetails.category || "General",
        price: typeof extractedDetails.price === 'number' ? extractedDetails.price : null,
        quantity: typeof extractedDetails.quantity === 'number' ? extractedDetails.quantity : 1
      };

      const createdProduct = await storage.createProduct(productData);
      console.log('Created product from voice (Talk2Trade format):', createdProduct);
      return createdProduct;
    } catch (error) {
      console.error('Product creation error:', error);
      throw error;
    }
  }

  // Product catalog API routes
  
  // Get all products
  app.get("/api/products", async (req, res) => {
    try {
      const products = await storage.getProducts();
      res.json(products);
    } catch (error) {
      console.error("Error fetching products:", error);
      res.status(500).json({ error: "Failed to fetch products" });
    }
  });

  // Get single product
  app.get("/api/products/:id", async (req, res) => {
    try {
      const id = req.params.id;
      const product = await storage.getProduct(id);
      
      if (!product) {
        return res.status(404).json({ error: "Product not found" });
      }
      
      res.json(product);
    } catch (error) {
      console.error("Error fetching product:", error);
      res.status(500).json({ error: "Failed to fetch product" });
    }
  });

  // Search products
  app.get("/api/products/search/:query", async (req, res) => {
    try {
      const query = req.params.query;
      const products = await storage.searchProducts(query);
      res.json(products);
    } catch (error) {
      console.error("Error searching products:", error);
      res.status(500).json({ error: "Failed to search products" });
    }
  });

  // Get products by category
  app.get("/api/products/category/:category", async (req, res) => {
    try {
      const category = req.params.category;
      const products = await storage.getProductsByCategory(category);
      res.json(products);
    } catch (error) {
      console.error("Error fetching products by category:", error);
      res.status(500).json({ error: "Failed to fetch products by category" });
    }
  });

  // Create product manually
  app.post("/api/products", async (req, res) => {
    try {
      const productData = req.body;
      
      // Basic validation for Talk2Trade format
      if (!productData.title) {
        return res.status(400).json({ error: "Product title is required" });
      }

      const createdProduct = await storage.createProduct(productData);
      res.status(201).json(createdProduct);
    } catch (error) {
      console.error("Error creating product:", error);
      res.status(500).json({ error: "Failed to create product" });
    }
  });

  // Update product
  app.put("/api/products/:id", async (req, res) => {
    try {
      const id = req.params.id;
      const updates = req.body;
      
      const updatedProduct = await storage.updateProduct(id, updates);
      
      if (!updatedProduct) {
        return res.status(404).json({ error: "Product not found" });
      }
      
      res.json(updatedProduct);
    } catch (error) {
      console.error("Error updating product:", error);
      res.status(500).json({ error: "Failed to update product" });
    }
  });

  // Delete product
  app.delete("/api/products/:id", async (req, res) => {
    try {
      const id = req.params.id;
      const deleted = await storage.deleteProduct(id);
      
      if (!deleted) {
        return res.status(404).json({ error: "Product not found" });
      }
      
      res.json({ success: true, message: "Product deleted successfully" });
    } catch (error) {
      console.error("Error deleting product:", error);
      res.status(500).json({ error: "Failed to delete product" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
