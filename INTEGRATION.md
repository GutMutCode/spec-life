# System Integration Documentation

**Version**: 1.0.0
**Last Updated**: 2025-01-27
**Status**: Active

## Table of Contents

1. [Overview](#overview)
2. [Authentication Flow](#authentication-flow)
3. [Data Flow Patterns](#data-flow-patterns)
4. [Frontend-Backend Integration](#frontend-backend-integration)
5. [State Management Integration](#state-management-integration)
6. [Error Handling Integration](#error-handling-integration)
7. [Testing Integration Points](#testing-integration-points)
8. [Deployment Integration](#deployment-integration)

---

## Overview

This document describes how different components of the Task Priority Manager system integrate with each other, with special focus on authentication flow and data synchronization patterns.

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│                        User Browser                         │
│  ┌───────────────────────────────────────────────────────┐  │
│  │              Frontend (React SPA)                     │  │
│  │                                                         │  │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────────────┐   │  │
│  │  │  Pages   │→│  Hooks    │→│  Services        │   │  │
│  │  │  (UI)    │  │  (State)  │  │  (Business)      │   │  │
│  │  └──────────┘  └──────────┘  └────────┬─────────┘   │  │
│  │                                         │              │  │
│  │  ┌──────────────────────────────────┬──┴──────────┐  │  │
│  │  │   StorageService                 │  ApiService │  │  │
│  │  │   (IndexedDB)                    │  (HTTP)     │  │  │
│  │  └──────────┬───────────────────────┴──────┬──────┘  │  │
│  └─────────────┼──────────────────────────────┼─────────┘  │
│                │                              │             │
│         Local Storage                    HTTP/HTTPS        │
│                                               │             │
└───────────────────────────────────────────────┼─────────────┘
                                                │
                                    ┌───────────▼───────────┐
                                    │   Backend (Express)   │
                                    │                       │
                                    │  ┌─────────────────┐ │
                                    │  │   Middleware    │ │
                                    │  │   (Auth, CORS)  │ │
                                    │  └────────┬────────┘ │
                                    │           │          │
                                    │  ┌────────▼────────┐ │
                                    │  │     Routes      │ │
                                    │  └────────┬────────┘ │
                                    │           │          │
                                    │  ┌────────▼────────┐ │
                                    │  │    Services     │ │
                                    │  └────────┬────────┘ │
                                    │           │          │
                                    │  ┌────────▼────────┐ │
                                    │  │  PostgresAdapter│ │
                                    │  └────────┬────────┘ │
                                    └───────────┼──────────┘
                                                │
                                    ┌───────────▼──────────┐
                                    │  PostgreSQL Database │
                                    └──────────────────────┘
```

---

## Authentication Flow

### Registration Flow

Complete flow from user registration to authenticated API calls.

```
┌─────────┐         ┌──────────────┐         ┌──────────────┐         ┌──────────┐
│  User   │         │   Frontend   │         │   Backend    │         │ Database │
└────┬────┘         └──────┬───────┘         └──────┬───────┘         └────┬─────┘
     │                     │                        │                      │
     │ 1. Fill form        │                        │                      │
     ├────────────────────>│                        │                      │
     │ (email, password)   │                        │                      │
     │                     │                        │                      │
     │ 2. Click Register   │                        │                      │
     ├────────────────────>│                        │                      │
     │                     │                        │                      │
     │                     │ 3. POST /api/auth/register                    │
     │                     ├───────────────────────>│                      │
     │                     │ { email, password }    │                      │
     │                     │                        │                      │
     │                     │                        │ 4. Validate input    │
     │                     │                        ├─────────┐            │
     │                     │                        │         │            │
     │                     │                        │<────────┘            │
     │                     │                        │                      │
     │                     │                        │ 5. Hash password     │
     │                     │                        ├─────────┐            │
     │                     │                        │         │            │
     │                     │                        │<────────┘            │
     │                     │                        │                      │
     │                     │                        │ 6. INSERT INTO users │
     │                     │                        ├─────────────────────>│
     │                     │                        │                      │
     │                     │                        │ 7. User row          │
     │                     │                        │<─────────────────────┤
     │                     │                        │                      │
     │                     │                        │ 8. Generate JWT      │
     │                     │                        ├─────────┐            │
     │                     │                        │         │            │
     │                     │                        │<────────┘            │
     │                     │                        │                      │
     │                     │ 9. 201 Created         │                      │
     │                     │<───────────────────────┤                      │
     │                     │ { token, user }        │                      │
     │                     │                        │                      │
     │                     │ 10. Store token        │                      │
     │                     ├─────────┐              │                      │
     │                     │ localStorage           │                      │
     │                     │ setItem('auth_token')  │                      │
     │                     │<────────┘              │                      │
     │                     │                        │                      │
     │                     │ 11. Store user         │                      │
     │                     ├─────────┐              │                      │
     │                     │ localStorage           │                      │
     │                     │ setItem('user')        │                      │
     │                     │<────────┘              │                      │
     │                     │                        │                      │
     │                     │ 12. Update state       │                      │
     │                     ├─────────┐              │                      │
     │                     │ setUser(userData)      │                      │
     │                     │<────────┘              │                      │
     │                     │                        │                      │
     │ 13. Redirect to /   │                        │                      │
     │<────────────────────┤                        │                      │
     │                     │                        │                      │
```

**Implementation Details**:

**Step 1-2**: User Input (Register.tsx)
```tsx
// /frontend/src/pages/Register.tsx
function Register() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { register } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await register({ email, password });
    navigate('/');
  };
}
```

**Step 3**: API Call (useAuth.ts)
```typescript
// /frontend/src/hooks/useAuth.ts
const register = async (credentials: RegisterCredentials) => {
  const response = await apiClient.post<AuthResponse>(
    '/api/auth/register',
    credentials
  );
  // Steps 10-12 handled here
  const { token, user } = response.data;
  localStorage.setItem('auth_token', token);
  localStorage.setItem('user', JSON.stringify(user));
  setUser(user);
};
```

**Step 4-5**: Validation & Hashing (auth.ts route)
```typescript
// /backend/src/api/routes/auth.ts
router.post('/register', async (req, res) => {
  const { email, password } = req.body;

  // Validate
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password required' });
  }

  // Hash password
  const passwordHash = await bcrypt.hash(password, 10);

  // Continue to step 6...
});
```

**Step 6-7**: Database Insert (AuthService.ts)
```typescript
// /backend/src/services/AuthService.ts
async register(email: string, passwordHash: string): Promise<User> {
  const result = await db.query(
    `INSERT INTO users (id, email, password_hash, created_at)
     VALUES (gen_random_uuid(), $1, $2, NOW())
     RETURNING id, email, created_at`,
    [email, passwordHash]
  );
  return result.rows[0];
}
```

**Step 8**: JWT Generation (auth.ts route)
```typescript
// /backend/src/api/routes/auth.ts
import jwt from 'jsonwebtoken';

const token = jwt.sign(
  { userId: user.id, email: user.email },
  process.env.JWT_SECRET!,
  { expiresIn: '24h' }
);
```

---

### Login Flow

```
┌─────────┐         ┌──────────────┐         ┌──────────────┐         ┌──────────┐
│  User   │         │   Frontend   │         │   Backend    │         │ Database │
└────┬────┘         └──────┬───────┘         └──────┬───────┘         └────┬─────┘
     │                     │                        │                      │
     │ 1. Fill form        │                        │                      │
     ├────────────────────>│                        │                      │
     │ (email, password)   │                        │                      │
     │                     │                        │                      │
     │ 2. Click Login      │                        │                      │
     ├────────────────────>│                        │                      │
     │                     │                        │                      │
     │                     │ 3. POST /api/auth/login                       │
     │                     ├───────────────────────>│                      │
     │                     │ { email, password }    │                      │
     │                     │                        │                      │
     │                     │                        │ 4. SELECT user       │
     │                     │                        ├─────────────────────>│
     │                     │                        │ WHERE email = $1     │
     │                     │                        │                      │
     │                     │                        │ 5. User row          │
     │                     │                        │<─────────────────────┤
     │                     │                        │                      │
     │                     │                        │ 6. Compare password  │
     │                     │                        ├─────────┐            │
     │                     │                        │ bcrypt.compare()     │
     │                     │                        │<────────┘            │
     │                     │                        │                      │
     │                     │                        │ 7. Generate JWT      │
     │                     │                        ├─────────┐            │
     │                     │                        │         │            │
     │                     │                        │<────────┘            │
     │                     │                        │                      │
     │                     │ 8. 200 OK              │                      │
     │                     │<───────────────────────┤                      │
     │                     │ { token, user }        │                      │
     │                     │                        │                      │
     │                     │ 9-11. Store token/user │                      │
     │                     ├─────────┐              │                      │
     │                     │ (same as register)     │                      │
     │                     │<────────┘              │                      │
     │                     │                        │                      │
     │ 12. Redirect to /   │                        │                      │
     │<────────────────────┤                        │                      │
```

**Key Difference from Registration**:
- Retrieves existing user from database instead of creating new one
- Compares provided password with stored hash using bcrypt
- Returns 401 if email not found or password doesn't match

---

### Authenticated Request Flow

How JWT token is used in subsequent API calls.

```
┌─────────┐         ┌──────────────┐         ┌──────────────┐         ┌──────────┐
│  User   │         │   Frontend   │         │   Backend    │         │ Database │
└────┬────┘         └──────┬───────┘         └──────┬───────┘         └────┬─────┘
     │                     │                        │                      │
     │ View tasks page     │                        │                      │
     ├────────────────────>│                        │                      │
     │                     │                        │                      │
     │                     │ 1. GET /api/tasks      │                      │
     │                     ├───────────────────────>│                      │
     │                     │ Authorization:         │                      │
     │                     │   Bearer <token>       │                      │
     │                     │                        │                      │
     │                     │                        │ 2. Extract token     │
     │                     │                        ├─────────┐            │
     │                     │                        │ from header          │
     │                     │                        │<────────┘            │
     │                     │                        │                      │
     │                     │                        │ 3. Verify JWT        │
     │                     │                        ├─────────┐            │
     │                     │                        │ jwt.verify()         │
     │                     │                        │<────────┘            │
     │                     │                        │                      │
     │                     │                        │ 4. Extract userId    │
     │                     │                        ├─────────┐            │
     │                     │                        │ from payload         │
     │                     │                        │<────────┘            │
     │                     │                        │                      │
     │                     │                        │ 5. SELECT tasks      │
     │                     │                        ├─────────────────────>│
     │                     │                        │ WHERE user_id = $1   │
     │                     │                        │                      │
     │                     │                        │ 6. Task rows         │
     │                     │                        │<─────────────────────┤
     │                     │                        │                      │
     │                     │ 7. 200 OK              │                      │
     │                     │<───────────────────────┤                      │
     │                     │ { tasks: [...] }       │                      │
     │                     │                        │                      │
     │ Display tasks       │                        │                      │
     │<────────────────────┤                        │                      │
```

**Implementation Details**:

**Step 1**: API Call with Token (TaskApiService.ts)
```typescript
// /frontend/src/services/TaskApiService.ts
async listTasks(): Promise<Task[]> {
  const response = await apiClient.get<ListTasksResponse>('/api/tasks');
  // Token automatically added by axios interceptor
  return response.data.tasks;
}
```

**Automatic Token Injection** (api.ts)
```typescript
// /frontend/src/lib/api.ts
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
```

**Step 2-4**: JWT Verification (authMiddleware.ts)
```typescript
// /backend/src/api/middleware/authMiddleware.ts
export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing authorization token' });
  }

  const token = authHeader.substring(7); // Remove "Bearer "

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as JWTPayload;
    req.userId = decoded.userId; // Attach to request
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}
```

**Step 5-6**: Database Query with User ID (tasks.ts route)
```typescript
// /backend/src/api/routes/tasks.ts
router.get('/', authMiddleware, async (req: AuthRequest, res) => {
  const userId = req.userId; // From authMiddleware
  const tasks = await taskService.listTasks(userId);
  res.json({ tasks });
});
```

---

### Token Expiration & Refresh Flow

```
┌─────────┐         ┌──────────────┐         ┌──────────────┐
│  User   │         │   Frontend   │         │   Backend    │
└────┬────┘         └──────┬───────┘         └──────┬───────┘
     │                     │                        │
     │ (Token expired)     │                        │
     │                     │                        │
     │ Make API request    │                        │
     ├────────────────────>│                        │
     │                     │                        │
     │                     │ GET /api/tasks         │
     │                     ├───────────────────────>│
     │                     │ Authorization: Bearer  │
     │                     │   <expired_token>      │
     │                     │                        │
     │                     │                        │ Verify JWT
     │                     │                        ├─────────┐
     │                     │                        │ (expired)
     │                     │                        │<────────┘
     │                     │                        │
     │                     │ 401 Unauthorized       │
     │                     │<───────────────────────┤
     │                     │ { error: "Expired" }   │
     │                     │                        │
     │                     │ Clear token            │
     │                     ├─────────┐              │
     │                     │ localStorage.remove    │
     │                     │<────────┘              │
     │                     │                        │
     │ Redirect to /login  │                        │
     │<────────────────────┤                        │
     │                     │                        │
     │ Re-login            │                        │
     ├────────────────────>│                        │
     │                     │                        │
     │ (Get new token)     │                        │
```

**Current Implementation**: Requires full re-login (no refresh tokens yet)

**Future Enhancement**: Refresh token flow
- Long-lived refresh token (7 days)
- Short-lived access token (1 hour)
- Automatic refresh on 401
- No user interruption

---

## Data Flow Patterns

### Current State: Local-Only (IndexedDB)

```
User Action → Component → Hook → StorageService → IndexedDB
```

**Example**: Creating a task
```typescript
// 1. User clicks "Add Task" (AddTask.tsx)
<button onClick={handleSubmit}>Add Task</button>

// 2. Component calls hook (AddTask.tsx)
const { addTask } = useTasks();
await addTask(newTask);

// 3. Hook calls service (useTasks.ts)
const taskManager = new TaskManager();
await taskManager.insertTask(newTask, rank);

// 4. Service updates IndexedDB (TaskManager.ts)
await StorageService.createTask(task);

// 5. IndexedDB write (StorageService.ts)
await db.tasks.add(task);
```

**Data never leaves browser** - No backend involved.

---

### Target State: Cloud Sync (Dual-Write Pattern)

```
User Action → Component → Hook → Service → IndexedDB + API → Backend → Database
                                    ↓
                            Optimistic Update
```

**Example**: Creating a task with cloud sync
```typescript
// 1. User clicks "Add Task" (AddTask.tsx)
<button onClick={handleSubmit}>Add Task</button>

// 2. Component calls hook (AddTask.tsx)
const { addTask } = useTasks();
await addTask(newTask);

// 3. Hook performs DUAL WRITE (useTasks.ts)
const taskManager = new TaskManager();

// 3a. Optimistic update to IndexedDB (immediate UI update)
const localTask = await taskManager.insertTask(newTask, rank);
setTasks([...tasks, localTask]); // UI updates instantly

// 3b. Sync to backend (async, background)
try {
  const syncedTask = await taskApiService.createTask(localTask);
  // Update local task with server ID/timestamps
  await StorageService.updateTask(syncedTask.id, syncedTask);
} catch (error) {
  // Mark task as "pending sync" in IndexedDB
  await StorageService.updateTask(localTask.id, {
    syncStatus: { synced: false, syncError: error.message }
  });
  // Show toast notification to user
  showToast('Task saved locally. Will sync when online.');
}

// 4. Backend processes (TaskService.ts)
await taskService.createTask(userId, taskData);

// 5. Database write (PostgresAdapter.ts)
await db.transaction(async (client) => {
  // Rank shifting + insert
});
```

**Benefits**:
- **Fast UI**: Optimistic update, no waiting for network
- **Offline support**: Works without internet
- **Data persistence**: Backed up to cloud
- **Conflict resolution**: Server is source of truth

---

## Frontend-Backend Integration

### HTTP Client Configuration

**Axios Instance** (`/frontend/src/lib/api.ts`):
```typescript
export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3001',
  headers: { 'Content-Type': 'application/json' },
  timeout: 10000, // 10 seconds
});

// Request interceptor: Add JWT token
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor: Handle 401
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user');
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);
```

### CORS Configuration

**Backend CORS** (`/backend/src/index.ts`):
```typescript
import cors from 'cors';

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
```

**Environment Variables**:
- Frontend: `VITE_API_URL=http://localhost:3002`
- Backend: `FRONTEND_URL=http://localhost:5173`

---

## State Management Integration

### React State Flow

```
Component State
    ↓
Custom Hook (useTasks, useAuth)
    ↓
Service Layer (TaskManager, TaskApiService)
    ↓
Storage Layer (IndexedDB, HTTP)
```

### State Synchronization

**useAuth Hook** - Authentication State:
```typescript
const [user, setUser] = useState<User | null>(null);

// Initialize from localStorage on mount
useEffect(() => {
  const storedUser = localStorage.getItem('user');
  if (storedUser) {
    setUser(JSON.parse(storedUser));
  }
}, []);

// Sync to localStorage on change
useEffect(() => {
  if (user) {
    localStorage.setItem('user', JSON.stringify(user));
  }
}, [user]);
```

**useTasks Hook** - Task State:
```typescript
const [tasks, setTasks] = useState<Task[]>([]);

// Load from IndexedDB on mount
useEffect(() => {
  getIncompleteTasks().then(setTasks);
}, []);

// Refresh on changes
const refreshTasks = useCallback(async () => {
  const freshTasks = await getIncompleteTasks();
  setTasks(freshTasks);
}, []);
```

### State Persistence

| State | Storage | Lifetime | Sync |
|-------|---------|----------|------|
| User | localStorage | Until logout | Manual |
| Auth Token | localStorage | 24 hours | Manual |
| Tasks | IndexedDB | Permanent | Manual |
| Form State | Component state | Until unmount | N/A |
| Comparison State | XState machine | Until complete | N/A |

---

## Error Handling Integration

### Error Flow

```
Backend Error → HTTP Response → Axios Interceptor → Service Layer → Hook → Component → User
```

### Error Categories

**1. Network Errors** (No response from server):
```typescript
catch (error) {
  if (axios.isAxiosError(error) && !error.response) {
    // Network error - show offline message
    showToast('Network error. Please check your connection.');
  }
}
```

**2. Authentication Errors** (401):
```typescript
// Handled by axios interceptor
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Automatic logout and redirect
    }
  }
);
```

**3. Validation Errors** (400):
```typescript
catch (error) {
  if (axios.isAxiosError(error) && error.response?.status === 400) {
    const message = error.response.data.error || 'Validation failed';
    setErrors({ title: message });
  }
}
```

**4. Server Errors** (500):
```typescript
catch (error) {
  if (axios.isAxiosError(error) && error.response?.status === 500) {
    showToast('Server error. Please try again later.');
    console.error('Server error:', error);
  }
}
```

### Error Display

**Toast Notifications** (`/frontend/src/components/Toast.tsx`):
- Success: Green toast, 3s duration
- Error: Red toast, 5s duration
- Warning: Yellow toast, 4s duration

**Inline Errors**: Form validation errors shown below input fields

---

## Testing Integration Points

### Frontend Tests

**Unit Tests** - Individual components/hooks:
```typescript
// /frontend/src/hooks/__tests__/useAuth.test.ts
test('login stores token in localStorage', async () => {
  const { result } = renderHook(() => useAuth());
  await act(async () => {
    await result.current.login({ email, password });
  });
  expect(localStorage.getItem('auth_token')).toBeDefined();
});
```

**Integration Tests** - Component + Hook + Service:
```typescript
// /frontend/src/pages/__tests__/AddTask.test.tsx
test('creating task updates task list', async () => {
  render(<AddTask />);
  await userEvent.type(screen.getByLabelText('Title'), 'New Task');
  await userEvent.click(screen.getByText('Add'));
  expect(screen.getByText('New Task')).toBeInTheDocument();
});
```

### Backend Tests

**Unit Tests** - Service methods:
```typescript
// /backend/src/services/__tests__/TaskService.test.ts
test('createTask shifts ranks correctly', async () => {
  const task = await taskService.createTask(userId, { title, rank: 0 });
  expect(task.rank).toBe(0);
  // Verify existing tasks were shifted
});
```

**Integration Tests** - API endpoints:
```typescript
// /backend/src/api/routes/__tests__/tasks.test.ts
test('POST /api/tasks requires authentication', async () => {
  const response = await request(app)
    .post('/api/tasks')
    .send({ title: 'Test' });
  expect(response.status).toBe(401);
});
```

### E2E Tests

**Full User Flows**:
```typescript
// e2e/auth.spec.ts
test('user can register, login, and create task', async ({ page }) => {
  await page.goto('/register');
  await page.fill('input[name="email"]', 'test@example.com');
  await page.fill('input[name="password"]', 'password123');
  await page.click('button[type="submit"]');

  await expect(page).toHaveURL('/');

  await page.click('text=Add Task');
  await page.fill('input[name="title"]', 'My Task');
  await page.click('button[type="submit"]');

  await expect(page.getByText('My Task')).toBeVisible();
});
```

---

## Deployment Integration

### Environment Configuration

**Development**:
```env
# Frontend (.env.development)
VITE_API_URL=http://localhost:3002

# Backend (.env)
PORT=3002
DATABASE_URL=postgresql://localhost:5432/task_priority_db
JWT_SECRET=dev_secret_key
FRONTEND_URL=http://localhost:5173
```

**Production**:
```env
# Frontend (.env.production)
VITE_API_URL=https://api.taskmanager.example.com

# Backend (.env.production)
PORT=3002
DATABASE_URL=postgresql://prod-db:5432/task_priority_db
JWT_SECRET=<secure_generated_key>
FRONTEND_URL=https://taskmanager.example.com
```

### Docker Integration

**docker-compose.yml**:
```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: task_priority_db
    volumes:
      - postgres-data:/var/lib/postgresql/data
    networks:
      - app-network

  backend:
    build:
      context: .
      dockerfile: backend/Dockerfile
    environment:
      DATABASE_URL: postgresql://postgres:${POSTGRES_PASSWORD}@postgres:5432/task_priority_db
      JWT_SECRET: ${JWT_SECRET}
      FRONTEND_URL: http://frontend:${FRONTEND_PORT}
    depends_on:
      - postgres
    networks:
      - app-network

  frontend:
    build:
      context: .
      dockerfile: frontend/Dockerfile
      args:
        VITE_API_URL: http://backend:${BACKEND_PORT}
    ports:
      - "${FRONTEND_PORT}:80"
    depends_on:
      - backend
    networks:
      - app-network

networks:
  app-network:
    driver: bridge

volumes:
  postgres-data:
```

### Database Migrations

**Migration Flow**:
```
1. Developer creates migration SQL file
   → /backend/migrations/002_add_column.sql

2. Deployment script runs migrations
   → psql < migrations/*.sql

3. Backend starts with updated schema
```

**Example Migration**:
```sql
-- /backend/migrations/002_add_sync_status.sql
ALTER TABLE tasks
ADD COLUMN sync_status VARCHAR(20) DEFAULT 'synced',
ADD COLUMN last_synced_at TIMESTAMP WITH TIME ZONE;

CREATE INDEX idx_tasks_sync_status ON tasks(sync_status)
WHERE sync_status != 'synced';
```

---

## Integration Checklist

### Adding New Feature

When adding a new feature that requires frontend-backend integration:

- [ ] **1. Define API Contract** (API_CONTRACT.md)
  - HTTP method and URL
  - Request/response formats
  - Error codes
  - Authentication requirements

- [ ] **2. Update Database Schema** (if needed)
  - Create migration SQL file
  - Update TypeScript interfaces
  - Update PostgresAdapter queries

- [ ] **3. Implement Backend**
  - Add route handler (/api/routes/)
  - Add service method (/services/)
  - Add tests

- [ ] **4. Implement Frontend**
  - Add API service method (/services/TaskApiService.ts)
  - Update hook (/hooks/)
  - Update component
  - Add tests

- [ ] **5. Integration Testing**
  - Test frontend + backend together
  - Test error handling
  - Test authentication
  - Test edge cases

- [ ] **6. Documentation**
  - Update API_CONTRACT.md
  - Update INTEGRATION.md
  - Add code comments

---

## Troubleshooting Common Integration Issues

### Issue: CORS Error

**Symptom**: `Access to XMLHttpRequest blocked by CORS policy`

**Solution**:
```typescript
// Backend: Add CORS middleware with correct origin
app.use(cors({
  origin: process.env.FRONTEND_URL,
  credentials: true
}));
```

### Issue: 401 Unauthorized

**Symptom**: All API requests return 401 even with valid token

**Possible Causes**:
1. Token not being sent: Check axios interceptor
2. Token expired: Check JWT expiration
3. JWT_SECRET mismatch: Verify environment variable
4. authMiddleware not applied: Check route configuration

**Debug**:
```typescript
// Frontend: Log request headers
console.log('Token:', localStorage.getItem('auth_token'));

// Backend: Log received token
console.log('Authorization header:', req.headers.authorization);
```

### Issue: IndexedDB Not Syncing

**Symptom**: Tasks saved locally but not appearing after refresh

**Possible Causes**:
1. Browser cleared storage
2. Incorrect database name
3. Transaction not committed
4. Private browsing mode

**Debug**:
```typescript
// Check IndexedDB in browser DevTools
// Application tab → IndexedDB → TaskPriorityDB

// Log database operations
console.log('Tasks in DB:', await db.tasks.toArray());
```

### Issue: Stale State

**Symptom**: UI not updating after API call

**Solution**:
```typescript
// Refresh state after mutation
const addTask = async (task: Task) => {
  await taskApiService.createTask(task);
  await refreshTasks(); // Reload from source
};
```

---

## References

- **API Contract**: `/API_CONTRACT.md`
- **Architecture**: `/ARCHITECTURE.md`
- **Frontend Architecture**: `/frontend/ARCHITECTURE.md`
- **Backend Source**: `/backend/src/`
- **Frontend Source**: `/frontend/src/`

---

**Maintained by**: Development Team
**Questions**: Contact tech lead or create GitHub issue
