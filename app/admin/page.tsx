import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";

export default async function AdminPage() {
  const user = await getSession();

  if (!user) {
    redirect("/login?next=/admin");
  }

  if (user.role !== "ADMIN") {
    redirect("/");
  }

  return (
    <div className="mx-auto max-w-5xl text-white">
      <p className="text-sm font-semibold uppercase tracking-[0.3em] text-gold">Admin</p>
      <h1 className="mt-3 font-display text-4xl text-cream">Platform overview</h1>
      <div className="mt-8 grid gap-5 md:grid-cols-3">
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <p className="text-sm text-cream/50">Signed in as</p>
          <p className="mt-2 text-xl font-semibold text-cream">{user.name}</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <p className="text-sm text-cream/50">Role</p>
          <p className="mt-2 text-xl font-semibold text-gold">{user.role}</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <p className="text-sm text-cream/50">Email</p>
          <p className="mt-2 text-xl font-semibold text-cream">{user.email}</p>
        </div>
      </div>
    </div>
  );
}
