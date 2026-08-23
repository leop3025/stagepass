"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function OrganiserRegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");

    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (form.password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, role: "ORGANISER" }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Registration failed");

      router.push("/organiser");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create organiser account");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#17120e] px-6 py-16 text-white">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <p className="text-sm font-semibold tracking-[0.25em] text-gold">STAGEPASS</p>
          <h1 className="mt-3 font-display text-4xl text-cream">Organiser sign up</h1>
          <p className="mt-2 text-sm text-cream/50">Create an organiser account to publish listings and track revenue.</p>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="name" className="mb-2 block text-sm text-cream/70">Full name</label>
              <input id="name" type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-white" required />
            </div>
            <div>
              <label htmlFor="email" className="mb-2 block text-sm text-cream/70">Email</label>
              <input id="email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-white" required />
            </div>
            <div>
              <label htmlFor="password" className="mb-2 block text-sm text-cream/70">Password</label>
              <input id="password" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-white" required />
            </div>
            <div>
              <label htmlFor="confirmPassword" className="mb-2 block text-sm text-cream/70">Confirm password</label>
              <input id="confirmPassword" type="password" value={form.confirmPassword} onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })} className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-white" required />
            </div>

            {error && (
              <div className="rounded-xl border border-rose-400/20 bg-rose-400/10 p-3 text-sm text-rose-300">
                {error}
              </div>
            )}

            <button type="submit" disabled={loading} className="w-full rounded-xl bg-gold px-5 py-3 font-semibold text-black disabled:opacity-60">
              {loading ? "Creating account..." : "Create organiser account"}
            </button>
          </form>

          <div className="mt-6 border-t border-white/10 pt-6 text-center">
            <p className="text-sm text-cream/50">Already have an organiser account?</p>
            <button type="button" onClick={() => router.push("/organiser/login")} className="mt-2 text-sm font-semibold text-gold hover:underline">
              Sign in
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
