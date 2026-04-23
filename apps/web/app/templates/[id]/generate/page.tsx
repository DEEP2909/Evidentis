"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useParams } from "next/navigation";

import { AppShell } from "@/components/india/AppShell";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Progress } from "@/components/ui/progress";

const wizardSteps = [
  "Select jurisdiction and language",
  "Configure party and filing details",
  "Review AI draft and export",
];

export default function TemplateGeneratePage() {
  const params = useParams();
  const id = params.id as string;
  const [step, setStep] = useState(1);
  const progress = useMemo(() => Math.round((step / wizardSteps.length) * 100), [step]);

  return (
    <AppShell title={`Template · ${id}`}>
      <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <section className="glass p-6">
          <h2 className="text-2xl font-semibold">Generation Wizard</h2>
          <div className="mt-4">
            <Progress value={progress} className="h-2 bg-white/15 [&>div]:bg-saffron-400" />
            <p className="mt-2 text-xs text-white/60">Step {step} of {wizardSteps.length}</p>
          </div>

          <div className="mt-5 space-y-3 text-sm text-white/80">
            {wizardSteps.map((item, index) => (
              <motion.button
                key={item}
                onClick={() => setStep(index + 1)}
                className={`w-full rounded-2xl border p-4 text-left transition ${
                  step === index + 1
                    ? "border-saffron-500/45 bg-saffron-500/15 text-saffron-200"
                    : "border-white/10 bg-black/10 hover:bg-black/20"
                }`}
              >
                {index + 1}. {item}
              </motion.button>
            ))}
          </div>
        </section>

        <section className="glass p-6">
          <h2 className="text-2xl font-semibold">Draft Preview</h2>
          <div className="mt-5 rounded-[2rem] bg-white/90 p-6 text-slate-900">
            <p className="text-xs uppercase tracking-[0.35em] text-[#0f2557]/60">Indian Legal Template Preview</p>
            <h3 className="mt-3 text-2xl font-semibold">Jurisdiction-aware template output</h3>
            <p className="mt-4 text-sm text-slate-600">
              Generated drafts include state-sensitive stamp guidance, matter metadata, bilingual clause rendering, and AI review notes before export.
            </p>
          </div>
          <div className="mt-4 flex justify-end">
            <Button onClick={() => toast.success("Draft generation initiated.")}>Generate Draft</Button>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
