import { FileDropzone } from "@sqlrooms/dropzone";
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
    useToast,
} from "@sqlrooms/ui";
import { TableStructurePanel } from "@sqlrooms/sql-editor";
import { useRoomStore } from "./store";
import { convertToValidColumnOrTableName } from "@sqlrooms/utils";
import { UploadIcon, TableIcon } from "lucide-react";
import { type FC } from "react";

export const DataViewAccordion: FC = () => {
    const connector = useRoomStore((state) => state.db.connector);
    const refreshTableSchemas = useRoomStore(
        (state) => state.db.refreshTableSchemas,
    );
    const { toast } = useToast();
    return (
        <>
            <Accordion type="multiple" defaultValue={["upload"]}>
                {/*File upload*/}
                <AccordionItem value="upload">
                    <AccordionTrigger className="gap-1 px-0">
                        <div className="text-muted-foreground flex items-center">
                            <UploadIcon className="h-4 w-4" />
                            <h3 className="ml-1 text-xs uppercase">
                                Upload files
                            </h3>
                        </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-[5px] pb-5 pt-1">
                        <FileDropzone
                            className="h-[200px] p-5"
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
                                            convertToValidColumnOrTableName(
                                                file.name,
                                            );
                                        await connector.loadFile(
                                            file,
                                            tableName,
                                        );
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
                    </AccordionContent>
                </AccordionItem>
                <AccordionItem value="schema">
                    <AccordionTrigger className="gap-1 px-0">
                        <div className="text-muted-foreground flex items-center">
                            <TableIcon className="h-4 w-4" />
                            <h3 className="ml-1 text-xs uppercase">Datasets</h3>
                        </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-[5px] pb-5 pt-1">
                        <TableStructurePanel />
                    </AccordionContent>
                </AccordionItem>
            </Accordion>
        </>
    );
};
