# Git Workflow

This project follows a simplified **GitHub Flow** to maintain code quality while keeping the process lightweight for individual or small team development.

## Branch Strategy

### Protected Branches

- **`main`**: Production-ready code
  - Protected with branch ruleset
  - Requires Pull Request for all changes
  - Requires 1 approval before merge
  - No force pushes allowed
  - No deletions allowed

### Working Branches

Use descriptive branch names with prefixes:

- `feature/description` - New features
- `fix/description` - Bug fixes
- `refactor/description` - Code refactoring
- `docs/description` - Documentation updates
- `test/description` - Test additions/modifications
- `chore/description` - Maintenance tasks

**Examples:**
```bash
feature/add-task-filtering
fix/comparison-modal-crash
refactor/storage-service
docs/update-readme
test/add-e2e-tests
chore/update-dependencies
```

## Workflow Process

### 1. Start New Work

```bash
# Ensure main is up to date
git checkout main
git pull origin main

# Create new branch
git checkout -b feature/your-feature-name
```

### 2. Make Changes

```bash
# Make your changes
# Edit files...

# Stage changes
git add .

# Commit with descriptive message
git commit -m "feat: add task filtering functionality"
```

### 3. Push to Remote

```bash
# First push: set upstream
git push -u origin feature/your-feature-name

# Subsequent pushes
git push
```

### 4. Create Pull Request

```bash
# Using GitHub CLI (recommended)
gh pr create --title "Add task filtering" --body "Implements user-requested task filtering by status and priority"

# Or manually via GitHub web interface
```

### 5. Review and Merge

Since this is an individual project:
- Review your own changes carefully
- Ensure tests pass
- Approve and merge the PR

```bash
# Via CLI
gh pr merge --squash

# Or via web interface
```

### 6. Clean Up

```bash
# Switch back to main
git checkout main
git pull origin main

# Delete local branch (if merged)
git branch -d feature/your-feature-name
```

## Commit Message Conventions

Follow **Conventional Commits** format:

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

### Types

- `feat`: New feature
- `fix`: Bug fix
- `refactor`: Code refactoring (no functional changes)
- `docs`: Documentation changes
- `test`: Adding or updating tests
- `chore`: Maintenance tasks (dependencies, config)
- `perf`: Performance improvements
- `style`: Code style changes (formatting, no logic changes)

### Examples

```bash
# Feature
git commit -m "feat(frontend): add task filtering by status"

# Bug fix
git commit -m "fix(backend): resolve database connection timeout"

# Documentation
git commit -m "docs: update installation instructions"

# Multiple changes
git commit -m "refactor(shared): simplify Task type definitions

- Remove unused properties
- Add JSDoc comments
- Update dependent code"
```

## Pull Request Guidelines

### PR Title

Use the same format as commit messages:
```
feat(frontend): add task filtering
fix(backend): resolve connection timeout
```

### PR Description Template

```markdown
## Summary
Brief description of changes (1-3 bullet points)

## Changes
- Detailed list of changes
- Why these changes were made

## Testing
- [ ] Unit tests pass
- [ ] E2E tests pass (if applicable)
- [ ] Manual testing completed

## Screenshots (if UI changes)
[Add screenshots if relevant]
```

## Emergency Hotfixes

For critical production issues:

```bash
# Create hotfix branch from main
git checkout main
git pull origin main
git checkout -b fix/critical-issue

# Make minimal fix
git add .
git commit -m "fix: resolve critical production issue"

# Push and create PR
git push -u origin fix/critical-issue
gh pr create --title "Hotfix: critical issue" --body "Resolves production error XYZ"

# Fast-track review and merge
gh pr merge --squash
```

## Branch Protection Rules

Current ruleset for `main` branch:

- **Deletion**: Prevented
- **Force push**: Prevented
- **Pull request**: Required
- **Approvals**: 1 required
- **Stale reviews**: Dismissed on new push
- **Review thread resolution**: Required

To view current rules:
```bash
gh ruleset list
gh ruleset view <ruleset-id>
```

## Handling Multiple Related Changes

If working on multiple related issues:

**Option 1: Single Branch (Recommended for related changes)**
```bash
git checkout -b feature/task-management-improvements
# Make all related changes
# Create single PR with comprehensive description
```

**Option 2: Separate Branches (For independent changes)**
```bash
# Work on each separately
git checkout -b feature/add-filtering
# Complete and merge

git checkout -b feature/add-sorting
# Complete and merge
```

## Syncing with Remote

### Before Starting Work
```bash
git checkout main
git pull origin main
git checkout -b feature/new-work
```

### During Long-Running Work
```bash
# Update feature branch with latest main
git checkout main
git pull origin main
git checkout feature/your-feature
git merge main

# Or use rebase (cleaner history)
git checkout feature/your-feature
git rebase main
```

## Common Commands Reference

```bash
# Check status
git status

# View branches
git branch -a

# View recent commits
git log --oneline --graph --all -10

# Undo last commit (keep changes)
git reset --soft HEAD~1

# Discard local changes
git checkout -- <file>
git restore <file>  # Git 2.23+

# Update branch from remote
git pull origin <branch-name>

# View pull requests
gh pr list
gh pr view <pr-number>
gh pr status
```

## Troubleshooting

### Can't Push to Main
Expected behavior! Main is protected. Create a branch and PR instead.

### Merge Conflicts
```bash
# During merge
git status  # See conflicted files
# Edit files to resolve conflicts
git add .
git commit -m "fix: resolve merge conflicts"
git push
```

### Accidentally Committed to Main
```bash
# If not pushed yet
git checkout -b feature/my-changes  # Create branch with changes
git checkout main
git reset --hard origin/main  # Reset main to remote
```

### Need to Update PR After Review
```bash
# Make requested changes
git add .
git commit -m "refactor: address PR review comments"
git push  # Automatically updates PR
```

## Best Practices

1. **Keep branches short-lived** - Merge within 1-2 days when possible
2. **Commit often** - Small, logical commits are easier to review
3. **Write clear commit messages** - Future you will thank present you
4. **Test before pushing** - Run `pnpm test` and `pnpm lint`
5. **Review your own PR** - Check the diff before requesting review
6. **Keep PRs focused** - One feature/fix per PR when possible
7. **Update branch regularly** - Sync with main to avoid conflicts
8. **Delete merged branches** - Keep repository clean

## Additional Resources

- [GitHub Flow Guide](https://guides.github.com/introduction/flow/)
- [Conventional Commits](https://www.conventionalcommits.org/)
- [Git Best Practices](https://git-scm.com/book/en/v2)
