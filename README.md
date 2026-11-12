# Taskflow

A project and task management web app built with React, TypeScript and Vite.

## Features

- **Dashboard**: task totals, completion rate, overdue count, per-project progress, and an upcoming/overdue list.
- **Projects**: create, edit, color-code and delete projects (deleting a project removes its tasks).
- **Kanban board**: each project has To do / In progress / Done columns with drag-and-drop.
- **All tasks**: a table with search (title, description, tags), filters by status, priority and project, and sorting. Filters live in the URL, so filtered views can be bookmarked or shared.
- **Tasks**: title, description, priority, due date, tags; overdue tasks are highlighted.
- **Checklists**: break a task into subtasks; cards show checklist progress.
- **Dependencies**: mark a task as blocked by others. Blocked tasks are flagged and can't be completed until their blockers are done; cycles are prevented in the form, the reducer and on import.
- **Recurring tasks**: repeat every N days, weeks or months. Completing one schedules the next instance (skipping missed dates, clamping month ends) with a fresh checklist.
- **Calendar**: month view with drag-and-drop rescheduling, an unscheduled tray, per-project filter and projected future repeats.
- **Search language**: on All tasks, combine terms like `is:overdue priority:high #bug project:mobile due:<7d -is:done "exact phrase"`. Supported: `is:overdue|blocked|open|done|recurring|unscheduled|subtasks`, `priority:`/`p:`, `status:`, `tag:`/`#`, `project:`, `due:today|tomorrow|week|overdue|none`, and `due:` comparisons (`<`, `<=`, `>`, `>=`, `=`) against relative days (`7d`) or dates (`2026-03-01`).
- **Command palette**: press ⌘K / Ctrl+K to fuzzy-search tasks, projects, pages and actions.
- **Undo / redo**: ⌘Z / ⇧⌘Z (Ctrl+Z / Ctrl+Shift+Z) or the sidebar buttons, with up to 100 steps. Deleting a task or project shows a toast with an Undo button that restores it, including dependency links, even after later edits.
- **Settings**: light / dark / system theme, JSON export and import, restore sample data, delete all data.
- **Persistence**: everything is saved to `localStorage`, so data survives page reloads.
- Responsive layout, keyboard-accessible cards and dialogs, 404 page.

## Getting started

Requires Node.js 20+.

```bash
npm install
npm run dev
```

Then open http://localhost:5173.

## Scripts

| Command             | Description                              |
| ------------------- | ---------------------------------------- |
| `npm run dev`       | Start the dev server with hot reload     |
| `npm run build`     | Type-check and build for production      |
| `npm run preview`   | Serve the production build locally       |
| `npm test`          | Run the test suite once                  |
| `npm run test:watch`| Run tests in watch mode                  |
| `npm run lint`      | Lint with ESLint                         |
| `npm run typecheck` | Type-check with TypeScript               |

## Project structure

```
src/
  App.tsx              Route definitions
  main.tsx             Entry point (router + store providers)
  types.ts             Domain types and constants
  styles.css           Global styles and light/dark theme tokens
  components/          Reusable UI (layout, modal, forms, cards, badges)
  pages/               Route-level screens
  store/               State: actions, reducer, undo history, dependency graph, selectors, persistence, seed data
  toast/               Toast notifications (provider, context, hook)
  hooks/               Custom React hooks
  utils/               Date, recurrence, search-language, fuzzy-match, keyboard, id, tag and URL-param helpers
  test/setup.ts        Vitest / Testing Library setup
```

State is managed with `useReducer` + React context. Action creators generate ids and timestamps so the reducer stays pure and easy to test. The reducer is wrapped by `store/history.ts` for undo/redo. Derived data (stats, filtering, sorting) lives in `store/selectors.ts`.

Saved data and backups from before checklists, dependencies and recurrence were added are upgraded on load by `parseAppState` in `store/storage.ts`.

## Testing

Unit tests cover the reducer, undo history, dependency graph, selectors, persistence and migration, recurrence, the search language, fuzzy matching and other utilities; component tests (React Testing Library) cover the task form and the main user flows: navigating, creating projects and tasks, filtering, completing tasks, deleting projects, and switching themes.

## CI

`.github/workflows/ci.yml` runs lint, type-check, tests and the production build on every push to `main` and on pull requests.
