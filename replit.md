# Audio Transcription & Translation App

## Overview

This is a full-stack audio transcription and translation application built with React (frontend) and Express.js (backend). The app allows users to record audio in local languages (Tamil, Hindi, Telugu, etc.), get transcriptions using AssemblyAI, and translate the results to English using Google Translate. It features a modern UI built with shadcn/ui components and TailwindCSS.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript
- **Build Tool**: Vite for fast development and building
- **UI Library**: shadcn/ui components with Radix UI primitives
- **Styling**: TailwindCSS with custom CSS variables for theming
- **State Management**: React Query (@tanstack/react-query) for server state
- **Routing**: Wouter for lightweight client-side routing
- **Form Handling**: React Hook Form with Zod validation

### Backend Architecture
- **Framework**: Express.js with TypeScript
- **Runtime**: Node.js with ES modules
- **Database**: PostgreSQL with Drizzle ORM
- **Database Provider**: Neon Database (@neondatabase/serverless)
- **File Upload**: Multer for handling multipart/form-data
- **AI Integration**: AssemblyAI API for audio transcription, Google Translate for translation

### Build System
- **Frontend**: Vite with React plugin
- **Backend**: esbuild for production bundling
- **Development**: tsx for TypeScript execution
- **Database**: Drizzle Kit for schema management and migrations

## Key Components

### Database Schema
- **Transcriptions Table**: Stores transcription results with text, language, confidence, duration, and timestamp
- **Users Table**: Basic user management (currently minimal implementation)
- **Storage Interface**: Abstraction layer supporting both in-memory and database storage

### API Endpoints
- `GET /api/transcriptions` - Retrieve all transcriptions
- `GET /api/transcriptions/:id` - Get single transcription
- `POST /api/transcribe` - Upload audio file and get transcription
- `POST /api/translate` - Translate transcribed text to English

### Frontend Features
- Audio recording with MediaRecorder API
- Language selection dropdown (Tamil, Hindi, Telugu, Malayalam, Kannada, Marathi, Gujarati, Bengali)
- Real-time transcription display in selected language
- Translation to English with Google Translate
- Text-to-speech playback for translated English text
- Responsive design with mobile support
- Toast notifications for user feedback
- Copy-to-clipboard functionality for both transcription and translation

### UI Components
- Complete shadcn/ui component library
- Custom themed components with CSS variables
- Responsive design patterns
- Accessibility features built-in

## Data Flow

1. **Language Selection**: User selects language from dropdown (Tamil, Hindi, Telugu, etc.)
2. **Audio Recording**: User records audio through browser MediaRecorder API
3. **File Upload**: Audio blob and selected language sent to backend via multipart form data
4. **Transcription**: Backend processes audio through AssemblyAI API with specific language code
5. **Storage**: Transcription results stored in PostgreSQL database
6. **Translation**: User can translate transcribed text to English using Google Translate
7. **Text-to-Speech**: User can play English translation using browser's speech synthesis
8. **Display**: Frontend fetches and displays transcription, translation, and speech controls
9. **State Management**: React Query handles caching and synchronization

## External Dependencies

### Core Dependencies
- **AssemblyAI**: Audio transcription API
- **Google Translate**: Text translation service
- **Franc-min**: Language detection library
- **Neon Database**: Serverless PostgreSQL hosting
- **Drizzle ORM**: Type-safe database operations
- **React Query**: Server state management
- **Radix UI**: Unstyled, accessible UI primitives
- **TailwindCSS**: Utility-first CSS framework

### Development Tools
- **Vite**: Fast development server and build tool
- **TypeScript**: Static type checking
- **ESLint**: Code linting and formatting
- **PostCSS**: CSS processing with Autoprefixer

## Deployment Strategy

### Production Build
- Frontend: Vite builds static assets to `dist/public`
- Backend: esbuild bundles server code to `dist/index.js`
- Database: Drizzle migrations applied via `db:push` command

### Environment Configuration
- Database URL required for PostgreSQL connection
- AssemblyAI API key required for transcription functionality
- Environment-specific settings for development vs production

## Recent Changes (July 15, 2025)

### Talk2Trade Branding & Advanced Feature Implementation
- **Complete Rebranding**: Transformed to "Talk2Trade" with professional splash screen and modern UI
- **Advanced Voice Processing**: Implemented AdvancedVoiceProcessor with AI agent optimization and error handling
- **Enhanced Dashboard**: Created AdvancedDashboard with real-time analytics and modern design
- **Offline Capabilities**: Added comprehensive offline storage using localStorage for seamless offline functionality
- **Enhanced User Experience**: Improved transcription and catalog pages with Talk2Trade branding and advanced features
- **Advanced Analytics**: Added detailed product metrics, category insights, and growth tracking

### Digital Catalog Creation System Implementation
- **Transformed Application Purpose**: Evolved from simple transcription tool to full digital catalog creation and maintenance system
- **Updated Branding**: Changed from "Powered by OpenAI Whisper" to "Powered by AssemblyAI & Google Translate"
- **Real-time Product Extraction**: Integrated OpenAI GPT-4o for automatic product detail extraction from English text
- **Auto-catalog Creation**: Automatically creates product catalog entries from voice input with AI-generated descriptions
- **Navigation System**: Added navigation bar to switch between Voice Input and Product Catalog pages

### Product Catalog Features
- **Complete CRUD Operations**: Create, read, update, delete products with comprehensive API
- **Advanced Search**: Full-text search across product names, descriptions, categories, brands, and tags
- **Category Management**: Filter and organize products by categories
- **Multi-view Display**: Grid and list view modes for product browsing
- **Status Management**: Draft, reviewed, and published status tracking
- **Real-time Dashboard**: Statistics showing total products, published/draft counts, and categories
- **Auto-generated Descriptions**: AI creates compelling product descriptions when original text is brief

### Enhanced Data Structure
- **Product Schema**: Added comprehensive product table with 15+ fields including price, quantity, brand, color, size, material, origin, tags
- **Storage Interface**: Extended IStorage with 7 new product-related methods
- **Memory Storage**: Implemented full in-memory storage for products with search capabilities
- **Relationship Mapping**: Links products to original transcriptions for traceability

### Backend API Enhancements
- **Smart Extraction**: Enhanced OpenAI prompt for product-specific information extraction
- **Auto-cataloging**: Automatic product creation from successful voice translations
- **7 New Endpoints**: Complete REST API for product management (/api/products/*)
- **Error Handling**: Robust error handling for product operations
- **Search Functionality**: Advanced search with multiple field matching

### Frontend Improvements  
- **Two-page Architecture**: Voice Input page and Product Catalog dashboard
- **Real-time Notifications**: Shows when products are auto-created from voice input
- **Modern UI Components**: Comprehensive form dialogs, statistics cards, action buttons
- **Responsive Design**: Grid/list views adapt to screen sizes
- **Navigation Integration**: Seamless switching between transcription and catalog management

### Previous Core Features (Maintained)
- AssemblyAI voice transcription with 8 Indian language support
- Google Translate integration for English translation  
- Text-to-speech playback for English translations
- Enhanced Tamil language pattern recognition and error correction
- Real-time audio recording with MediaRecorder API

### File Structure
```
├── client/          # React frontend
├── server/          # Express backend
├── shared/          # Shared TypeScript definitions
├── migrations/      # Database migration files
└── dist/           # Production build output
```

### Development Workflow
- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run db:push` - Apply database schema changes

The application follows a monorepo structure with clear separation between frontend, backend, and shared code, making it easy to maintain and scale.