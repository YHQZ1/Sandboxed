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
  return (
    <Editor
      height="100%"
      language={MONACO_LANG[language]}
      value={value}
      theme="vs-dark"
      onChange={(v) => onChange(v || "")}
      options={{
        fontSize: 14,
        minimap: { enabled: false },
        scrollBeyondLastLine: false,
        readOnly: readOnly,
        lineNumbers: "on",
        tabSize: 2,
      }}
    />
  );
}
