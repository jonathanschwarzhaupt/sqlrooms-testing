import { RoomShell } from "@sqlrooms/room-shell";
import { roomStore } from "./store";

export const App = () => {
    return (
        <RoomShell className="h-screen" roomStore={roomStore}>
            <RoomShell.Sidebar />
            <RoomShell.LayoutComposer />
            <RoomShell.LoadingProgress />
        </RoomShell>
    );
};
