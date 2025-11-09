# Collapsible Sidebar Implementation

## Overview

This document explains how to implement a collapsible sidebar in SQLRooms, including the research findings about what the framework provides and the patterns used to achieve this functionality.

## Research Findings

### Does RoomShell.Sidebar Have Built-in Collapse Functionality?

**No**, `RoomShell.Sidebar` does NOT have built-in collapse/expand functionality.

According to the TypeScript type definitions in `@sqlrooms/room-shell`, the sidebar component only accepts two props:
```typescript
export declare const RoomSidebar: FC<PropsWithChildren<{
    className?: string;
}>>;
```

- `className` (optional string) - for custom styling
- `children` (React children) - the content to render

There are no props for controlling visibility, collapsed state, or toggle behavior.

### How SQLRooms Supports Custom UI State

While there's no built-in sidebar collapse, SQLRooms provides the building blocks to implement this pattern:

#### 1. State Management with Zustand

SQLRooms uses **Zustand** for state management with a **slice-based composition pattern**. You can add custom state to your room store alongside the framework slices:

```typescript
export type RoomState = RoomShellSliceState<RoomConfig> &
    SqlEditorSliceState &
    DuckDbSliceState & {
        // Your custom state here
        currentWorkspace: WorkspaceId;
        setCurrentWorkspace: (workspace: WorkspaceId) => void;
    };
```

This pattern allows you to extend the store with any application-specific state you need.

#### 2. The useDisclosure Hook

SQLRooms provides a `useDisclosure` hook from `@sqlrooms/ui` for managing open/closed state:

```typescript
import { useDisclosure } from "@sqlrooms/ui";

const disclosure = useDisclosure(initialState);
// Returns: { isOpen, onOpen, onClose, onToggle }
```

This hook is perfect for UI elements that have two states (open/closed, visible/hidden, etc.).

**Example in your codebase**: The SQL Editor modal uses this pattern:
```typescript
const sqlEditorDisclosure = useDisclosure();
// ...
<SqlEditorModal
    isOpen={sqlEditorDisclosure.isOpen}
    onClose={sqlEditorDisclosure.onClose}
/>
```

#### 3. Conditional Rendering Pattern

React's conditional rendering works seamlessly with SQLRooms components:

```tsx
<RoomShell>
  {isOpen && <RoomShell.Sidebar />}
  <RoomShell.LayoutComposer />
</RoomShell>
```

This is the standard React pattern for showing/hiding components based on state.

## Implementation Options

There are two main approaches to implementing a collapsible sidebar:

### Option 1: Zustand Store State (Recommended for Persistence)

**Pros**:
- State persists across page refreshes (if using persist middleware)
- Centralized state management
- Can be accessed from anywhere in the app
- Consistent with SQLRooms architecture

**Cons**:
- Slightly more code to set up
- Adds to global state

**Use when**: You want the sidebar collapsed/expanded state to be remembered after page refresh.

### Option 2: Local Component State with useDisclosure

**Pros**:
- Simpler implementation
- Less code
- Keeps state local to component
- Hook already available from `@sqlrooms/ui`

**Cons**:
- State resets on page refresh
- Cannot be accessed from other components

**Use when**: You want the sidebar to always start in the same state (usually expanded) on page load.

## Our Implementation Plan

We chose **Option 1** (Zustand store state) because we want the user's preference to persist across sessions.

### Changes Required

#### 1. Extend the Store State (`src/store.tsx`)

Add sidebar state to the `RoomState` type:

```typescript
export type RoomState = RoomShellSliceState<RoomConfig> &
    SqlEditorSliceState &
    DuckDbSliceState & {
        currentWorkspace: WorkspaceId;
        setCurrentWorkspace: (workspace: WorkspaceId) => void;
        // Sidebar collapse state
        isSidebarCollapsed: boolean;
        toggleSidebar: () => void;
    };
```

Add the initial state and toggle method in the store creator:

```typescript
export const { roomStore, useRoomStore } = createRoomStore<
    RoomConfig,
    RoomState
>((set, get, store) => ({
    // ... existing slices ...

    // Sidebar state
    isSidebarCollapsed: false,
    toggleSidebar: () => {
        set((state) => ({
            isSidebarCollapsed: !state.isSidebarCollapsed
        }));
        console.log('Sidebar toggled');
    },
}));
```

**Why this works**: The store is a single source of truth. When we call `toggleSidebar()`, it updates the `isSidebarCollapsed` state, which triggers React re-renders in components using that state.

#### 2. Update App Component (`src/App.tsx`)

**Import the state**:
```typescript
const isSidebarCollapsed = useRoomStore((state) => state.isSidebarCollapsed);
const toggleSidebar = useRoomStore((state) => state.toggleSidebar);
```

**Conditional rendering**:
```tsx
{!isSidebarCollapsed && (
    <RoomShell.Sidebar className="w-48">
        {/* sidebar content */}
    </RoomShell.Sidebar>
)}
```

**Add toggle button**:
```tsx
<button
    onClick={toggleSidebar}
    className="fixed left-0 top-1/2 -translate-y-1/2 z-50 ..."
>
    {isSidebarCollapsed ? <ChevronRight /> : <ChevronLeft />}
</button>
```

**Key concepts**:
- **Zustand selector**: `useRoomStore((state) => state.isSidebarCollapsed)` subscribes to only that specific piece of state
- **Conditional rendering**: `{!isSidebarCollapsed && <Component />}` only renders when collapsed is false
- **Fixed positioning**: The toggle button uses `fixed` positioning so it's always visible, even when sidebar is hidden

#### 3. Horizontal Button Layout

For the Theme Switch and SQL Editor button, wrap them in a flex container:

```tsx
<div className="flex flex-row gap-2 w-full">
    <ThemeSwitch />
    <RoomShell.SidebarButton
        title="SQL Editor"
        onClick={sqlEditorDisclosure.onToggle}
        isSelected={false}
        icon={CodeIcon}
    />
</div>
```

**Why this works**:
- `flex flex-row` creates a horizontal flexbox layout
- `gap-2` adds spacing between items
- `w-full` ensures the container takes full width of the sidebar

## Key Architectural Patterns

### 1. State-Driven UI

SQLRooms follows a **state-driven architecture** where:
- UI state lives in the Zustand store
- Components read state via selectors
- Components update state via store methods
- React handles re-rendering when state changes

This is the same pattern used for:
- Workspace switching (`currentWorkspace` state)
- Layout management (`layout.setLayout()` method)
- Database connections (DuckDB slice state)

### 2. Composition Over Configuration

Rather than providing every possible UI variant, SQLRooms provides:
- **Building blocks** (components like `RoomShell`, `Sidebar`, `LayoutComposer`)
- **State management tools** (Zustand slices, `useDisclosure` hook)
- **Styling utilities** (Tailwind CSS, `cn()` utility)

You **compose** these to build the exact UI you need.

### 3. Conditional Rendering for UI Variants

SQLRooms components are designed to work with React's conditional rendering:
- Show/hide components based on state
- Render different content based on conditions
- Dynamic component trees

This gives you full control over the UI structure without framework limitations.

## Benefits of This Approach

1. **Persistence**: User preference is stored and remembered
2. **Flexibility**: Easy to modify behavior or add features (e.g., keyboard shortcuts)
3. **Consistency**: Follows the same patterns used throughout SQLRooms
4. **Type Safety**: TypeScript ensures correct state access
5. **Scalability**: Can easily add more UI state as needed

## What We Learned

1. **SQLRooms is unopinionated about UI state**: The framework provides the tools but doesn't prescribe how to use them
2. **Zustand slices are composable**: You can add your own state alongside framework slices
3. **The `useDisclosure` hook is versatile**: Good for any open/closed UI pattern
4. **Conditional rendering is powerful**: Simple React patterns work seamlessly with SQLRooms
5. **State-driven architecture is consistent**: The same pattern (state + methods + hooks) applies to all features

## Next Steps

After implementing the collapsible sidebar, you could extend this pattern to:
- Add keyboard shortcuts (e.g., Ctrl+B to toggle sidebar)
- Implement sidebar resize (drag to adjust width)
- Add sidebar panels that can be toggled individually
- Create multiple sidebars (left and right)
- Add animations/transitions for smoother UX

All of these would follow the same state-driven pattern: add state to the store, connect it to the UI, and use React patterns for rendering.
