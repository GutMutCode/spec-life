# Task Priority Manager - System Architecture

> **Last Updated:** 2025-10-27
> **Version:** 1.0 (Local-Only Phase)
> **Target:** 2.0 (Cloud Sync Phase - In Progress)

## Table of Contents

- [Overview](#overview)
- [System Architecture](#system-architecture)
- [Current State vs Target State](#current-state-vs-target-state)
- [Layer Architecture](#layer-architecture)
- [Data Flow](#data-flow)
- [Authentication & Authorization](#authentication--authorization)
- [API Contract](#api-contract)
- [Database Schema](#database-schema)
- [Frontend Architecture](#frontend-architecture)
- [Backend Architecture](#backend-architecture)
- [Deployment Architecture](#deployment-architecture)
- [Development Roadmap](#development-roadmap)

---

## Overview

**Task Priority Manager** is a full-stack task management application that uses comparison-based ranking to help users focus on their highest-priority task.

### Core Concept

Instead of manually assigning priority numbers, users answer simple "Which is more important?" questions. The system uses **binary search** to efficiently determine the optimal position for each task (maximum 10 comparisons for up to 1024 tasks).

### Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | React 18 + TypeScript + Vite |
| **Backend** | Node.js 20 + Express + TypeScript |
| **Database** | PostgreSQL 14 |
| **Local Storage** | IndexedDB (via Dexie.js) |
| **State Management** | XState v5 (FSM for comparisons) |
| **Styling** | Tailwind CSS |
| **Authentication** | JWT (JSON Web Tokens) |
| **Deployment** | Docker Compose |

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         User Browser                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │             Frontend (React + TypeScript)                │  │
│  │                                                          │  │
│  │  ┌─────────────┐  ┌──────────────┐  ┌───────────────┐  │  │
│  │  │   Pages     │  │  Components  │  │    Hooks      │  │  │
│  │  │ (Dashboard, │  │  (TaskCard,  │  │  (useTasks,   │  │  │
│  │  │  AddTask,   │  │   TaskList,  │  │   useAuth)    │  │  │
│  │  │  AllTasks)  │  │   Layout)    │  │               │  │  │
│  │  └─────┬───────┘  └──────┬───────┘  └───────┬───────┘  │  │
│  │        │                 │                  │           │  │
│  │        └─────────────────┴──────────────────┘           │  │
│  │                          │                               │  │
│  │        ┌─────────────────┴──────────────────┐           │  │
│  │        │        Service Layer                │           │  │
│  │        │  ┌────────────────────────────────┐ │           │  │
│  │        │  │   StorageService (CRUD)        │ │           │  │
│  │        │  │   TaskManager (Rank Shifting)  │ │           │  │
│  │        │  │   TaskApiService (API Calls)   │ │           │  │
│  │        │  └────────┬───────────────┬───────┘ │           │  │
│  │        └───────────┼───────────────┼─────────┘           │  │
│  │                    │               │                     │  │
│  │         ┌──────────▼──────┐   ┌───▼──────────────┐      │  │
│  │         │   IndexedDB     │   │   HTTP Client    │      │  │
│  │         │   (Dexie.js)    │   │   (axios)        │      │  │
│  │         │                 │   │   + JWT Token    │      │  │
│  │         └─────────────────┘   └────────┬─────────┘      │  │
│  └──────────────────────────────────────────┼──────────────┘  │
└─────────────────────────────────────────────┼──────────────────┘
                                              │
                                              │ HTTP/HTTPS
                                              │ (Port 3002)
                                              │
┌─────────────────────────────────────────────▼──────────────────┐
│                    Backend Server (Docker)                     │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │          Express.js API Server                           │ │
│  │                                                          │ │
│  │  ┌───────────────┐  ┌──────────────┐  ┌──────────────┐ │ │
│  │  │   Middleware  │  │    Routes    │  │   Services   │ │ │
│  │  │ (auth, CORS,  │  │  /api/auth   │  │  AuthService │ │ │
│  │  │   helmet)     │  │  /api/tasks  │  │  TaskService │ │ │
│  │  └───────────────┘  └──────┬───────┘  └──────┬───────┘ │ │
│  │                             │                 │         │ │
│  │                    ┌────────┴─────────────────┘         │ │
│  │                    │                                    │ │
│  │          ┌─────────▼──────────────┐                    │ │
│  │          │  PostgresAdapter       │                    │ │
│  │          │  (Database Layer)      │                    │ │
│  │          └──────────┬─────────────┘                    │ │
│  └─────────────────────┼──────────────────────────────────┘ │
│                        │                                    │
│         ┌──────────────▼────────────────┐                  │
│         │   PostgreSQL Database         │                  │
│         │   - users table               │                  │
│         │   - tasks table               │                  │
│         │   (Port 5433)                 │                  │
│         └───────────────────────────────┘                  │
└────────────────────────────────────────────────────────────┘
```

---

## Current State vs Target State

### **Current State (v1.0 - Local-Only)**

```
User → Frontend → IndexedDB
                    (Local Storage Only)

Backend & PostgreSQL exist but are NOT connected to frontend
```

**Characteristics:**
- ✅ All features working (US1-US5)
- ✅ 177 tests passing
- ✅ Offline-first architecture
- ❌ No cloud synchronization
- ❌ No multi-device support
- ❌ Data lost if browser data cleared

### **Target State (v2.0 - Cloud Sync)**

```
User → Frontend → IndexedDB (Local Cache)
                    ↓
                  StorageService
                    ↓
           ┌────────┴────────┐
           ↓                 ↓
      IndexedDB         API Client → Backend → PostgreSQL
    (Offline Cache)    (Cloud Sync)   (Server)  (Persistent)
```

**Characteristics:**
- ✅ All local features preserved
- ✅ Cloud backup and sync
- ✅ Multi-device support
- ✅ Data persistence
- ✅ Offline-first with eventual consistency

---

## Layer Architecture

### 1. **Presentation Layer** (Frontend)

**Location:** `/frontend/src/`

**Responsibilities:**
- Render UI components
- Handle user interactions
- Manage local state
- Route navigation

**Key Files:**
- `pages/` - Route-level components
- `components/` - Reusable UI components
- `hooks/` - Custom React hooks

### 2. **Business Logic Layer** (Frontend Services)

**Location:** `/frontend/src/services/`

**Responsibilities:**
- Task CRUD operations
- Rank shifting algorithms
- Validation logic
- API communication

**Key Files:**
- `StorageService.ts` - Task CRUD with IndexedDB
- `TaskManager.ts` - Rank shifting logic
- `TaskApiService.ts` - Backend API calls (NEW)

### 3. **Data Access Layer** (Frontend)

**Location:** `/frontend/src/lib/`

**Responsibilities:**
- IndexedDB schema and operations
- API client configuration
- Type definitions

**Key Files:**
- `indexeddb.ts` - Dexie.js database wrapper
- `api.ts` - Axios HTTP client with JWT interceptor

### 4. **API Layer** (Backend)

**Location:** `/backend/src/api/`

**Responsibilities:**
- HTTP request handling
- Authentication middleware
- Input validation
- Response formatting

**Key Files:**
- `routes/auth.ts` - /api/auth/* endpoints
- `routes/tasks.ts` - /api/tasks/* endpoints
- `middleware/auth.ts` - JWT verification

### 5. **Application Layer** (Backend Services)

**Location:** `/backend/src/services/`

**Responsibilities:**
- Business logic
- Data transformation
- Service coordination

**Key Files:**
- `AuthService.ts` - User authentication
- `TaskService.ts` - Task operations with rank shifting

### 6. **Persistence Layer** (Backend)

**Location:** `/backend/src/storage/`

**Responsibilities:**
- Database queries
- Transaction management
- Data mapping

**Key Files:**
- `PostgresAdapter.ts` - PostgreSQL operations
- `migrations/` - Database schema migrations

---

## Data Flow

### **Current Flow (v1.0 - Local-Only)**

```
User Action
    ↓
Component (e.g., TaskCard)
    ↓
Hook (e.g., useTasks)
    ↓
StorageService
    ↓
IndexedDB (lib/indexeddb.ts)
    ↓
Browser Local Storage
```

### **Target Flow (v2.0 - Dual-Write with Cloud Sync)**

```
User Action
    ↓
Component
    ↓
Hook (useTasks)
    ↓
StorageService (UPDATED)
    ↓
┌───────────────┴───────────────┐
↓                               ↓
IndexedDB                    TaskApiService (NEW)
(Immediate)                      ↓
                            axios + JWT
                                 ↓
                            Backend API
                                 ↓
                            TaskService
                                 ↓
                            PostgresAdapter
                                 ↓
                            PostgreSQL
```

**Dual-Write Strategy:**
1. **Write to IndexedDB first** (optimistic UI update)
2. **Write to API in background** (cloud sync)
3. **On API success:** Mark as synced
4. **On API failure:** Queue for retry

---

## Authentication & Authorization

### **Authentication Flow**

```
1. User submits login credentials
    ↓
2. Frontend: POST /api/auth/login
    ↓
3. Backend validates credentials (bcrypt)
    ↓
4. Backend generates JWT token (24h expiry)
    ↓
5. Frontend stores token in localStorage
    ↓
6. Frontend includes token in all API requests (Authorization: Bearer <token>)
    ↓
7. Backend verifies token on each request (auth middleware)
```

### **JWT Token Structure**

```json
{
  "userId": "uuid-v4",
  "email": "user@example.com",
  "iat": 1234567890,
  "exp": 1234654290
}
```

### **Protected Routes**

**Frontend Routes (ProtectedRoute component):**
- `/` - Dashboard
- `/add` - Add Task
- `/tasks` - All Tasks
- `/history` - Completed Tasks

**Backend Routes (auth middleware):**
- `GET /api/tasks`
- `POST /api/tasks`
- `PUT /api/tasks/:id`
- `DELETE /api/tasks/:id`

### **Public Routes**

**Frontend:**
- `/login` - Login page
- `/register` - Registration page

**Backend:**
- `POST /api/auth/register`
- `POST /api/auth/login`

---

## API Contract

### **Base URL**

- **Development:** `http://localhost:3002`
- **Production:** Configured via `VITE_API_URL` environment variable

### **Authentication Endpoints**

#### `POST /api/auth/register`

**Request:**
```json
{
  "email": "user@example.com",
  "password": "securePassword123"
}
```

**Response (201):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid-v4",
    "email": "user@example.com"
  }
}
```

#### `POST /api/auth/login`

**Request:**
```json
{
  "email": "user@example.com",
  "password": "securePassword123"
}
```

**Response (200):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid-v4",
    "email": "user@example.com"
  }
}
```

### **Task Endpoints**

All task endpoints require `Authorization: Bearer <token>` header.

#### `GET /api/tasks`

**Query Parameters:**
- `completed` (optional): `true` | `false`

**Response (200):**
```json
{
  "tasks": [
    {
      "id": "uuid-v4",
      "userId": "uuid-v4",
      "title": "Task title",
      "description": "Optional description",
      "deadline": "2025-12-31T23:59:59.000Z",
      "rank": 0,
      "parentId": null,
      "depth": 0,
      "completed": false,
      "completedAt": null,
      "createdAt": "2025-10-27T...",
      "updatedAt": "2025-10-27T...",
      "collaborators": ["Alice", "Bob"]
    }
  ]
}
```

#### `POST /api/tasks`

**Request:**
```json
{
  "id": "optional-uuid-v4",
  "title": "Task title",
  "description": "Optional description",
  "deadline": "2025-12-31T23:59:59.000Z",
  "rank": 0,
  "parentId": null,
  "depth": 0,
  "completed": false,
  "completedAt": null,
  "createdAt": "2025-10-27T...",
  "updatedAt": "2025-10-27T...",
  "collaborators": ["Alice"]
}
```

**Response (201):**
```json
{
  "task": { /* task object */ }
}
```

**Automatic Rank Shifting:**
Backend automatically shifts ranks of existing tasks at or after the insertion rank.

#### `PUT /api/tasks/:id`

**Request (all fields optional):**
```json
{
  "title": "Updated title",
  "description": "Updated description",
  "deadline": "2025-12-31T23:59:59.000Z",
  "completed": true,
  "completedAt": "2025-10-27T..."
}
```

**Response (200):**
```json
{
  "task": { /* updated task object */ }
}
```

#### `DELETE /api/tasks/:id`

**Response (204):** No content

**Automatic Rank Shifting:**
Backend automatically shifts ranks of tasks below the deleted task.

---

## Database Schema

### **PostgreSQL Tables**

#### `users` Table

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT email_format CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}')
);

CREATE INDEX idx_users_email ON users(email);
```

#### `tasks` Table

```sql
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  deadline TIMESTAMP WITH TIME ZONE,
  rank INTEGER NOT NULL DEFAULT 0,
  parent_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  depth INTEGER NOT NULL DEFAULT 0,
  completed BOOLEAN NOT NULL DEFAULT FALSE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  collaborators TEXT[] DEFAULT '{}'
);

CREATE INDEX idx_tasks_user_id ON tasks(user_id);
CREATE INDEX idx_tasks_rank ON tasks(rank);
CREATE INDEX idx_tasks_completed ON tasks(completed);
CREATE INDEX idx_tasks_user_completed_rank ON tasks(user_id, completed, rank);
CREATE INDEX idx_tasks_parent_id ON tasks(parent_id);
```

### **IndexedDB Schema (Frontend)**

**Database Name:** `TaskPriorityDB`

**Tables:**

#### `tasks` Table (ObjectStore)

```typescript
interface Task {
  id: string;                    // Primary key (UUID v4)
  userId?: string;               // User ID (optional, for future sync)
  title: string;
  description?: string;
  deadline?: Date;
  rank: number;
  parentId: string | null;
  depth: number;
  completed: boolean;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  collaborators?: string[];
}
```

**Indexes:**
- `id` (primary key)
- `rank`
- `completedAt`
- `createdAt`
- `[completed+rank]` (compound index)

#### `metadata` Table (ObjectStore)

```typescript
interface Metadata {
  key: string;                   // Primary key
  value: string | number | boolean;
}
```

**Usage:**
- Last cleanup timestamp
- Sync status flags (future)

---

## Frontend Architecture

**Detailed documentation:** See `/frontend/ARCHITECTURE.md`

### **Key Patterns**

1. **Offline-First Architecture**
   - All data stored in IndexedDB first
   - API calls are asynchronous and optional

2. **Optimistic UI Updates**
   - UI updates immediately on user action
   - Reverts on error
   - Implemented in `useTasks` hook

3. **Component Hierarchy**

```
App.tsx
└── Routes
    ├── Login / Register (public)
    └── Layout (protected)
        ├── Dashboard
        │   └── TopTaskCard (prominent)
        ├── AddTask
        │   └── ComparisonWorkflow (XState FSM)
        ├── AllTasks
        │   └── TaskList (draggable)
        │       └── TaskCard (compact, editable)
        └── History
            └── CompletedTasksList
```

4. **State Management**

- **React State:** Component-level state
- **Custom Hooks:** Shared state logic (`useTasks`, `useAuth`)
- **XState:** Finite state machine for comparison workflow

5. **Service Layer Pattern**

```
Component → Hook → Service → Data Layer
                     ↓
            StorageService.ts
            TaskManager.ts
            TaskApiService.ts (NEW)
```

---

## Backend Architecture

### **Layered Architecture**

```
HTTP Request
    ↓
Express Middleware (auth, CORS, helmet)
    ↓
Route Handler (routes/tasks.ts)
    ↓
Service Layer (services/TaskService.ts)
    ↓
Storage Adapter (storage/PostgresAdapter.ts)
    ↓
PostgreSQL Database
```

### **Key Design Patterns**

1. **Dependency Injection**
   - Services receive adapters as constructor parameters
   - Easy to mock for testing

2. **Adapter Pattern**
   - `PostgresAdapter` abstracts database operations
   - Can swap for different database in future

3. **DTO Pattern**
   - `CreateTaskDTO`, `UpdateTaskDTO` for input
   - `toTaskResponseDTO` for output transformation

4. **Transaction Management**
   - Rank shifting operations use database transactions
   - Ensures atomicity (all or nothing)

### **Rank Shifting Algorithm**

**Insert at rank N:**
```sql
BEGIN;
UPDATE tasks
SET rank = rank + 1, updated_at = NOW()
WHERE user_id = $1
  AND parent_id IS NOT DISTINCT FROM $2
  AND completed = false
  AND rank >= $3;

INSERT INTO tasks (...) VALUES (...);
COMMIT;
```

**Delete at rank N:**
```sql
BEGIN;
DELETE FROM tasks WHERE id = $1 AND user_id = $2;

UPDATE tasks
SET rank = rank - 1, updated_at = NOW()
WHERE user_id = $2
  AND parent_id IS NOT DISTINCT FROM $3
  AND rank > $4;
COMMIT;
```

---

## Deployment Architecture

### **Docker Compose Setup**

```yaml
services:
  postgres:
    image: postgres:14-alpine
    ports: ["5433:5432"]
    volumes: [postgres_data]
    healthcheck: pg_isready

  backend:
    build: ./backend
    ports: ["3002:3001"]
    depends_on: [postgres]
    environment:
      - DATABASE_URL=postgresql://...
      - JWT_SECRET=...

  frontend:
    build: ./frontend
    ports: ["8081:80"]
    depends_on: [backend]
```

### **Environment Variables**

**Backend (.env):**
```bash
NODE_ENV=production
PORT=3001
DATABASE_URL=postgresql://user:pass@postgres:5432/dbname
JWT_SECRET=your-secret-key
CORS_ORIGIN=http://localhost:8081
```

**Frontend (Build-time):**
```bash
VITE_API_URL=http://localhost:3002
```

### **Network Architecture**

```
User Browser (Port 8081)
    ↓ HTTP
Frontend (Nginx)
    ↓ HTTP
Backend API (Port 3002)
    ↓ PostgreSQL Protocol
PostgreSQL (Port 5433)
```

---

## Development Roadmap

### **Phase 1: Local-Only** ✅ COMPLETE

- [x] Frontend UI (all pages)
- [x] IndexedDB storage
- [x] Comparison-based ranking
- [x] Drag-and-drop reordering
- [x] Inline editing
- [x] Task history
- [x] 177 tests passing

### **Phase 2: Authentication** ✅ COMPLETE (2025-10-27)

- [x] JWT authentication
- [x] Login/Register pages
- [x] Protected routes
- [x] Token management
- [x] Backend auth endpoints

### **Phase 3: Cloud Sync** 🚧 IN PROGRESS

- [x] TaskApiService created
- [ ] Update StorageService for dual-write
- [ ] Sync queue for offline operations
- [ ] Initial sync (upload local tasks)
- [ ] Conflict resolution
- [ ] Real-time updates (polling or WebSocket)

### **Phase 4: Production Ready**

- [ ] Error monitoring (Sentry)
- [ ] Analytics
- [ ] Performance optimization
- [ ] E2E tests for cloud sync
- [ ] Production deployment

---

## File Structure Reference

```
spec-life/
├── frontend/
│   ├── src/
│   │   ├── components/      # UI components
│   │   ├── hooks/           # Custom React hooks
│   │   ├── lib/             # Utilities (IndexedDB, API client)
│   │   ├── pages/           # Route components
│   │   ├── services/        # Business logic layer
│   │   │   ├── StorageService.ts      # CRUD operations
│   │   │   ├── TaskManager.ts         # Rank shifting
│   │   │   └── TaskApiService.ts      # API calls (NEW)
│   │   └── App.tsx
│   └── ARCHITECTURE.md      # Frontend-specific architecture
│
├── backend/
│   └── src/
│       ├── api/
│       │   ├── middleware/  # Auth, CORS, error handling
│       │   └── routes/      # Express routes
│       ├── services/        # Business logic
│       └── storage/         # Database layer
│
├── shared/
│   └── types/              # Shared TypeScript types
│
├── ARCHITECTURE.md         # THIS FILE - System architecture
├── README.md              # Getting started guide
├── DEPLOYMENT.md          # Deployment instructions
└── LLM_READABILITY_ANALYSIS.md  # Code quality analysis
```

---

## Next Steps for Developers

### **To Complete Cloud Sync:**

1. **Update StorageService**
   - Add dual-write logic (IndexedDB + API)
   - Add sync status tracking
   - Add offline queue

2. **Add Sync UI Indicators**
   - Show sync status in UI
   - Show pending sync count
   - Show conflicts

3. **Implement Initial Sync**
   - Upload existing local tasks to server
   - Download server tasks to IndexedDB
   - Merge conflicts

4. **Add Real-Time Updates**
   - Poll server for changes
   - Or implement WebSocket connection

### **For LLM/AI Understanding:**

**Start with these files in order:**

1. `README.md` - Project overview
2. `ARCHITECTURE.md` - This file
3. `frontend/ARCHITECTURE.md` - Frontend details
4. `shared/types/Task.ts` - Core data model
5. `frontend/src/services/StorageService.ts` - Business logic
6. `backend/src/api/routes/tasks.ts` - API endpoints

---

## Questions & Support

**Documentation:**
- See `README.md` for installation and getting started
- See `DEPLOYMENT.md` for production deployment
- See `frontend/ARCHITECTURE.md` for frontend details
- See `LLM_READABILITY_ANALYSIS.md` for code quality metrics

**Key Concepts:**
- **Rank:** 0-indexed priority (0 = highest priority)
- **Comparison:** Binary search to find optimal rank
- **Dual-Write:** Write to both IndexedDB and API
- **Optimistic UI:** Update UI before API confirms
- **Offline-First:** App works without internet

**Contact:** Check project README for maintainer information
