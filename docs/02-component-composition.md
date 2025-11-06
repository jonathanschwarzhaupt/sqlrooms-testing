# SQLRooms Component Composition Guide

This guide covers available SQLRooms components and best practices for composing them to build custom panels.

## Available SQLRooms Components

### 1. @sqlrooms/ui - Core UI Components

These are pre-styled components based on Radix UI and Tailwind:

#### Layout & Structure
- `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, `CardFooter`
- `Tabs`, `TabsList`, `TabsTrigger`, `TabsContent`
- `Accordion`, `AccordionItem`, `AccordionTrigger`, `AccordionContent`
- `Separator`, `ScrollArea`, `Resizable`

#### Forms & Inputs
- `Button`, `Input`, `Textarea`, `Label`
- `Select`, `SelectTrigger`, `SelectValue`, `SelectContent`, `SelectItem`
- `Checkbox`, `Switch`, `RadioGroup`, `Slider`
- `Combobox`, `Command` (for search/command palettes)

#### Feedback
- `Alert`, `AlertTitle`, `AlertDescription`
- `Dialog`, `Sheet`, `Drawer` (modals/panels)
- `Toast`, `Toaster`, `useToast` hook
- `Progress`, `Spinner`, `Skeleton`
- `ErrorPane`, `ErrorBoundary`

#### Data Display
- `Table`, `TableHeader`, `TableRow`, `TableHead`, `TableBody`, `TableCell`
- `Badge`, `Tooltip`
- `Tree` (for hierarchical data)

#### Special
- `ThemeProvider`, `ThemeSwitch` (dark/light mode)
- `EditableText` (inline editing)
- `CopyButton` (copy to clipboard)

### 2. @sqlrooms/sql-editor - SQL-Specific Components

- `QueryEditorPanel` - Full-featured SQL editor with tabs
- `SqlMonacoEditor` - Just the Monaco editor part
- `TableStructurePanel` - Schema browser
- `QueryResultPanel` - Display query results
- `SqlQueryDataSourcesPanel` - Data source management
- `SqlEditorHeader` - Header with run/cancel buttons
- `CreateTableModal` - Modal for creating tables

### 3. @sqlrooms/dropzone - File Upload

- `FileDropzone` - Drag-and-drop file upload

### 4. @sqlrooms/room-shell - Shell Components

- `RoomPanel` - Wrapper for panels
- `RoomShell`, `RoomShell.Sidebar`, `RoomShell.LayoutComposer`, `RoomShell.LoadingProgress`

---

## Best Practices for Component Composition

### 1. The Store Hook Pattern ⭐

**Always use selective subscriptions** to prevent unnecessary re-renders:

```tsx
// ❌ BAD - Re-renders on ANY store change
const store = useRoomStore();

// ✅ GOOD - Only re-renders when specific state changes
const connector = useRoomStore((state) => state.db.connector);
const tables = useRoomStore((state) => state.db.tables);
```

### 2. Component Composition Strategy

Think in layers:

```
Panel Wrapper (RoomPanel)
  ├── Business Logic (hooks, state)
  ├── Layout Components (Card, Tabs, etc.)
  │   ├── Feature Components (FileDropzone, TableStructurePanel)
  │   └── UI Components (Button, Input, etc.)
  └── Feedback (Toast, ErrorPane)
```

**Example - Building a custom "Query History" panel:**

```tsx
import { RoomPanel } from "@sqlrooms/room-shell";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  ScrollArea,
  Button,
  Badge
} from "@sqlrooms/ui";
import { useRoomStore } from "./store";

export const QueryHistoryPanel = () => {
  // 1. Get data from store (selective subscription)
  const queryHistory = useRoomStore((state) => state.sql.queryHistory);
  const runQuery = useRoomStore((state) => state.sql.runQuery);

  return (
    // 2. Wrap in RoomPanel (registers with layout system)
    <RoomPanel type="history">
      {/* 3. Use Card for visual grouping */}
      <Card className="h-full flex flex-col">
        <CardHeader>
          <CardTitle>Query History</CardTitle>
        </CardHeader>

        {/* 4. ScrollArea for overflow handling */}
        <CardContent className="flex-1 overflow-hidden">
          <ScrollArea className="h-full">
            {queryHistory.map((query, idx) => (
              <div key={idx} className="mb-2 p-2 border rounded">
                <div className="flex justify-between items-start">
                  <code className="text-xs">{query.sql}</code>
                  <Badge variant={query.success ? "default" : "destructive"}>
                    {query.success ? "Success" : "Error"}
                  </Badge>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => runQuery(query.sql)}
                >
                  Re-run
                </Button>
              </div>
            ))}
          </ScrollArea>
        </CardContent>
      </Card>
    </RoomPanel>
  );
};
```

### 3. Tailwind Utility Classes ⭐

SQLRooms uses Tailwind extensively. Key patterns:

**Flexbox layouts:**
```tsx
<div className="flex flex-col gap-4">        {/* Vertical stack with gap */}
<div className="flex items-center justify-between"> {/* Horizontal with space */}
<div className="flex-1">                     {/* Grow to fill space */}
```

**Spacing (padding/margin):**
```tsx
className="p-4"      // padding: 1rem (all sides)
className="px-4 py-2" // padding: 1rem horizontal, 0.5rem vertical
className="gap-2"    // gap between flex/grid children
```

**Sizing:**
```tsx
className="h-full w-full"  // 100% height and width
className="h-[200px]"      // Fixed 200px height
className="max-w-md"       // Constrained width
```

**Colors (using CSS variables from your index.css):**
```tsx
className="bg-primary text-primary-foreground"  // Brand color
className="bg-muted text-muted-foreground"      // Subtle background
className="bg-destructive"                      // Error/danger
```

### 4. Reusing SQLRooms Components ⭐

**Don't rebuild what exists!** Example from `DataPanel.tsx`:

- Uses `FileDropzone` instead of building drag-and-drop from scratch
- Uses `TableStructurePanel` instead of building a schema tree
- Uses `useToast` hook for notifications

**Example - Building a "Data Viewer" panel:**

```tsx
import { RoomPanel } from "@sqlrooms/room-shell";
import { QueryResultPanel } from "@sqlrooms/sql-editor";
import { Tabs, TabsList, TabsTrigger, TabsContent, Button } from "@sqlrooms/ui";
import { useRoomStore } from "./store";

export const DataViewerPanel = () => {
  const tables = useRoomStore((state) => state.db.tables);
  const runQuery = useRoomStore((state) => state.sql.runQuery);
  const [selectedTable, setSelectedTable] = useState(tables[0]);

  return (
    <RoomPanel type="viewer">
      <div className="flex flex-col h-full">
        {/* Tabs for table selection */}
        <Tabs value={selectedTable} onValueChange={setSelectedTable}>
          <TabsList>
            {tables.map(table => (
              <TabsTrigger key={table} value={table}>
                {table}
              </TabsTrigger>
            ))}
          </TabsList>

          {tables.map(table => (
            <TabsContent key={table} value={table} className="flex-1">
              {/* Reuse QueryResultPanel - it handles all the table rendering! */}
              <QueryResultPanel
                query={`SELECT * FROM ${table} LIMIT 100`}
              />
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </RoomPanel>
  );
};
```

### 5. Error Handling Pattern

Use `ErrorBoundary` and `ErrorPane`:

```tsx
import { ErrorBoundary, ErrorPane } from "@sqlrooms/ui";

export const MyPanel = () => {
  const data = useRoomStore((state) => state.myData);
  const error = useRoomStore((state) => state.myError);

  if (error) {
    return <ErrorPane error={error} onRetry={() => { /* retry logic */ }} />;
  }

  return (
    <ErrorBoundary fallback={<ErrorPane />}>
      {/* Your component */}
    </ErrorBoundary>
  );
};
```

### 6. Loading States

Use `Spinner`, `Skeleton`, or `Progress`:

```tsx
import { Spinner, SkeletonPane } from "@sqlrooms/ui";

export const MyPanel = () => {
  const isLoading = useRoomStore((state) => state.isLoading);
  const data = useRoomStore((state) => state.data);

  if (isLoading) {
    return <SkeletonPane />;  // Full-panel skeleton
    // OR
    return <Spinner />;       // Just a spinner
  }

  return <div>{/* Render data */}</div>;
};
```

---

## Complete Example: Statistics Panel

Here's a full example combining multiple components:

```tsx
import { RoomPanel } from "@sqlrooms/room-shell";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
  Button,
  Badge,
  Separator,
  useToast,
} from "@sqlrooms/ui";
import { useRoomStore } from "./store";
import { useState, useEffect } from "react";

export const StatisticsPanel = () => {
  // 1. Store subscriptions (selective!)
  const connector = useRoomStore((state) => state.db.connector);
  const tables = useRoomStore((state) => state.db.tables);
  const { toast } = useToast();

  // 2. Local state
  const [stats, setStats] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);

  // 3. Effects & logic
  const loadStats = async () => {
    setLoading(true);
    try {
      const newStats: Record<string, number> = {};
      for (const table of tables) {
        const result = await connector.query(`SELECT COUNT(*) as count FROM ${table}`);
        newStats[table] = result.data[0].count;
      }
      setStats(newStats);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error loading statistics",
        description: String(error),
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (tables.length > 0) {
      loadStats();
    }
  }, [tables]);

  // 4. Render
  return (
    <RoomPanel type="statistics">
      <Card className="h-full flex flex-col">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Table Statistics</CardTitle>
          <Button
            onClick={loadStats}
            disabled={loading}
            size="sm"
          >
            Refresh
          </Button>
        </CardHeader>

        <Separator />

        <CardContent className="flex-1 overflow-auto p-4">
          {tables.length === 0 ? (
            <div className="text-muted-foreground text-center py-8">
              No tables loaded. Upload a file to get started.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Table Name</TableHead>
                  <TableHead className="text-right">Row Count</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tables.map((table) => (
                  <TableRow key={table}>
                    <TableCell className="font-mono">{table}</TableCell>
                    <TableCell className="text-right">
                      {loading ? (
                        <Badge variant="secondary">Loading...</Badge>
                      ) : (
                        <Badge>{stats[table]?.toLocaleString() || "—"}</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </RoomPanel>
  );
};
```

---

## Minimal Example: Main View with Query Editor

This example shows how to build a minimal main view that allows querying tables and displaying results using only existing SQLRooms components:

```tsx
import { RoomPanel } from "@sqlrooms/room-shell";
import { QueryEditorPanel } from "@sqlrooms/sql-editor";

/**
 * MainView - A minimal query editor panel
 *
 * This component uses the pre-built QueryEditorPanel which includes:
 * - SQL Monaco editor with syntax highlighting
 * - Query execution controls (Run, Cancel)
 * - Tabbed interface for multiple queries
 * - Automatic result display in table format
 * - Error handling and loading states
 */
export const MainView = () => {
  return (
    <RoomPanel type="main">
      <QueryEditorPanel />
    </RoomPanel>
  );
};
```

That's it! The `QueryEditorPanel` is a complete, production-ready SQL query interface that handles:

- **Query editing**: Monaco editor with SQL syntax highlighting, autocomplete
- **Execution**: Run button, query cancellation, keyboard shortcuts
- **Results display**: Automatic table rendering with pagination
- **Error handling**: Error messages displayed inline
- **Loading states**: Spinners during query execution
- **Multiple queries**: Tab interface for working with multiple queries

### Using it in your store

Replace the main panel in `src/store.tsx`:

```tsx
import { MainView } from "./MainView";

// In your store configuration:
panels: {
  main: {
    component: MainView,  // or just use QueryEditorPanel directly
    placement: "main",
  },
  data: {
    title: "Data",
    component: DataPanel,
    icon: DatabaseIcon,
    placement: "sidebar",
  },
}
```

---

## Key Takeaways

1. **Import what you need** - All components are tree-shakeable
2. **Use Tailwind classes** - Don't write custom CSS
3. **Selective store subscriptions** - `useRoomStore((state) => state.specific.thing)`
4. **Compose, don't rebuild** - Stack SQLRooms components like LEGO blocks
5. **Follow the Container pattern** - `RoomPanel` → Layout → Feature → UI components
6. **Handle edge cases** - Empty states, loading, errors

The `DataPanel.tsx` in this project is an excellent reference that follows all these patterns: it stacks `FileDropzone` + `TableStructurePanel` inside a `RoomPanel`, uses selective store subscriptions, and handles success/error with toast notifications.
