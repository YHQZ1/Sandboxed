import type { Language } from "../../types";

const LANGUAGES: { value: Language; label: string }[] = [
  { value: "python", label: "Python" },
  { value: "javascript", label: "JavaScript" },
  { value: "cpp", label: "C++" },
  { value: "c", label: "C" },
  { value: "java", label: "Java" },
];

interface Props {
  value: Language;
  onChange: (lang: Language) => void;
}

export default function LanguageSelect({ value, onChange }: Props) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as Language)}
      className="bg-zinc-800 text-white text-sm rounded-lg px-3 py-1.5 outline-none border border-zinc-700 focus:border-zinc-500"
    >
      {LANGUAGES.map((l) => (
        <option key={l.value} value={l.value}>
          {l.label}
        </option>
      ))}
    </select>
  );
}
