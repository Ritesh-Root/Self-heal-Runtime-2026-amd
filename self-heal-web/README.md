# Self-Heal Web Dashboard

A modern Next.js 14 web interface for the Self-Heal Runtime system. This dashboard provides a user-friendly interface to trigger and monitor the autonomous Java code triage process.

## Features

- **Real-time Log Streaming**: View triage process logs as they happen
- **Modern UI**: Built with Tailwind CSS for a sleek, responsive design
- **Type-Safe**: Fully typed with TypeScript
- **Error Handling**: Comprehensive error handling and loading states
- **Color-Coded Logs**: Errors, warnings, and success messages are highlighted

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Runtime**: Node.js 18+

## Getting Started

### Prerequisites

- Node.js 18 or higher
- npm (comes with Node.js)
- Java backend built at `../self-heal-runtime/target/self-heal-runtime-1.0-SNAPSHOT.jar`

### Installation

```bash
# Install dependencies
npm install
```

### Development

```bash
# Run the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Production Build

```bash
# Build for production
npm run build

# Start production server
npm start
```

## Usage

1. Start the development server with `npm run dev`
2. Open your browser to [http://localhost:3000](http://localhost:3000)
3. Enter the absolute path to a Java file you want to analyze (e.g., `/path/to/TransactionProcessor.java`)
4. Click "Run Triage" to start the process
5. Watch the real-time logs as the system:
   - Detects crashes
   - Isolates the problematic method using AST
   - Consults Gemini AI for a fix
   - Applies and verifies the fix

## Project Structure

```
self-heal-web/
├── app/
│   ├── api/
│   │   └── triage/
│   │       └── route.ts          # API endpoint for running triage
│   ├── globals.css               # Global styles with Tailwind
│   ├── layout.tsx                # Root layout component
│   └── page.tsx                  # Main dashboard page
├── components/
│   └── LogViewer.tsx             # Real-time log viewer component
├── public/                       # Static assets
├── next.config.js                # Next.js configuration
├── tailwind.config.ts            # Tailwind CSS configuration
├── tsconfig.json                 # TypeScript configuration
└── package.json                  # Dependencies and scripts
```

## API Routes

### POST /api/triage

Triggers the self-heal triage process.

**Request Body:**
```json
{
  "filePath": "/absolute/path/to/JavaFile.java"
}
```

**Response:**
- Streaming text response with real-time logs
- Process output is sent as it's generated
- Errors are prefixed with `[ERROR]`

## Development Notes

- The API route spawns a Java process to run the self-heal-runtime JAR
- Logs are streamed in real-time using Server-Sent Events pattern
- The frontend uses React hooks for state management
- All components are client-side rendered for interactivity

## Troubleshooting

### "Failed to start process" Error

Make sure the Java backend JAR is built:
```bash
cd ../self-heal-runtime
./maven/bin/mvn package -DskipTests
```

### Port Already in Use

If port 3000 is already in use, you can specify a different port:
```bash
PORT=3001 npm run dev
```

### TypeScript Errors

Run type checking:
```bash
npx tsc --noEmit
```

### Linting

Check for code quality issues:
```bash
npm run lint
```

## Browser Support

- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)

## License

Part of the Self-Heal Runtime project.
