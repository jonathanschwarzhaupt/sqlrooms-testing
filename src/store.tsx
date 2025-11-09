import {
    BaseRoomConfig,
    createRoomShellSlice,
    createRoomStore,
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
import { DataView } from "./DataView";

// Define combined config schema
export const RoomConfig =
    BaseRoomConfig.merge(SqlEditorSliceConfig).merge(DuckDbSliceConfig);
export type RoomConfig = z.infer<typeof RoomConfig>;

// Define combined state type
export type RoomState = RoomShellSliceState<RoomConfig> &
    SqlEditorSliceState &
    DuckDbSliceState & {}; // can add my own state here

export const { roomStore, useRoomStore } = createRoomStore<
    RoomConfig,
    RoomState
>((set, get, store) => ({
    // base room slice
    ...createRoomShellSlice<RoomConfig>({
        config: {
            title: "My Data App",
            layout: {
                type: "mosaic",
                nodes: {
                    direction: "row",
                    // first: {
                    //     direction: "column",
                    //     first: "upload-file",
                    //     second: "table-structure",
                    //     splitPercentage: 30,
                    // },
                    first: "data-view",
                    second: "main-view",
                    splitPercentage: 30,
                },
            },
            ...createDefaultSqlEditorConfig(),
            ...createDefaultDuckDbConfig(),
        },
        room: {
            panels: {
                // "upload-file": {
                //     component: UploadFile,
                //     placement: "sidebar",
                // },
                // "table-structure": {
                //     component: TableStructure,
                //     placement: "sidebar",
                // },
                "data-view": {
                    title: "Data View",
                    icon: DatabaseIcon,
                    component: DataView,
                    placement: "sidebar",
                },
                "main-view": {
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
}));
