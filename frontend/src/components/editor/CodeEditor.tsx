/* eslint-disable @typescript-eslint/no-explicit-any */
import Editor from "@monaco-editor/react";
import type { Language } from "../../types";

const MONACO_LANG: Record<Language, string> = {
  python: "python",
  javascript: "javascript",
  cpp: "cpp",
  c: "c",
  java: "java",
};

interface Props {
  language: Language;
  value: string;
  onChange: (val: string) => void;
  readOnly?: boolean;
}

export default function CodeEditor({
  language,
  value,
  onChange,
  readOnly,
}: Props) {
  const handleEditorWillMount = (monaco: any) => {
    monaco.editor.defineTheme("dojo-dark", {
      base: "vs-dark",
      inherit: true,
      rules: [],
      colors: {
        "editor.background": "#0a0a0a", // Matches your main background
        "editor.foreground": "#ededed",
        "editorLineNumber.foreground": "#404040",
        "editorLineNumber.activeForeground": "#ededed",
        "editor.lineHighlightBackground": "#171717",
        "editorCursor.foreground": "#ededed",
        "editor.selectionBackground": "#262626",
        "editorIndentGuide.background": "#171717",
        "editorIndentGuide.activeBackground": "#262626",
      },
    });
  };

  return (
    <div className="h-full w-full border border-[#262626] rounded-sm overflow-hidden">
      <Editor
        height="100%"
        language={MONACO_LANG[language]}
        value={value}
        theme="dojo-dark"
        onMount={(_editor, monaco) => handleEditorWillMount(monaco)}
        beforeMount={handleEditorWillMount}
        onChange={(v) => onChange(v || "")}
        options={{
          fontSize: 13,
          fontFamily: "'IBM Plex Mono', 'Fira Code', monospace",
          fontLigatures: true,
          minimap: { enabled: false },
          scrollBeyondLastLine: false,
          readOnly,
          lineNumbers: "on",
          lineNumbersMinChars: 3,
          tabSize: 2,
          padding: { top: 20, bottom: 20 },
          renderLineHighlight: "all",
          cursorBlinking: "smooth",
          cursorSmoothCaretAnimation: "on",
          smoothScrolling: true,
          contextmenu: false,
          quickSuggestions: true,
          scrollbar: {
            verticalScrollbarSize: 6,
            horizontalScrollbarSize: 6,
            vertical: "visible",
            horizontal: "visible",
          },
          overviewRulerBorder: false,
          hideCursorInOverviewRuler: true,
        }}
      />
    </div>
  );
}
