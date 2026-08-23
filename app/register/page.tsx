"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function RegisterPage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Registration failed.");
        return;
      }

      const role = String(data.user?.role || "CUSTOMER").toUpperCase();
      router.push(role === "ORGANISER" ? "/organiser" : "/account");
      router.refresh();
    } catch {
      setError("Could not connect to the server.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#17120e] px-6 py-16 text-white">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <p className="text-sm font-semibold tracking-[0.25em] text-gold">
            STAGEPASS
          </p>

          <h1 className="mt-3 font-display text-4xl text-cream">
            Customer sign up
          </h1>

          <p className="mt-2 text-sm text-cream/50">
            Create a customer account to book seats and manage your tickets.
          </p>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label
                htmlFor="name"
                className="mb-2 block text-sm text-cream/70"
              >
                Name
              </label>

              <input
                id="name"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your name"
                className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none transition placeholder:text-cream/30 focus:border-gold"
              />
            </div>

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
                placeholder="At least 6 characters"
                className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none transition placeholder:text-cream/30 focus:border-gold"
              />
            </div>

            <div>
              <label
                htmlFor="confirmPassword"
                className="mb-2 block text-sm text-cream/70"
              >
                Confirm password
              </label>

              <input
                id="confirmPassword"
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Enter password again"
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
              {loading ? "Creating account..." : "Create account"}
            </button>
          </form>

          <div className="mt-6 border-t border-white/10 pt-6 text-center space-y-3">
            <p className="text-sm text-cream/50">
              Already have a customer account?
            </p>

            <button
              type="button"
              onClick={() => router.push("/login")}
              className="mt-2 text-sm font-semibold text-gold hover:underline"
            >
              Customer sign in
            </button>

            <button
              type="button"
              onClick={() => router.push("/organiser/register")}
              className="block w-full text-sm font-medium text-cream/70 hover:text-gold"
            >
              Create organiser account instead
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
