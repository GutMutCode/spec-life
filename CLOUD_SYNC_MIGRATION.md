# Cloud Sync Migration Strategy

> **Status:** Planning Phase
> **Version:** 1.0
> **Last Updated:** 2025-10-27
> **Owner:** Development Team

---

## Executive Summary

This document outlines the strategy for migrating the Task Priority Manager from a **local-only (IndexedDB)** architecture to a **cloud-synchronized** architecture with offline-first capabilities.

**Current State (v1.0):**
- ✅ All features functional with IndexedDB
- ✅ 177 tests passing
- ❌ No cloud backup or multi-device sync
- ❌ Data lost if browser storage cleared

**Target State (v2.0):**
- ✅ Offline-first with local cache (IndexedDB)
- ✅ Cloud backup (PostgreSQL)
- ✅ Multi-device synchronization
- ✅ Conflict resolution
- ✅ Offline queue for failed operations

**Migration Timeline:** 3-4 weeks
**Risk Level:** Medium (data consistency challenges)

---

## Table of Contents

1. [Current Architecture Analysis](#1-current-architecture-analysis)
2. [Sync Pattern Selection](#2-sync-pattern-selection)
3. [Conflict Resolution Strategy](#3-conflict-resolution-strategy)
4. [Schema Evolution](#4-schema-evolution)
5. [Implementation Phases](#5-implementation-phases)
6. [Data Migration Plan](#6-data-migration-plan)
7. [Testing Strategy](#7-testing-strategy)
8. [Rollback Plan](#8-rollback-plan)
9. [Performance Considerations](#9-performance-considerations)
10. [Security Considerations](#10-security-considerations)

---

## 1. Current Architecture Analysis

### 1.1 Frontend Data Flow (Current)

```
User Action → Component → Service → IndexedDB
              ↓
           UI Update (Optimistic)
```

**Key Services:**
- `StorageService.ts` - CRUD operations
- `TaskManager.ts` - Rank shifting logic
- `indexeddb.ts` - Dexie wrapper

**Current IndexedDB Schema (v2):**
```typescript
{
  tasks: {
    id: string (UUID),
    title: string,
    description: string?,
    rank: number,
    completed: boolean,
    completedAt: Date?,
    deadline: Date?,
    parentId: string?,
    depth: number,
    collaborators: string[]?,
    createdAt: Date,
    updatedAt: Date
  },
  metadata: {
    key: string,
    value: any
  }
}
```

### 1.2 Backend Infrastructure (Exists but Unused)

```
Express API → TaskService → PostgresAdapter → PostgreSQL
```

**API Endpoints (Implemented):**
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/tasks` - List tasks
- `POST /api/tasks` - Create task
- `PUT /api/tasks/:id` - Update task
- `DELETE /api/tasks/:id` - Delete task

**Database Schema (PostgreSQL):**
```sql
CREATE TABLE tasks (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  rank INTEGER NOT NULL,
  completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMP,
  deadline TIMESTAMP,
  parent_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  depth INTEGER DEFAULT 0,
  collaborators TEXT[],
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### 1.3 Gap Analysis

| Feature | Frontend | Backend | Status |
|---------|----------|---------|--------|
| CRUD Operations | ✅ IndexedDB | ✅ PostgreSQL | ❌ Not Connected |
| Authentication | ✅ Components | ✅ JWT API | ❌ Not Used |
| Rank Shifting | ✅ Local | ✅ Server | ❌ Not Synced |
| Offline Support | ✅ Native | ❌ None | ❌ No Queue |
| Conflict Resolution | ❌ None | ❌ None | ❌ Not Designed |

**Critical Missing Components:**
1. Sync status tracking (pending/synced/conflict)
2. Offline operation queue
3. Conflict detection (version vectors or timestamps)
4. Sync orchestration service
5. Network state detection

---

## 2. Sync Pattern Selection

### 2.1 Pattern Comparison

| Pattern | Pros | Cons | Fit Score |
|---------|------|------|-----------|
| **Server as Source of Truth** | Simple, consistent | Poor offline UX | 3/10 |
| **Client-First Sync** | Great offline UX | Complex conflicts | 7/10 |
| **Event Sourcing** | Full audit trail | High complexity | 5/10 |
| **Operational Transform (OT)** | Real-time collab | Very complex | 4/10 |
| **CRDT (Conflict-free)** | Automatic merge | Limited operations | 6/10 |
| **Dual-Write + Last-Write-Wins** | Simple, predictable | Possible data loss | **8/10** ✅ |

### 2.2 Selected Pattern: **Dual-Write + Last-Write-Wins (LWW)**

**Architecture:**
```
User Action
   ↓
StorageService
   ↓
┌──────────────┴──────────────┐
↓                             ↓
IndexedDB                  API Client
(Immediate Write)         (Background Sync)
   ↓                             ↓
UI Update                    PostgreSQL
(Optimistic)                 (Cloud Backup)
```

**Why this pattern?**

✅ **Pros:**
- Simple to implement and reason about
- Great offline UX (instant local updates)
- Predictable behavior (latest timestamp wins)
- Aligns with current optimistic UI pattern
- Low complexity for MVP

⚠️ **Cons:**
- May lose concurrent edits (acceptable for task manager)
- No automatic merge (user re-edits if needed)
- Requires timestamp synchronization

**Acceptable Trade-offs:**
1. **Concurrent edits are rare** - Most users work solo on tasks
2. **Last edit usually correct** - Users typically override old data intentionally
3. **Lost edits recoverable** - Users can see history and re-edit

### 2.3 Sync States

Each task will have a `sync_status` field:

```typescript
type SyncStatus =
  | 'pending'   // Not yet synced to server
  | 'syncing'   // Sync in progress
  | 'synced'    // Successfully synced
  | 'conflict'  // Server has newer version
  | 'error';    // Sync failed (network/validation)
```

**State Transitions:**
```
pending → syncing → synced
   ↓         ↓         ↓
   └─────→ error ←────┘
                ↓
             conflict
```

---

## 3. Conflict Resolution Strategy

### 3.1 Conflict Detection

**Method:** Timestamp comparison (Last-Write-Wins)

```typescript
interface TaskWithSync extends Task {
  // Local timestamps
  updatedAt: Date;           // Last local update

  // Sync metadata (new fields)
  syncStatus: SyncStatus;
  lastSyncedAt?: Date;       // Last successful sync
  serverUpdatedAt?: Date;    // Server's updatedAt (from last fetch)
}
```

**Conflict Detection Logic:**
```typescript
function detectConflict(local: Task, server: Task): boolean {
  // Conflict if server was updated after our last sync
  return server.updatedAt > (local.lastSyncedAt || 0);
}
```

### 3.2 Resolution Strategies

#### Strategy 1: **Server Wins** (Default)
```typescript
if (detectConflict(local, server)) {
  // Overwrite local with server version
  await db.tasks.put({
    ...server,
    syncStatus: 'synced',
    lastSyncedAt: new Date(),
    serverUpdatedAt: server.updatedAt
  });
}
```

**Use Cases:**
- User logs in on new device
- Background sync while app closed
- Multiple devices editing same task

#### Strategy 2: **Manual Resolution** (Future Enhancement)
```typescript
if (detectConflict(local, server)) {
  // Show conflict UI to user
  showConflictDialog({
    localVersion: local,
    serverVersion: server,
    onResolve: (chosen) => {
      if (chosen === 'local') {
        forceSync(local); // Overwrite server
      } else {
        acceptServer(server); // Overwrite local
      }
    }
  });
}
```

**Use Cases:**
- Important edits user doesn't want to lose
- Power users who need full control

### 3.3 Conflict Prevention

**Techniques:**
1. **Frequent syncs** - Reduce window for conflicts
2. **Real-time indicators** - Show when task is being edited elsewhere (future)
3. **Optimistic locking** - Warn before overwriting recent changes
4. **Conflict log** - Track conflicts for debugging

---

## 4. Schema Evolution

### 4.1 IndexedDB Migration (v2 → v3)

**New Schema:**
```typescript
// Version 3: Add sync fields
this.version(3).stores({
  tasks: 'id, rank, completedAt, createdAt, [completed+rank], syncStatus, lastSyncedAt',
  metadata: 'key',
  syncQueue: '++queueId, taskId, operation, timestamp' // NEW TABLE
}).upgrade(tx => {
  // Migrate existing tasks
  return tx.table('tasks').toCollection().modify(task => {
    task.syncStatus = 'pending';  // Mark for initial sync
    task.lastSyncedAt = null;
    task.serverUpdatedAt = null;
  });
});
```

**New Tables:**

#### `syncQueue` - Offline Operation Queue
```typescript
interface SyncQueueEntry {
  queueId?: number;         // Auto-increment primary key
  taskId: string;           // Task being modified
  operation: 'create' | 'update' | 'delete';
  payload: Partial<Task>;   // Operation data
  timestamp: Date;          // When queued
  retryCount: number;       // Number of retry attempts
  lastError?: string;       // Last error message
}
```

**Purpose:** Store operations performed offline for later sync

### 4.2 Backend Schema (No Changes Required)

PostgreSQL schema already supports all fields. No migration needed.

**Verification:**
```sql
-- Check schema compatibility
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'tasks';
```

---

## 5. Implementation Phases

### Phase 1: **Foundation** (Week 1)

**Goal:** Add sync infrastructure without changing behavior

**Tasks:**
- [ ] Update IndexedDB schema to v3
- [ ] Add `SyncStatus` type and fields to Task interface
- [ ] Create `SyncQueue` table and operations
- [ ] Add network state detection (`navigator.onLine`)
- [ ] Create `SyncService` class skeleton
- [ ] Add sync status UI indicators (badge/icon)

**Deliverables:**
- All tasks have `sync_status: 'pending'`
- UI shows sync status (but nothing syncs yet)
- IndexedDB v3 deployed

**Testing:**
- Verify schema migration doesn't break existing functionality
- Confirm all 177 tests still pass

**Risk:** Low (additive changes only)

---

### Phase 2: **Read Sync** (Week 1-2)

**Goal:** Fetch tasks from server on login

**Tasks:**
- [ ] Implement initial sync on login/app start
- [ ] Fetch all user tasks from `GET /api/tasks`
- [ ] Merge server tasks into IndexedDB
- [ ] Handle conflicts (server wins for now)
- [ ] Show "Syncing..." indicator during fetch
- [ ] Handle authentication errors (redirect to login)

**Architecture:**
```typescript
// SyncService.ts
class SyncService {
  async initialSync(userId: string): Promise<void> {
    // 1. Fetch all tasks from server
    const serverTasks = await taskApiService.listTasks();

    // 2. Fetch all local tasks
    const localTasks = await db.tasks.toArray();

    // 3. Merge (server wins on conflict)
    for (const serverTask of serverTasks) {
      const localTask = localTasks.find(t => t.id === serverTask.id);

      if (!localTask || serverTask.updatedAt > localTask.updatedAt) {
        // Server wins - update local
        await db.tasks.put({
          ...serverTask,
          syncStatus: 'synced',
          lastSyncedAt: new Date(),
          serverUpdatedAt: serverTask.updatedAt
        });
      }
    }

    // 4. Mark local-only tasks as pending sync
    for (const localTask of localTasks) {
      if (!serverTasks.find(t => t.id === localTask.id)) {
        await db.tasks.update(localTask.id, {
          syncStatus: 'pending'
        });
      }
    }
  }
}
```

**Deliverables:**
- Login fetches tasks from server
- Local tasks preserved after login
- Server tasks available in UI
- Conflicts resolved automatically

**Testing:**
- Test with existing server data
- Test with local-only data
- Test with mixed data
- Test offline login (should still work with cached data)

**Risk:** Medium (data merge logic)

---

### Phase 3: **Write Sync - Create/Update** (Week 2)

**Goal:** Sync local creates/updates to server

**Tasks:**
- [ ] Implement dual-write in StorageService
- [ ] POST new tasks to `/api/tasks`
- [ ] PUT updates to `/api/tasks/:id`
- [ ] Handle sync failures (queue for retry)
- [ ] Implement retry logic with exponential backoff
- [ ] Show sync errors in UI (toast notifications)

**Architecture:**
```typescript
// StorageService.ts
class StorageService {
  async createTask(taskData: CreateTaskData): Promise<Task> {
    // 1. Create locally first (instant UX)
    const task: Task = {
      ...taskData,
      id: taskData.id || generateTaskId(),
      createdAt: new Date(),
      updatedAt: new Date(),
      syncStatus: 'pending' // Mark as needing sync
    };
    await db.tasks.add(task);

    // 2. Background sync to server
    this.syncTask(task).catch(err => {
      console.error('Background sync failed:', err);
      // Add to retry queue
      syncQueue.add({
        taskId: task.id,
        operation: 'create',
        payload: task,
        timestamp: new Date(),
        retryCount: 0
      });
    });

    return task;
  }

  private async syncTask(task: Task): Promise<void> {
    try {
      // Update UI: syncing
      await db.tasks.update(task.id, { syncStatus: 'syncing' });

      // Call API
      const serverTask = await taskApiService.createTask(task);

      // Update UI: synced
      await db.tasks.update(task.id, {
        syncStatus: 'synced',
        lastSyncedAt: new Date(),
        serverUpdatedAt: serverTask.updatedAt
      });
    } catch (error) {
      // Update UI: error
      await db.tasks.update(task.id, {
        syncStatus: 'error',
        lastError: error.message
      });
      throw error;
    }
  }
}
```

**Retry Logic:**
```typescript
class SyncQueue {
  async processQueue(): Promise<void> {
    const entries = await db.syncQueue.toArray();

    for (const entry of entries) {
      try {
        await this.retryOperation(entry);
        await db.syncQueue.delete(entry.queueId!);
      } catch (error) {
        // Exponential backoff
        if (entry.retryCount < 5) {
          await db.syncQueue.update(entry.queueId!, {
            retryCount: entry.retryCount + 1,
            lastError: error.message
          });
        } else {
          // Give up after 5 retries
          console.error('Sync failed permanently:', entry);
        }
      }
    }
  }
}
```

**Deliverables:**
- New tasks sync to server
- Updates sync to server
- Failed syncs queued for retry
- UI shows sync status

**Testing:**
- Test online create/update
- Test offline create/update (queued)
- Test network failure during sync
- Test retry after network recovery

**Risk:** Medium (error handling complexity)

---

### Phase 4: **Write Sync - Delete** (Week 3)

**Goal:** Sync deletes to server

**Tasks:**
- [ ] DELETE tasks from `/api/tasks/:id`
- [ ] Handle cascading deletes (subtasks)
- [ ] Handle delete conflicts (already deleted on server)
- [ ] Queue offline deletes

**Architecture:**
```typescript
async deleteTask(taskId: string): Promise<void> {
  // 1. Delete locally first
  await db.tasks.delete(taskId);

  // 2. Background sync to server
  this.syncDelete(taskId).catch(err => {
    // Queue for retry
    syncQueue.add({
      taskId,
      operation: 'delete',
      payload: {},
      timestamp: new Date(),
      retryCount: 0
    });
  });
}
```

**Edge Cases:**
- Task deleted on server but exists locally → Delete local
- Task deleted locally but exists on server → Delete server
- Task deleted on both → No-op (idempotent)

**Deliverables:**
- Deletes sync to server
- Cascading deletes handled
- Offline deletes queued

**Testing:**
- Test online delete
- Test offline delete (queued)
- Test delete of task with subtasks
- Test delete conflict (404 from server)

**Risk:** Low (simpler than create/update)

---

### Phase 5: **Background Sync & Polish** (Week 3-4)

**Goal:** Automatic sync without user intervention

**Tasks:**
- [ ] Implement background sync on app focus
- [ ] Periodic sync timer (every 5 minutes)
- [ ] Pull server changes on sync
- [ ] Handle bulk operations efficiently
- [ ] Add sync status dashboard (Settings page)
- [ ] Add manual "Sync Now" button
- [ ] Implement conflict resolution UI (manual mode)
- [ ] Add sync analytics (track success/failure rates)

**Background Sync Triggers:**
```typescript
// 1. On app focus (user returns to tab)
window.addEventListener('focus', () => {
  syncService.sync();
});

// 2. On network online (user reconnects)
window.addEventListener('online', () => {
  syncService.processQueue();
});

// 3. Periodic timer (every 5 min)
setInterval(() => {
  syncService.sync();
}, 5 * 60 * 1000);

// 4. After major operations (create/update/delete)
// Already implemented in Phase 3
```

**Deliverables:**
- Automatic sync on app focus
- Periodic background sync
- Offline queue processed on reconnect
- Sync status page in Settings
- Manual sync button

**Testing:**
- Test sync on tab focus
- Test sync on network reconnect
- Test periodic sync
- Test manual sync button

**Risk:** Low (mostly UX polish)

---

### Phase 6: **Migration & Rollout** (Week 4)

**Goal:** Migrate existing users to cloud sync

**Tasks:**
- [ ] Create migration guide for users
- [ ] Add "Enable Cloud Sync" onboarding flow
- [ ] Backup existing IndexedDB data before migration
- [ ] Gradual rollout (10% → 50% → 100%)
- [ ] Monitor error rates and rollback if needed
- [ ] Add feature flag for cloud sync (`VITE_ENABLE_CLOUD_SYNC`)

**Migration Flow:**
```
User logs in → Check if cloud sync enabled
   ↓
If disabled: Show onboarding
   ↓
User clicks "Enable Cloud Sync"
   ↓
1. Backup local data to JSON
2. Upload all local tasks to server
3. Mark all as synced
4. Enable background sync
5. Show success message
```

**Rollback Plan:** See [Section 8](#8-rollback-plan)

**Deliverables:**
- Feature flag for cloud sync
- Onboarding UI
- Migration success tracking
- Rollback capability

**Testing:**
- Test migration with 0 tasks
- Test migration with 100+ tasks
- Test migration with subtasks
- Test migration failure (network error)

**Risk:** High (user data at stake)

---

## 6. Data Migration Plan

### 6.1 User Migration Path

**Scenario 1: New User**
```
Sign up → Create account → Start with empty cloud storage
```
- No migration needed
- All tasks created go directly to cloud

**Scenario 2: Existing User (Local Data)**
```
Login → Detect local tasks → Offer migration → Upload to cloud
```

**Migration Steps:**
1. **Detect local data:**
   ```typescript
   const localTasks = await db.tasks.toArray();
   if (localTasks.length > 0) {
     showMigrationPrompt();
   }
   ```

2. **Backup local data:**
   ```typescript
   const backup = JSON.stringify(localTasks);
   localStorage.setItem('tasks_backup_' + Date.now(), backup);
   ```

3. **Upload to server:**
   ```typescript
   for (const task of localTasks) {
     await taskApiService.createTask(task);
   }
   ```

4. **Mark as synced:**
   ```typescript
   await db.tasks.toCollection().modify(task => {
     task.syncStatus = 'synced';
     task.lastSyncedAt = new Date();
   });
   ```

5. **Enable sync:**
   ```typescript
   localStorage.setItem('cloud_sync_enabled', 'true');
   syncService.start();
   ```

### 6.2 Rollback Strategy

**If migration fails:**
1. Restore from backup:
   ```typescript
   const backup = localStorage.getItem('tasks_backup_...');
   const tasks = JSON.parse(backup);
   await db.tasks.bulkPut(tasks);
   ```

2. Disable cloud sync:
   ```typescript
   localStorage.setItem('cloud_sync_enabled', 'false');
   ```

3. Show error message with support link

---

## 7. Testing Strategy

### 7.1 Unit Tests

**New Test Files:**
- `SyncService.test.ts` - Sync logic
- `SyncQueue.test.ts` - Offline queue
- `conflictResolution.test.ts` - Conflict detection

**Test Coverage Goals:**
- Sync service: 90%
- Conflict resolution: 95%
- Queue processing: 85%

### 7.2 Integration Tests

**Scenarios:**
1. **Full sync cycle:**
   - Create task offline → Go online → Verify synced

2. **Conflict resolution:**
   - Edit task on device A → Edit same task on device B → Verify LWW

3. **Offline queue:**
   - Create 10 tasks offline → Go online → Verify all synced

4. **Network failure recovery:**
   - Start sync → Disconnect network → Verify queued → Reconnect → Verify synced

### 7.3 E2E Tests (Playwright)

**Test Flows:**
```typescript
test('sync creates task to server', async ({ page }) => {
  await page.goto('/add');
  await page.fill('[data-testid="task-title"]', 'Test Task');
  await page.click('[data-testid="save-button"]');

  // Wait for sync indicator
  await page.waitForSelector('[data-testid="sync-success"]');

  // Verify on server (via API call)
  const tasks = await apiClient.get('/api/tasks');
  expect(tasks.data).toContainEqual(
    expect.objectContaining({ title: 'Test Task' })
  );
});
```

### 7.4 Manual Testing Checklist

- [ ] Create task while online
- [ ] Create task while offline
- [ ] Update task while online
- [ ] Update task while offline
- [ ] Delete task while online
- [ ] Delete task while offline
- [ ] Login on second device, verify sync
- [ ] Edit same task on two devices (conflict)
- [ ] Clear browser data, verify cloud restore

---

## 8. Rollback Plan

### 8.1 Feature Flag

```typescript
// Check if cloud sync enabled
const isCloudSyncEnabled = () => {
  return localStorage.getItem('cloud_sync_enabled') === 'true' &&
         import.meta.env.VITE_ENABLE_CLOUD_SYNC === 'true';
};

// Use in StorageService
if (isCloudSyncEnabled()) {
  await syncToServer(task);
}
```

### 8.2 Rollback Triggers

**Automatic Rollback If:**
- Error rate > 5% (within 1 hour)
- Sync failure rate > 20%
- Data loss detected (task count decreases unexpectedly)

**Manual Rollback If:**
- User reports data loss
- Critical bug discovered
- Performance degradation

### 8.3 Rollback Procedure

1. **Disable cloud sync globally:**
   ```bash
   # Update environment variable
   VITE_ENABLE_CLOUD_SYNC=false
   ```

2. **Notify users:**
   - Show banner: "Cloud sync temporarily disabled"
   - Provide ETA for fix

3. **Preserve local data:**
   - IndexedDB continues to work
   - No data loss

4. **Investigate issue:**
   - Check Sentry errors
   - Review sync logs
   - Identify root cause

5. **Fix and re-deploy:**
   - Deploy fix
   - Test thoroughly
   - Re-enable cloud sync

---

## 9. Performance Considerations

### 9.1 Sync Frequency

**Initial Sync:**
- On login: Fetch all tasks (can be slow for 1000+ tasks)
- Mitigation: Show loading indicator, paginate if needed

**Background Sync:**
- Every 5 minutes: Only fetch changed tasks (since last sync)
- Use `?updatedAfter=<timestamp>` query param

**On-Demand Sync:**
- After create/update/delete: Immediate
- Manual "Sync Now" button: Immediate

### 9.2 Optimization Techniques

**1. Differential Sync**
```typescript
// Only fetch tasks updated since last sync
const lastSync = await getLastSyncTimestamp();
const updatedTasks = await api.get(`/api/tasks?updatedAfter=${lastSync}`);
```

**2. Batch Operations**
```typescript
// Batch multiple updates into one request
const updates = await db.syncQueue.toArray();
await api.post('/api/tasks/batch', { operations: updates });
```

**3. Debounced Sync**
```typescript
// Don't sync on every keystroke, wait 2 seconds
const debouncedSync = debounce(syncTask, 2000);
```

**4. IndexedDB Indexes**
```typescript
// Query only pending syncs efficiently
db.tasks.where('syncStatus').equals('pending').toArray();
```

### 9.3 Performance Targets

| Metric | Target | Measurement |
|--------|--------|-------------|
| Initial sync (100 tasks) | < 2s | Time to load |
| Create + sync | < 500ms | Time to 'synced' |
| Background sync | < 1s | Non-blocking |
| Offline queue drain | < 5s | After reconnect |

---

## 10. Security Considerations

### 10.1 Authentication

**JWT Token Handling:**
```typescript
// Store token securely
localStorage.setItem('auth_token', token);

// Include in all API requests
apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;

// Clear on logout/401
apiClient.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401) {
      localStorage.removeItem('auth_token');
      window.location.href = '/login';
    }
  }
);
```

### 10.2 Data Validation

**Client-Side:**
- Validate before sending to server
- Prevent XSS in task titles/descriptions
- Sanitize user input

**Server-Side:**
- Re-validate all data (never trust client)
- SQL injection prevention (parameterized queries)
- Rate limiting on API endpoints

### 10.3 Data Privacy

**User Isolation:**
```sql
-- Every query filters by user_id
SELECT * FROM tasks WHERE user_id = $1;
```

**No Cross-User Access:**
- API validates JWT `userId` matches task `user_id`
- Database has foreign key constraints

**Data Encryption:**
- HTTPS for all API calls
- PostgreSQL connections encrypted (SSL)
- Passwords hashed with bcrypt

---

## 11. Monitoring & Observability

### 11.1 Metrics to Track

**Sync Success Rate:**
```typescript
Sentry.metrics.increment('sync.success', {
  tags: { operation: 'create' }
});

Sentry.metrics.increment('sync.failure', {
  tags: { operation: 'update', error: 'network' }
});
```

**Sync Latency:**
```typescript
const start = Date.now();
await syncTask(task);
const duration = Date.now() - start;

Sentry.metrics.timing('sync.duration', duration, {
  tags: { operation: 'create' }
});
```

**Queue Depth:**
```typescript
const queueSize = await db.syncQueue.count();
Sentry.metrics.gauge('sync.queue_size', queueSize);
```

### 11.2 Alerts

**Critical:**
- Sync failure rate > 10% (within 1 hour)
- Queue depth > 100 items
- Authentication failures spike

**Warning:**
- Sync latency > 5s (p95)
- Retry count > 3 for any operation
- Conflict rate > 5%

### 11.3 Dashboards

**Sync Health Dashboard:**
- Success/failure rate (last 24h)
- Average sync latency
- Queue depth over time
- Conflict rate
- Active users with sync enabled

---

## 12. Success Criteria

### 12.1 Launch Criteria

**Functionality:**
- [ ] All CRUD operations sync to server
- [ ] Offline queue processes successfully
- [ ] Conflicts resolved automatically (LWW)
- [ ] Multi-device sync works
- [ ] All existing tests pass (177)
- [ ] New sync tests pass (50+ new tests)

**Performance:**
- [ ] Initial sync < 2s (100 tasks)
- [ ] Create + sync < 500ms
- [ ] No user-facing errors

**User Experience:**
- [ ] Sync status visible in UI
- [ ] Error messages clear and actionable
- [ ] Migration flow smooth (<5 clicks)
- [ ] No data loss reported

### 12.2 Post-Launch Metrics

**Week 1:**
- Sync success rate > 95%
- Error rate < 2%
- User adoption > 50%

**Week 4:**
- Sync success rate > 98%
- Error rate < 1%
- User adoption > 80%
- Zero data loss incidents

---

## 13. FAQ

**Q: What happens if I'm offline?**
A: All operations work normally. Changes are queued and sync when you reconnect.

**Q: What if I edit the same task on two devices?**
A: The most recent edit wins (Last-Write-Wins). You can see conflicts in Settings.

**Q: Can I disable cloud sync?**
A: Yes, there's a toggle in Settings. Local-only mode still works.

**Q: Is my data secure?**
A: Yes. All API calls use HTTPS, passwords are hashed, and data is isolated per user.

**Q: What if sync fails?**
A: The operation is queued and retried automatically. You'll see a status indicator.

**Q: Will this slow down my app?**
A: No. Sync happens in the background. You'll see instant local updates.

---

## 14. Next Steps

1. **Review this document** with team (1 day)
2. **Update task estimation** based on phases (1 day)
3. **Create Jira tickets** for each phase (1 day)
4. **Kickoff Phase 1** - Foundation (Week 1)

**Timeline:**
- **Week 1:** Phases 1-2 (Foundation + Read Sync)
- **Week 2:** Phase 3 (Write Sync)
- **Week 3:** Phases 4-5 (Delete + Background Sync)
- **Week 4:** Phase 6 (Migration + Rollout)

**Stakeholder Approval:**
- [ ] Tech Lead
- [ ] Product Manager
- [ ] QA Lead

---

**Document Version:** 1.0
**Last Updated:** 2025-10-27
**Next Review:** After Phase 1 completion
