# Repository Guidelines

## Project Structure & Module Organization
The workspace uses pnpm to manage three packages: `frontend/` (React + Vite), `backend/` (Express API), and `shared/` (TypeScript definitions). React code is grouped by concern inside `frontend/src`, with components, pages, services, and hooks; unit specs live next to source in `__tests__/` folders, and test helpers sit in `frontend/src/test`. The backend keeps HTTP handlers in `src/api`, domain logic in `src/services`, persistence helpers in `src/storage`, and migrations under `backend/migrations`. Product specs and planning notes stay in `specs/` alongside supporting guides such as `IMPLEMENTATION_GUIDE.md`.

## Build, Test, and Development Commands
Run `pnpm install` once to hydrate all workspaces. `pnpm dev` starts the Vite dev server and the Express watcher together; use `cd frontend && pnpm dev` or `cd backend && pnpm dev` when you only need one side. Ship-ready bundles come from `pnpm build`, while `pnpm lint` runs ESLint across packages. Execute `pnpm test` for the full suite or scope to a package, e.g. `cd frontend && pnpm test`.

## Coding Style & Naming Conventions
TypeScript is first-class everywhere; keep modules typed and prefer shared contracts from `@shared`. ESLint (configured via `.eslintrc.cjs` in each package) provides the baseline checks—run it frequently to catch drift. Match the prevailing style: two-space indentation, single-quoted strings, PascalCase React components (`TaskList.tsx`), hooks prefixed with `use`, and camelCase utilities. Backend services export named functions, and test files use the `*.test.ts` or `*.test.tsx` suffix.

## Testing Guidelines
Vitest powers both frontend and backend unit tests. Place new specs beside implementation within a local `__tests__` folder and call helpers from `frontend/src/test/setup.ts` for DOM utilities. For backend logic, add `*.test.ts` files under the relevant `src` directory and mock external I/O. Use `pnpm test -- --coverage` when you need a coverage report, and keep Playwright end-to-end checks current via `cd frontend && pnpm test:e2e`.

## Commit & Pull Request Guidelines
Follow Conventional Commits (`feat`, `fix`, `refactor`, `docs`, etc.) with optional scopes such as `frontend` or `backend`. Branch from `main` using the prefixes defined in `GIT_WORKFLOW.md`, e.g. `feature/add-task-filtering`. Pull requests must include a summary, detailed change bullets, and the testing checklist; attach screenshots for UI adjustments. Always confirm lint and test runs locally before requesting review.

## Security & Configuration Tips
Never commit `.env` files—use the examples in `README.md` to populate `backend/.env` and `frontend/.env`. Rotate `JWT_SECRET` values regularly and run `pnpm migrate up` against a local PostgreSQL instance after schema changes. When sharing SQL dumps or seed data, keep them under `backend/migrations` or `specs/` instead of the repository root.
