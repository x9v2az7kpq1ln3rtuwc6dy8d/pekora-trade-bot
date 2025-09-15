# ROBLOX Trade Evaluation Bot

## Overview

This is a Discord bot and web application for evaluating ROBLOX item trades with demand-based value adjustments. The system provides both a Discord bot interface and a comprehensive web dashboard for trade analysis. Users can input their items and the items they're being offered, and the system calculates fair trade values using a database of item values and demand multipliers. The bot helps users make informed decisions about whether trades are favorable, fair, or disadvantageous.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
The client is built using React with TypeScript, employing a component-based architecture with shadcn/ui for the design system. The application uses Wouter for client-side routing and TanStack Query for state management and API interactions. The UI follows a dashboard layout with separate pages for trade evaluation, item management, trade history, and bias settings. Tailwind CSS provides styling with a custom design token system supporting light/dark themes.

### Backend Architecture
The server is an Express.js application using TypeScript and ESM modules. It follows a RESTful API design pattern with separate modules for routes, storage, and Discord bot functionality. The architecture separates concerns between the web API endpoints and the Discord bot logic, allowing both interfaces to share the same core trade evaluation engine. The server uses middleware for request logging and error handling.

### Database Design
The system uses PostgreSQL with Drizzle ORM for type-safe database operations. The schema includes four main tables: items (storing ROBLOX items with values and demand levels), trade_history (recording all trade evaluations), bias_settings (configurable demand multipliers), and users (for authentication). The database uses UUID primary keys and includes proper indexing for performance.

### Trade Evaluation Engine
The core business logic implements a sophisticated trade evaluation algorithm that:
- Parses CSV-formatted item lists from user input
- Looks up item values from the database
- Applies demand-based multipliers (high, normal, low, terrible, rising, ok)
- Calculates total values for both sides of the trade
- Generates verdicts (Accept, Decline, Counter) with reasoning
- Provides suggestions for additional items or givebacks to balance trades

### Discord Integration
The Discord bot uses discord.js v14 with slash commands and button interactions. It integrates with the same evaluation engine used by the web interface, providing users with embedded trade results and interactive buttons for marking trade outcomes. The bot supports role-based permissions for administrative functions.

### Session and State Management
The web application uses TanStack Query for client-side state management with optimistic updates and cache invalidation. The server maintains stateless operations with all data persisted to the database. Trade evaluations are saved to history for tracking and analytics.

## External Dependencies

### Database Services
- **Neon Database**: PostgreSQL hosting service using @neondatabase/serverless driver for connection pooling and serverless compatibility

### Discord Platform
- **Discord.js**: Official Discord API library for bot functionality, slash commands, and message interactions
- **Discord API**: Real-time communication with Discord servers for bot presence and command handling

### UI and Styling
- **Radix UI**: Headless component primitives providing accessible form controls, dialogs, and interactive elements
- **Tailwind CSS**: Utility-first CSS framework for responsive design and theming
- **shadcn/ui**: Pre-built component library built on Radix UI and Tailwind CSS

### Development and Build Tools
- **Vite**: Development server and build tool with React plugin for fast development experience
- **TypeScript**: Type safety across the entire application stack
- **Drizzle Kit**: Database migration and schema management tool
- **ESBuild**: Fast JavaScript bundler for production builds

### Data Management
- **Drizzle ORM**: Type-safe SQL query builder with automatic TypeScript type generation
- **TanStack Query**: Server state management with caching, background updates, and optimistic updates
- **React Hook Form**: Form state management with validation and performance optimization
- **Zod**: Runtime type validation for API endpoints and form data

### Utilities
- **date-fns**: Date manipulation and formatting library
- **class-variance-authority**: Utility for creating type-safe CSS class variants
- **nanoid**: Secure URL-safe unique ID generation for client-side operations