"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Eye, EyeOff, Loader2, Sparkles, ArrowRight, Shield, Scale, Users } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { setTokens } from "@/lib/api";


import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BrandLogo } from "@/components/india/BrandLogo";
import { useTranslation } from "react-i18next";

const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string(),
  invitationCode: z.string().optional(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type RegisterFormData = z.infer<typeof registerSchema>;

const fadeUp = {
  hidden: { opacity: 0, y: 24, filter: "blur(4px)" },
  show: {
    opacity: 1, y: 0, filter: "blur(0px)",
    transition: { type: "tween", ease: [0.22, 1, 0.36, 1], duration: 0.7 },
  },
};

const stagger = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08, delayChildren: 0.15 } },
};

const trialFeatures = [
  { icon: Scale, label: "Unlimited document analysis" },
  { icon: Shield, label: "AI legal research assistance" },
  { icon: Sparkles, label: "Contract risk assessment" },
  { icon: Users, label: "Stakeholder collaboration" },
];

export default function RegisterPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isStakeholder, setIsStakeholder] = useState(false);
  const router = useRouter();
  const { t } = useTranslation();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (data: RegisterFormData) => {
    setIsLoading(true);
    try {
      const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
      const response = await fetch(`${API_BASE}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: data.name,
          email: data.email,
          password: data.password,
          invitationCode: isStakeholder ? data.invitationCode : undefined,
        }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({ message: "Registration failed" }));
        throw new Error(err?.error?.message || err?.message || "Registration failed");
      }

      const result = await response.json();
      const payload = result?.success ? result.data : result;

      // Store tokens
      if (payload?.accessToken) {
        setTokens(payload.accessToken, payload.refreshToken);
      }

      // Store trial end date for the trial banner
      if (payload?.trialEndsAt && typeof window !== "undefined") {
        localStorage.setItem("evidentis_trial_ends_at", payload.trialEndsAt);
      }

      toast.success("Registration successful! Welcome to your 30-day free trial.");
      router.push("/dashboard");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Registration failed. Please try again.";
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
      <div className="grain-overlay min-h-screen flex bg-[#050506]">
      {/* ── Left Panel — Brand & Trial Info ── */}
      <div className="hidden lg:flex lg:w-[48%] items-center justify-center p-12 relative overflow-hidden">
        {/* Background layers */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#0a0d14] via-[#0d1220] to-[#0f1a2e]" />
        <div className="absolute inset-0 grid-pattern opacity-30" />
        <div className="absolute top-1/4 left-1/3 h-[400px] w-[400px] rounded-full bg-saffron-500/10 blur-[120px]" />
        <div className="absolute bottom-0 right-0 h-12 w-12 border-b border-r border-saffron-400/14" />
        <div className="absolute left-0 top-0 h-12 w-12 border-l border-t border-saffron-400/14" />

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
              <h1 className="font-serif text-4xl lg:text-5xl text-white tracking-tight leading-[1.08]">
                Join <span className="italic text-white/40">EvidentIS</span>
              </h1>
              <p className="mt-4 text-base text-white/45 leading-relaxed max-w-sm">
                Start your 30-day free trial and experience the power of AI-driven legal intelligence across 36 Indian jurisdictions.
              </p>
            </motion.div>

            {/* Trial features */}
            <motion.div variants={fadeUp} className="space-y-3">
              <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-saffron-300">
                Free Trial Includes
              </span>
              <div className="grid gap-2.5 mt-3">
                {trialFeatures.map((f, i) => (
                  <motion.div
                    key={f.label}
                    variants={fadeUp}
                    className="flex items-center gap-3 border border-white/[0.05] bg-white/[0.02] px-4 py-3"
                  >
                    <div className="flex h-8 w-8 items-center justify-center border border-saffron-400/12 bg-saffron-500/10">
                      <f.icon className="h-3.5 w-3.5 text-saffron-300" />
                    </div>
                    <span className="text-sm text-white/60">{f.label}</span>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            {/* Trial badge */}
            <motion.div
              variants={fadeUp}
              className="inline-flex items-center gap-2.5 rounded-full border border-saffron-400/16 bg-saffron-500/10 px-5 py-2"
            >
              <span className="h-2 w-2 rounded-full bg-saffron-400 animate-pulse" />
              <span className="text-xs font-medium tracking-wide text-saffron-300">
                30 Days Free — No card required
              </span>
            </motion.div>
          </motion.div>
        </div>
      </div>

      {/* ── Right Panel — Registration Form ── */}
      <div className="flex-1 flex items-center justify-center p-8 relative">
        {/* Subtle ambient glow */}
        <div className="pointer-events-none absolute left-1/2 top-1/2 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-saffron-500/8 blur-[110px]" />

        <motion.div
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.7, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
          className="w-full max-w-md relative z-10"
        >
          {/* Mobile logo */}
          <div className="lg:hidden mb-8 flex justify-center">
            <BrandLogo size="lg" />
          </div>

          <Card className="border border-white/[0.06] bg-white/[0.02] backdrop-blur-xl shadow-2xl shadow-black/40">
            <CardHeader className="space-y-2 pb-4">
              <CardTitle className="text-2xl text-center font-serif text-white tracking-tight">
                {t("auth_registerTitle")}
              </CardTitle>
              <CardDescription className="text-center text-white/40">
                {t("auth_registerSubtitle")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-white/60 text-xs uppercase tracking-wider">
                    {t("auth_fullName")}
                  </Label>
                  <Input
                    id="name"
                    type="text"
                    placeholder="Enter your full name"
                    className="focus-saffron bg-white/[0.03] text-white placeholder:text-white/25"
                    {...register("name")}
                  />
                  {errors.name && (
                    <p className="text-sm text-red-400">{errors.name.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email" className="text-white/60 text-xs uppercase tracking-wider">
                    {t("auth_email")}
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter your email"
                    className="focus-saffron bg-white/[0.03] text-white placeholder:text-white/25"
                    {...register("email")}
                  />
                  {errors.email && (
                    <p className="text-sm text-red-400">{errors.email.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password" className="text-white/60 text-xs uppercase tracking-wider">
                    {t("auth_password")}
                  </Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Create a password (min 8 characters)"
                      className="focus-saffron bg-white/[0.03] pr-10 text-white placeholder:text-white/25"
                      {...register("password")}
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {errors.password && (
                    <p className="text-sm text-red-400">{errors.password.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword" className="text-white/60 text-xs uppercase tracking-wider">
                    {t("auth_confirmPassword")}
                  </Label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="Confirm your password"
                      className="focus-saffron bg-white/[0.03] pr-10 text-white placeholder:text-white/25"
                      {...register("confirmPassword")}
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    >
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {errors.confirmPassword && (
                    <p className="text-sm text-red-400">{errors.confirmPassword.message}</p>
                  )}
                </div>

                {/* Stakeholder toggle */}
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={() => setIsStakeholder(!isStakeholder)}
                    className="flex items-center gap-2 text-xs text-white/35 hover:text-white/60 transition-colors"
                  >
                    <div
                      className={`w-4 h-4 border rounded-sm flex items-center justify-center transition-all ${
                        isStakeholder
                          ? "border-saffron-500 bg-saffron-500"
                          : "border-white/15 bg-transparent"
                      }`}
                    >
                      {isStakeholder && (
                        <svg className="w-3 h-3 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                    <span className="uppercase tracking-wider">I was invited as a stakeholder</span>
                  </button>
                </div>

                {/* Invitation code field (shown when stakeholder is toggled) */}
                {isStakeholder && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                    className="space-y-2"
                  >
                    <Label htmlFor="invitationCode" className="text-white/60 text-xs uppercase tracking-wider">
                      Invitation Code
                    </Label>
                    <Input
                      id="invitationCode"
                      type="text"
                      placeholder="Enter your invitation code"
                      className="focus-saffron bg-white/[0.03] font-mono tracking-wider text-white placeholder:text-white/25"
                      {...register("invitationCode")}
                    />
                    <p className="text-[10px] text-white/25">
                      Invitation codes are sent by the account admin for stakeholder access.
                    </p>
                  </motion.div>
                )}

                <Button
                  type="submit"
                  className="w-full rounded-xl"
                  disabled={isLoading}
                >
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  <Sparkles className="mr-2 h-4 w-4" />
                  Start Free Trial
                </Button>
              </form>

              <div className="mt-6 text-center text-sm text-white/30">
                {t("auth_hasAccount")}{" "}
                <Link href="/login" className="link-ink">
                  {t("login")}
                </Link>
              </div>

              <div className="mt-4 flex items-center justify-center">
                <div className="inline-flex items-center gap-2 rounded-full border border-saffron-400/14 bg-saffron-500/10 px-4 py-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-saffron-400 animate-pulse" />
                  <p className="text-[10px] font-medium uppercase tracking-wider text-saffron-300/80">
                    Trial starts immediately with full access
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
