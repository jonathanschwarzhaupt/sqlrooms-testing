import { RoomPanel } from "@sqlrooms/room-shell";
import { FileDropzone } from "@sqlrooms/dropzone";
import { TableSchemaTree } from "@sqlrooms/schema-tree";
import { useRoomStore } from "./store";
import { convertToValidColumnOrTableName } from "@sqlrooms/utils";
import {
    useToast,
    ResizablePanelGroup,
    ResizablePanel,
    ResizableHandle,
} from "@sqlrooms/ui";

export const DataView = () => {
    const connector = useRoomStore((state) => state.db.connector);
    const refreshTableSchemas = useRoomStore(
        (state) => state.db.refreshTableSchemas,
    );
    const { toast } = useToast();
    const schemaTrees = useRoomStore((state) => state.db.schemaTrees);

    return (
        <ResizablePanelGroup direction="vertical">
            <ResizablePanel defaultSize={50}>
                <FileDropzone
                    acceptedFormats={{
                        "text/csv": [".csv"],
                        "text/tsv": [".tsv"],
                        "text/parquet": [".parquet"],
                        "text/json": [".json"],
                    }}
                    onDrop={async (files) => {
                        for (const file of files) {
                            try {
                                const tableName =
                                    convertToValidColumnOrTableName(file.name);
                                await connector.loadFile(file, tableName);
                                toast({
                                    variant: "default",
                                    title: "Table created",
                                    description: `File ${file.name} loaded as ${tableName}`,
                                });
                            } catch (error) {
                                toast({
                                    variant: "destructive",
                                    title: "Error",
                                    description: `Error loading file ${file.name}: ${error}`,
                                });
                            }
                        }
                        await refreshTableSchemas();
                    }}
                >
                    <div className="text-muted-foreground text-xs">
                        Files you add will stay local to your browser.
                    </div>
                </FileDropzone>
            </ResizablePanel>
            <ResizableHandle withHandle />
            <ResizablePanel>
                <div className="flex-1 overflow-auto p-2">
                    {schemaTrees && (
                        <TableSchemaTree schemaTrees={schemaTrees} />
                    )}
                </div>
            </ResizablePanel>
        </ResizablePanelGroup>
    );
};
