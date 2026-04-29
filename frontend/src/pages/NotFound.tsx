import { useLocation, useNavigate } from "react-router-dom";

type NotFoundVariant = "no-contest" | "contest-ended" | "generic";

function getVariant(pathname: string): NotFoundVariant {
  if (pathname.startsWith("/room/") || pathname.startsWith("/results/")) {
    return "no-contest";
  }
  return "generic";
}

const variants: Record<
  NotFoundVariant,
  { code: string; headline: string; sub: string; cta: string; ctaPath: string }
> = {
  "no-contest": {
    code: "404",
    headline: "Room not found.",
    sub: "That room code doesn't exist or the contest has already been deleted. Double-check the code you were given.",
    cta: "Join a room",
    ctaPath: "/join",
  },
  "contest-ended": {
    code: "410",
    headline: "Contest is over.",
    sub: "This contest has ended and is no longer accepting participants. Ask your host for the results link.",
    cta: "Go home",
    ctaPath: "/",
  },
  generic: {
    code: "404",
    headline: "Nothing here.",
    sub: "The page you're looking for doesn't exist. You might have followed a broken link or mistyped the URL.",
    cta: "Go home",
    ctaPath: "/",
  },
};

export default function NotFound({
  forceVariant,
}: {
  forceVariant?: NotFoundVariant;
}) {
  const location = useLocation();
  const navigate = useNavigate();
  const variant = forceVariant ?? getVariant(location.pathname);
  const v = variants[variant];

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-[#ededed] font-sans flex flex-col justify-center items-center px-6 selection:bg-[#262626] selection:text-[#ededed]">
      <div className="max-w-xl w-full flex flex-col items-center text-center">
        {/* Error code — same scale/tracking as the "Sandboxed." wordmark on Home */}
        <h2 className="text-7xl md:text-9xl font-medium tracking-tighter mb-6 text-[#f5f5f5] select-none">
          {v.code}.
        </h2>

        <p className="text-[#f5f5f5] text-lg font-medium mb-3">{v.headline}</p>

        <p className="text-[#a3a3a3] text-base mb-10 max-w-md leading-relaxed">
          {v.sub}
        </p>

        <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
          <button
            onClick={() => navigate(v.ctaPath)}
            className="px-8 py-3.5 text-sm font-medium bg-[#ededed] text-[#0a0a0a] rounded hover:bg-[#d4d4d4] transition-colors w-full sm:w-auto"
          >
            {v.cta}
          </button>

          {v.ctaPath !== "/" && (
            <button
              onClick={() => navigate("/")}
              className="px-8 py-3.5 text-sm font-medium bg-transparent text-[#ededed] border border-[#262626] rounded hover:bg-[#171717] transition-colors w-full sm:w-auto"
            >
              Go home
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
