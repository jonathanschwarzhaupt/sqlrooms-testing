import {
    BaseRoomConfig,
    createRoomShellSlice,
    createRoomStore,
    LayoutConfig,
    type RoomShellSliceState,
} from "@sqlrooms/room-shell";
import {
    createDefaultSqlEditorConfig,
    createSqlEditorSlice,
    SqlEditorSliceConfig,
    type SqlEditorSliceState,
} from "@sqlrooms/sql-editor";
import {
    createDefaultDuckDbConfig,
    createDuckDbSlice,
    DuckDbSliceConfig,
    type DuckDbSliceState,
} from "@sqlrooms/duckdb";
import {
    AiSettingsSliceConfig,
    AiSliceConfig,
    createAiSettingsSlice,
    createAiSlice,
    createDefaultAiConfig,
    createDefaultAiSettingsConfig,
    createDefaultAiInstructions,
    createDefaultAiTools,
    type AiSettingsSliceState,
    type AiSliceState,
} from "@sqlrooms/ai";
import { createVegaChartTool } from "@sqlrooms/vega";
import { z } from "zod";
import { DatabaseIcon } from "lucide-react";

// import { EditorView } from "./EditorView";
// import { DataView } from "./DataView";
import { DataViewAccordion } from "./DataViewV2";
import { AI_SETTINGS } from "./config";
import EchoToolResult from "./EchoToolResult";
import { AiView } from "./AiView";

// Define combined config schema
export const RoomConfig = BaseRoomConfig.merge(SqlEditorSliceConfig)
    .merge(DuckDbSliceConfig)
    .merge(AiSliceConfig)
    .merge(AiSettingsSliceConfig);
export type RoomConfig = z.infer<typeof RoomConfig>;

// Define combined state type
export type RoomState = RoomShellSliceState<RoomConfig> &
    SqlEditorSliceState &
    DuckDbSliceState &
    AiSettingsSliceState &
    AiSliceState & {
        // Explicitly type config for better IntelliSense
        config: RoomConfig;

        // Custom workspace state
        currentWorkspace: WorkspaceId;
        setCurrentWorkspace: (workspace: WorkspaceId) => void;
    };

// Create workspace layout configs

const dataWorkspace: LayoutConfig = {
    type: "mosaic",
    nodes: {
        direction: "row",
        first: "file-upload",
        second: "data-connectors",
        splitPercentage: 40,
    },
};

const queryWorkspace: LayoutConfig = {
    type: "mosaic",
    nodes: {
        direction: "row",
        first: "data-view",
        second: "ai-view",
        splitPercentage: 30,
    },
};

const chartWorkspace: LayoutConfig = {
    type: "mosaic",
    nodes: "chart-view",
};

const WORKSPACES = {
    data: dataWorkspace,
    query: queryWorkspace,
    chart: chartWorkspace,
};
type WorkspaceId = keyof typeof WORKSPACES;

export const { roomStore, useRoomStore } = createRoomStore<
    RoomConfig,
    RoomState
>((set, get, store) => ({
    // base room slice
    ...createRoomShellSlice<RoomConfig>({
        config: {
            title: "My Data App",
            layout: WORKSPACES.query,
            ...createDefaultSqlEditorConfig(),
            ...createDefaultDuckDbConfig(),
            ...createDefaultAiConfig(),
            ...createDefaultAiSettingsConfig(AI_SETTINGS),
        },
        room: {
            panels: {
                "data-view": {
                    title: "Data View",
                    icon: DatabaseIcon,
                    component: DataViewAccordion,
                    placement: "main",
                },
                "ai-view": {
                    title: "Main View",
                    component: AiView,
                    placement: "main",
                },
            },
        },
    })(set, get, store),

    // Sql editor slice
    ...createSqlEditorSlice()(set, get, store),

    // DuckDB slice
    ...createDuckDbSlice({})(set, get, store),

    // AI settings slice
    ...createAiSettingsSlice()(set, get, store),

    // AI slice
    ...createAiSlice({
        initialAnalysisPrompt: "What insights can you provide from my data?",
        getInstructions: () => {
            return createDefaultAiInstructions(store);
        },
        tools: {
            ...createDefaultAiTools(store, { query: {} }),
            chart: createVegaChartTool(),
            // add simple custom tool as an example
            echo: {
                name: "echo",
                description: "A simple echo tools that returns the input text.",
                parameters: z.object({
                    text: z.string().describe("The text to echo back"),
                }),
                execute: async ({ text }: { text: string }) => {
                    return {
                        llmResult: {
                            success: true,
                            details: `Echo: ${text}`,
                        },
                    };
                },
                component: EchoToolResult,
            },
        },
    })(set, get, store),

    // Workspace state
    currentWorkspace: "query" as WorkspaceId,
    setCurrentWorkspace: (workspace: WorkspaceId) => {
        // Update workspace state
        set({ currentWorkspace: workspace });

        // switch to new layout
        const newLayout = WORKSPACES[workspace];
        get().layout.setLayout(newLayout);

        // log for debugging
        console.log(`Switched to workspace: ${workspace}`);
    },
}));

// Expose store to window for debugging
if (typeof window !== "undefined") {
    (window as any).roomStore = roomStore;
}
