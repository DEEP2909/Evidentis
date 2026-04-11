import { AppShell } from "@/components/india/AppShell";

export default async function TemplateGeneratePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <AppShell title={`Template · ${id}`}>
      <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <section className="rounded-[2rem] border border-white/10 bg-white/5 p-6 backdrop-blur">
          <h2 className="text-2xl font-semibold">Generation Wizard</h2>
          <div className="mt-5 space-y-3 text-sm text-white/80">
            <div className="rounded-2xl border border-white/10 bg-black/10 p-4">1. Select jurisdiction and language</div>
            <div className="rounded-2xl border border-white/10 bg-black/10 p-4">2. Apply stamp duty and filing guidance</div>
            <div className="rounded-2xl border border-white/10 bg-black/10 p-4">3. Generate bilingual draft with citations</div>
          </div>
        </section>

        <section className="rounded-[2rem] border border-white/10 bg-white/5 p-6 backdrop-blur">
          <h2 className="text-2xl font-semibold">Draft Preview</h2>
          <div className="mt-5 rounded-[2rem] bg-white/90 p-6 text-slate-900">
            <p className="text-xs uppercase tracking-[0.35em] text-[#0f2557]/60">Indian Legal Template Preview</p>
            <h3 className="mt-3 text-2xl font-semibold">Jurisdiction-aware template output</h3>
            <p className="mt-4 text-sm text-slate-600">
              Generated drafts will include state-sensitive stamp guidance, matter metadata, bilingual clause rendering, and AI review notes before export.
            </p>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
