# API Contract Documentation

**Version**: 1.0.0
**Last Updated**: 2025-01-27
**Status**: Active

## Table of Contents

1. [Overview](#overview)
2. [Authentication](#authentication)
3. [Common Patterns](#common-patterns)
4. [API Endpoints](#api-endpoints)
   - [Authentication APIs](#authentication-apis)
   - [Task APIs](#task-apis)
   - [User APIs](#user-apis)
5. [Data Models](#data-models)
6. [Error Handling](#error-handling)
7. [Rate Limiting](#rate-limiting)
8. [Versioning](#versioning)

---

## Overview

This document defines the HTTP API contract between the frontend (React SPA) and backend (Express.js server) for the Task Priority Manager application.

### Base URL

```
Development:  http://localhost:3002
Production:   https://api.taskmanager.example.com
```

Environment variable: `VITE_API_URL` (frontend), `API_URL` (backend)

### Protocol

- **Transport**: HTTP/1.1 over TCP
- **Format**: JSON (Content-Type: application/json)
- **Encoding**: UTF-8
- **Authentication**: JWT Bearer tokens

### Client Libraries

**Frontend**: Axios HTTP client (`/frontend/src/lib/api.ts`)
- Automatic JWT token injection
- Response/Request interceptors
- Timeout: 10s
- Retry logic: None (TODO)

**Backend**: Express.js REST API
- Routes: `/backend/src/api/routes/`
- Middleware: `/backend/src/api/middleware/`

---

## Authentication

### JWT Token Format

All authenticated requests must include a JWT token in the Authorization header:

```http
Authorization: Bearer <jwt_token>
```

### Token Structure

```json
{
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "email": "user@example.com",
  "iat": 1706361600,
  "exp": 1706448000
}
```

**Fields**:
- `userId`: UUID v4 of the authenticated user
- `email`: User's email address
- `iat`: Issued at timestamp (Unix epoch)
- `exp`: Expiration timestamp (Unix epoch, 24 hours after iat)

### Token Storage

**Frontend**: `localStorage.setItem('auth_token', token)`
- Key: `auth_token`
- Cleared on 401 responses
- Cleared on explicit logout

**Backend**: Not stored (stateless JWT validation)
- Validates signature using JWT_SECRET
- Checks expiration on every request

### Authentication Flow

```
Client                          Server
  |                               |
  |-- POST /api/auth/register --->|
  |<-- 201 { token, user } -------|
  |                               |
  | (Store token in localStorage) |
  |                               |
  |-- GET /api/tasks ------------->|
  |   Authorization: Bearer <tok> |
  |<-- 200 { tasks: [...] } ------|
  |                               |
  |-- (Token expires) ----------->|
  |<-- 401 Unauthorized ----------|
  |                               |
  | (Clear token, redirect /login)|
  |                               |
  |-- POST /api/auth/login ------>|
  |<-- 200 { token, user } -------|
```

---

## Common Patterns

### Request Headers

```http
Content-Type: application/json
Authorization: Bearer <jwt_token>
Accept: application/json
```

### Response Format

**Success Response** (2xx):
```json
{
  "task": { /* Task object */ },
  "message": "Task created successfully"
}
```

**Error Response** (4xx, 5xx):
```json
{
  "error": "Validation failed",
  "details": "Title is required",
  "code": "VALIDATION_ERROR"
}
```

### Timestamps

All timestamps are in **ISO 8601 format**:
```json
{
  "createdAt": "2025-01-27T12:34:56.789Z",
  "updatedAt": "2025-01-27T13:45:00.123Z",
  "deadline": "2025-12-31T23:59:59.999Z"
}
```

**Frontend Conversion**:
```typescript
// String to Date
const deadline = new Date(task.deadline);

// Date to String (for API requests)
const payload = {
  deadline: deadline.toISOString()
};
```

### Pagination

**Not yet implemented** (TODO)

Future format:
```json
{
  "items": [ /* Array of items */ ],
  "total": 150,
  "page": 1,
  "pageSize": 20,
  "totalPages": 8
}
```

### Filtering

**Not yet implemented** (TODO)

Future format: Query parameters
```
GET /api/tasks?completed=false&parentId=null&sortBy=rank&order=asc
```

---

## API Endpoints

### Authentication APIs

#### POST /api/auth/register

Register a new user account.

**Request**:
```http
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePass123!"
}
```

**Response** (201 Created):
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "user@example.com",
    "createdAt": "2025-01-27T12:34:56.789Z"
  }
}
```

**Errors**:
- `400 Bad Request`: Invalid email format or weak password
- `409 Conflict`: Email already registered

**Validation Rules**:
- Email: Valid email format, max 255 chars
- Password: Min 8 chars, max 255 chars

**Frontend Usage**:
```typescript
import { useAuth } from '@/hooks/useAuth';

const { register } = useAuth();
await register({ email, password });
// Token automatically stored in localStorage
```

---

#### POST /api/auth/login

Authenticate existing user.

**Request**:
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePass123!"
}
```

**Response** (200 OK):
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "user@example.com",
    "createdAt": "2025-01-27T12:34:56.789Z"
  }
}
```

**Errors**:
- `401 Unauthorized`: Invalid email or password
- `400 Bad Request`: Missing email or password

**Frontend Usage**:
```typescript
import { useAuth } from '@/hooks/useAuth';

const { login } = useAuth();
await login({ email, password });
// Token automatically stored in localStorage
```

---

### Task APIs

#### GET /api/tasks

List all tasks for authenticated user.

**Authentication**: Required (JWT)

**Request**:
```http
GET /api/tasks?completed=false
Authorization: Bearer <jwt_token>
```

**Query Parameters**:
- `completed` (optional): Filter by completion status (true/false)

**Response** (200 OK):
```json
{
  "tasks": [
    {
      "id": "123e4567-e89b-12d3-a456-426614174000",
      "userId": "550e8400-e29b-41d4-a716-446655440000",
      "title": "Implement login page",
      "description": "Add user authentication UI with email/password",
      "rank": 0,
      "parentId": null,
      "depth": 0,
      "completed": false,
      "completedAt": null,
      "deadline": "2025-12-31T23:59:59.999Z",
      "createdAt": "2025-01-27T12:34:56.789Z",
      "updatedAt": "2025-01-27T12:34:56.789Z",
      "collaborators": ["Alice", "Bob"]
    }
  ]
}
```

**Errors**:
- `401 Unauthorized`: Missing or invalid JWT token
- `500 Internal Server Error`: Database error

**Frontend Usage**:
```typescript
import { taskApiService } from '@/services/TaskApiService';

const tasks = await taskApiService.listTasks(false); // Only incomplete tasks
```

**Backend Implementation**: `/backend/src/api/routes/tasks.ts`

**SQL Query**:
```sql
SELECT * FROM tasks
WHERE user_id = $1
  AND completed = $2
ORDER BY rank ASC;
```

---

#### POST /api/tasks

Create a new task.

**Authentication**: Required (JWT)

**Request**:
```http
POST /api/tasks
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "title": "Implement login page",
  "description": "Add user authentication UI",
  "rank": 0,
  "parentId": null,
  "depth": 0,
  "completed": false,
  "deadline": "2025-12-31T23:59:59.999Z",
  "collaborators": ["Alice"]
}
```

**Request Fields**:
- `id` (optional): UUID v4 (generated if not provided)
- `title` (required): Task title (1-255 chars)
- `description` (optional): Task description (max 2000 chars)
- `rank` (required): Priority rank (0 = highest, non-negative integer)
- `parentId` (optional): Parent task ID (null for top-level)
- `depth` (optional): Hierarchy depth (0 for top-level, defaults to 0)
- `completed` (optional): Completion status (defaults to false)
- `deadline` (optional): ISO 8601 timestamp
- `collaborators` (optional): Array of collaborator names

**Response** (201 Created):
```json
{
  "task": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "userId": "550e8400-e29b-41d4-a716-446655440000",
    "title": "Implement login page",
    "description": "Add user authentication UI",
    "rank": 0,
    "parentId": null,
    "depth": 0,
    "completed": false,
    "completedAt": null,
    "deadline": "2025-12-31T23:59:59.999Z",
    "createdAt": "2025-01-27T12:34:56.789Z",
    "updatedAt": "2025-01-27T12:34:56.789Z",
    "collaborators": ["Alice"]
  }
}
```

**Errors**:
- `400 Bad Request`: Invalid request body (missing title, invalid rank, etc.)
- `401 Unauthorized`: Missing or invalid JWT token
- `409 Conflict`: Task ID already exists
- `500 Internal Server Error`: Database error

**Rank Shifting Behavior**:
When creating a task at rank N:
1. All tasks with `rank >= N` have their rank incremented by 1
2. New task is inserted at rank N
3. Operation is atomic (database transaction)

**Frontend Usage**:
```typescript
import { taskApiService } from '@/services/TaskApiService';

const newTask = await taskApiService.createTask({
  title: 'Implement login page',
  rank: 0,
  parentId: null
});
```

**Backend Implementation**: `/backend/src/services/TaskService.ts:createTask()`

**SQL Transaction**:
```sql
BEGIN;

-- Step 1: Shift existing tasks
UPDATE tasks
SET rank = rank + 1, updated_at = NOW()
WHERE user_id = $1 AND rank >= $2 AND completed = FALSE;

-- Step 2: Insert new task
INSERT INTO tasks (id, user_id, title, rank, ...)
VALUES ($1, $2, $3, $4, ...)
RETURNING *;

COMMIT;
```

---

#### PUT /api/tasks/:id

Update an existing task.

**Authentication**: Required (JWT)

**Request**:
```http
PUT /api/tasks/123e4567-e89b-12d3-a456-426614174000
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "title": "Implement login and registration pages",
  "description": "Updated description",
  "completed": true,
  "completedAt": "2025-01-27T15:00:00.000Z"
}
```

**Request Fields** (all optional):
- `title`: New task title (1-255 chars)
- `description`: New task description (max 2000 chars)
- `completed`: New completion status
- `completedAt`: Completion timestamp (ISO 8601)
- `deadline`: New deadline (ISO 8601)
- `collaborators`: New collaborator list

**Note**: `rank`, `parentId`, `depth` are NOT updatable via this endpoint.
Use TaskManager.moveTask() for rank changes (not yet implemented in API).

**Response** (200 OK):
```json
{
  "task": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "userId": "550e8400-e29b-41d4-a716-446655440000",
    "title": "Implement login and registration pages",
    "description": "Updated description",
    "rank": 0,
    "parentId": null,
    "depth": 0,
    "completed": true,
    "completedAt": "2025-01-27T15:00:00.000Z",
    "deadline": "2025-12-31T23:59:59.999Z",
    "createdAt": "2025-01-27T12:34:56.789Z",
    "updatedAt": "2025-01-27T15:01:23.456Z",
    "collaborators": ["Alice"]
  }
}
```

**Errors**:
- `400 Bad Request`: Invalid request body
- `401 Unauthorized`: Missing or invalid JWT token
- `404 Not Found`: Task not found or not owned by user
- `500 Internal Server Error`: Database error

**Frontend Usage**:
```typescript
import { taskApiService } from '@/services/TaskApiService';

const updatedTask = await taskApiService.updateTask(taskId, {
  completed: true,
  completedAt: new Date()
});
```

**Backend Implementation**: `/backend/src/services/TaskService.ts:updateTask()`

**SQL Query**:
```sql
UPDATE tasks
SET title = $1, description = $2, completed = $3, updated_at = NOW()
WHERE id = $4 AND user_id = $5
RETURNING *;
```

---

#### DELETE /api/tasks/:id

Delete a task.

**Authentication**: Required (JWT)

**Request**:
```http
DELETE /api/tasks/123e4567-e89b-12d3-a456-426614174000
Authorization: Bearer <jwt_token>
```

**Response** (204 No Content):
```
(Empty body)
```

**Errors**:
- `401 Unauthorized`: Missing or invalid JWT token
- `404 Not Found`: Task not found or not owned by user
- `500 Internal Server Error`: Database error

**Rank Shifting Behavior**:
When deleting a task at rank N:
1. All tasks with `rank > N` have their rank decremented by 1
2. Task is deleted
3. Operation is atomic (database transaction)

**Cascade Deletion**:
If task has subtasks (children with `parentId = task.id`):
- All subtasks are also deleted (CASCADE)
- Their subtasks are deleted recursively
- Configured in database schema

**Frontend Usage**:
```typescript
import { taskApiService } from '@/services/TaskApiService';

await taskApiService.deleteTask(taskId);
```

**Backend Implementation**: `/backend/src/services/TaskService.ts:deleteTask()`

**SQL Transaction**:
```sql
BEGIN;

-- Step 1: Delete task (CASCADE deletes children)
DELETE FROM tasks
WHERE id = $1 AND user_id = $2;

-- Step 2: Shift remaining tasks
UPDATE tasks
SET rank = rank - 1, updated_at = NOW()
WHERE user_id = $2 AND rank > $3 AND completed = FALSE;

COMMIT;
```

---

### User APIs

#### GET /api/users/me

Get current user profile.

**Authentication**: Required (JWT)

**Request**:
```http
GET /api/users/me
Authorization: Bearer <jwt_token>
```

**Response** (200 OK):
```json
{
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "user@example.com",
    "createdAt": "2025-01-27T12:34:56.789Z"
  }
}
```

**Errors**:
- `401 Unauthorized`: Missing or invalid JWT token

**Frontend Usage**:
```typescript
import { useAuth } from '@/hooks/useAuth';

const { user } = useAuth();
// user is automatically loaded from localStorage
```

**Backend Implementation**: `/backend/src/api/routes/users.ts`

---

## Data Models

### Task Model

**TypeScript Interface** (`/shared/Task.ts`):
```typescript
interface Task {
  id: string;                    // UUID v4
  userId: string;                // UUID v4 (foreign key to users)
  title: string;                 // 1-255 chars
  description?: string;          // max 2000 chars
  rank: number;                  // 0 = highest priority, non-negative
  parentId: string | null;       // UUID v4 or null (top-level)
  depth: number;                 // 0 = top-level, 1 = subtask, etc.
  completed: boolean;            // false = active, true = done
  completedAt: Date | null;      // Timestamp when marked complete
  deadline?: Date;               // Optional deadline
  createdAt: Date;               // Creation timestamp
  updatedAt: Date;               // Last update timestamp
  collaborators?: string[];      // Array of collaborator names
}
```

**Database Schema** (`/backend/migrations/001_initial_schema.sql`):
```sql
CREATE TABLE tasks (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  rank INTEGER NOT NULL CHECK (rank >= 0),
  parent_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  depth INTEGER NOT NULL DEFAULT 0 CHECK (depth >= 0),
  completed BOOLEAN NOT NULL DEFAULT FALSE,
  completed_at TIMESTAMP WITH TIME ZONE,
  deadline TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  collaborators TEXT[]
);

CREATE INDEX idx_tasks_user_id ON tasks(user_id);
CREATE INDEX idx_tasks_rank ON tasks(user_id, rank) WHERE completed = FALSE;
CREATE INDEX idx_tasks_parent_id ON tasks(parent_id);
```

**Field Constraints**:
- `id`: Must be valid UUID v4
- `userId`: Must exist in users table
- `title`: Non-empty, max 255 chars
- `rank`: Non-negative integer
- `parentId`: Must exist in tasks table (if not null)
- `depth`: Non-negative integer
- `completed`: Boolean (true/false)

---

### User Model

**TypeScript Interface**:
```typescript
interface User {
  id: string;          // UUID v4
  email: string;       // Unique, valid email format
  passwordHash: string; // bcrypt hash (never sent to client)
  createdAt: Date;     // Registration timestamp
}
```

**Database Schema**:
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);
```

---

## Error Handling

### HTTP Status Codes

| Code | Meaning | When Used |
|------|---------|-----------|
| 200 | OK | Successful GET, PUT |
| 201 | Created | Successful POST (resource created) |
| 204 | No Content | Successful DELETE |
| 400 | Bad Request | Invalid request body, validation failed |
| 401 | Unauthorized | Missing/invalid JWT, authentication failed |
| 403 | Forbidden | Authenticated but lacks permission (future) |
| 404 | Not Found | Resource doesn't exist or not owned by user |
| 409 | Conflict | Duplicate resource (e.g., email already exists) |
| 422 | Unprocessable Entity | Semantic validation failed (future) |
| 429 | Too Many Requests | Rate limit exceeded (not yet implemented) |
| 500 | Internal Server Error | Database error, unexpected server error |

### Error Response Format

```json
{
  "error": "Human-readable error message",
  "details": "Additional context (optional)",
  "code": "ERROR_CODE"
}
```

**Error Codes**:
- `VALIDATION_ERROR`: Request validation failed
- `AUTHENTICATION_ERROR`: JWT validation failed
- `NOT_FOUND`: Resource not found
- `DUPLICATE_RESOURCE`: Resource already exists
- `DATABASE_ERROR`: Database operation failed
- `INTERNAL_ERROR`: Unexpected server error

**Example**:
```json
{
  "error": "Task not found",
  "details": "Task with ID '123e4567-e89b-12d3-a456-426614174000' does not exist or you don't have permission to access it",
  "code": "NOT_FOUND"
}
```

### Frontend Error Handling

**Axios Interceptor** (`/frontend/src/lib/api.ts`):
```typescript
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      // Clear token and redirect to login
      localStorage.removeItem('auth_token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);
```

**Error Display**:
- 401: Automatic redirect to /login
- 4xx: Display error message to user (Toast notification)
- 5xx: Display generic error message, log to console

---

## Rate Limiting

**Status**: Not yet implemented (TODO)

**Planned Configuration**:
- Global: 100 requests per minute per IP
- Auth endpoints: 5 requests per minute per IP
- Task endpoints: 60 requests per minute per user

**Implementation**: Express-rate-limit middleware

---

## Versioning

**Current Version**: v1 (implicit, no version prefix in URLs)

**Future Versioning**:
- URL versioning: `/api/v2/tasks`
- Header versioning: `Accept: application/vnd.taskmanager.v2+json`

**Deprecation Policy** (future):
- Old versions supported for 6 months after new version release
- Deprecation warnings in response headers
- Migration guides provided

---

## Changelog

### v1.0.0 (2025-01-27)

Initial API contract:
- Authentication (register, login)
- Tasks CRUD (list, create, update, delete)
- User profile (get current user)
- JWT-based authentication
- Rank shifting algorithm

**Known Limitations**:
- No pagination (all tasks returned)
- No filtering beyond completed status
- No rate limiting
- No task reordering endpoint (rank changes via delete+create)
- No batch operations
- No real-time updates (WebSocket)
- No file attachments
- No task comments
- No task tags/labels

---

## Future Enhancements (Roadmap)

### v1.1 (Q2 2025)
- [ ] Pagination for task lists
- [ ] Advanced filtering (parentId, deadline range, collaborators)
- [ ] Rate limiting
- [ ] Task reordering endpoint (PUT /api/tasks/:id/rank)

### v1.2 (Q3 2025)
- [ ] Batch operations (bulk create, update, delete)
- [ ] Task search (full-text search on title/description)
- [ ] Task tags/labels

### v2.0 (Q4 2025)
- [ ] WebSocket support for real-time updates
- [ ] File attachments
- [ ] Task comments/activity log
- [ ] Collaborative editing (conflict resolution)
- [ ] Task templates

---

## References

- **Backend Source**: `/backend/src/`
- **Frontend Source**: `/frontend/src/`
- **Shared Types**: `/shared/`
- **Database Migrations**: `/backend/migrations/`
- **Root Architecture**: `/ARCHITECTURE.md`
- **Frontend Architecture**: `/frontend/ARCHITECTURE.md`

---

**Maintained by**: Development Team
**Questions**: Contact tech lead or create GitHub issue
