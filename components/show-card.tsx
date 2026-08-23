import Link from "next/link";
import { format } from "date-fns";
import { Badge } from "./ui/badge";
import { formatCurrency } from "@/lib/utils";

const palettes: Record<string, string> = {
  "Sci-Fi": "from-cyan-700 via-slate-900 to-indigo-950",
  Drama: "from-amber-800 via-stone-900 to-rose-950",
  Concert: "from-violet-700 via-fuchsia-950 to-slate-950",
  Thriller: "from-red-900 via-zinc-950 to-orange-950",
};

export function ShowCard({
  show,
}: {
  show: {
    id: string;
    title: string;
    genre: string;
    kind: string;
    startsAt: Date | string;
    premiumPrice: number;
    standardPrice: number;
    venue: { name: string; city: string };
  };
}) {
  const when = new Date(show.startsAt);
  const bg = palettes[show.genre] ?? "from-stone-700 via-stone-900 to-black";

  return (
    <Link href={`/shows/${show.id}`} className="group block">
      <article className="overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03] transition hover:-translate-y-1 hover:border-gold/30">
        <div className={`relative h-48 bg-gradient-to-br ${bg} p-5`}>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.18),transparent_45%)]" />
          <div className="relative flex h-full flex-col justify-between">
            <div className="flex gap-2">
              <Badge>{show.kind === "MOVIE" ? "Film" : "Live"}</Badge>
              <Badge className="border-gold/30 text-gold">{show.genre}</Badge>
            </div>
            <h3 className="font-display text-3xl text-cream drop-shadow">
              {show.title}
            </h3>
          </div>
        </div>
        <div className="p-5">
          <p className="text-sm text-cream/70">
            {format(when, "EEE d MMM · h:mm a")}
          </p>
          <p className="mt-1 text-sm text-cream/45">
            {show.venue.name}, {show.venue.city}
          </p>
          <p className="mt-4 text-sm text-gold">
            From {formatCurrency(show.standardPrice)}
          </p>
        </div>
      </article>
    </Link>
  );
}

