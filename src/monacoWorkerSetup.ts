import { configureMonacoLoader } from "@sqlrooms/monaco-editor";
import * as monaco from "monaco-editor";
import editorWorker from "monaco-editor/esm/vs/editor/editor.worker?worker";
import jsonWorker from "monaco-editor/esm/vs/language/json/json.worker?worker";
import cssWorker from "monaco-editor/esm/vs/language/css/css.worker?worker";
import htmlWorker from "monaco-editor/esm/vs/language/html/html.worker?worker";
import tsWorker from "monaco-editor/esm/vs/language/typescript/ts.worker?worker";

// Configure Monaco loader with workers for Vite
// This is required for Monaco Editor to work properly in Vite
// See: https://sqlrooms.org/llms-full.txt
configureMonacoLoader({
    monaco,
    workers: {
        default: editorWorker,
        json: jsonWorker,
        css: cssWorker,
        html: htmlWorker,
        typescript: tsWorker,
        javascript: tsWorker,
    },
});

console.log("✅ Monaco worker configuration loaded");
