"use client";

import { FormEvent, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const next = searchParams.get("next") || "/";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Login failed");
        return;
      }

      const role = String(data.role || "CUSTOMER").toUpperCase();
      const destination = role === "ORGANISER" ? "/organiser" : "/account";
      router.push(next.startsWith("/organiser") ? "/organiser" : destination);
      router.refresh();
    } catch {
      setError("Could not connect to the server.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#17120e] px-6 text-white">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <p className="text-sm font-semibold tracking-[0.25em] text-gold">
            STAGEPASS
          </p>

          <h1 className="mt-3 font-display text-4xl text-cream">
            Customer portal
          </h1>

          <p className="mt-2 text-sm text-cream/50">
            Sign in to select seats, hold bookings, and manage your tickets.
          </p>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label
                htmlFor="email"
                className="mb-2 block text-sm text-cream/70"
              >
                Email
              </label>

              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none transition placeholder:text-cream/30 focus:border-gold"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="mb-2 block text-sm text-cream/70"
              >
                Password
              </label>

              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none transition placeholder:text-cream/30 focus:border-gold"
              />
            </div>

            {error && (
              <div className="rounded-xl border border-rose-400/20 bg-rose-400/10 p-3">
                <p className="text-sm text-rose-300">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-gold px-5 py-3 font-semibold text-black transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "Signing in..." : "Sign in"}
            </button>
          </form>

          <div className="mt-6 border-t border-white/10 pt-6 text-center space-y-3">
            <p className="text-sm text-cream/50">
              Don&apos;t have a customer account?
            </p>

            <button
              type="button"
              onClick={() => router.push("/register")}
              className="mt-2 text-sm font-semibold text-gold hover:underline"
            >
              Create customer account
            </button>

            <button
              type="button"
              onClick={() => router.push("/organiser/login")}
              className="block w-full text-sm font-medium text-cream/70 hover:text-gold"
            >
              Switch to organiser login
            </button>
          </div>
        </div>

        <div className="mt-6 text-center">
          <button
            type="button"
            onClick={() => router.push("/")}
            className="text-sm text-cream/40 transition hover:text-cream"
          >
            ← Back to events
          </button>
        </div>
      </div>
    </main>
  );
}
