"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";

import { AppShell } from "@/components/india/AppShell";
import { hearingCalendar } from "@/lib/india";
import { useTranslation } from "react-i18next";

type CalendarEvent = {
  id: string;
  title: string;
  court: string;
  urgency: "low" | "medium" | "high";
  day: number;
};

const events: readonly CalendarEvent[] = [
  { id: "e1", title: "Section 138 Complaint", court: "Delhi District Court", urgency: "high", day: 8 },
  { id: "e2", title: "RERA Appeal", court: "MahaRERA Tribunal", urgency: "medium", day: 10 },
  { id: "e3", title: "IBC Admission", court: "NCLT Mumbai Bench", urgency: "high", day: 12 },
  { id: "e4", title: "Consumer Hearing", court: "NCDRC", urgency: "low", day: 16 },
  { id: "e5", title: "Interim Bail Hearing", court: "High Court of Karnataka", urgency: "high", day: 21 },
  { id: "e6", title: "Arbitration Mention", court: "DIAC", urgency: "medium", day: 24 },
];

const weekDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function urgencyStyles(urgency: CalendarEvent["urgency"]) {
  if (urgency === "high") return "border-red-500/35 bg-red-500/12 text-red-200";
  if (urgency === "medium") return "border-yellow-500/35 bg-yellow-500/12 text-yellow-200";
  return "border-green-500/35 bg-green-500/12 text-green-200";
}

export default function CalendarPage() {
  const { t } = useTranslation();
  const [selectedDay, setSelectedDay] = useState(8);

  const days = useMemo(
    () =>
      Array.from({ length: 35 }, (_, index) => ({
        day: index + 1,
        events: events.filter((event) => event.day === index + 1),
      })),
    []
  );

  const upcoming = useMemo(
    () => events.filter((event) => event.day >= selectedDay).slice(0, 5),
    [selectedDay]
  );

  return (
    <AppShell title={t("calendar")}>
      <div className="grid gap-6 xl:grid-cols-[1.35fr_0.65fr]">
        <section className="glass p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-2xl font-semibold">Weekly Hearing Calendar</h2>
            <p className="text-sm text-white/55">April 2026</p>
          </div>

          <div className="grid grid-cols-7 gap-2 text-center text-xs uppercase tracking-[0.16em] text-white/50">
            {weekDays.map((day) => (
              <div key={day} className="rounded-md py-2">
                {day}
              </div>
            ))}
          </div>

          <div className="mt-2 grid grid-cols-7 gap-2">
            {days.map((entry) => (
              <motion.button
                key={entry.day}
                onClick={() => setSelectedDay(entry.day)}
                className={`min-h-24 rounded-xl border p-2 text-left transition ${
                  selectedDay === entry.day
                    ? "border-saffron-500/45 bg-saffron-500/12"
                    : "border-white/15 bg-white/5 hover:bg-white/10"
                }`}
                aria-label={`Select day ${entry.day}`}
              >
                <div className="mb-1 text-xs text-white/65">{entry.day}</div>
                <div className="space-y-1">
                  {entry.events.map((event) => (
                    <div
                      key={event.id}
                      className={`rounded-md border px-1.5 py-1 text-[10px] ${urgencyStyles(event.urgency)}`}
                    >
                      <span className="inline-flex items-center gap-1">
                        <span className="inline-flex h-1.5 w-1.5 animate-pulse rounded-full bg-current" />
                        {event.title}
                      </span>
                    </div>
                  ))}
                </div>
              </motion.button>
            ))}
          </div>
        </section>

        <section className="space-y-4">
          <div className="glass p-5">
            <h2 className="text-lg font-semibold">Upcoming Hearings</h2>
            <div className="mt-4 space-y-3">
              {upcoming.map((event, index) => (
                <motion.div
                  key={event.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.04 }}
                  className="rounded-xl border border-white/15 bg-white/5 p-3"
                >
                  <p className="text-xs text-saffron-300">Day {event.day}</p>
                  <h3 className="mt-1 text-sm font-semibold">{event.title}</h3>
                  <p className="text-xs text-white/60">{event.court}</p>
                  <span className={`mt-2 inline-block rounded-full border px-2 py-0.5 text-xs ${urgencyStyles(event.urgency)}`}>
                    {event.urgency}
                  </span>
                </motion.div>
              ))}
            </div>
          </div>

          <div className="glass p-5">
            <h2 className="text-lg font-semibold">Quick Docket Snapshot</h2>
            <div className="mt-3 space-y-2 text-sm text-white/70">
              {hearingCalendar.map((hearing) => (
                <div key={hearing.title} className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 px-3 py-2">
                  <span>{hearing.title}</span>
                  <span className="text-xs text-white/55">{hearing.date}</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
