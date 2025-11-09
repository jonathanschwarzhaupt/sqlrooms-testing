# Multi-Workspace Architecture in SQLRooms

## Introduction

This document teaches you the fundamental concepts behind SQLRooms' layout system and how to leverage them to create multi-workspace applications. By understanding these concepts deeply, you'll be able to build sophisticated, dynamic UIs that adapt to different user workflows.

## Foundational Concepts

### What is a Panel?

A **panel** is a self-contained React component that represents a distinct piece of functionality in your application.

**Panel Definition Structure:**
```typescript
{
  title: string;           // Display name
  icon: ComponentType;     // Icon component
  component: ComponentType; // The React component to render
  placement: "sidebar" | "main"; // Where it can appear
}
```

**Examples from your app:**
- `DataView` - Shows file upload and table structure
- `MainView` - Contains SQL editor and query results
- Future: `ChartsView`, `DataConnectorsView`, etc.

**Key Insight:** Panels are **registered** in the store but **rendered** based on the layout configuration. A panel can exist in the store but not be visible if it's not in the current layout tree.

### What is a Layout?

A **layout** is a configuration object that describes how panels should be arranged on screen. It's a pure data structure (JSON-serializable) that SQLRooms uses to build the UI.

**Layout Structure:**
```typescript
{
  type: "mosaic";  // Layout algorithm to use
  nodes: MosaicNode<string>;  // Tree structure of panel arrangement
}
```

**Critical Understanding:**
- Layouts are **data**, not components
- They reference panels by ID (string keys)
- They can be stored, switched, and manipulated at runtime
- SQLRooms translates layout data → rendered UI

### The Mosaic Tree - The Heart of SQLRooms Layouts

The **mosaic tree** is a hierarchical data structure that describes how panels are split and arranged.

#### Tree Node Types

**1. Leaf Node (Panel Reference)**
```typescript
type LeafNode = string;  // Just a panel ID

// Example
"main-view"  // This node renders the MainView panel
```

**2. Parent Node (Split)**
```typescript
type ParentNode = {
  direction: "row" | "column";  // How to split
  first: MosaicNode;            // Left or top child
  second: MosaicNode;           // Right or bottom child
  splitPercentage: number;      // % allocated to first child (0-100)
}

// Example
{
  direction: "row",
  first: "data-view",    // Takes 30% of width
  second: "main-view",   // Takes 70% of width
  splitPercentage: 30
}
```

#### How the Tree Becomes a UI

SQLRooms recursively traverses the tree:

```
Start: {direction: "row", first: "sidebar", second: {...}, splitPercentage: 30}
  │
  ├─ Is first a string? YES → Render "sidebar" panel in 30% width
  │
  └─ Is second a string? NO → Recurse into second node
       {direction: "column", first: "editor", second: "results", splitPercentage: 60}
         │
         ├─ Is first a string? YES → Render "editor" panel in 60% height
         │
         └─ Is second a string? YES → Render "results" panel in 40% height
```

**Result:**
```
┌──────────┬────────────────────────────┐
│          │    Editor (60% height)     │
│ Sidebar  ├────────────────────────────┤
│ (30%)    │   Results (40% height)     │
│          │                            │
└──────────┴────────────────────────────┘
   30%              70% width
```

#### Example: Your Current Layout

```typescript
{
  type: "mosaic",
  nodes: {
    direction: "row",
    first: {
      direction: "column",
      first: "upload-file",
      second: "table-structure",
      splitPercentage: 30,
    },
    second: "main-view",
    splitPercentage: 30,
  }
}
```

**Visual representation:**
```
┌─────────────┬──────────────────────────────────────┐
│   Upload    │                                      │
│   (30% h)   │                                      │
├─────────────┤         Main View                    │
│   Table     │      (SQL Editor + Results)          │
│  Structure  │                                      │
│   (70% h)   │                                      │
└─────────────┴──────────────────────────────────────┘
    30% width              70% width
```

**Why this matters:** Understanding that layouts are trees helps you visualize how changes propagate. Adding a node, removing a node, or changing split percentages affects the entire structure.

## The State-Driven Architecture

### How SQLRooms Manages Layouts

SQLRooms uses a **state-driven** approach to layout management:

```
Layout State (Store) → React Components → Rendered UI
     ↓                      ↓                  ↓
  JSON data          RoomShell reads        Browser DOM
  Serializable       state and renders      Visual output
```

**Key Methods in the Store:**

```typescript
layout: {
  // Current layout configuration
  currentLayout: LayoutConfig;

  // All registered panels
  panels: Record<string, PanelInfo>;

  // Methods
  setLayout(newLayout: LayoutConfig): void;  // Replace entire layout
  togglePanel(panelId: string, show?: boolean): void;  // Show/hide panel
  removeMosaicNodeByKey(path: MosaicPath): void;  // Remove node from tree
}
```

### The Power of `setLayout()`

The `setLayout()` method is the key to dynamic layout switching:

```typescript
// Before
currentLayout = {
  type: "mosaic",
  nodes: "editor-only"  // Simple single-panel layout
}

// Call setLayout
store.layout.setLayout({
  type: "mosaic",
  nodes: {
    direction: "column",
    first: "editor",
    second: "preview",
    splitPercentage: 50
  }
})

// After
// UI instantly updates to show split layout with editor and preview
```

**What happens internally:**

1. **State Update**: The store's `currentLayout` is replaced with the new layout
2. **React Re-render**: Components subscribed to layout state re-render
3. **Tree Traversal**: RoomShell traverses the new mosaic tree
4. **Component Mounting**: New panels are mounted, old ones unmounted
5. **Layout Calculation**: Split percentages are applied, panels resize

**Why this is powerful:**
- No manual DOM manipulation
- No complex imperative logic
- Just data → UI transformation
- Framework handles all complexity

### Static vs. Dynamic Layouts

**Static Layout (What You Have Now):**
```typescript
createRoomStore((set, get, store) => ({
  ...createRoomShellSlice({
    config: {
      layout: { /* Fixed at initialization */ }
    }
  })
}))
```

- Layout defined once at store creation
- Can only be changed by calling `setLayout()` later
- User can resize splits, but structure is fixed

**Dynamic Layout (What You Want):**
```typescript
// Multiple layouts stored as data
const LAYOUTS = {
  workspace1: { /* layout config */ },
  workspace2: { /* layout config */ },
  workspace3: { /* layout config */ }
}

// Method to switch
setCurrentWorkspace: (id) => {
  get().layout.setLayout(LAYOUTS[id]);
}
```

- Multiple layouts defined as pure data
- Easy to switch at runtime
- Clean separation between layout definitions and switching logic

## The Multi-Workspace Pattern

### Conceptual Model

A **workspace** is a named layout configuration that represents a complete user workflow.

**Mental Model:**
```
Application
├── Workspace: Data Management
│   └── Layout: [File Upload | Connection Config]
│
├── Workspace: SQL Queries
│   └── Layout: [Table Explorer | [Editor / Results]]
│
└── Workspace: Visualizations
    └── Layout: [Chart Selector | Chart Canvas]
```

Each workspace:
- Has a unique identifier (`data`, `query`, `charts`)
- Defines a complete mosaic layout
- May reference different panels
- Represents a distinct user activity

### Architecture Components

**1. Workspace Definitions (Pure Data)**
```typescript
const WORKSPACES: Record<string, LayoutConfig> = {
  data: {
    type: "mosaic",
    nodes: { /* Data management layout */ }
  },
  query: {
    type: "mosaic",
    nodes: { /* SQL editor layout */ }
  },
  charts: {
    type: "mosaic",
    nodes: { /* Visualization layout */ }
  }
}
```

**2. Workspace State (Runtime)**
```typescript
{
  currentWorkspace: 'data' | 'query' | 'charts';
  // Which workspace is active
}
```

**3. Workspace Switching Logic**
```typescript
setCurrentWorkspace: (workspace) => {
  // Update state
  set({ currentWorkspace: workspace });

  // Update layout
  get().layout.setLayout(WORKSPACES[workspace]);
}
```

**4. UI Controls (Buttons/Icons)**
```tsx
<button onClick={() => setCurrentWorkspace('data')}>
  <DatabaseIcon />
</button>
<button onClick={() => setCurrentWorkspace('query')}>
  <CodeIcon />
</button>
<button onClick={() => setCurrentWorkspace('charts')}>
  <ChartIcon />
</button>
```

### Data Flow in Multi-Workspace Architecture

```
User Click → setCurrentWorkspace() → State Update → setLayout() → UI Re-render
     ↓              ↓                      ↓            ↓             ↓
   Icon          Method call          currentWorkspace  New mosaic  Panels
  Clicked        with workspace ID     = 'charts'       tree loaded mounted
```

**Step-by-step execution:**

1. **User clicks "Charts" icon**
   ```typescript
   onClick={() => setCurrentWorkspace('charts')}
   ```

2. **Store method executes**
   ```typescript
   setCurrentWorkspace('charts') {
     set({ currentWorkspace: 'charts' });  // State update
     get().layout.setLayout(WORKSPACES.charts);  // Layout update
   }
   ```

3. **React re-renders components**
   - Components using `useRoomStore(s => s.currentWorkspace)` update
   - RoomShell detects layout change, re-renders

4. **RoomShell processes new layout**
   - Unmounts panels from old layout
   - Traverses new mosaic tree
   - Mounts panels from new layout

5. **UI displays new workspace**
   - Chart selector panel appears on left
   - Chart canvas panel appears on right
   - SQL editor panels are unmounted

## Practical Implementation

### Example: Building Your 3-Workspace System

Let's walk through creating a complete multi-workspace application.

#### Step 1: Define Your Workspace Layouts

**Data Management Workspace:**
```typescript
const dataWorkspace: LayoutConfig = {
  type: "mosaic",
  nodes: {
    direction: "row",
    first: "file-upload",      // Left: Upload and file list
    second: "data-connectors",  // Right: Connection configuration
    splitPercentage: 40
  }
};
```

**SQL Query Workspace (Your Current Layout):**
```typescript
const queryWorkspace: LayoutConfig = {
  type: "mosaic",
  nodes: {
    direction: "row",
    first: {
      direction: "column",
      first: "upload-file",
      second: "table-structure",
      splitPercentage: 30
    },
    second: "main-view",  // Editor + Results
    splitPercentage: 30
  }
};
```

**Charts Workspace:**
```typescript
const chartsWorkspace: LayoutConfig = {
  type: "mosaic",
  nodes: {
    direction: "row",
    first: "chart-selector",  // Left: Choose chart type
    second: {
      direction: "column",
      first: "chart-canvas",   // Top: Visualization
      second: "chart-config",  // Bottom: Settings
      splitPercentage: 70
    },
    splitPercentage: 25
  }
};
```

#### Step 2: Centralize Workspace Definitions

```typescript
// In store.tsx
const WORKSPACES = {
  data: dataWorkspace,
  query: queryWorkspace,
  charts: chartsWorkspace
} as const;

type WorkspaceId = keyof typeof WORKSPACES;
```

**Why this pattern?**
- Single source of truth
- Type-safe workspace IDs
- Easy to add more workspaces
- Testable (pure data)

#### Step 3: Extend Store State

```typescript
export type RoomState = RoomShellSliceState<RoomConfig> &
    SqlEditorSliceState &
    DuckDbSliceState & {
        // Workspace state
        currentWorkspace: WorkspaceId;
        setCurrentWorkspace: (workspace: WorkspaceId) => void;
    };
```

#### Step 4: Implement Workspace Switching in Store

```typescript
export const { roomStore, useRoomStore } = createRoomStore<RoomConfig, RoomState>(
    (set, get, store) => ({
        // Existing slices
        ...createRoomShellSlice<RoomConfig>({
            config: {
                title: "My Data App",
                layout: WORKSPACES.query,  // Default workspace
                // ... rest of config
            },
            room: {
                panels: {
                    // ALL panels for ALL workspaces
                    "upload-file": { /* ... */ },
                    "table-structure": { /* ... */ },
                    "main-view": { /* ... */ },
                    "data-connectors": { /* ... */ },
                    "chart-selector": { /* ... */ },
                    "chart-canvas": { /* ... */ },
                    "chart-config": { /* ... */ }
                }
            }
        })(set, get, store),

        ...createSqlEditorSlice()(set, get, store),
        ...createDuckDbSlice()(set, get, store),

        // Workspace management
        currentWorkspace: 'query' as WorkspaceId,

        setCurrentWorkspace: (workspace: WorkspaceId) => {
            // Update workspace state
            set({ currentWorkspace: workspace });

            // Switch to new layout
            const newLayout = WORKSPACES[workspace];
            get().layout.setLayout(newLayout);

            // Optional: Log for debugging
            console.log(`Switched to workspace: ${workspace}`);
        }
    })
);
```

**What's happening here:**

1. **All panels registered upfront** - Even if not used in current workspace
2. **Default workspace set** - `layout: WORKSPACES.query`
3. **State initialization** - `currentWorkspace: 'query'`
4. **Switching logic** - Updates both state and layout

#### Step 5: Create Workspace Switcher UI

```typescript
// WorkspaceSwitcher.tsx
import { useRoomStore } from "./store";
import { DatabaseIcon, CodeIcon, ChartBarIcon } from "lucide-react";

export const WorkspaceSwitcher: FC = () => {
    const currentWorkspace = useRoomStore(s => s.currentWorkspace);
    const setCurrentWorkspace = useRoomStore(s => s.setCurrentWorkspace);

    const workspaces = [
        { id: 'data' as const, icon: DatabaseIcon, label: 'Data' },
        { id: 'query' as const, icon: CodeIcon, label: 'Query' },
        { id: 'charts' as const, icon: ChartBarIcon, label: 'Charts' }
    ];

    return (
        <div className="flex flex-col gap-2 p-2">
            {workspaces.map(ws => (
                <button
                    key={ws.id}
                    onClick={() => setCurrentWorkspace(ws.id)}
                    className={`
                        flex items-center gap-2 px-3 py-2 rounded
                        ${currentWorkspace === ws.id
                            ? 'bg-primary text-primary-foreground'
                            : 'hover:bg-secondary'}
                    `}
                >
                    <ws.icon className="h-5 w-5" />
                    <span>{ws.label}</span>
                </button>
            ))}
        </div>
    );
};
```

#### Step 6: Wire Up in App.tsx

```typescript
import { WorkspaceSwitcher } from "./WorkspaceSwitcher";

export const App = () => {
    return (
        <ThemeProvider defaultTheme="light" storageKey="ui-theme">
            <RoomShell className="h-screen" roomStore={roomStore}>
                <RoomShell.Sidebar>
                    <WorkspaceSwitcher />
                    <div className="mt-auto">
                        <ThemeSwitch />
                    </div>
                </RoomShell.Sidebar>
                <RoomShell.LayoutComposer />
                <RoomShell.LoadingProgress />
            </RoomShell>
        </ThemeProvider>
    );
};
```

## Advanced Concepts

### Panel Lifecycle in Workspace Switching

When you switch workspaces, panels go through a lifecycle:

```
OLD WORKSPACE                    NEW WORKSPACE
┌─────────────┐                 ┌─────────────┐
│  Panel A    │ ──unmount──→    │             │
│  Panel B    │                 │  Panel C    │ ←──mount
└─────────────┘                 │  Panel D    │ ←──mount
                                └─────────────┘
```

**Component Lifecycle:**
1. **Unmounting**: Components in old layout run cleanup (`useEffect` cleanup functions)
2. **State Preservation**: Panel state is lost unless persisted in the store
3. **Mounting**: New components initialize fresh

**Important Implications:**

- **Local component state is lost** when switching away from a workspace
- **Store state persists** across workspace switches
- **Side effects** (subscriptions, timers) should clean up properly

**Example - Data Loss Problem:**
```typescript
function ChartCanvas() {
    // ❌ BAD: This state is lost when switching to another workspace
    const [chartData, setChartData] = useState(null);

    // ✅ GOOD: This persists in the store
    const chartData = useRoomStore(s => s.charts.currentData);
}
```

### Workspace State Persistence

You may want to remember which workspace the user was in:

```typescript
// Add to store
setCurrentWorkspace: (workspace: WorkspaceId) => {
    set({ currentWorkspace: workspace });
    get().layout.setLayout(WORKSPACES[workspace]);

    // Persist to localStorage
    localStorage.setItem('lastWorkspace', workspace);
}

// On initialization, check localStorage
const lastWorkspace = localStorage.getItem('lastWorkspace') as WorkspaceId || 'query';
currentWorkspace: lastWorkspace,
```

**Use Case**: User closes app in Charts workspace, reopens → should start in Charts workspace.

### Dynamic Panel Registration

You can add panels dynamically without restarting:

```typescript
addPanel: (id: string, config: PanelConfig) => {
    set(state => ({
        layout: {
            ...state.layout,
            panels: {
                ...state.layout.panels,
                [id]: config
            }
        }
    }));
}
```

**Use Case**: Plugin system where users can add new panels at runtime.

### Nested Workspaces

You can have workspaces within workspaces:

```typescript
const CHART_TYPES = {
    bar: { /* Bar chart layout */ },
    line: { /* Line chart layout */ },
    pie: { /* Pie chart layout */ }
};

// When in charts workspace, user can switch chart type
setChartType: (type) => {
    const baseLayout = WORKSPACES.charts;
    const chartLayout = CHART_TYPES[type];

    // Merge layouts or replace specific nodes
    get().layout.setLayout(mergeLayouts(baseLayout, chartLayout));
}
```

## Best Practices

### 1. Panel Organization

**DO:**
```typescript
// Group related panels
panels: {
    // Data workspace panels
    "data-upload": { /* ... */ },
    "data-connectors": { /* ... */ },

    // Query workspace panels
    "query-editor": { /* ... */ },
    "query-results": { /* ... */ },

    // Shared panels
    "table-structure": { /* ... */ }
}
```

**DON'T:**
```typescript
// Haphazard naming
panels: {
    "panel1": { /* ... */ },
    "stuff": { /* ... */ },
    "main": { /* ... */ }
}
```

### 2. Workspace Naming

**DO:**
```typescript
type WorkspaceId = 'data' | 'query' | 'charts';
const WORKSPACES: Record<WorkspaceId, LayoutConfig> = { /* ... */ };
```

**DON'T:**
```typescript
// Magic strings everywhere
get().layout.setLayout(layouts['workspace-3']);
```

### 3. Panel Reusability

Some panels can be shared across workspaces:

```typescript
const WORKSPACES = {
    data: {
        nodes: {
            direction: "row",
            first: "table-structure",  // Shared panel
            second: "data-upload"
        }
    },
    query: {
        nodes: {
            direction: "row",
            first: "table-structure",  // Same panel, different context
            second: "query-editor"
        }
    }
};
```

**When to share panels:**
- Panel shows the same information in different contexts
- Panel is purely presentational (stateless)
- Panel state is in the store (not local component state)

**When NOT to share:**
- Panels have different behavior in different workspaces
- Panels have complex local state
- Panels need different configurations

### 4. Layout Complexity

**Keep layouts simple:**
```typescript
// ✅ GOOD: 2-3 levels deep
{
    direction: "row",
    first: "sidebar",
    second: {
        direction: "column",
        first: "main",
        second: "footer"
    }
}

// ❌ BAD: Too deeply nested
{
    direction: "row",
    first: {
        direction: "column",
        first: {
            direction: "row",
            first: { /* ... */ }
            // 5+ levels deep gets confusing
        }
    }
}
```

**Why?**
- Easier to reason about
- Better performance
- Simpler to modify
- Users can understand the structure

### 5. Error Handling

Handle invalid workspace IDs:

```typescript
setCurrentWorkspace: (workspace: WorkspaceId) => {
    // Validate
    if (!(workspace in WORKSPACES)) {
        console.error(`Invalid workspace: ${workspace}`);
        return;
    }

    try {
        set({ currentWorkspace: workspace });
        get().layout.setLayout(WORKSPACES[workspace]);
    } catch (error) {
        console.error('Failed to switch workspace:', error);
        // Optionally: Revert to default workspace
    }
}
```

### 6. Testing Workspaces

Workspaces are pure data, so they're easy to test:

```typescript
describe('WORKSPACES', () => {
    it('should have valid mosaic structure', () => {
        Object.values(WORKSPACES).forEach(workspace => {
            expect(workspace.type).toBe('mosaic');
            expect(workspace.nodes).toBeDefined();
        });
    });

    it('should reference valid panel IDs', () => {
        const validPanels = new Set(Object.keys(panelDefinitions));

        Object.values(WORKSPACES).forEach(workspace => {
            const panelIds = extractPanelIds(workspace.nodes);
            panelIds.forEach(id => {
                expect(validPanels.has(id)).toBe(true);
            });
        });
    });
});
```

## Common Patterns

### Pattern 1: Workspace with Persistent Sidebar

Keep a sidebar visible across all workspaces:

```typescript
const createWorkspaceLayout = (mainArea: MosaicNode): LayoutConfig => ({
    type: "mosaic",
    nodes: {
        direction: "row",
        first: "persistent-sidebar",  // Always visible
        second: mainArea,             // Changes per workspace
        splitPercentage: 20
    }
});

const WORKSPACES = {
    data: createWorkspaceLayout("data-view"),
    query: createWorkspaceLayout({
        direction: "column",
        first: "editor",
        second: "results"
    }),
    charts: createWorkspaceLayout("chart-canvas")
};
```

### Pattern 2: Modal Overlays

Some panels can overlay the workspace without changing layout:

```typescript
// In your workspace panel component
const [showSettings, setShowSettings] = useState(false);

return (
    <>
        <div>Main workspace content</div>
        {showSettings && (
            <Dialog>
                <SettingsPanel />
            </Dialog>
        )}
    </>
);
```

**When to use overlays vs. workspace panels:**
- **Overlay**: Temporary, contextual UI (settings, help, previews)
- **Workspace panel**: Permanent, workflow-essential UI (editors, viewers)

### Pattern 3: Contextual Workspaces

Workspaces that change based on data:

```typescript
setCurrentWorkspace: (workspace: WorkspaceId, context?: any) => {
    set({ currentWorkspace: workspace, workspaceContext: context });

    // Use context to customize layout
    const layout = context
        ? customizeLayout(WORKSPACES[workspace], context)
        : WORKSPACES[workspace];

    get().layout.setLayout(layout);
}

// Usage
setCurrentWorkspace('charts', { chartType: 'bar', dataSource: 'table1' });
```

## Troubleshooting

### Problem: Panel Not Appearing in Workspace

**Symptom**: Layout switches but panel is missing

**Checklist:**
1. ✅ Is panel registered in `panels` object?
2. ✅ Is panel ID spelled correctly in layout tree?
3. ✅ Is panel component exported properly?
4. ✅ Check browser console for errors

**Debug technique:**
```typescript
// Log all panel IDs in current layout
const extractPanelIds = (node: MosaicNode): string[] => {
    if (typeof node === 'string') return [node];
    return [...extractPanelIds(node.first), ...extractPanelIds(node.second)];
};

console.log('Panels in layout:', extractPanelIds(currentLayout.nodes));
console.log('Registered panels:', Object.keys(store.layout.panels));
```

### Problem: State Lost When Switching Workspaces

**Symptom**: User enters data, switches workspace, data is gone

**Solution**: Move state from component to store

```typescript
// ❌ BAD: Local state
function ChartPanel() {
    const [selectedChart, setSelectedChart] = useState('bar');
    // Lost when unmounting
}

// ✅ GOOD: Store state
// In store
chartWorkspace: {
    selectedChart: 'bar' as ChartType,
    setSelectedChart: (chart: ChartType) => {
        set(state => ({
            chartWorkspace: { ...state.chartWorkspace, selectedChart: chart }
        }));
    }
}

// In component
function ChartPanel() {
    const selectedChart = useRoomStore(s => s.chartWorkspace.selectedChart);
    const setSelectedChart = useRoomStore(s => s.chartWorkspace.setSelectedChart);
    // Persists across workspace switches
}
```

### Problem: Workspace Buttons Not Updating

**Symptom**: Click workspace button, layout doesn't change

**Debug:**
```typescript
setCurrentWorkspace: (workspace: WorkspaceId) => {
    console.log('Setting workspace to:', workspace);
    console.log('Current workspace before:', get().currentWorkspace);

    set({ currentWorkspace: workspace });

    console.log('Current workspace after:', get().currentWorkspace);
    console.log('New layout:', WORKSPACES[workspace]);

    get().layout.setLayout(WORKSPACES[workspace]);

    console.log('Layout set complete');
}
```

**Common issues:**
- Method not bound correctly
- `setLayout` not being called
- Layout tree has invalid structure
- Panel IDs don't match registered panels

## Conceptual Summary

Let's tie everything together with a mental model:

### The SQLRooms Layout System as a Framework

Think of SQLRooms like a **declarative UI framework**:

```
You Provide:          SQLRooms Provides:
┌─────────────┐      ┌──────────────────┐
│ Panel       │──┬──→│ Panel Registry   │
│ Definitions │  │   │ Panel Mounting   │
└─────────────┘  │   │ Panel Lifecycle  │
                 │   └──────────────────┘
┌─────────────┐  │   ┌──────────────────┐
│ Layout      │──┼──→│ Mosaic Algorithm │
│ Config      │  │   │ Split Rendering  │
└─────────────┘  │   │ Resize Handling  │
                 │   └──────────────────┘
┌─────────────┐  │   ┌──────────────────┐
│ Workspace   │──┴──→│ State Management │
│ Switching   │      │ Layout Updates   │
│ Logic       │      │ Re-render Logic  │
└─────────────┘      └──────────────────┘
```

**Your responsibilities:**
- Define panels (components + metadata)
- Design layouts (mosaic tree structures)
- Implement switching logic (when to change layouts)

**SQLRooms handles:**
- Rendering the layout
- Managing panel lifecycle
- Handling resizing and dragging
- Optimizing re-renders
- Persisting layout state

### Multi-Workspace as a Design Pattern

The multi-workspace pattern is:
- **State-driven**: Current workspace determines current layout
- **Data-oriented**: Layouts are pure data structures
- **Declarative**: You describe what should be shown, not how to show it
- **Composable**: Panels can be mixed and matched across workspaces

**Core insight:** By separating **layout definition** (data) from **layout rendering** (framework), you get:
- Easy testing (pure data)
- Easy serialization (save/load layouts)
- Easy switching (just change data)
- Clean architecture (separation of concerns)

## Next Steps

Now that you understand the concepts, you can:

1. **Plan your workspaces** - What distinct workflows do you have?
2. **Design layout trees** - Sketch how panels should be arranged
3. **Identify shared panels** - Which panels appear in multiple workspaces?
4. **Implement incrementally** - Start with 2 workspaces, add more later
5. **Test thoroughly** - Verify state persistence, panel lifecycle, edge cases

Remember: The power of SQLRooms comes from its **declarative** approach. You focus on **what** the UI should look like, and the framework handles **how** to make it happen.

## Further Reading

- SQLRooms Documentation: https://sqlrooms.org/llms-full.txt
- Mosaic Layout Library: https://github.com/nomcopter/react-mosaic-component
- State Management Patterns: Review your `store.tsx` to see how slices compose
- React Component Lifecycle: Understanding mounting/unmounting for panel lifecycle

---

With this deep understanding of SQLRooms' layout architecture and the multi-workspace pattern, you're now equipped to build sophisticated, dynamic applications that adapt to different user workflows. The key is treating layouts as data, leveraging the framework's state-driven approach, and keeping your workspace definitions clean and composable.
