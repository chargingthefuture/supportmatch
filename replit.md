# Support Match - A TI Accountability Network

## Overview

Support Match is a web-based accountability matching system designed to create safe, supportive relationships for personal growth and accountability. The application facilitates month-long matches between users with similar preferences and goals, providing a structured environment for mutual support while maintaining user safety through comprehensive reporting and exclusion mechanisms.

The system operates on a matching algorithm that considers user preferences, gender compatibility, and mutual exclusions to create meaningful matches. Each match includes built-in messaging capabilities and safety features to ensure a positive experience for all participants.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript for type safety and modern development patterns
- **Routing**: Wouter for lightweight client-side routing
- **State Management**: TanStack Query (React Query) for server state management and caching
- **UI Framework**: Radix UI components with shadcn/ui design system for accessible, consistent interface
- **Styling**: Tailwind CSS with CSS custom properties for theming and responsive design
- **Form Handling**: React Hook Form with Zod validation for robust form management

### Backend Architecture
- **Runtime**: Node.js with Express.js framework for RESTful API endpoints
- **Language**: TypeScript for full-stack type safety
- **Session Management**: Simple in-memory session storage with session ID-based authentication
- **API Design**: RESTful endpoints with standardized JSON responses and error handling
- **Development Server**: Vite integration for hot module replacement and development tooling

### Data Storage Solutions
- **ORM**: Drizzle ORM for type-safe database operations and schema management
- **Database**: PostgreSQL with Neon serverless for both development and production
- **Environment Separation**: Development and production databases with environment-scoped DATABASE_URL
- **Schema Design**: Relational model with users, partnerships, messages, exclusions, and reports tables
- **Migrations**: Drizzle Kit for database schema versioning and deployment
- **Admin Users**: Auto-seeded admin users in both environments using ADMIN_TOKEN

### Authentication and Authorization
- **Session-based Authentication**: Custom session management using HTTP headers
- **Role-based Access**: Admin and regular user roles with appropriate permission checks
- **Security Middleware**: Request logging and error handling for API protection
- **Session Persistence**: Local storage for client-side session management

### Matching Algorithm
- **Partnership Creation**: Manual monthly matching based on user preferences and availability
- **Exclusion System**: User-controlled blocking mechanism to prevent unwanted matches
- **Gender Preferences**: Configurable matching based on gender identity and preferences
- **Active Status Filtering**: Only matches users who are currently active in the system

### Safety and Reporting System
- **User Reporting**: Comprehensive reporting system for safety concerns and inappropriate behavior
- **Admin Dashboard**: Administrative interface for managing reports and user safety
- **User Exclusions**: Self-service exclusion system for users to avoid specific individuals
- **Partnership Management**: Ability to end partnerships early or mark them as completed

### Communication Features
- **In-app Messaging**: Real-time messaging system within partnerships
- **Message Persistence**: All partnership communications are stored and retrievable
- **Match Duration**: Fixed monthly partnership periods with clear start and end dates

## External Dependencies

### Core Runtime Dependencies
- **@neondatabase/serverless**: Neon PostgreSQL serverless driver for production database connectivity
- **drizzle-orm**: Type-safe ORM for database operations and query building
- **express**: Web application framework for Node.js API server
- **@tanstack/react-query**: Server state management and caching for React applications

### UI and Component Libraries
- **@radix-ui/react-***: Comprehensive collection of accessible, unstyled UI primitives
- **tailwindcss**: Utility-first CSS framework for rapid UI development
- **class-variance-authority**: Type-safe utility for managing CSS class variants
- **cmdk**: Command palette component for enhanced user interaction

### Form and Validation
- **react-hook-form**: Performant forms library with minimal re-renders
- **@hookform/resolvers**: Validation resolvers for React Hook Form
- **zod**: TypeScript-first schema validation library
- **drizzle-zod**: Integration between Drizzle ORM and Zod for schema validation

### Development and Build Tools
- **vite**: Fast build tool and development server for modern web projects
- **typescript**: Static type checking for enhanced developer experience
- **tsx**: TypeScript execution environment for Node.js development
- **esbuild**: Fast JavaScript bundler for production builds

### Session Management
- **connect-pg-simple**: PostgreSQL session store for Express sessions (production-ready)
- **nanoid**: URL-safe unique ID generator for session management

### Date and Time Handling
- **date-fns**: Modern JavaScript date utility library for date manipulation and formatting