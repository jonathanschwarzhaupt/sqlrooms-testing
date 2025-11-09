// WorkspaceSwitcher.tsx
import { useRoomStore } from "./store";
import { CodeIcon, CloudUploadIcon, SwatchBookIcon } from "lucide-react";
import { type FC } from "react";

export const WorkspaceSwitcher: FC = () => {
    const currentWorkspace = useRoomStore((s) => s.currentWorkspace);
    const setCurrentWorkspace = useRoomStore((s) => s.setCurrentWorkspace);

    const workspaces = [
        { id: "data" as const, icon: CloudUploadIcon, label: "Data" },
        { id: "query" as const, icon: CodeIcon, label: "Query" },
        { id: "chart" as const, icon: SwatchBookIcon, label: "Charts" },
    ];

    return (
        <div className="flex flex-col gap-2 p-2 w-full">
            {workspaces.map((ws) => (
                <button
                    key={ws.id}
                    onClick={() => setCurrentWorkspace(ws.id)}
                    className={`
                        flex items-center gap-3 px-4 py-2 rounded-md
                        transition-colors
                        ${
                            currentWorkspace === ws.id
                                ? "bg-primary text-primary-foreground"
                                : "hover:bg-secondary text-foreground"
                        }
                    `}
                >
                    <ws.icon className="h-5 w-5 flex-shrink-0" />
                    <span className="text-sm font-medium">{ws.label}</span>
                </button>
            ))}
        </div>
    );
};
