# Feature Specification: Keyboard Shortcuts Help UI

**Feature Branch**: `002-ui`
**Created**: 2025-10-17
**Status**: Draft
**Input**: User description: "키보드 숏컷을 사용자가 볼수 있게 UI를 만들어줘."

## User Scenarios & Testing

### User Story 1 - Quick Shortcut Reference (Priority: P1)

A user is working in the task management application and wants to know what keyboard shortcuts are available without leaving their current workflow. They press a help key and see a modal or overlay displaying all available shortcuts organized by context.

**Why this priority**: This is the core value of the feature - providing immediate access to keyboard shortcut information. Without this, users cannot discover or remember available shortcuts, significantly reducing productivity gains.

**Independent Test**: Can be fully tested by pressing the help key (e.g., `?` or `Shift+?`) and verifying that a complete, readable list of all keyboard shortcuts appears in a modal/overlay. Delivers immediate value by showing users all available shortcuts.

**Acceptance Scenarios**:

1. **Given** user is on any page of the application, **When** user presses `?` or `Shift+?`, **Then** a shortcuts help overlay appears showing all available keyboard shortcuts
2. **Given** shortcuts help overlay is open, **When** user presses `Escape` or clicks outside the overlay, **Then** the overlay closes and user returns to their previous context
3. **Given** user is viewing the shortcuts help, **When** user scans the list, **Then** shortcuts are grouped by category (Navigation, Task Management, etc.) for easy scanning
4. **Given** user is viewing the shortcuts help, **When** user reads any shortcut description, **Then** the key combination and its action are clearly displayed

---

### User Story 2 - Contextual Shortcut Hints (Priority: P2)

A user hovers over or focuses on an interactive element (button, link, input) and sees a tooltip or hint indicating if a keyboard shortcut is available for that action.

**Why this priority**: Enhances discoverability by teaching users shortcuts in context as they use the application. Supports learning-by-doing and reduces the need to memorize all shortcuts upfront.

**Independent Test**: Can be tested by hovering over or focusing on any interactive element with an associated shortcut and verifying that a tooltip appears showing the keyboard shortcut. Delivers value by making shortcuts discoverable during natural application usage.

**Acceptance Scenarios**:

1. **Given** user hovers over the "Add Task" button for 500ms, **When** tooltip appears, **Then** it shows "Add Task (n)" indicating the `n` keyboard shortcut
2. **Given** user is using keyboard navigation, **When** user focuses on an element with a shortcut, **Then** a hint shows the available keyboard shortcut immediately
3. **Given** user sees a shortcut hint, **When** user uses the indicated shortcut, **Then** the corresponding action executes successfully

---

## Clarifications

### Session 2025-10-17

- Q: What happens when user presses shortcut help key (`?`) while already viewing the shortcuts help? → A: Toggle close - pressing `?` again closes the shortcuts help overlay
- Q: What is the timing behavior for showing contextual shortcut hint tooltips? → A: 500ms hover delay, immediate on focus
- Q: What happens when shortcuts help overlay is open and user tries to use a keyboard shortcut? → A: Close help first, then execute shortcut
- Q: How does the shortcuts help display on mobile devices where keyboard shortcuts may not be available? → A: Hide on mobile devices
- Q: Where should shortcut definitions be stored and managed in the codebase? → A: Centralized config file

---

### Edge Cases

**Resolved**:
- **Conflicting shortcuts across contexts**: The centralized configuration file (FR-114, Clarifications) will prevent conflicts by validating unique key combinations per context during config initialization. The config will use a flat array structure where each shortcut explicitly declares its context (e.g., global vs. page-specific). The implementation will log warnings if duplicate keys are detected in the same context.
- **Modifier key display across OS**: Resolved by FR-007 and device detection (Clarifications). The system detects the user's OS via `navigator.platform` and displays OS-appropriate symbols (⌘ on Mac, Ctrl on Windows/Linux). The `useDeviceDetection` hook provides `isMac`, `isWindows`, `isLinux` flags, and the `ModifierKeys` mapping provides OS-specific labels.

**Deferred** (future enhancement):
- Shortcut remapping/customization (explicitly out of scope per "Out of Scope" section)

## Requirements

### Functional Requirements

- **FR-001**: System MUST display a keyboard shortcuts help interface accessible via a keyboard shortcut (default: `?` or `Shift+?`); pressing the help key again while help is open MUST toggle close the overlay
- **FR-002**: System MUST show all available keyboard shortcuts organized by functional category (Navigation, Task Management, History, etc.)
- **FR-003**: Shortcuts help MUST display the key combination and associated action description for each shortcut
- **FR-004**: System MUST allow users to close the shortcuts help using keyboard (`Escape`), mouse/touch (click outside or close button), or by pressing the help key (`?`) again
- **FR-005**: System MUST display shortcuts help in a modal or overlay that doesn't navigate away from current page
- **FR-005a**: When shortcuts help overlay is open and user presses any application keyboard shortcut, system MUST automatically close the help overlay first, then execute the shortcut
- **FR-006**: System MUST show contextual shortcut hints on interactive elements when hovered (after 500ms delay) or focused (immediately for keyboard users)
- **FR-007**: Shortcut display MUST adapt to user's operating system (show `Cmd` on Mac, `Ctrl` on Windows/Linux)
- **FR-008**: System MUST maintain accessibility standards (ARIA labels, focus management) in shortcuts help interface
- **FR-009**: Shortcuts help MUST be visually distinct and not interfere with underlying application content
- **FR-010**: System MUST display shortcuts in a responsive layout that works on various screen sizes
- **FR-011**: System MUST hide the keyboard shortcuts help interface and contextual hints on touch-only mobile devices (devices without physical keyboards)

### Key Entities

- **Keyboard Shortcut**: Represents a key combination and its associated action
  - Attributes: key combination (e.g., "n", "Ctrl+S"), action description, category, context (which pages it applies to)
  - Storage: All shortcuts defined in a centralized configuration file/module as single source of truth

- **Shortcut Category**: Groups related shortcuts together
  - Attributes: category name (e.g., "Navigation", "Task Management"), display order

- **Shortcut Hint**: Contextual tooltip information for an interactive element
  - Attributes: associated shortcut, target element, hint text

## Success Criteria

### Measurable Outcomes

- **SC-001**: Users can open the shortcuts help interface within 1 second of pressing the help key
- **SC-002**: 80% of users who view the shortcuts help successfully use at least one new keyboard shortcut within the same session
- **SC-003**: Shortcuts help displays all available shortcuts (currently 8-10 based on README) clearly organized by category
- **SC-004**: Users can discover available shortcuts without reading external documentation
- **SC-005**: Keyboard shortcut usage increases by 30% within 2 weeks of feature deployment
- **SC-006**: Zero interference with existing keyboard shortcuts - help interface doesn't block or conflict with current functionality
- **SC-007**: Shortcuts help loads and renders in under 200ms to maintain perception of instant feedback

### Post-MVP Success Metrics

**Note**: SC-002 and SC-005 are behavioral metrics requiring analytics tracking, which is explicitly out of scope for the initial implementation (see "Out of Scope" section). These metrics should be measured post-deployment if analytics infrastructure is added in a future iteration.

## Assumptions

- The application currently has keyboard shortcuts implemented (as documented in README.md: n, a, h, d, ?, Tab/Shift+Tab, Enter/Space, Escape)
- Users are familiar with the concept of keyboard shortcuts from other applications
- The help trigger key (`?` or `Shift+?`) is not currently used for other functionality
- Most users will access this feature on desktop/laptop devices with physical keyboards
- Shortcuts are hardcoded and not customizable - this is a read-only display feature
- The shortcuts help should follow the application's existing design system and visual style
- Accessibility (WCAG 2.1 AA compliance) is a priority as indicated by existing application documentation

## Dependencies

- Existing keyboard shortcut implementation must be maintained
- Centralized keyboard shortcuts configuration file/module (single source of truth for all shortcuts)
- Design system/component library for consistent modal/overlay styling
- Keyboard event handling system to detect help trigger key

## Scope

### In Scope

- Display interface for viewing all available keyboard shortcuts
- Contextual hints showing shortcuts on interactive elements
- Keyboard and mouse/touch interaction for opening/closing help
- Responsive design for various screen sizes
- Operating system-specific key display (Cmd vs Ctrl)
- Accessibility features (focus management, ARIA labels, screen reader support)

### Out of Scope

- Customization or remapping of keyboard shortcuts
- Internationalization of shortcut descriptions (assume English for initial version)
- Analytics tracking of shortcut usage
- Tutorial or onboarding flow for teaching shortcuts
- Gamification or progress tracking for shortcut mastery
- Export or print functionality for shortcuts reference
