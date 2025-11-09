import { RoomShell } from "@sqlrooms/room-shell";
import { SqlEditorModal } from "@sqlrooms/sql-editor";
import { ThemeProvider, ThemeSwitch, useDisclosure } from "@sqlrooms/ui";
import { CodeIcon } from "lucide-react";
import { roomStore } from "./store";
import { WorkspaceSwitcher } from "./WorkspaceSwitcher";

export const App = () => {
    const sqlEditorDisclosure = useDisclosure();

    return (
        <ThemeProvider defaultTheme="light" storageKey="ui-theme">
            <RoomShell className="h-screen" roomStore={roomStore}>
                <RoomShell.Sidebar className="w-48">
                    <div className="order-first w-full">
                        <WorkspaceSwitcher />
                    </div>
                    <div className="flex-grow" />
                    <div className="flex flex-row items-center justify-center gap-3 w-full p-2">
                        <ThemeSwitch />
                        <RoomShell.SidebarButton
                            title="SQL Editor"
                            onClick={sqlEditorDisclosure.onToggle}
                            isSelected={false}
                            icon={CodeIcon}
                        />
                    </div>
                </RoomShell.Sidebar>
                <RoomShell.LayoutComposer />
                <RoomShell.LoadingProgress />
                <SqlEditorModal
                    isOpen={sqlEditorDisclosure.isOpen}
                    onClose={sqlEditorDisclosure.onClose}
                />
            </RoomShell>
        </ThemeProvider>
    );
};
