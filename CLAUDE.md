# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a React application built with TypeScript and Vite, using the SQLRooms framework to create a room-based UI with panels and layouts. The application uses Zustand for state management and Tailwind CSS for styling.

**SQLRooms Documentation**: Full framework documentation is available at https://sqlrooms.org/llms-full.txt - reference this for detailed information about advanced features, database integration, AI capabilities, and architectural patterns.

## Development Commands

- `pnpm dev` - Start the development server with hot module replacement
- `pnpm build` - Type-check with TypeScript and build for production
- `pnpm lint` - Run ESLint on all TypeScript/TSX files
- `pnpm preview` - Preview the production build locally

## Architecture

### Core Dependencies

**SQLRooms Framework**: This project is built on top of the `@sqlrooms/*` package ecosystem:
- `@sqlrooms/room-store` - State management layer using Zustand
- `@sqlrooms/room-shell` - Main UI shell component with sidebar, layout composer, and loading progress
- `@sqlrooms/room-config` - Configuration types and schemas using Zod
- `@sqlrooms/ui` - UI components and Tailwind preset

### State Management

The application uses Zustand via SQLRooms' `createRoomStore` wrapper with a **slice-based composition pattern**:

- **Store location**: `src/store.tsx`
- **Room state** is typed as `RoomState<BaseRoomConfig>`
- The store is built by composing multiple slices: `Store = RoomShellSlice + DuckDbSlice + AiSlice + ...`
  - Each slice handles a specific domain (UI shell, database, AI, etc.)
  - Slices provide state fields, methods, and configuration
  - This enables flexible feature combinations without tight coupling

**Current slices**:
- `createRoomShellSlice` - Core UI configuration:
  - Room configuration (title, layout, data sources)
  - Panel definitions with their components, icons, titles, and placement
  - Layout system (mosaic type with directional splits)

**Key pattern**: Configuration (persistent settings) is separate from Runtime state (temporary query results, UI state). The persist middleware only stores essential configuration.

### Application Entry & Component Hierarchy

- **Main entry**: `src/main.tsx` - Standard React 19 entry with StrictMode
- **App component**: `src/App.tsx` - Renders the `RoomShell` with sidebar, layout composer, and loading progress

The `roomStore` must be imported and passed to `RoomShell` in App.tsx.

**UI Component Hierarchy**:
```
RoomShell (receives roomStore prop)
├── RoomShell.Sidebar - Navigation and panel selection
├── RoomShell.LayoutComposer - Renders mosaic layout tree
├── RoomShell.LoadingProgress - Query/operation status indicator
└── Custom Tiles - Individual panels rendered by layout system
```

Each tile/panel accesses store data via `useRoomStore()` hook and updates state through exposed store methods.

### Styling

- **Tailwind CSS** is configured with SQLRooms preset (`sqlroomsTailwindPreset()`)
- Content paths include both `src/**/*.{ts,tsx}` and `node_modules/@sqlrooms/**/dist/**/*.js` to ensure SQLRooms components are styled correctly
- Global styles in `src/index.css`

## Layout System

SQLRooms uses **Mosaic trees** - hierarchical structures where each node represents either:
- A **panel ID** (string) - leaf node rendering a single panel
- A **parent node** with `direction`, `first`, `second`, and `splitPercentage`

Example nested layout:
```typescript
{
  direction: 'row',
  first: 'sidebar',  // 30% width
  second: {
    direction: 'column',
    first: 'main',    // 60% of remaining height
    second: 'results' // 40% of remaining height
  },
  splitPercentage: 30
}
```

The `LayoutComposer` component in `RoomShell` renders this tree structure with resizable splits.

## Adding New Panels

To add a new panel to the room:

1. Define the panel in `src/store.tsx` within the `panels` object
2. Each panel requires:
   - `title`: Display name
   - `icon`: React component (can return null)
   - `component`: React component to render
   - `placement`: Either "sidebar" or "main"
3. Update the layout configuration's `nodes` to include the panel ID in the mosaic structure

**Available panel types** (when using additional SQLRooms packages):
- Data visualization panels (Mosaic charts, Recharts)
- Editor panels (Monaco SQL editor)
- Table displays (paginated, virtualized)
- Discussion panels (threaded conversations)
- Graph visualization (Cosmos WebGL-based)

## Database Integration (Optional)

If you add `@sqlrooms/duckdb` for DuckDB-WASM integration:

**Core pattern** - Use the `useSql` hook for type-safe queries:
```typescript
const {data, isLoading, error} = useSql({
  query: 'SELECT * FROM users'
});
```

**Features**:
- Query deduplication to prevent redundant execution
- Query cancellation via `QueryHandle` interface
- File operations (CSV, JSON, Parquet import/export)
- Apache Arrow integration for efficient columnar data
- Optional Zod validation for schema transformations

**Connectors**: Multiple deployment options available
- WASM connector (in-browser)
- WebSocket connector (server-side)
- MotherDuck connector (managed cloud)

## AI Integration (Optional)

If you add `@sqlrooms/ai` or similar AI slice:

**Architecture**: Session-based with complete message history
- Each session maintains `uiMessages` array with full conversation
- Tools return `llmResult` (for AI context) + `additionalData` (for UI visualization)
- Support for custom React components in tool result rendering

**Configuration**: Multiple LLM providers via `createAiSettingsSlice`
- OpenAI, Anthropic, or custom providers
- Per-session model selection
- Configurable base URLs and API keys

## Adding New Features

To add custom functionality using the slice pattern:

1. Define a Zod schema for your feature's configuration
2. Create a Zustand slice with state + methods
3. Export a configuration creation utility
4. Provide React hooks for component access (e.g., `useStoreWith[Feature]`)
5. Integrate with main store in `src/store.tsx` by spreading your slice into the store creator

Example structure:
```typescript
export const { roomStore, useRoomStore } = createRoomStore<PC, RS>(
  (set, get, store) => ({
    ...createRoomShellSlice(...)(set, get, store),
    ...createYourCustomSlice(...)(set, get, store),
  })
);
```

## Type Safety

- TypeScript strict mode enabled
- ESLint configured with React hooks rules and react-refresh for Fast Refresh compatibility
- The project uses TypeScript 5.9+ with separate configs for app code (`tsconfig.app.json`) and build tools (`tsconfig.node.json`)
