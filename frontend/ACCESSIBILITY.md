# Accessibility Testing Guide (T114)

This document provides a comprehensive checklist for testing the Task Priority Manager with screen readers and other assistive technologies.

## Prerequisites

### Screen Readers
- **Windows**: NVDA (free) or JAWS
- **macOS**: VoiceOver (built-in)
- **Linux**: Orca

### Browser Support
- Chrome/Edge with NVDA/JAWS
- Safari with VoiceOver
- Firefox with NVDA/Orca

---

## Testing Checklist

### 1. Keyboard Navigation

#### Global Navigation
- [ ] **Tab key**: Can navigate through all interactive elements
- [ ] **Shift+Tab**: Can navigate backwards
- [ ] **Enter/Space**: Can activate buttons and links
- [ ] **Escape**: Closes modals and dialogs
- [ ] **Arrow keys**: Navigate within lists (when applicable)

#### Keyboard Shortcuts (T111)
- [ ] Press `n` - Opens "Add Task" page
- [ ] Press `a` - Opens "All Tasks" page
- [ ] Press `h` - Opens "History" page
- [ ] Press `d` - Returns to Dashboard
- [ ] Press `?` - Shows keyboard shortcuts help (console)

#### Modal Dialogs (T113)
- [ ] **Focus trap**: Tab/Shift+Tab stays within modal
- [ ] **Escape**: Closes modal and returns focus
- [ ] **Focus restoration**: Returns to trigger element after close

---

### 2. Screen Reader Testing

#### Page Structure
- [ ] **Landmarks**: Header, main, navigation, contentinfo announced
- [ ] **Headings**: Proper hierarchy (h1 → h2 → h3)
- [ ] **Page title**: Descriptive and updated on route change

#### Dashboard Page
- [ ] **Empty state**: "No tasks yet" message is announced
- [ ] **Top task**: Title, description, deadline announced
- [ ] **Rank badge**: "Priority rank X - highest/high/medium/low priority" announced
- [ ] **Overdue indicator**: Warning announced clearly
- [ ] **Action buttons**: "Mark task complete", "Delete task" with task title

#### Add Task Form (TaskForm)
- [ ] **Form label**: "Create new task form" announced
- [ ] **Required fields**: "Task Title, required" announced
- [ ] **Field errors**: Announced with `role="alert"`
- [ ] **Character count**: "X of 200 characters used" announced
- [ ] **Submit button**: "Submit task and continue to priority comparison"
- [ ] **Cancel button**: "Cancel task creation and return to dashboard"

#### Comparison Modal (ComparisonModal)
- [ ] **Dialog role**: "Compare Tasks, dialog" announced
- [ ] **Progress**: "Step X of 10 - Which task is more important?" announced
- [ ] **Task cards**: Both tasks read with title, description, deadline
- [ ] **Comparison buttons**: Clear labels with task names
  - "Mark [Task A] as more important than [Task B]"
  - "Mark [Task A] as less important than [Task B]"
- [ ] **Skip button**: "Skip comparison and manually choose task position"
- [ ] **Success message**: Insertion feedback announced
- [ ] **Focus trap**: Cannot tab out of modal
- [ ] **Escape**: Closes modal

#### All Tasks Page (TaskList)
- [ ] **Task count**: Number of tasks announced
- [ ] **Task order**: Rank order clear (0, 1, 2...)
- [ ] **Drag handle**: "Drag to reorder task: [title]" announced (if present)
- [ ] **Action buttons**: Unique labels for each task

#### History Page
- [ ] **Completed tasks**: List of completed tasks navigable
- [ ] **Completion date**: Announced for each task
- [ ] **Empty state**: "No completed tasks" announced

---

### 3. ARIA Implementation (T112)

#### Interactive Elements
- [ ] **Buttons**: All have descriptive `aria-label` or text
- [ ] **Links**: Navigation links have clear purpose
- [ ] **Modals**: `role="dialog"`, `aria-modal="true"`, `aria-labelledby`, `aria-describedby`
- [ ] **Forms**: `aria-required`, `aria-invalid`, `aria-describedby` for errors
- [ ] **Alerts**: Error messages use `role="alert"` or `aria-live="polite"`

#### Hidden Content
- [ ] **Decorative icons**: `aria-hidden="true"` on SVGs
- [ ] **Screen reader only**: Important info available to screen readers

#### Dynamic Content
- [ ] **Live regions**: Status updates announced (`aria-live="polite"`)
- [ ] **Loading states**: `aria-busy` attribute used
- [ ] **State changes**: Button state changes announced (e.g., "Saving...")

---

### 4. Visual Accessibility

#### Color Contrast
- [ ] **Text**: Minimum 4.5:1 contrast ratio (WCAG AA)
- [ ] **Interactive elements**: Minimum 3:1 contrast ratio
- [ ] **Focus indicators**: Visible on all focusable elements
- [ ] **Priority colors**: Not sole indicator (text labels present)

#### Focus Management
- [ ] **Visible focus**: Blue outline on focused elements
- [ ] **Focus order**: Logical tab order (top to bottom, left to right)
- [ ] **Skip links**: Can skip repetitive content (if needed)

---

### 5. Common Screen Reader Commands

#### NVDA (Windows)
- `Insert + Down Arrow` - Start reading from current position
- `Insert + B` - Announce current element
- `B` - Navigate by buttons
- `H` - Navigate by headings
- `F` - Navigate by form fields
- `D` - Navigate by landmarks

#### VoiceOver (macOS)
- `VO + A` - Start reading
- `VO + Right/Left Arrow` - Navigate elements
- `VO + Space` - Activate element
- `VO + U` - Open rotor (navigate by type)
- `VO + Shift + H` - Navigate by headings

---

## Known Issues

Document any accessibility issues found during testing:

### Issues Found
1. **Issue**: [Description]
   - **Severity**: Critical / Major / Minor
   - **Component**: [Component name]
   - **Steps to reproduce**: [Steps]
   - **Expected behavior**: [What should happen]
   - **Actual behavior**: [What actually happens]
   - **Fix**: [Proposed solution or PR link]

---

## Testing Session Template

Use this template for each testing session:

```markdown
## Testing Session: [Date]

**Tester**: [Name]
**Screen Reader**: [NVDA/JAWS/VoiceOver/Orca]
**Browser**: [Chrome/Firefox/Safari]
**OS**: [Windows/macOS/Linux]

### Pages Tested
- [ ] Dashboard
- [ ] Add Task
- [ ] All Tasks
- [ ] History

### Issues Found
1. [Issue description] - [Severity]
2. [Issue description] - [Severity]

### Overall Accessibility Rating
- [ ] Excellent - No issues
- [ ] Good - Minor issues only
- [ ] Needs Improvement - Major issues found
- [ ] Poor - Critical issues blocking usage

### Notes
[Additional observations]
```

---

## Success Criteria

The application passes accessibility testing when:

1. ✅ All interactive elements are keyboard accessible
2. ✅ All modals implement focus trapping
3. ✅ All form fields have proper labels and error handling
4. ✅ Screen reader announces all important information
5. ✅ Color is not the sole indicator of meaning
6. ✅ Focus indicators are visible and clear
7. ✅ ARIA attributes are used correctly
8. ✅ No keyboard traps (except intentional modal traps)
9. ✅ Dynamic content changes are announced
10. ✅ Users can complete all tasks using only keyboard + screen reader

---

## Resources

- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/)
- [WebAIM Screen Reader Testing](https://webaim.org/articles/screenreader_testing/)
- [NVDA Download](https://www.nvaccess.org/download/)
- [VoiceOver User Guide](https://support.apple.com/guide/voiceover/welcome/mac)

---

## Automated Testing

Consider adding automated accessibility tests:

```bash
# Install axe-core for automated testing
npm install --save-dev @axe-core/react

# Run accessibility tests in test suite
npm test -- --coverage
```

**Note**: Automated tests catch ~30-50% of accessibility issues. Manual testing with screen readers is essential.
