import { useNavigate } from "react-router-dom";

export default function Home() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-zinc-950 text-white flex flex-col items-center justify-center gap-8">
      <div className="text-center">
        <h1 className="text-6xl font-black tracking-tight mb-2">Dojo</h1>
        <p className="text-zinc-400 text-lg">
          Live competitive coding for recruiting the sharpest engineers.
        </p>
      </div>
      <div className="flex gap-4">
        <button
          onClick={() => navigate("/create")}
          className="px-6 py-3 bg-white text-black font-semibold rounded-lg hover:bg-zinc-200 transition"
        >
          Host a Contest
        </button>
        <button
          onClick={() => navigate("/join")}
          className="px-6 py-3 border border-zinc-600 text-white font-semibold rounded-lg hover:bg-zinc-800 transition"
        >
          Join a Room
        </button>
      </div>
    </div>
  );
}
