"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";

import { useAuthStore } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MfaDialog } from "./mfa-dialog";

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

type LoginFormData = z.infer<typeof loginSchema>;

function AshokaChakra() {
  return (
    <svg viewBox="0 0 120 120" className="h-28 w-28 text-saffron-300 ashoka-spin" aria-label="Ashoka Chakra">
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
  const steps = ["Credentials", "MFA", "Access"];
  return (
    <div className="mt-4 flex items-center gap-2">
      {steps.map((step, index) => {
        const active = mfaRequired ? index >= 1 : index === 0;
        return (
          <div key={step} className="flex items-center gap-2">
            <div
              className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] ${
                active ? "bg-saffron-500 text-slate-900" : "border border-white/20 text-white/55"
              }`}
            >
              {index + 1}
            </div>
            {index < steps.length - 1 ? <div className="h-px w-7 bg-white/20" /> : null}
          </div>
        );
      })}
    </div>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const { login, mfaRequired, error, clearError } = useAuthStore();
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

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
        toast.success("Welcome back!");
        router.push("/dashboard");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen">
      <motion.div
        initial={{ opacity: 0, x: -36 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.55 }}
        className="hidden w-1/2 flex-col justify-between bg-[radial-gradient(circle_at_top,#203b7a_0%,#0f2557_42%,#071226_100%)] p-12 lg:flex"
      >
        <div className="flex items-center gap-3">
          <div className="relative h-12 w-12 overflow-hidden rounded-2xl border border-white/20 bg-white/10 p-1">
            <Image src="/logo.svg" alt="EvidentIS logo" fill className="object-contain p-1" priority />
          </div>
          <span className="text-2xl font-semibold text-white">EvidentIS</span>
        </div>

        <div className="space-y-6">
          <AshokaChakra />
          <div>
            <h1 className="text-4xl font-semibold leading-tight text-white">
              India-Ready Legal <br />
              <span className="text-saffron-300">Intelligence Platform</span>
            </h1>
            <p className="mt-4 max-w-md text-lg text-white/75">
              Run multilingual legal operations with AI workflows across all Indian states and UTs.
            </p>
          </div>
        </div>

        <div className="flex gap-8">
          <div>
            <p className="text-3xl font-semibold text-saffron-300">23</p>
            <p className="text-sm text-white/55">Languages</p>
          </div>
          <div>
            <p className="text-3xl font-semibold text-saffron-300">36</p>
            <p className="text-sm text-white/55">Jurisdictions</p>
          </div>
          <div>
            <p className="text-3xl font-semibold text-saffron-300">DPDP</p>
            <p className="text-sm text-white/55">Aligned</p>
          </div>
        </div>
      </motion.div>

      <div className="flex flex-1 items-center justify-center bg-background p-8">
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="w-full max-w-md"
        >
          <div className="mb-8 flex items-center justify-center gap-3 lg:hidden">
            <div className="relative h-12 w-12 overflow-hidden rounded-2xl border border-white/20 bg-white/10 p-1">
              <Image src="/logo.svg" alt="EvidentIS logo" fill className="object-contain p-1" />
            </div>
            <span className="text-2xl font-semibold">EvidentIS</span>
          </div>

          <Card className="glass">
            <CardHeader className="space-y-1">
              <CardTitle className="text-2xl">Sign in</CardTitle>
              <CardDescription className="text-white/65">
                Enter your credentials to access your account
              </CardDescription>
              <MfaSteps mfaRequired={mfaRequired} />
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
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
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="advocate@chambers.in"
                    {...register("email")}
                    disabled={isSubmitting}
                    className="focus-saffron"
                  />
                  {errors.email ? <p className="text-sm text-red-300">{errors.email.message}</p> : null}
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password">Password</Label>
                    <Link href="/forgot-password" className="text-sm text-white/60 transition hover:text-saffron-300">
                      Forgot password?
                    </Link>
                  </div>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      {...register("password")}
                      disabled={isSubmitting}
                      className="focus-saffron pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((value) => !value)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-white/55 hover:text-white"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {errors.password ? <p className="text-sm text-red-300">{errors.password.message}</p> : null}
                </div>

                <Button type="submit" className={`w-full ${isSubmitting ? "shimmer-loading text-slate-900" : ""}`} disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Signing in...
                    </>
                  ) : (
                    "Sign in"
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          <p className="mt-6 text-center text-sm text-white/60">
            Don&apos;t have an account?{" "}
            <Link href="/signup" className="text-saffron-300 hover:underline">
              Contact your administrator
            </Link>
          </p>
        </motion.div>
      </div>

      <MfaDialog />
    </div>
  );
}
