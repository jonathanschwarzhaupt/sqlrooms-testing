# Minimal SQLRooms Setup with DuckDB

This document explains the minimal, working setup for a SQLRooms application with DuckDB file upload capability.

## The Key Concept: `getConnector()` vs `connector`

**The Critical Difference:**

```tsx
// ❌ WRONG - Might not be initialized
const connector = useRoomStore((state) => state.db.connector);
await connector.loadFile(file, tableName);

// ✅ CORRECT - Ensures initialization
const getConnector = useRoomStore((state) => state.db.getConnector);
const connector = await getConnector();
await connector.loadFile(file, tableName);
```

**Why this matters:**
- `state.db.connector` is a direct reference that might be a placeholder
- `state.db.getConnector()` is a method that ensures the connector is **fully initialized** before returning it
- This initialization includes setting up the WASM engine and virtual filesystem

## Complete Minimal Example

### 1. Store Setup (src/store.tsx)

```tsx
import {
    BaseRoomConfig,
    createRoomShellSlice,
    createRoomStore,
    type RoomShellSliceState,
    LayoutTypes,
} from "@sqlrooms/room-shell";
import {
    createDefaultSqlEditorConfig,
    createSqlEditorSlice,
    SqlEditorSliceConfig,
    type SqlEditorSliceState,
} from "@sqlrooms/sql-editor";
import { type DuckDbSliceState, createDuckDbSlice } from "@sqlrooms/duckdb";
import { z } from "zod";
import { DataPanel } from "./DataPanel";
import { DatabaseIcon } from "lucide-react";
import { MainView } from "./MainView";

// Room config for saving
export const RoomConfig = BaseRoomConfig.merge(SqlEditorSliceConfig);
export type RoomConfig = z.infer<typeof RoomConfig>;

// Room state - compose all slice states
export type RoomState = RoomShellSliceState<RoomConfig> &
    SqlEditorSliceState &
    DuckDbSliceState & {
        // Add your own state here
    };

export const { roomStore, useRoomStore } = createRoomStore<
    RoomConfig,
    RoomState
>((set, get, store) => ({
    // Room shell slice - UI layout and panels
    ...createRoomShellSlice<RoomConfig>({
        config: {
            layout: {
                type: LayoutTypes.enum.mosaic,
                nodes: {
                    first: "data",
                    second: "main",
                    direction: "row",
                    splitPercentage: 30,
                },
            },
            ...createDefaultSqlEditorConfig(),
        },
        room: {
            panels: {
                main: {
                    component: MainView,
                    placement: "main",
                },
                data: {
                    title: "Data",
                    component: DataPanel,
                    icon: DatabaseIcon,
                    placement: "sidebar",
                },
            },
        },
    })(set, get, store),

    // DuckDB slice - provides database functionality
    // Pass empty object {} - the slice creates and manages the connector internally
    ...createDuckDbSlice({})(set, get, store),

    // SQL Editor slice - provides query editor UI
    ...createSqlEditorSlice()(set, get, store),
}));
```

**What each slice provides:**

- **RoomShellSlice**: Layout system, panel management, UI shell
- **DuckDbSlice**: Database connector, query execution, table management
- **SqlEditorSlice**: Query editor UI, syntax highlighting, result display

### 2. File Upload Panel (src/DataPanel.tsx)

```tsx
import { RoomPanel } from "@sqlrooms/room-shell";
import { TableStructurePanel } from "@sqlrooms/sql-editor";
import { FileDropzone } from "@sqlrooms/dropzone";
import { convertToValidColumnOrTableName } from "@sqlrooms/utils";
import { useToast } from "@sqlrooms/ui";
import { useRoomStore } from "./store";

export const DataPanel = () => {
    // Get the connector getter function
    const getConnector = useRoomStore((state) => state.db?.getConnector);
    const refreshTableSchemas = useRoomStore(
        (state) => state.db?.refreshTableSchemas,
    );
    const { toast } = useToast();

    return (
        <RoomPanel type="data">
            <FileDropzone
                className="h-[200px] p-5"
                acceptedFormats={{
                    "text/csv": [".csv"],
                    "text/tsv": [".tsv"],
                    "text/parquet": [".parquet"],
                    "text/json": [".json"],
                }}
                onDrop={async (files) => {
                    // IMPORTANT: Await getConnector() to ensure initialization
                    const connector = await getConnector();

                    for (const file of files) {
                        try {
                            const tableName = convertToValidColumnOrTableName(
                                file.name,
                            );

                            // Load file with auto-detection and replace if exists
                            await connector.loadFile(file, tableName, {
                                method: 'auto',    // Auto-detect CSV/JSON/Parquet
                                replace: true,     // Replace if table exists
                            });

                            toast({
                                variant: "default",
                                title: "Table created",
                                description: `File ${file.name} loaded as ${tableName}`,
                            });
                        } catch (error) {
                            console.error('File upload error:', error);
                            toast({
                                variant: "destructive",
                                title: "Error",
                                description: `Error loading file ${file.name}: ${error}`,
                            });
                        }
                    }

                    // Refresh to show new tables in UI
                    await refreshTableSchemas();
                }}
            >
                <div className="text-muted-foreground text-xs">
                    Files you add will stay local to your browser.
                </div>
            </FileDropzone>
            <TableStructurePanel />
        </RoomPanel>
    );
};
```

**Key points:**

1. **getConnector()**: Returns a Promise that resolves to an initialized connector
2. **method: 'auto'**: DuckDB auto-detects the file format (CSV, JSON, Parquet)
3. **replace: true**: Overwrites the table if it already exists
4. **refreshTableSchemas()**: Updates the UI to show newly loaded tables

### 3. App Component (src/App.tsx)

```tsx
import { RoomShell } from "@sqlrooms/room-shell";
import { ThemeProvider, ThemeSwitch } from "@sqlrooms/ui";
import { roomStore } from "./store";

export const App = () => {
    return (
        <ThemeProvider defaultTheme="light" storageKey="sqlrooms-ui-theme">
            <RoomShell className="h-screen" roomStore={roomStore}>
                <RoomShell.Sidebar>
                    <ThemeSwitch />
                </RoomShell.Sidebar>
                <RoomShell.LayoutComposer />
                <RoomShell.LoadingProgress />
            </RoomShell>
        </ThemeProvider>
    );
};
```

**No manual initialization needed!** The `getConnector()` method handles it automatically.

## How It Works

### Initialization Flow

1. **App loads** → Store is created with all slices
2. **User drops file** → `onDrop` handler is called
3. **`await getConnector()`** is called:
   - Checks if connector is initialized
   - If not, downloads WASM files from CDN
   - Starts Web Worker
   - Sets up virtual filesystem
   - Returns initialized connector
4. **`connector.loadFile()`** is called:
   - Reads file content
   - Auto-detects format (CSV/JSON/Parquet)
   - Creates table in DuckDB
5. **`refreshTableSchemas()`** updates UI:
   - Queries DuckDB for table list
   - Updates `state.db.tables`
   - TableStructurePanel re-renders with new table

### Data Flow

```
File Drop
    ↓
await getConnector()
    ↓
connector.loadFile(file, name, options)
    ↓
DuckDB creates table
    ↓
refreshTableSchemas()
    ↓
UI updates with new table
```

## Common Patterns

### Query the Uploaded Data

```tsx
const getConnector = useRoomStore((state) => state.db.getConnector);

// Later in your code:
const connector = await getConnector();
const result = await connector.query('SELECT * FROM my_table LIMIT 10');
console.log(result); // Apache Arrow Table
```

### Create Derived Tables

```tsx
const createTableFromQuery = useRoomStore(
    (state) => state.db.createTableFromQuery
);

const result = await createTableFromQuery(
    'filtered_data',
    'SELECT * FROM uploaded_data WHERE value > 100'
);
console.log(`Created table with ${result.rowCount} rows`);
```

### Check Available Tables

```tsx
const tables = useRoomStore((state) => state.db.tables);
console.log('Available tables:', tables.map(t => t.tableName));
```

## Why This Design?

**Lazy Initialization**: The connector isn't created until first use, saving resources.

**Async Safety**: `getConnector()` ensures the connector is ready before returning it, preventing race conditions.

**Automatic Cleanup**: The slice manages the connector lifecycle automatically.

**Type Safety**: TypeScript ensures you're accessing the correct state properties.

## Troubleshooting

### File upload fails with "NotReadableError"
- **Cause**: Using `state.db.connector` instead of `await getConnector()`
- **Fix**: Always use `await getConnector()` before loading files

### QueryEditorPanel shows spinner forever
- **Cause**: Missing `createSqlEditorSlice()` in store or initialization issue
- **Fix**: Ensure all slices are included and `getConnector()` is called when needed

### Tables don't appear after upload
- **Cause**: Forgot to call `refreshTableSchemas()`
- **Fix**: Always call `await refreshTableSchemas()` after loading files

### "Cannot read property of undefined" errors
- **Cause**: Accessing slice state before it's created
- **Fix**: Use optional chaining: `state.db?.getConnector`

## Next Steps

Now that you have a working minimal example:

1. **Try uploading a CSV file** - It should work!
2. **Query your data** in the QueryEditorPanel
3. **Build custom panels** that use the uploaded data
4. **Explore other DuckDB features** like joins, aggregations, window functions

The beauty of this setup is that it's **exactly what the framework expects** - no workarounds, just the standard pattern.
