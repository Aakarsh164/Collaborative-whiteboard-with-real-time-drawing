# Collaborative Whiteboard

A real-time collaborative whiteboard application built with React, TypeScript, Socket.IO, and SQLite.

## Features

- Real-time collaborative drawing
- Multiple drawing tools (pen, eraser, shapes, text)
- Room-based collaboration with password protection
- Live cursor tracking
- Export functionality (PDF, PNG)
- Responsive design

## Tech Stack

- **Frontend**: React, TypeScript, Vite, Tailwind CSS
- **Backend**: Node.js, Express, Socket.IO
- **Database**: SQLite
- **Real-time Communication**: Socket.IO

## Local Development

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn

### Setup

1. Clone the repository:
```bash
git clone <repository-url>
cd collaborative-whiteboard
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

This will start both the client (Vite dev server) and the backend server concurrently.

- Client: http://localhost:5173
- Server: http://localhost:3001

## Production Deployment

### Render Deployment

This project is configured for easy deployment on Render:

1. Connect your GitHub repository to Render
2. Create a new Web Service
3. Use the following settings:
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
   - **Environment Variable**: `NODE_ENV=production`

The `render.yaml` file is included for automatic configuration.

### Manual Deployment

1. Build the application:
```bash
npm run build
```

2. Start the production server:
```bash
npm start
```

The server will serve the built React app and handle API requests on the same port.

## Project Structure

```
├── src/                    # React frontend
│   ├── components/         # React components
│   ├── hooks/             # Custom React hooks
│   ├── types/             # TypeScript type definitions
│   └── utils/             # Utility functions
├── server/                # Express backend
│   ├── database/          # Database management
│   ├── managers/          # Business logic managers
│   └── types/             # Server type definitions
├── dist/                  # Built files (generated)
└── package.json           # Dependencies and scripts
```

## Available Scripts

- `npm run dev` - Start development server (client + server)
- `npm run dev:client` - Start only the client dev server
- `npm run dev:server` - Start only the server dev server
- `npm run build` - Build both client and server for production
- `npm run build:client` - Build only the client
- `npm run build:server` - Build only the server
- `npm start` - Start production server
- `npm run lint` - Run ESLint

## Environment Variables

- `NODE_ENV` - Set to `production` for production deployment
- `PORT` - Server port (defaults to 3001)

## License

MIT