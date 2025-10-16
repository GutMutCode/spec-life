# Feature Specification: Dynamic Task Priority Manager

**Feature Branch**: `001-`
**Created**: 2025-10-15
**Status**: Draft
**Input**: User description: "새로운 작업이 생길때마다 기존 작업들을 확인하고, 우선순위를 재배치하여 지금 가장 중요한 작업을 쉽게 확인 할 수 있는 서비스 만들기"

## Clarifications

### Session 2025-10-15

- Q: User Authentication & Data Privacy → A: Simple authentication with local-first storage (optional account for cloud backup)
- Q: Overdue Task Handling → A: Keep at calculated position with visual warning (maintain algorithm consistency)
- Q: Priority Ranking Scale → A: Relative priority comparison system - each task gets priority rank (0=highest) by comparing against existing tasks. No fixed importance levels used.
- Q: Completed Task Retention Period → A: 90 days (quarterly history)
- Q: Default Priority for New Tasks → A: N/A - priority rank determined through relative comparison with existing tasks during add process (see FR-007, FR-017)
- Q: Priority Calculation Method → A: Relative comparison starting from rank 0 (highest priority), new tasks compared sequentially against existing tasks to determine insertion position
- Q: Re-prioritizing Existing Tasks → A: Drag-and-drop reordering (manually move task up/down in list)
- Q: Comparison Interface Interaction → A: Binary choice buttons (More Important / Less Important)
- Q: Terminology Cleanup → A: Remove or revise FR-002 to match priority rank terminology
- Q: Comparison Process Optimization → A: Limit to 10 comparisons max with skip option (place at current position)
- Q: Success Criteria Update for Comparison UX → A: Update to 60 seconds to account for comparison steps

## User Scenarios & Testing *(mandatory)*

### User Story 1 - View Current Top Priority Task (Priority: P1)

A user opens the service to immediately see which task they should work on right now. The system displays the single most important task at the top of the interface, making the decision effortless.

**Why this priority**: This is the core value proposition - helping users quickly identify what matters most without analysis paralysis. Even without adding new tasks, users get immediate value from seeing their prioritized task list.

**Independent Test**: Can be fully tested by creating a few tasks with different attributes (deadline, importance) and verifying the top task displayed matches expected priority logic. Delivers immediate decision-making value.

**Acceptance Scenarios**:

1. **Given** a user has multiple tasks in the system, **When** they open the task view, **Then** the highest priority task is prominently displayed at the top
2. **Given** a user has no tasks, **When** they open the task view, **Then** they see a clear empty state with guidance to add their first task
3. **Given** a user has only one task, **When** they open the task view, **Then** that task is shown as the top priority

---

### User Story 2 - Add New Task with Automatic Reprioritization (Priority: P1)

A user needs to add a new task to their list. The system guides them through a relative comparison process: starting from the current rank 0 (highest priority) task, the user compares the new task against existing tasks to determine where it should be inserted. This process continues sequentially until the correct position is found.

**Why this priority**: This is the primary feature differentiator - dynamic priority determination through relative comparison. Without this, the service is just a basic task list. This must work for MVP.

**Independent Test**: Can be fully tested by adding a new task and going through the comparison process using the binary choice buttons (e.g., shown Task A at rank 0, click "Less Important", then shown Task B at rank 1, click "More Important") and verifying it's inserted at rank 1 with previous Task B becoming rank 2. Delivers the core "smart reprioritization" value.

**Acceptance Scenarios**:

1. **Given** a user has existing tasks, **When** they add a new task and indicate it's more important than the current rank 0 task, **Then** the new task becomes rank 0 and all previous tasks shift down (0→1, 1→2, etc.)
2. **Given** a user has existing tasks, **When** they add a new task and through sequential comparison determine it should be rank 3, **Then** it's inserted at rank 3 and tasks at rank 3+ shift down
3. **Given** a user adds a task, **When** the comparison process completes (or user clicks "Skip/Place Here"), **Then** they see visual feedback showing the final rank position and which tasks were shifted
4. **Given** a user is comparing a new task and reaches 10 comparisons, **When** the limit is reached, **Then** the system automatically places the task at that position or allows the user to skip to place it earlier

---

### User Story 3 - View All Tasks in Priority Order (Priority: P2)

A user wants to see their complete task list, not just the top item. The system displays all tasks sorted by priority, giving context about upcoming work.

**Why this priority**: Users need visibility into their full workload for planning. While the top task is most critical (P1), seeing the complete prioritized list adds planning value.

**Independent Test**: Can be fully tested by creating multiple tasks and verifying the entire list displays in correct priority order. Delivers workload visibility value independently.

**Acceptance Scenarios**:

1. **Given** a user has multiple tasks, **When** they view the task list, **Then** all tasks appear ordered by priority rank (0, 1, 2, 3... with 0 at the top)
2. **Given** tasks have different priority ranks, **When** displayed, **Then** the rank numbers are visible and ordering is clear
3. **Given** a user views their task list, **When** they scroll through it, **Then** they can see each task's rank number and understand relative priorities

---

### User Story 4 - Edit Task Details with Reprioritization (Priority: P2)

A user needs to update task information (such as deadline or description) or change a task's priority position. They can edit text fields directly, or drag the task to a new position in the list to change its priority rank.

**Why this priority**: Tasks change over time. While editing is important, users can initially work with the tasks as created (P1 stories). This enhances usability but isn't required for MVP value.

**Independent Test**: Can be fully tested by (1) editing task text and verifying changes persist, and (2) dragging a task from rank 3 to rank 1 and verifying it moves correctly with other tasks shifting down. Delivers task management flexibility independently.

**Acceptance Scenarios**:

1. **Given** a user drags a task to a new position, **When** they drop it, **Then** the task's rank updates and all tasks between the old and new positions shift accordingly
2. **Given** a user edits a task's description or deadline, **When** they save changes, **Then** the task maintains its current priority rank (text changes don't affect rank)
3. **Given** a task is being edited or dragged, **When** the user cancels, **Then** no changes are applied and the task remains at its original rank

---

### User Story 5 - Complete or Delete Tasks (Priority: P3)

A user finishes a task or decides it's no longer relevant. They mark it complete or delete it, and the system automatically promotes the next highest priority task to the top.

**Why this priority**: Task completion is essential long-term but not required to demonstrate core reprioritization value. Users can test P1-P2 stories with a static set of tasks.

**Independent Test**: Can be fully tested by completing/deleting the top task and verifying the next task automatically becomes the new top priority. Delivers task lifecycle management independently.

**Acceptance Scenarios**:

1. **Given** a user completes the top priority task, **When** they mark it done, **Then** it's removed from the active list and the next task becomes top priority
2. **Given** a user deletes a mid-priority task, **When** deletion confirms, **Then** remaining tasks maintain their relative priority order
3. **Given** a user completes a task, **When** they view completed tasks, **Then** they can see their accomplishment history

---

### Edge Cases

- What happens when two tasks are considered equally important during comparison? → Handled by FR-016 (use creation time as tiebreaker, new task goes after existing task)
- How does the system handle tasks with no deadline versus tasks with deadlines? → Deadlines are displayed during comparison (when present) to inform user decisions, but ranking is determined entirely by user's binary choice. Tasks without deadlines are displayed with "No deadline" label.
- What if a user adds the first task (no existing tasks to compare)? → First task automatically becomes rank 0
- What if a user wants to abort the comparison process midway? → User can cancel, and the new task is not added (no changes to existing ranks)
- How does the system prioritize when a task's deadline has passed? → Handled by FR-022 and FR-023 (visual warning, maintain current rank position)
- What happens when the user has an extremely large number of tasks (e.g., 1000+)? → Covered by SC-006 (responsive up to 500 tasks; performance beyond that is out of scope for MVP). Comparison limited to 10 steps max (FR-033) with skip option (FR-034) to prevent tedious UX
- What if the comparison reaches the 10-step limit? → User can either continue accepting the current position (after 10 comparisons) or skip earlier to place the task at any intermediate position
- What happens when a user edits a task's deadline to be more urgent? → The task maintains its current rank position. Users must manually drag the task to a higher priority position if the deadline change warrants re-prioritization. Automatic re-ranking on edit is out of scope for MVP.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST allow users to add new tasks with a title and optional description
- **FR-002**: [MERGED INTO FR-007]
- **FR-003**: System MUST re-evaluate and reorder all task priority ranks whenever a new task is added or an existing task is moved
- **FR-004**: System MUST display the highest priority task prominently to the user
- **FR-005**: System MUST display all tasks in descending priority order
- **FR-006**: System MUST allow users to specify a deadline for tasks
- **FR-007**: System MUST determine task priority through relative comparison with existing tasks. When adding a new task, the system presents existing tasks sequentially starting from rank 0 (highest priority), and the user indicates whether the new task is more or less important using binary choices. The final comparison position determines the assigned rank, where 0 represents the highest priority and all subsequent tasks shift down by one rank.
- **FR-008**: System MUST allow users to edit task details (title, description, deadline) and reorder tasks via drag-and-drop to change relative priority
- **FR-009**: System MUST re-evaluate and update priority ranks when a task is manually reordered via drag-and-drop (see FR-030, FR-031). Editing task text fields (title, description, deadline) does NOT trigger automatic re-ranking; the task maintains its current rank unless explicitly moved by the user.
- **FR-010**: System MUST allow users to mark tasks as complete
- **FR-011**: System MUST allow users to delete tasks
- **FR-012**: System MUST remove completed or deleted tasks from the active priority list
- **FR-013**: System MUST persist tasks so they're available across sessions
- **FR-014**: System MUST provide visual differentiation between priority levels
- **FR-015**: System MUST show users when a task's position has changed due to reprioritization
- **FR-016**: System MUST handle tasks considered equally important during comparison in a consistent manner (new task placed after existing task using creation time as tiebreaker)
- **FR-017**: System MUST calculate priority through sequential relative comparison: when a new task is added, compare it against existing tasks starting from rank 0 (highest priority) to determine its insertion position. During comparison, the system displays each comparison task's deadline (if set) alongside title/description to inform the user's decision, but the final rank is determined solely by the user's binary choice ("More Important" / "Less Important"). The system does not automatically factor deadline proximity into ranking.
- **FR-018**: System MUST support optional user authentication for cloud backup of task data
- **FR-019**: System MUST store task data locally on the user's device as the primary storage mechanism
- **FR-020**: System MUST allow users to use the service without creating an account (anonymous local-only mode)
- **FR-021**: System MUST protect user task data from unauthorized access when authentication is enabled
- **FR-022**: System MUST display a visual warning indicator for tasks with passed deadlines
- **FR-023**: System MUST maintain the calculated priority position for overdue tasks (not automatically promoting them above higher-priority tasks)
- **FR-024**: System MUST retain completed tasks for 90 days before automatic deletion
- **FR-025**: System MUST allow users to view their completed task history within the 90-day retention window
- **FR-026**: System MUST present a sequential comparison interface when adding new tasks, starting from rank 0 and proceeding until insertion position is determined
- **FR-027**: System MUST provide binary choice buttons ("More Important" / "Less Important") at each comparison step for users to indicate whether the new task is more or less important than the displayed comparison task
- **FR-028**: System MUST automatically shift existing task ranks when a new task is inserted (all tasks at insertion rank and below increment by 1)
- **FR-029**: System MUST display task priority ranks (0, 1, 2, 3...) to users alongside task information
- **FR-030**: System MUST support drag-and-drop interaction for reordering tasks in the priority list
- **FR-031**: System MUST update all affected task ranks when a task is moved via drag-and-drop (tasks between old and new positions are shifted accordingly)
- **FR-032**: System MUST provide visual feedback during drag-and-drop operations showing where the task will be inserted
- **FR-033**: System MUST limit the comparison process to a maximum of 10 sequential comparisons per new task. After the 10th comparison, if the user has not manually skipped, the system automatically inserts the task at the current comparison position (i.e., one rank below the 10th compared task).
- **FR-034**: System MUST provide a "Skip" or "Place Here" button during comparison to allow users to end the process early and insert the task at the current comparison position. This button is available at every comparison step (not just after reaching the 10-step limit).

### Key Entities

- **Task**: Represents a work item to be completed. Key attributes include title, description (optional), deadline (optional), priority rank (0=highest), creation timestamp, completion status, overdue indicator
- **Priority Rank**: A relative ordering value (0, 1, 2, 3...) where 0 is the highest priority. Determined by sequential comparison against existing tasks when added or modified. When a task is inserted at position N, all tasks at position N and higher are shifted down (N+1, N+2...)

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can identify their top priority task within 2 seconds of opening the interface
- **SC-002**: When a new task is added, priority reordering completes and updates the display within 1 second
- **SC-003**: Users can add a new task with all details (including comparison process) in under 60 seconds
- **SC-004**: 90% of users successfully understand which task to work on next without additional explanation
- **SC-005**: System correctly prioritizes tasks in at least 95% of test scenarios (comparing automated priority to expert human judgment)
- **SC-006**: Task list remains responsive with up to 500 tasks without noticeable performance degradation (under 2 second load time)
- **SC-007**: Zero data loss - all tasks persist correctly across sessions and system restarts

## Assumptions *(optional)*

- Users will primarily access this service from a single device (multi-device sync is out of scope for initial version)
- Priority calculation will be deterministic and consistent (same inputs always produce same priority order)
- Tasks are personal to individual users (team/shared task management is out of scope)
- Users understand basic concepts of task importance and deadlines
- The service will support standard datetime formats for deadline entry
- The priority algorithm can be tuned based on user feedback after initial release

## Out of Scope *(optional)*

- Multi-user collaboration or task sharing
- Task dependencies (e.g., "Task B cannot start until Task A is complete")
- Recurring tasks or task templates
- Task categories or tags
- Time tracking or effort estimation
- Notifications or reminders
- Calendar integration
- Mobile native applications (initial version may be web-based)
- AI-powered priority suggestions based on user behavior patterns
- Task delegation or assignment to others
- Subtasks or task hierarchies
