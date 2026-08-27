import Link from "next/link";
import { requireUser } from "@/lib/supabase/server";
import { AccountForm } from "./AccountForm";
import { SettingsForm } from "./SettingsForm";
import { DangerZone } from "./DangerZone";

export default async function SettingsPage() {
  const { supabase, user } = await requireUser();

  const { data: preferences, error } = await supabase
    .from("user_preferences")
    .select("units, notify_expiring, notify_weekly_plan, default_visibility")
    .eq("user_id", user.id)
    .single();

  if (error || !preferences) throw error ?? new Error("Preferences not found");

  return (
    <div className="flex max-w-2xl flex-1 flex-col gap-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl">Settings</h1>
        <Link href="/preferences" className="text-sm text-accent-700 underline">
          How you eat
        </Link>
      </div>

      <section className="flex flex-col gap-3 rounded-[30px] bg-surface p-6">
        <h2 className="text-lg">Account</h2>
        <AccountForm currentEmail={user.email ?? ""} />
      </section>

      <section className="flex flex-col gap-3 rounded-[30px] bg-surface p-6">
        <h2 className="text-lg">Appearance &amp; sharing</h2>
        <SettingsForm
          initialUnits={preferences.units}
          initialNotifyExpiring={preferences.notify_expiring}
          initialNotifyWeeklyPlan={preferences.notify_weekly_plan}
          initialDefaultVisibility={preferences.default_visibility}
        />
      </section>

      <section className="flex flex-col gap-3 rounded-[30px] bg-surface p-6">
        <h2 className="text-lg">Your data</h2>
        <p className="text-sm text-[color:var(--color-muted)]">
          Every recipe, pantry item, and preference you have, as one file.
        </p>
        <a href="/preferences/settings/export" className="btn btn-secondary self-start">
          Download my data
        </a>
      </section>

      <DangerZone />
    </div>
  );
}
