import { RoomPanel } from "@sqlrooms/room-shell";
import { TableSchemaTree } from "@sqlrooms/schema-tree";
import { useRoomStore } from "./store";

export const TableStructure = () => {
    const schemaTrees = useRoomStore((state) => state.db.schemaTrees);

    return (
        <RoomPanel type="data" className="flex flex-col">
            <div className="flex-1 overflow-auto p-2">
                {schemaTrees && <TableSchemaTree schemaTrees={schemaTrees} />}
            </div>
        </RoomPanel>
    );
};
