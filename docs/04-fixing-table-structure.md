# Fixing Table Structure Panel Height Issue

## Overview

This document explains a complex CSS layout issue where the `TableStructurePanel` component wasn't using the available vertical space, leaving most of the panel empty even with data loaded. Through systematic debugging, we discovered the root cause and learned important lessons about React component composition, CSS layout chains, and SQLRooms architecture.

## The Problem

After uploading CSV files, the table schema tree would render correctly but occupy only ~90px of height, leaving hundreds of pixels of wasted whitespace below. The data was present (database, schema, tables, columns all expandable), but the component refused to grow vertically.

### Initial Symptoms

- ✅ Data loaded successfully (3 tables with thousands of rows)
- ✅ Tree structure worked (expandable/collapsible nodes)
- ❌ Component height was tiny (~90px) despite 500+ px available
- ❌ Most of the panel was empty whitespace

## The Debugging Journey

### Step 1: Isolate Layout vs. Component

First, we tested whether the **panel container** itself had correct height:

```tsx
export const TableStructure = () => {
    return (
        <RoomPanel type="data">
            <div className="h-full bg-blue-500">
                Does this fill the space?
            </div>
        </RoomPanel>
    );
};
```

**Result**: The blue div filled the entire vertical space perfectly.

**Conclusion**: The mosaic layout and panel container were working correctly. The issue was with `TableStructurePanel` itself.

### Step 2: Check for Missing Dependencies

We investigated whether `TableStructurePanel` was receiving data. By inspecting the source code of `TableStructurePanel`, we discovered it depends on:

```javascript
const schemaTrees = useStoreWithSqlEditor((s) => s.db.schemaTrees);
```

This state comes from the **DuckDB slice**, which wasn't installed or configured!

#### Adding the DuckDB Slice

**Why was this necessary?**
- `TableStructurePanel` reads `state.db.schemaTrees`
- This state is provided by `createDuckDbSlice`
- Without the slice, `schemaTrees` is undefined, so the tree has nothing to render

**Installation:**
```bash
pnpm add @sqlrooms/duckdb
```

**Configuration in `store.tsx`:**

```tsx
// 1. Import the DuckDB slice pieces
import {
    createDefaultDuckDbConfig,
    createDuckDbSlice,
    DuckDbSliceConfig,
    type DuckDbSliceState,
} from "@sqlrooms/duckdb";

// 2. Merge configs (Zod schemas)
export const RoomConfig =
    BaseRoomConfig
        .merge(SqlEditorSliceConfig)
        .merge(DuckDbSliceConfig);  // ← Add DuckDB config schema

// 3. Compose state types (TypeScript intersection)
export type AppRoomState =
    RoomShellSliceState<BaseRoomConfig> &
    SqlEditorSliceState &
    DuckDbSliceState;  // ← Add DuckDB state type

// 4. Spread default config
config: {
    title: "My Data App",
    // ... other config
    ...createDefaultSqlEditorConfig(),
    ...createDefaultDuckDbConfig(),  // ← Add DuckDB defaults
}

// 5. Register the slice
export const { roomStore, useRoomStore } = createRoomStore<
    RoomConfig,
    AppRoomState
>((set, get, store) => ({
    ...createRoomShellSlice<BaseRoomConfig>({...})(set, get, store),
    ...createSqlEditorSlice()(set, get, store),
    ...createDuckDbSlice({})(set, get, store),  // ← Add slice
}));
```

**Result**: Data now appeared in the tree! But the height issue persisted.

### Step 3: HTML Inspection - Finding the Culprit

By examining the rendered HTML, we found this structure inside `TableStructurePanel`:

```html
<div class="relative flex h-full flex-col gap-2 p-2 overflow-auto">  <!-- ScrollArea -->
    <div class="h-full w-full">  <!-- ScrollArea viewport -->
        <div style="min-width: 100%; display: table;">  <!-- ⚠️ THE PROBLEM -->
            <div class="flex h-full flex-col">  <!-- TableSchemaTree -->
                <!-- Tree content here -->
            </div>
        </div>
    </div>
</div>
```

**The culprit**: `display: table;`

This style is injected by Radix UI's `ScrollArea` component, which `TableStructurePanel` uses internally.

## Why `display: table` Breaks Layout

### Understanding CSS Height Propagation

For an element with `height: 100%` or Tailwind's `h-full` to work, there must be an **unbroken chain** of height definitions from the viewport down to that element.

#### The Working Chain (Before ScrollArea)

```
Viewport (100vh)
└── Mosaic Container (h-full, flex)
    └── Panel Tile (h-full, flex-1)
        └── RoomPanel (flex flex-col)
            └── Your div (h-full) ← Gets 100% of parent height ✅
```

Every parent has a defined height, so `h-full` can compute as 100% of a known value.

#### The Broken Chain (With ScrollArea)

```
Viewport (100vh)
└── Mosaic Container (h-full, flex)
    └── Panel Tile (h-full, flex-1)
        └── RoomPanel (h-full)
            └── ScrollArea (h-full)
                └── Internal wrapper (display: table) ← BREAKS HERE ⚠️
                    └── TableSchemaTree (h-full) ← Can't compute height ❌
```

**Why does `display: table` break it?**

1. **Block vs. Table layout models**: When you use `display: table`, the browser switches from the normal flow (block) or flex layout to the **CSS table layout algorithm**
2. **Table sizing behavior**: Tables calculate their size based on their **content**, not their container
3. **Height percentage failure**: When a child tries to use `height: 100%` inside `display: table`, it asks "100% of what?" — but the table doesn't have a defined height (it's content-sized), so it fails to resolve
4. **Result**: The element collapses to its minimum content size (~90px for the visible tree nodes)

### Why Does Flexbox Work?

Flexbox (`flex`, `flex-col`, `flex-1`) doesn't rely on percentage-based heights:

```tsx
<RoomPanel type="data" className="flex flex-col">  {/* Establish flex container */}
    <div className="flex-1 overflow-auto">  {/* flex-1 = grow to fill space */}
        <TableSchemaTree schemaTrees={schemaTrees} />
    </div>
</RoomPanel>
```

**How this works:**

1. **`flex flex-col`**: RoomPanel becomes a flex container with vertical direction
2. **`flex-1`**: Inner div gets `flex: 1 1 0%`, which means:
   - `flex-grow: 1` — Grow to fill available space
   - `flex-shrink: 1` — Shrink if needed
   - `flex-basis: 0%` — Start from 0, then grow
3. **Space distribution**: Flexbox **distributes available space** rather than using percentages
4. **`overflow-auto`**: Adds scrolling when content exceeds the flexed height

**No percentage calculations needed!** Flexbox directly assigns the available space.

## The Solution

### Option 1: Use TableSchemaTree Directly (Recommended)

Bypass the problematic `TableStructurePanel` wrapper and use the underlying `TableSchemaTree`:

```tsx
import { RoomPanel } from "@sqlrooms/room-shell";
import { TableSchemaTree } from "@sqlrooms/schema-tree";
import { useRoomStore } from "./store";

export const TableStructure = () => {
    const schemaTrees = useRoomStore((state) => state.db.schemaTrees);

    return (
        <RoomPanel type="data" className="flex flex-col">
            <div className="flex-1 overflow-auto p-2">
                {schemaTrees && <TableSchemaTree schemaTrees={schemaTrees} />}
            </div>
        </RoomPanel>
    );
};
```

**Why this works:**
- `flex flex-col` on RoomPanel establishes flex container
- `flex-1` makes the inner div expand to fill all available space
- `overflow-auto` enables scrolling when tree content exceeds panel height
- No `display: table` wrapper to break the chain

### Option 2: Fix ScrollArea (Advanced)

If you really need ScrollArea's features (custom scrollbars, scroll event hooks), you'd need to force height:

```tsx
<ScrollArea className="h-full" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
    {/* Content */}
</ScrollArea>
```

But this is more fragile and less idiomatic.

## Understanding SQLRooms Store Extension

### The Slice Pattern

SQLRooms uses **Zustand slices** — a composition pattern where each feature is a self-contained unit providing:
- **State fields**: Data stored in the store
- **Actions**: Methods to update that data
- **Configuration**: Persistent settings (saved between sessions)

### Adding a New Slice (Step-by-Step)

When you add functionality like DuckDB, follow this pattern:

#### 1. Install the Package

```bash
pnpm add @sqlrooms/package-name
```

#### 2. Import Slice Creators

```tsx
import {
    createSliceName,           // Slice creator function
    SliceConfig,               // Zod schema for config
    type SliceState,           // TypeScript state type
    createDefaultSliceConfig,  // Default config factory (optional)
} from "@sqlrooms/package-name";
```

#### 3. Merge Config Schemas

Configs are Zod schemas that define persistent settings:

```tsx
export const RoomConfig =
    BaseRoomConfig
        .merge(FirstSliceConfig)
        .merge(SecondSliceConfig);  // Chain .merge() calls
```

**Why Zod?**
- Runtime validation of configuration
- Type safety from schema to TypeScript types
- Easy serialization for persistence

#### 4. Compose State Types

States are TypeScript types defining runtime data:

```tsx
export type AppRoomState =
    RoomShellSliceState<BaseRoomConfig> &
    FirstSliceState &
    SecondSliceState;  // Intersection (&) combines types
```

**Type intersections** merge object types — the result has all properties from all slices.

#### 5. Spread Default Configs

Inside `createRoomShellSlice` config:

```tsx
config: {
    title: "My App",
    layout: { /* ... */ },
    ...createDefaultFirstSliceConfig(),
    ...createDefaultSecondSliceConfig(),
}
```

This provides sensible defaults for each slice's configuration.

#### 6. Register Slices in Store Creator

```tsx
export const { roomStore, useRoomStore } = createRoomStore<
    RoomConfig,
    AppRoomState
>((set, get, store) => ({
    ...createRoomShellSlice<BaseRoomConfig>({...})(set, get, store),
    ...createFirstSlice()(set, get, store),
    ...createSecondSlice({})(set, get, store),
}));
```

Each slice creator is a **higher-order function**:
- Takes options/config
- Returns a function that takes `(set, get, store)`
- Returns state object with fields and methods

The spread operator (`...`) merges all slice state objects into one store.

### Type Parameter Patterns

**Important distinction:**

```tsx
// Shell slice uses BaseRoomConfig (doesn't know about other slices)
...createRoomShellSlice<BaseRoomConfig>({...})(set, get, store)

// Top-level store uses merged types (knows about everything)
createRoomStore<RoomConfig, AppRoomState>(...)
```

**Why?**
- Each slice is **independent** — doesn't depend on others
- Only the top-level store knows about the **full composition**
- This enables mix-and-match slice combinations

### When to Add a Slice

Add a slice when you need:
- **Database functionality**: `@sqlrooms/duckdb` or `@sqlrooms/motherduck`
- **AI features**: `@sqlrooms/ai`
- **Visualization**: Components that need shared chart state
- **Custom features**: Your own domain-specific state

### Config vs. State

**Config (Persistent)**
- Saved between sessions (localStorage, database, etc.)
- User preferences: theme, layout, connection strings
- Uses Zod schemas for validation

**State (Runtime)**
- Temporary data: query results, UI state, loading flags
- Cleared on refresh
- Uses TypeScript types

## Key Takeaways

### CSS Layout Lessons

1. **Height propagation requires an unbroken chain**: Every parent must have defined height for `h-full` to work
2. **`display: table` breaks percentage heights**: Tables are content-sized, not container-sized
3. **Flexbox is more robust**: `flex-1` distributes space directly without percentages
4. **Use flex for dynamic layouts**: When content size varies, flexbox handles it better than fixed heights

### React Component Patterns

1. **Test systematically**: Start with simple colored divs to isolate layout vs. component issues
2. **Read the source**: When a component misbehaves, check its implementation (we found ScrollArea this way)
3. **Use primitives when wrappers fail**: `TableSchemaTree` works better than `TableStructurePanel` for our use case
4. **Understand dependencies**: `TableStructurePanel` required DuckDB slice state

### SQLRooms Architecture

1. **Slices are composable**: Mix and match features by spreading slice creators
2. **Two levels of types**: Individual slices use their own configs, top-level store uses merged types
3. **Config vs. State**: Persistent settings vs. runtime data
4. **State dependencies**: Components may require specific slices (TableStructurePanel needs DuckDB)
5. **Framework components may have wrappers**: Sometimes you need the underlying primitive (TableSchemaTree) instead of the convenience wrapper (TableStructurePanel)

### Debugging Strategy

1. **Isolate the problem**: Layout issue? Component issue? Data issue?
2. **Check dependencies**: Does the component have required state?
3. **Inspect the DOM**: Find the exact element breaking the layout chain
4. **Understand the rendering**: What intermediate components/wrappers are involved?
5. **Choose the right tool**: Sometimes bypassing layers solves the problem elegantly

## Further Reading

- **CSS Flexbox**: [MDN Flexbox Guide](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_Flexible_Box_Layout/Basic_Concepts_of_Flexbox)
- **CSS Tables**: [Why percentage heights fail in tables](https://stackoverflow.com/questions/15662578/height-100-not-working-inside-display-table-and-display-table-cell)
- **Zustand Slices**: [Zustand slice pattern documentation](https://docs.pmnd.rs/zustand/guides/typescript#slices-pattern)
- **SQLRooms Docs**: https://sqlrooms.org/llms-full.txt

## Practical Exercise

To solidify your understanding, try:

1. **Create a custom slice** with your own state and actions
2. **Experiment with layouts**: Try removing `flex-1` and see what happens
3. **Add another SQLRooms slice**: Install `@sqlrooms/ai` and integrate it
4. **Inspect other components**: Use browser dev tools to understand how other panels achieve full height
