# SQLRooms Basics: A Guide for Backend Engineers

This guide explains SQLRooms concepts for data engineers with backend experience (Python, SQL, Go) who are new to frontend development.

## The Big Picture: Database-Powered UI Framework

**Think of SQLRooms as**: A framework that runs **DuckDB inside the browser** and gives you a UI architecture specifically designed for building data analysis applications. Instead of building backend APIs to query data, the database runs client-side and the UI is a composable set of "data panels."

## Core Concept #1: DuckDB-WASM (The Game Changer)

You know DuckDB - the fast analytical database. SQLRooms runs it **entirely in the browser** using WebAssembly.

**What this means**:
```
Traditional architecture:
Browser → API Server → Database → API Server → Browser
(Request)  (Query DB)   (Execute)  (Return)    (Display)

SQLRooms architecture:
Browser (DuckDB-WASM + UI)
Everything happens locally
```

**Key implications**:
- No backend needed for analytics queries
- Users can load CSV/Parquet files directly into the browser
- SQL queries execute locally at near-native speed
- Can still connect to remote databases via connectors (WebSocket, MotherDuck)

**The Hook Pattern**:
```typescript
// Similar to how you'd query a database in Python
const {data, isLoading, error} = useSql({
  query: 'SELECT * FROM sales WHERE year = 2024'
});

// This is like:
# Python equivalent
data, error = execute_query("SELECT * FROM sales WHERE year = 2024")
```

The hook automatically:
- Deduplicates identical queries (like query caching)
- Manages loading states
- Handles errors
- Re-runs when dependencies change

## Core Concept #2: State Management via "Slices" (Think: Composable Services)

In backend systems, you might have separate services:
```
API Gateway
├── Auth Service
├── Data Service
├── Analytics Service
└── Notification Service
```

SQLRooms uses **the same compositional pattern** but for frontend state:

```typescript
Application State Store =
  DatabaseSlice +        // Manages DuckDB connection, queries
  UIShellSlice +         // Manages panels, layout, navigation
  AISlice +              // Manages AI chat sessions, tools
  YourCustomSlice        // Your domain-specific state
```

**Each slice is like a microservice** that:
- Has its own data (state)
- Exposes methods (like API endpoints)
- Can be independently developed
- Composes with other slices

**Example - Creating your own slice**:
```typescript
// Like defining a new service with its API
export const createDataPipelineSlice = (config) => (set, get, store) => ({
  // State - like database tables
  pipelines: [],
  runningJobs: {},

  // Methods - like API endpoints
  runPipeline: async (pipelineId) => {
    set({ runningJobs: {...get().runningJobs, [pipelineId]: 'running'} })
    // execute pipeline logic
  },

  getPipelineStatus: (pipelineId) => {
    return get().runningJobs[pipelineId]
  }
})
```

## Core Concept #3: Configuration vs Runtime State (Like Config Files vs Cache)

This is a pattern you definitely know from backend:

**Configuration** (persistent, like config.yaml):
- User preferences
- Panel definitions
- Layout structure
- Data source connections
- Saved queries

**Runtime State** (temporary, like Redis cache):
- Current query results
- UI state (which panel is open)
- Loading states
- Temporary calculations

SQLRooms automatically persists only configuration using Zustand's persistence middleware - just like how your backend might save config to disk but keep runtime data in memory.

## Core Concept #4: Panels (Like Microservices Exposed as UI)

Think of panels as **service endpoints that render UI instead of returning JSON**.

In a backend API:
```
GET /api/data-sources     → Returns JSON list
GET /api/query-builder    → Returns query structure
GET /api/results          → Returns query results
```

In SQLRooms:
```
Panel: "data-sources"     → Renders UI for browsing data
Panel: "query-builder"    → Renders SQL editor interface
Panel: "results"          → Renders data table/visualization
```

**Defining a panel**:
```typescript
panels: {
  'pipeline-monitor': {
    title: "Pipeline Monitor",
    icon: () => <Icon />,
    component: () => {
      // This component can access the store
      const pipelines = useRoomStore(state => state.pipelines)

      return <div>
        {pipelines.map(p => <PipelineCard pipeline={p} />)}
      </div>
    },
    placement: "main"
  }
}
```

Each panel:
- Is identified by a string ID (like a route path)
- Has a React component (think: request handler)
- Can access the full application state
- Can trigger state updates (like calling internal APIs)

## Core Concept #5: Layout System (Like Service Composition/Routing)

The layout defines how panels are arranged - similar to how you might compose microservices or define API routes.

**Mosaic Tree Structure** (think: recursive data structure):
```typescript
// Simple: Like a REST route structure
{
  type: "mosaic",
  nodes: "main"  // Single panel, full screen
}

// Complex: Like nested service composition
{
  type: "mosaic",
  nodes: {
    direction: "row",           // Split horizontally
    first: "data-sources",      // Left side (30%)
    second: {                   // Right side (70%)
      direction: "column",      // Split vertically
      first: "sql-editor",      // Top (60%)
      second: "results"         // Bottom (40%)
    },
    splitPercentage: 30
  }
}
```

This creates:
```
┌──────────┬────────────────────┐
│  Data    │   SQL Editor       │
│ Sources  │                    │
│  (30%)   ├────────────────────┤
│          │   Results          │
└──────────┴────────────────────┘
```

Users can resize these splits interactively - the framework handles all the complexity.

## Core Concept #6: React Basics (Just Enough Context)

Since you're new to frontend, here's the minimum React you need to understand:

**1. Components = Functions that return UI**
```typescript
// Like a function that returns an HTTP response
function DataTable({data}) {
  return (
    <table>
      {data.map(row => <tr><td>{row.name}</td></tr>)}
    </table>
  )
}
```

**2. Hooks = Functions that access framework features**
```typescript
// Similar to importing utility libraries in Python
const data = useRoomStore(state => state.queryResults)  // Read state
const runQuery = useRoomStore(state => state.runQuery)  // Get method
```

**3. JSX = HTML-like syntax in JavaScript**
```typescript
// Instead of template strings, you write HTML-like code
<div className="panel">
  <h1>{title}</h1>
  <DataTable data={results} />
</div>
```

That's 90% of what you need to know about React for SQLRooms.

## How It All Connects: Example Data Platform

Let's say you're building a **data quality monitoring SaaS**:

```typescript
// 1. Define your state slices (like backend services)
const dataQualitySlice = (set, get) => ({
  // State
  dataSources: [],
  qualityRules: [],
  violations: [],

  // Methods (like API endpoints)
  loadDataSource: async (file) => {
    // Load into DuckDB
    await get().db.insertCSV('raw_data', file)
    // Run quality checks
    const violations = await get().runQualityChecks()
    set({ violations })
  },

  runQualityChecks: async () => {
    // Execute SQL checks in browser
    const result = await get().db.query(`
      SELECT column_name, COUNT(*) as null_count
      FROM raw_data
      WHERE value IS NULL
      GROUP BY column_name
    `)
    return result
  }
})

// 2. Define panels (like UI for each service)
panels: {
  'data-sources': {
    component: () => {
      const loadDataSource = useRoomStore(s => s.loadDataSource)
      return <FileUploader onUpload={loadDataSource} />
    }
  },

  'quality-dashboard': {
    component: () => {
      const violations = useRoomStore(s => s.violations)
      return <ViolationChart data={violations} />
    }
  },

  'sql-editor': {
    component: () => {
      const {data} = useSql({
        query: 'SELECT * FROM raw_data LIMIT 100'
      })
      return <MonacoEditor initialData={data} />
    }
  }
}

// 3. Define layout (how panels are arranged)
layout: {
  nodes: {
    direction: 'row',
    first: 'data-sources',     // Left sidebar
    second: {
      direction: 'column',
      first: 'quality-dashboard',  // Top right
      second: 'sql-editor'         // Bottom right
    }
  }
}
```

## Why This is Powerful for Your Use Case

**Traditional SaaS architecture**:
```
User → Load Balancer → App Servers → Database
                    ↓
                Backend API (FastAPI/Go)
                    ↓
                Complex state management
                Heavy server costs
```

**SQLRooms architecture**:
```
User → Static Files (CDN) → Browser runs everything
                          ↓
                      DuckDB-WASM
                          ↓
                     No backend needed*

*Unless you need auth, storage, or heavy compute
```

**Benefits for data tooling**:
1. **Near-zero infrastructure costs** - Just serve static files
2. **Instant responsiveness** - No network latency for queries
3. **Scales automatically** - Each user's browser does the work
4. **Works offline** - All processing is local
5. **Easy to add AI** - Built-in AI slice for LLM integration
6. **Users can bring their own data** - Load files directly

## Common Patterns You'll Use

**1. File Upload → DuckDB → Visualization**
```typescript
// User uploads CSV
const handleUpload = async (file) => {
  await db.insertCSV('dataset', file)
  // Query auto-runs and UI updates
}

const {data} = useSql({query: 'SELECT * FROM dataset'})
```

**2. SQL Editor → Live Results**
```typescript
const [query, setQuery] = useState('SELECT * FROM data')
const {data, isLoading} = useSql({query})

// As user types, results update automatically
```

**3. Cross-Panel Communication via Store**
```typescript
// Panel 1: Sets selected row
const selectRow = useRoomStore(s => s.setSelectedRow)

// Panel 2: Reacts to selection
const selectedRow = useRoomStore(s => s.selectedRow)
```

## Next Steps for Learning

1. **Start simple**: Create a single panel that loads a CSV and shows a table
2. **Add interactivity**: Let users write SQL queries
3. **Add state**: Store query history in a custom slice
4. **Add visualization**: Show charts from query results
5. **Add AI**: Integrate LLM for natural language queries

The framework handles the hard parts (state management, layout, database integration) - you focus on your data logic, which is your strength.
