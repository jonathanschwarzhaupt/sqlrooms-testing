import { BaseRoomConfig } from "@sqlrooms/room-store";
import {
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
import { DatabaseIcon } from "lucide-react";
import { z } from "zod";

import { UploadFile } from "./FileDropzone";
import { TableStructure } from "./TableStructurePanel";

// Define combined config schema
export const RoomConfig =
    BaseRoomConfig.merge(SqlEditorSliceConfig).merge(DuckDbSliceConfig);
export type RoomConfig = z.infer<typeof RoomConfig>;

// Define combined state type
export type AppRoomState = RoomShellSliceState<BaseRoomConfig> &
    SqlEditorSliceState &
    DuckDbSliceState;

export const { roomStore, useRoomStore } = createRoomStore<
    RoomConfig,
    AppRoomState
>((set, get, store) => ({
    // base room slice
    ...createRoomShellSlice<BaseRoomConfig>({
        config: {
            title: "My Data App",
            layout: {
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
                },
            },
            dataSources: [],
            ...createDefaultSqlEditorConfig(),
            ...createDefaultDuckDbConfig(),
        },
        room: {
            panels: {
                "upload-file": {
                    title: "Data Sources",
                    icon: DatabaseIcon,
                    component: UploadFile,
                    placement: "main",
                },
                "table-structure": {
                    title: "Table Structure",
                    icon: () => null,
                    component: TableStructure,
                    placement: "main",
                },
                "main-view": {
                    title: "Main View",
                    icon: () => null,
                    component: () => null,
                    placement: "main",
                },
            },
        },
    })(set, get, store),

    // Sql editor slice
    ...createSqlEditorSlice()(set, get, store),
    ...createDuckDbSlice({})(set, get, store),
}));
