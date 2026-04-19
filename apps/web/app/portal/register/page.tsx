"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Loader2,
  ArrowLeft,
  Users,
  FileCheck,
  ShieldCheck,
  Building2,
} from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { setTokens } from "@/lib/api";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BrandLogo } from "@/components/india/BrandLogo";
import { useTranslation } from "react-i18next";

const stakeholderSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  company: z.string().min(2, "Company name is required"),
  invitationCode: z.string().min(4, "Invitation code is required"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type StakeholderFormData = z.infer<typeof stakeholderSchema>;

const fadeUp = {
  hidden: { opacity: 0, y: 24, filter: "blur(4px)" },
  show: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { type: "tween", ease: [0.22, 1, 0.36, 1], duration: 0.7 },
  },
};

const stagger = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.2 },
  },
};

const stakeholderBenefits = [
  {
    icon: FileCheck,
    title: "Document Review",
    description: "Review, comment on, and approve shared legal documents.",
  },
  {
    icon: ShieldCheck,
    title: "Secure Access",
    description:
      "End-to-end encrypted access with jurisdiction-aware permissions.",
  },
  {
    icon: Users,
    title: "Collaboration",
    description:
      "Real-time collaboration with the legal team on matters and contracts.",
  },
  {
    icon: Building2,
    title: "Organisation View",
    description:
      "View obligations, deadlines, and compliance status for your matters.",
  },
];

export default function StakeholderRegisterPage() {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { t } = useTranslation();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<StakeholderFormData>({
    resolver: zodResolver(stakeholderSchema),
  });

  const onSubmit = async (data: StakeholderFormData) => {
    setIsLoading(true);
    try {
      const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
      const response = await fetch(`${API_BASE}/api/auth/register/stakeholder`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: data.name,
          email: data.email,
          company: data.company,
          invitationCode: data.invitationCode,
          password: data.password,
        }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({ message: "Registration failed" }));
        throw new Error(err?.error?.message || err?.message || "Registration failed");
      }

      const result = await response.json();
      const payload = result?.success ? result.data : result;

      if (payload?.accessToken) {
        setTokens(payload.accessToken, payload.refreshToken);
      }

      toast.success(
        "Stakeholder account created! You can now access shared documents."
      );
      router.push("/dashboard");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Registration failed. Please check your invitation code.";
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="grain-overlay min-h-screen flex bg-[#050506]">
      {/* ── Left Panel — Stakeholder Info ── */}
      <div className="hidden lg:flex lg:w-[48%] items-center justify-center p-12 relative overflow-hidden">
        {/* Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#0a0d14] via-[#0d1220] to-[#0f1a2e]" />
        <div className="absolute inset-0 grid-pattern opacity-25" />
        <div className="absolute top-1/3 right-1/4 w-[350px] h-[350px] bg-[#138808]/[0.04] rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 left-1/4 h-[300px] w-[300px] rounded-full bg-saffron-500/10 blur-[110px]" />
        <div className="absolute bottom-0 right-0 w-12 h-12 border-r border-b border-white/[0.06]" />
        <div className="absolute top-0 left-0 w-12 h-12 border-l border-t border-white/[0.06]" />

        <div className="relative z-10 max-w-md">
          <motion.div
            variants={stagger}
            initial="hidden"
            animate="show"
            className="space-y-10"
          >
            <motion.div variants={fadeUp}>
              <BrandLogo size="xl" />
            </motion.div>

            <motion.div variants={fadeUp}>
              <div className="inline-flex items-center gap-2 rounded-sm bg-white/[0.04] px-3 py-1.5 border border-white/[0.06] mb-6">
                <Users className="h-3.5 w-3.5 text-saffron-300" />
                <span className="text-[10px] uppercase tracking-[0.2em] text-white/50 font-medium">
                  Stakeholder Portal
                </span>
              </div>
              <h1 className="font-serif text-4xl lg:text-5xl text-white tracking-tight leading-[1.08]">
                External{" "}
                <span className="italic text-white/40">Stakeholder</span>
                <br />
                Access
              </h1>
              <p className="mt-4 text-base text-white/40 leading-relaxed max-w-sm">
                You&apos;ve been invited to collaborate on the EvidentIS
                platform. Register with your invitation code to access shared
                legal documents and matters.
              </p>
            </motion.div>

            {/* Benefits */}
            <motion.div variants={fadeUp} className="space-y-3">
              <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-saffron-300">
                What You Can Do
              </span>
              <div className="grid gap-2.5 mt-3">
                {stakeholderBenefits.map((b) => (
                  <motion.div
                    key={b.title}
                    variants={fadeUp}
                    className="flex items-start gap-3 border border-white/[0.04] bg-white/[0.015] px-4 py-3.5"
                  >
                    <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center border border-saffron-400/12 bg-saffron-500/10">
                      <b.icon className="h-3.5 w-3.5 text-saffron-300" />
                    </div>
                    <div>
                      <span className="text-sm text-white/70 font-medium">
                        {b.title}
                      </span>
                      <p className="text-xs text-white/30 mt-0.5">
                        {b.description}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        </div>
      </div>

      {/* ── Right Panel — Form ── */}
      <div className="flex-1 flex items-center justify-center p-8 relative">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-[#138808]/[0.015] rounded-full blur-[100px] pointer-events-none" />

        <motion.div
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{
            duration: 0.7,
            delay: 0.2,
            ease: [0.22, 1, 0.36, 1],
          }}
          className="w-full max-w-md relative z-10"
        >
          {/* Back link */}
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-xs text-white/30 hover:text-white/60 transition-colors mb-6 uppercase tracking-wider"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Home
          </Link>

          {/* Mobile logo */}
          <div className="lg:hidden mb-6 flex justify-center">
            <BrandLogo size="lg" />
          </div>

          <Card className="border border-white/[0.06] bg-white/[0.02] backdrop-blur-xl shadow-2xl shadow-black/40">
            <CardHeader className="space-y-2 pb-4">
              <div className="flex items-center justify-center gap-2 mb-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-sm border border-saffron-400/15 bg-saffron-500/10">
                  <Users className="h-4 w-4 text-saffron-300" />
                </div>
              </div>
              <CardTitle className="text-2xl text-center font-serif text-white tracking-tight">
                Stakeholder Registration
              </CardTitle>
              <CardDescription className="text-center text-white/35">
                Register with the invitation code provided by your legal team
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                {/* Invitation Code — prominent placement */}
                <div className="space-y-2 pb-2 border-b border-white/[0.04]">
                  <Label
                    htmlFor="invitationCode"
                    className="text-xs font-semibold uppercase tracking-wider text-saffron-300"
                  >
                    Invitation Code
                  </Label>
                  <Input
                    id="invitationCode"
                    type="text"
                    placeholder="e.g. INV-XXXX-XXXX"
                    className="focus-saffron bg-white/[0.03] font-mono tracking-widest text-center text-white placeholder:text-white/20"
                    {...register("invitationCode")}
                  />
                  {errors.invitationCode && (
                    <p className="text-sm text-red-400">
                      {errors.invitationCode.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label
                    htmlFor="name"
                    className="text-white/60 text-xs uppercase tracking-wider"
                  >
                    {t("auth_fullName")}
                  </Label>
                  <Input
                    id="name"
                    type="text"
                    placeholder="Your full name"
                    className="focus-saffron bg-white/[0.03] text-white placeholder:text-white/20"
                    {...register("name")}
                  />
                  {errors.name && (
                    <p className="text-sm text-red-400">
                      {errors.name.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label
                    htmlFor="email"
                    className="text-white/60 text-xs uppercase tracking-wider"
                  >
                    {t("auth_email")}
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="Your work email"
                    className="focus-saffron bg-white/[0.03] text-white placeholder:text-white/20"
                    {...register("email")}
                  />
                  {errors.email && (
                    <p className="text-sm text-red-400">
                      {errors.email.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label
                    htmlFor="company"
                    className="text-white/60 text-xs uppercase tracking-wider"
                  >
                    Company / Organisation
                  </Label>
                  <Input
                    id="company"
                    type="text"
                    placeholder="Your organisation name"
                    className="focus-saffron bg-white/[0.03] text-white placeholder:text-white/20"
                    {...register("company")}
                  />
                  {errors.company && (
                    <p className="text-sm text-red-400">
                      {errors.company.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label
                    htmlFor="password"
                    className="text-white/60 text-xs uppercase tracking-wider"
                  >
                    {t("auth_password")}
                  </Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Create a password (min 8 characters)"
                    className="focus-saffron bg-white/[0.03] text-white placeholder:text-white/20"
                    {...register("password")}
                  />
                  {errors.password && (
                    <p className="text-sm text-red-400">
                      {errors.password.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label
                    htmlFor="confirmPassword"
                    className="text-white/60 text-xs uppercase tracking-wider"
                  >
                    {t("auth_confirmPassword")}
                  </Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="Confirm your password"
                    className="focus-saffron bg-white/[0.03] text-white placeholder:text-white/20"
                    {...register("confirmPassword")}
                  />
                  {errors.confirmPassword && (
                    <p className="text-sm text-red-400">
                      {errors.confirmPassword.message}
                    </p>
                  )}
                </div>

                <Button
                  type="submit"
                  className="mt-2 w-full rounded-xl"
                  disabled={isLoading}
                >
                  {isLoading && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  <Users className="mr-2 h-4 w-4" />
                  Create Stakeholder Account
                </Button>
              </form>

              <div className="mt-6 text-center space-y-2">
                <p className="text-sm text-white/30">
                  {t("auth_hasAccount")}{" "}
                  <Link
                    href="/login"
                    className="link-ink"
                  >
                    {t("login")}
                  </Link>
                </p>
                <p className="text-sm text-white/30">
                  Not a stakeholder?{" "}
                  <Link
                    href="/register"
                    className="link-ink"
                  >
                    Start a free trial
                  </Link>
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
