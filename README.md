# Task Priority Manager

A dynamic task priority management application with comparison-based ranking. Help users focus on what matters most by presenting the single highest-priority task front and center.

## Overview

Task Priority Manager uses a unique comparison-based approach to task prioritization. Instead of manually assigning priority numbers, users answer simple "Which is more important?" questions. The system uses binary search to efficiently determine the optimal position for each task.

### Key Features

- **Focus-First Dashboard**: See your single most important task immediately
- **Smart Comparison System**: Binary search-based task ranking (max 10 comparisons)
- **Drag-and-Drop Reordering**: Manual priority adjustment with visual feedback
- **Inline Task Editing**: Edit tasks directly in the list
- **Accessibility First**: Full keyboard navigation, ARIA labels, screen reader support
- **Optimistic UI**: Instant feedback for all user actions
- **90-Day Task History**: Track completed tasks with automatic cleanup

## Architecture

```
task-priority-manager/
├── frontend/          # React + TypeScript + Vite
├── backend/           # Express + PostgreSQL API
├── shared/            # Shared TypeScript types
└── docs/              # Additional documentation
```

### Tech Stack

**Frontend:**
- React 18 + TypeScript
- Vite (build tool)
- Tailwind CSS (styling)
- React Router (routing)
- Dexie (IndexedDB wrapper)
- XState (FSM for comparison logic)
- @dnd-kit (drag-and-drop)

**Backend:**
- Node.js 20+ + Express
- PostgreSQL (database)
- TypeScript
- Helmet + CORS (security)

**Testing:**
- Vitest (unit tests)
- Playwright (E2E tests)
- Testing Library (React)

## Prerequisites

Before you begin, ensure you have:

- **Node.js** 20.0.0 or higher
- **pnpm** 8.0.0 or higher
- **PostgreSQL** 14+ (for backend API, optional for frontend-only development)

### Installing Prerequisites

**Node.js:**
```bash
# Using nvm (recommended)
nvm install 20
nvm use 20

# Or download from https://nodejs.org/
```

**pnpm:**
```bash
npm install -g pnpm
```

**PostgreSQL:**
```bash
# macOS
brew install postgresql@14

# Ubuntu/Debian
sudo apt install postgresql-14

# Windows
# Download from https://www.postgresql.org/download/windows/
```

## Getting Started

### 1. Clone the Repository

```bash
git clone <repository-url>
cd task-priority-manager
```

### 2. Install Dependencies

```bash
# Install all workspace dependencies
pnpm install
```

This installs dependencies for frontend, backend, and shared packages in a single command.

### 3. Environment Setup

#### Backend Environment Variables

Create `backend/.env`:

```bash
# Database
DATABASE_URL=postgresql://postgres:password@localhost:5432/task_priority_dev

# Server
PORT=3001
NODE_ENV=development

# Security (generate with: openssl rand -base64 32)
JWT_SECRET=your-secret-key-here
```

#### Frontend Environment Variables

Create `frontend/.env`:

```bash
# API endpoint (optional, defaults to http://localhost:3001)
VITE_API_URL=http://localhost:3001
```

### 4. Database Setup

```bash
# Start PostgreSQL (if not running)
# macOS:
brew services start postgresql@14

# Ubuntu/Debian:
sudo systemctl start postgresql

# Create database
createdb task_priority_dev

# Run migrations
cd backend
pnpm migrate up
```

### 5. Start Development Servers

**Option A: Start All Services (Recommended)**
```bash
# From project root
pnpm dev
```

This starts:
- Frontend dev server on `http://localhost:5173`
- Backend API server on `http://localhost:3001`

**Option B: Start Services Individually**
```bash
# Terminal 1: Frontend
cd frontend
pnpm dev

# Terminal 2: Backend
cd backend
pnpm dev
```

### 6. Access the Application

Open your browser and navigate to:
```
http://localhost:5173
```

## Development

### Project Structure

```
frontend/
├── src/
│   ├── components/       # React components
│   │   ├── TaskCard.tsx
│   │   ├── TaskForm.tsx
│   │   ├── TaskList.tsx
│   │   ├── ComparisonModal.tsx
│   │   └── Toast.tsx
│   ├── pages/            # Page components
│   │   ├── Dashboard.tsx
│   │   ├── AddTask.tsx
│   │   ├── AllTasks.tsx
│   │   └── History.tsx
│   ├── hooks/            # Custom React hooks
│   │   ├── useTasks.ts
│   │   ├── useComparison.ts
│   │   ├── useFocusTrap.ts
│   │   └── useKeyboardShortcuts.ts
│   ├── services/         # Business logic
│   │   ├── StorageService.ts      # IndexedDB operations
│   │   ├── TaskManager.ts         # Task CRUD + ranking
│   │   ├── ComparisonEngine.ts    # Binary search logic
│   │   └── comparisonMachine.ts   # XState FSM
│   ├── lib/              # Utilities
│   │   ├── indexeddb.ts
│   │   ├── utils.ts
│   │   └── validation.ts
│   └── __tests__/        # Tests
│
backend/
├── src/
│   ├── api/
│   │   ├── routes/       # Express routes
│   │   └── middleware/   # Express middleware
│   ├── services/         # Business logic
│   ├── db/               # Database layer
│   └── server.ts         # Entry point
│
shared/
└── src/
    └── Task.ts           # Shared TypeScript types
```

### Available Scripts

**Root Level:**
```bash
pnpm dev          # Start all services in parallel
pnpm build        # Build all packages
pnpm test         # Run all tests
pnpm lint         # Lint all packages
pnpm clean        # Clean all node_modules and build artifacts
```

**Frontend:**
```bash
cd frontend
pnpm dev          # Start dev server (Vite)
pnpm build        # Build for production
pnpm preview      # Preview production build
pnpm test         # Run unit tests (Vitest)
pnpm test:ui      # Run tests with UI
pnpm test:e2e     # Run E2E tests (Playwright)
pnpm lint         # Lint TypeScript/React
```

**Backend:**
```bash
cd backend
pnpm dev          # Start dev server (tsx watch)
pnpm build        # Compile TypeScript
pnpm start        # Run compiled server
pnpm test         # Run unit tests
pnpm migrate up   # Run database migrations
pnpm migrate down # Rollback migrations
pnpm lint         # Lint TypeScript
```

### Keyboard Shortcuts

The application supports keyboard navigation:

- `n` - Navigate to Add Task page
- `a` - Navigate to All Tasks page
- `h` - Navigate to History page
- `d` - Navigate to Dashboard
- `?` - Show keyboard shortcuts help (console)
- `Tab` / `Shift+Tab` - Navigate between elements
- `Enter` / `Space` - Activate buttons
- `Escape` - Close modals

### Running Tests

**Unit Tests:**
```bash
# All tests
pnpm test

# Frontend tests only
cd frontend && pnpm test

# Backend tests only
cd backend && pnpm test

# Watch mode
pnpm test --watch

# With coverage
pnpm test --coverage
```

**E2E Tests:**
```bash
cd frontend
pnpm test:e2e

# With UI
pnpm test:e2e --ui

# Debug mode
pnpm test:e2e --debug
```

### Code Quality

**Linting:**
```bash
pnpm lint
```

**Type Checking:**
```bash
# Frontend
cd frontend && tsc --noEmit

# Backend
cd backend && tsc --noEmit
```

## Building for Production

### Full Build

```bash
# From project root
pnpm build
```

This compiles:
- Frontend → `frontend/dist/`
- Backend → `backend/dist/`
- Shared types → `shared/dist/`

### Frontend Only

```bash
cd frontend
pnpm build

# Preview production build
pnpm preview
```

### Backend Only

```bash
cd backend
pnpm build

# Run production build
pnpm start
```

## Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed deployment instructions including:
- Docker containerization
- Environment configuration
- Database setup
- Reverse proxy setup (Nginx)
- SSL/TLS configuration
- CI/CD pipelines

## Documentation

- [IMPLEMENTATION_GUIDE.md](./IMPLEMENTATION_GUIDE.md) - Development phases and task breakdown
- [DEPLOYMENT.md](./DEPLOYMENT.md) - Deployment and production setup
- [frontend/ACCESSIBILITY.md](./frontend/ACCESSIBILITY.md) - Accessibility testing guide
- [frontend/PERFORMANCE.md](./frontend/PERFORMANCE.md) - Performance optimization guide

## User Stories

### US1: Focus on Top Priority
A user opens the service to immediately see which task they should work on right now. The system displays the single most important task at the top of the interface, making the decision effortless.

### US2: Add New Task with Comparison
A user adds a new task and wants to know where it fits in their priority list. The system asks comparison questions ("Which is more important?") to find the right position.

### US3: View All Tasks
A user wants to see their complete task list, not just the top item. The system displays all tasks sorted by priority, giving context about upcoming work.

### US4: Manual Reordering
A user realizes their priorities have shifted and needs to adjust task order. The system allows drag-and-drop reordering with instant rank updates.

### US5: Task History
A user completes a task and wants to see their history. The system shows completed tasks in reverse chronological order with 90-day retention.

## Technical Highlights

### Comparison Algorithm
- **Binary search** for efficient position finding (O(log n))
- **Max 10 comparisons** before manual placement fallback
- **XState FSM** for robust state management

### Performance Optimizations
- React.memo on TaskCard components
- useMemo for expensive calculations
- useCallback for stable function references
- Optimistic UI updates for instant feedback
- Efficient IndexedDB queries with Dexie

### Accessibility
- Full WCAG 2.1 AA compliance
- Screen reader support (NVDA, JAWS, VoiceOver)
- Keyboard navigation throughout
- Focus management in modals
- ARIA labels on all interactive elements

### Error Handling
- Graceful degradation on failures
- User-friendly error messages
- Automatic retry mechanisms
- Error boundaries for React components

## Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Opera 76+

**IndexedDB Required:** The frontend uses IndexedDB for local storage. Browsers must support IndexedDB API.

## Troubleshooting

### Port Already in Use

```bash
# Frontend (port 5173)
lsof -ti:5173 | xargs kill -9

# Backend (port 3001)
lsof -ti:3001 | xargs kill -9
```

### Database Connection Errors

```bash
# Check PostgreSQL is running
pg_isready

# Reset database
dropdb task_priority_dev
createdb task_priority_dev
cd backend && pnpm migrate up
```

### Dependency Issues

```bash
# Clean install
pnpm clean
pnpm install

# Verify pnpm version
pnpm --version  # Should be 8.0.0+
```

### Build Errors

```bash
# Clear Vite cache
cd frontend
rm -rf node_modules/.vite
pnpm build
```

## Contributing

1. Follow the existing code style
2. Write tests for new features
3. Update documentation as needed
4. Ensure all tests pass: `pnpm test`
5. Ensure linting passes: `pnpm lint`

## License

Private - All Rights Reserved

## Support

For issues, questions, or contributions, please refer to:
- [IMPLEMENTATION_GUIDE.md](./IMPLEMENTATION_GUIDE.md) for development guidance
- [DEPLOYMENT.md](./DEPLOYMENT.md) for deployment help

---

**Built with React, TypeScript, and a focus on user experience.**
