# Taskflow

A project and task management web app built with React, TypeScript and Vite.

## Features

- **Dashboard**: task totals, completion rate, overdue count, per-project progress, and an upcoming/overdue list.
- **Projects**: create, edit, color-code and delete projects (deleting a project removes its tasks).
- **Kanban board**: each project has To do / In progress / Done columns with drag-and-drop.
- **All tasks**: a table with search (title, description, tags), filters by status, priority and project, and sorting. Filters live in the URL, so filtered views can be bookmarked or shared.
- **Tasks**: title, description, priority, due date, tags; overdue tasks are highlighted.
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
  store/               State: actions, reducer, selectors, persistence, seed data
  hooks/               Custom React hooks
  utils/               Date, id, tag and URL-param helpers
  test/setup.ts        Vitest / Testing Library setup
```

State is managed with `useReducer` + React context. Action creators generate ids and timestamps so the reducer stays pure and easy to test. Derived data (stats, filtering, sorting) lives in `store/selectors.ts`.

## Testing

Unit tests cover the reducer, selectors, persistence and utilities; component tests (React Testing Library) cover the task form and the main user flows: navigating, creating projects and tasks, filtering, completing tasks, deleting projects, and switching themes.

## CI

`.github/workflows/ci.yml` runs lint, type-check, tests and the production build on every push to `main` and on pull requests.
