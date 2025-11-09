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
import { z } from "zod";
import { DatabaseIcon } from "lucide-react";

import { MainView } from "./MainView";
// import { DataView } from "./DataView";
import { DataViewAccordion } from "./DataViewV2";

// Define combined config schema
export const RoomConfig =
    BaseRoomConfig.merge(SqlEditorSliceConfig).merge(DuckDbSliceConfig);
export type RoomConfig = z.infer<typeof RoomConfig>;

// Define combined state type
export type RoomState = RoomShellSliceState<RoomConfig> &
    SqlEditorSliceState &
    DuckDbSliceState & {
        currentWorkspace: WorkspaceId;
        setCurrentWorkspace: (workspace: WorkspaceId) => void;
    }; // can add my own state here

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
                    component: MainView,
                    placement: "main",
                },
            },
        },
    })(set, get, store),

    // Sql editor slice
    ...createSqlEditorSlice()(set, get, store),

    // DuckDB slice
    ...createDuckDbSlice({})(set, get, store),

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
