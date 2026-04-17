"use client";

import { Suspense } from "react";

import Link from "next/link";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { Eye, EyeOff, Loader2, ShieldCheck, Lock, Globe2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";

import { useAuthStore } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BrandLogo } from "@/components/india/BrandLogo";
import { MfaDialog } from "./mfa-dialog";
import { useTranslation } from "react-i18next";

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

type LoginFormData = z.infer<typeof loginSchema>;

function AshokaChakra() {
  return (
    <svg
      viewBox="0 0 120 120"
      className="h-28 w-28 text-saffron-300 ashoka-spin"
      aria-label="Ashoka Chakra"
    >
      <title>Ashoka Chakra</title>
      {/* Outer glow ring */}
      <circle
        cx="60" cy="60" r="56"
        fill="none"
        stroke="currentColor"
        strokeWidth="0.5"
        opacity="0.2"
      />
      <circle cx="60" cy="60" r="52" fill="none" stroke="currentColor" strokeWidth="3" />
      <circle cx="60" cy="60" r="6" fill="currentColor" />
      {Array.from({ length: 24 }).map((_, index) => {
        const angle = (index * 360) / 24;
        return (
          <line
            key={angle}
            x1="60"
            y1="60"
            x2="60"
            y2="12"
            stroke="currentColor"
            strokeWidth="2"
            transform={`rotate(${angle} 60 60)`}
          />
        );
      })}
    </svg>
  );
}

function MfaSteps({ mfaRequired }: { mfaRequired: boolean }) {
  const { t } = useTranslation();
  const steps = [t("auth_stepCredentials"), t("auth_stepMFA"), t("auth_stepAccess")];
  return (
    <div className="mt-4 flex items-center gap-2">
      {steps.map((step, index) => {
        const active = mfaRequired ? index >= 1 : index === 0;
        const completed = mfaRequired ? index === 0 : false;
        return (
          <div key={step} className="flex items-center gap-2">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: index * 0.08, duration: 0.3 }}
              className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-semibold transition-all duration-300 ${
                completed
                  ? "bg-green-500/20 text-green-400 ring-1 ring-green-500/40"
                  : active
                  ? "bg-saffron-500 text-slate-900 shadow-md shadow-saffron-500/30"
                  : "border border-white/20 text-white/55"
              }`}
            >
              {completed ? "✓" : index + 1}
            </motion.div>
            {index < steps.length - 1 ? (
              <div className="h-px w-7 bg-white/20 transition-colors">
                <div
                  className={`h-full transition-all duration-500 ${
                    completed ? "bg-saffron-500/60 w-full" : "w-0"
                  }`}
                />
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}



function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, mfaRequired, error, clearError } = useAuthStore();
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { t } = useTranslation();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    clearError();
    setIsSubmitting(true);

    try {
      const success = await login(data.email, data.password);
      if (success && !mfaRequired) {
        toast.success(t("auth_loginTitle"));
        const returnUrl = searchParams.get("returnUrl");
        router.push(returnUrl ? decodeURIComponent(returnUrl) : "/dashboard");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen">

      {/* ── Left hero panel ── */}
      <motion.div
        initial={{ opacity: 0, x: -36 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.55 }}
        className="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-[radial-gradient(circle_at_top,#203b7a_0%,#0f2557_42%,#071226_100%)] p-12 lg:flex"
      >
        {/* Atmospheric grid */}
        <div className="pointer-events-none absolute inset-0 bg-grid opacity-100" />

        {/* Animated orbs */}
        <div
          aria-hidden="true"
          className="animated-orb orb-saffron absolute -top-16 -right-16 h-72 w-72 opacity-40"
        />
        <div
          aria-hidden="true"
          className="animated-orb orb-navy absolute bottom-0 -left-12 h-80 w-80 opacity-50"
        />

        {/* Floating particles */}
        <span
          className="float-particle absolute left-16 top-1/3 h-1.5 w-1.5 rounded-full bg-saffron-300/60"
          aria-hidden="true"
        />
        <span
          className="float-particle absolute right-24 top-2/3 h-1 w-1 rounded-full bg-white/40"
          style={{ animationDelay: "2.5s" }}
          aria-hidden="true"
        />

        {/* Logo */}
        <div className="relative flex items-center gap-0">
          <BrandLogo size="lg" priority />
        </div>

        {/* Center content */}
        <div className="relative space-y-6">
          {/* Ashoka Chakra with subtle glow ring */}
          <div className="relative inline-block">
            <div className="absolute inset-0 rounded-full bg-saffron-500/10 blur-2xl scale-150" />
            <AshokaChakra />
          </div>

          <div>
            <span className="gold-rule" />
            <h1 className="text-4xl font-semibold leading-tight text-white">
              {t("auth_heroTitle1")} <br />
              <span className="text-saffron-300">{t("auth_heroTitle2")}</span>
            </h1>
            <p className="mt-4 max-w-md text-lg text-white/75">
              {t("auth_heroSubtitle")}
            </p>
          </div>
        </div>

        {/* Stats footer */}
        <motion.div
          className="relative flex gap-8"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.5 }}
        >
          {[
            { value: "23", label: t("auth_statLanguages") },
            { value: "36", label: t("auth_statJurisdictions") },
            { value: "DPDP", label: t("auth_statAligned") },
          ].map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.55 + index * 0.08, duration: 0.35 }}
              className="stat-item"
            >
              <span className="stat-value">{stat.value}</span>
              <span className="stat-label">{stat.label}</span>
            </motion.div>
          ))}
        </motion.div>
      </motion.div>

      {/* ── Right form panel ── */}
      <div className="flex flex-1 items-center justify-center bg-background p-8">
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="w-full max-w-md"
        >
          {/* Mobile-only logo */}
          <div className="mb-8 flex items-center justify-center gap-0 lg:hidden">
            <BrandLogo size="lg" />
          </div>

          <Card className="glass border-glow">
            <CardHeader className="space-y-1 pb-4">
              <CardTitle className="text-2xl font-semibold">{t("auth_loginTitle")}</CardTitle>
              <CardDescription className="text-white/65">
                {t("auth_loginSubtitle")}
              </CardDescription>
              <MfaSteps mfaRequired={mfaRequired} />
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                {error ? (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className="rounded-lg border border-red-500/35 bg-red-500/12 p-3 text-sm text-red-200"
                  >
                    {error}
                  </motion.div>
                ) : null}

                <div className="space-y-2">
                  <Label htmlFor="email">{t("auth_email")}</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="advocate@chambers.in"
                    {...register("email")}
                    disabled={isSubmitting}
                    className="focus-saffron transition-all duration-200"
                  />
                  {errors.email ? <p className="text-sm text-red-300">{errors.email.message}</p> : null}
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password">{t("auth_password")}</Label>
                    <Link
                      href="/forgot-password"
                      className="link-ink text-sm text-white/60 transition hover:text-saffron-300"
                    >
                      {t("auth_forgotPassword")}
                    </Link>
                  </div>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      {...register("password")}
                      disabled={isSubmitting}
                      className="focus-saffron pr-10 transition-all duration-200"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-white/55 transition-all hover:text-white hover:scale-110 z-10 cursor-pointer"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {errors.password ? <p className="text-sm text-red-300">{errors.password.message}</p> : null}
                </div>

                <Button
                  type="submit"
                  id="login-submit"
                  className={`w-full transition-all ${isSubmitting ? "shimmer-loading text-slate-900" : ""}`}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {t("auth_signingIn")}
                    </>
                  ) : (
                    t("login")
                  )}
                </Button>
              </form>

              {/* Trust badges */}
              <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
                <span className="trust-badge">
                  <ShieldCheck className="h-3 w-3 text-green-400" />
                  {t("trust_dpdp")}
                </span>
                <span className="trust-badge">
                  <Lock className="h-3 w-3 text-saffron-400" />
                  {t("trust_mfa")}
                </span>
                <span className="trust-badge">
                  <Globe2 className="h-3 w-3 text-blue-400" />
                  {t("trust_dataResidency")}
                </span>
              </div>
            </CardContent>
          </Card>

          <p className="mt-6 text-center text-sm text-white/60">
            {t("auth_noAccount")}{" "}
            <Link href="/signup" className="link-ink text-saffron-300 hover:text-saffron-200">
              Contact your administrator
            </Link>
          </p>
        </motion.div>
      </div>

      <MfaDialog />
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-slate-950"><Loader2 className="h-8 w-8 animate-spin text-saffron-500" /></div>}>
      <LoginContent />
    </Suspense>
  );
}
