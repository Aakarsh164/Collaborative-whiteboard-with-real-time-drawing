# Collaborative Whiteboard

A real-time collaborative whiteboard application built with React, TypeScript, Socket.IO, and Node.js.

## Features

- Real-time collaborative drawing
- Multiple drawing tools (pen, rectangle, circle, text)
- Room-based collaboration
- User cursors and presence
- Export to PDF
- Responsive design

## Tech Stack

- **Frontend**: React, TypeScript, Vite, Tailwind CSS
- **Backend**: Node.js, Express, Socket.IO, TypeScript
- **Database**: PostgreSQL (production) / SQLite (development)
- **Deployment**: Vercel (frontend), Render (backend)

## Setup

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   - Create a `.env` file in the root directory
   - Add the following variables:
     ```
     NODE_ENV=development
     # For production, set DATABASE_URL in your deployment platform
     ```

### Database Setup

The application uses:
- **PostgreSQL** in production (when `DATABASE_URL` is set)
- **SQLite** in development (in-memory database)

For production deployment on Render:
1. Create a PostgreSQL database in your Render dashboard
2. Set the `DATABASE_URL` environment variable in your service settings
3. The application will automatically create the required tables

### Development

1. Start the development server:
   ```bash
   npm run dev
   ```

2. Start the backend server:
   ```bash
   npm run server:dev
   ```

3. Open http://localhost:5173 in your browser

### Production Deployment

#### Frontend (Vercel)
1. Connect your GitHub repository to Vercel
2. Deploy automatically on push to main branch

#### Backend (Render)
1. Connect your GitHub repository to Render
2. Set environment variables:
   - `DATABASE_URL`: Your PostgreSQL connection string
   - `NODE_ENV`: production
3. Deploy automatically on push to main branch

## Usage

1. Create a new room or join an existing one
2. Start drawing with the toolbar tools
3. Share the room URL with others to collaborate
4. Export your work as PDF when finished

## Project Structure

```
project/
├── src/                 # Frontend React application
│   ├── components/      # React components
│   ├── hooks/          # Custom React hooks
│   ├── types/          # TypeScript type definitions
│   └── utils/          # Utility functions
├── server/             # Backend Node.js application
│   ├── database/       # Database management
│   ├── managers/       # Business logic managers
│   └── types/          # TypeScript type definitions
└── package.json        # Dependencies and scripts
```

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | PostgreSQL connection string | Production only |
| `NODE_ENV` | Environment (development/production) | Yes |

## License

MIT