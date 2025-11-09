import { RoomShell } from "@sqlrooms/room-shell";
import { roomStore } from "./store";
import { ThemeProvider } from "@sqlrooms/ui";

export const App = () => {
    return (
        <ThemeProvider defaultTheme="light" storageKey="ui-theme">
            <RoomShell className="h-screen" roomStore={roomStore}>
                <RoomShell.Sidebar />
                <RoomShell.LayoutComposer />
                <RoomShell.LoadingProgress />
            </RoomShell>
        </ThemeProvider>
    );
};
