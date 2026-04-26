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
    <div className="relative inline-block">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as Language)}
        className="cursor-pointer font-sans text-[11px] font-bold tracking-widest uppercase bg-[#0a0a0a] text-[#ededed] border border-[#262626] rounded-sm pl-3 pr-8 py-1.5 outline-none focus:border-[#737373] hover:bg-[#111111] transition-all appearance-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='8' height='5' viewBox='0 0 8 5'%3E%3Cpath d='M0 0l4 5 4-5z' fill='%23737373'/%3E%3C/svg%3E")`,
          backgroundRepeat: "no-repeat",
          backgroundPosition: "right 10px center",
        }}
      >
        {LANGUAGES.map((l) => (
          <option
            key={l.value}
            value={l.value}
            className="bg-[#0a0a0a] text-[#ededed]"
          >
            {l.label}
          </option>
        ))}
      </select>
    </div>
  );
}
