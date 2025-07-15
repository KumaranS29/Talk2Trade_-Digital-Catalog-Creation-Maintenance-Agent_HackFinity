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
- Switched from OpenAI Whisper to AssemblyAI for better pricing and quotas
- Added language selection dropdown for 8 Indian languages (Tamil, Hindi, Telugu, Malayalam, Kannada, Marathi, Gujarati, Bengali)
- Implemented specific language code transcription with AssemblyAI instead of auto-detection
- Added Google Translate integration for English translation
- Implemented text-to-speech playback for translated English text
- Enhanced pattern matching for Tamil language recognition
- Post-processing improvements for common Tamil words (pudavai → saree, rupai → rupees)
- Added comprehensive error correction for Tamil transcription mistakes

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