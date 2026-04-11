import { CORE_INDIAN_ACTS } from "@evidentis/shared";

import { AppShell } from "@/components/india/AppShell";

export default async function BareActDetailPage({
  params,
}: {
  params: Promise<{ actSlug: string }>;
}) {
  const { actSlug } = await params;
  const act = CORE_INDIAN_ACTS.find((item) => item.slug === actSlug) ?? CORE_INDIAN_ACTS[0];

  return (
    <AppShell title={act.shortTitle}>
      <div className="rounded-[2rem] border border-white/10 bg-white/5 p-6 backdrop-blur">
        <p className="text-xs uppercase tracking-[0.35em] text-[#ffd18b]">{act.category}</p>
        <h2 className="mt-3 text-3xl font-semibold">{act.title}</h2>
        <p className="mt-3 max-w-3xl text-sm text-white/75">
          Section-level navigation, multilingual explanations, bookmarks, and cross-links to successor statutes are configured around this act.
        </p>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {["Section 1", "Section 2", "Section 3"].map((section) => (
            <div key={section} className="rounded-2xl border border-white/10 bg-black/10 p-4">
              <p className="text-sm text-[#ffd18b]">{section}</p>
              <p className="mt-2 text-sm text-white/75">Plain-language explanation, cross references, and matter save actions will appear here.</p>
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
