# Dynamic Task Priority Manager Constitution

## Core Principles

### I. Test-First Development (NON-NEGOTIABLE)

TDD is mandatory for all business logic implementation:
- MUST write unit tests before implementation code
- MUST verify tests fail (red) before implementing
- MUST follow Red-Green-Refactor cycle
- Integration tests required for: storage layer, API contracts, FSM state machines

**Applies to**: Core services (TaskManager, ComparisonEngine, StorageService), rank shifting logic, comparison workflow

### II. Local-First Architecture

Data sovereignty and offline capability are paramount:
- MUST store primary data in client-side IndexedDB
- MUST function fully without backend connectivity
- Backend sync is optional enhancement, not dependency
- Cloud backup uses last-write-wins conflict resolution

### III. Simplicity Over Cleverness

Choose simple, maintainable solutions:
- Sequential integer ranks (0, 1, 2...) over fractional ranks
- Binary comparison UI over complex priority scoring
- Direct state updates over optimistic concurrency
- YAGNI: Build what spec requires, defer what it doesn't

### IV. Performance Measurability

All performance claims must be verifiable:
- <2s initial load (SC-001, SC-006)
- <1s reprioritization (SC-002)
- <60s task addition with comparison (SC-003)
- Benchmark with realistic data (500 tasks minimum)

### V. Accessibility & Usability

Interface must be universally accessible:
- ARIA labels on all interactive elements
- Keyboard shortcuts for common actions
- Screen reader compatibility (test with VoiceOver/NVDA)
- Visual feedback for all state changes

## Development Workflow

### Test Gates

- Phase 2 (Foundational): 100% pass rate required before user stories (T022)
- Each user story: Independent test must pass before marking complete
- Phase 9 (Polish): Full test suite must pass (T123)

### Code Review Requirements

- All PRs must verify TDD compliance (tests written first)
- Performance degradation flagged if >10% slower than baseline
- Accessibility checklist required for UI changes

## Governance

This constitution supersedes default practices. Amendments require:
1. Documented justification in plan.md Complexity Tracking table
2. Approval before implementation proceeds
3. Update to this file with version increment

**Version**: 1.0.0 | **Ratified**: 2025-10-15 | **Last Amended**: 2025-10-15
