"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, CheckCircle2, Eye, EyeOff, Loader2, XCircle } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const resetPasswordSchema = z
  .object({
    password: z
      .string()
      .min(12, "Password must be at least 12 characters")
      .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
      .regex(/[a-z]/, "Password must contain at least one lowercase letter")
      .regex(/[0-9]/, "Password must contain at least one number")
      .regex(/[^A-Za-z0-9]/, "Password must contain at least one special character"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;

function LeftBrandPanel() {
  return (
    <div className="hidden w-1/2 flex-col justify-between bg-[radial-gradient(circle_at_top,#203b7a_0%,#0f2557_42%,#071226_100%)] p-12 lg:flex">
      <div className="flex items-center gap-3">
        <div className="relative h-12 w-12 overflow-hidden rounded-2xl border border-white/20 bg-white/10 p-1">
          <Image src="/logo.svg" alt="EvidentIS logo" fill className="object-contain p-1" priority />
        </div>
        <span className="text-2xl font-semibold text-white">EvidentIS</span>
      </div>

      <div>
        <h1 className="text-4xl font-semibold leading-tight text-white">
          Set a New
          <br />
          <span className="text-saffron-300">Secure Password</span>
        </h1>
        <p className="mt-4 max-w-md text-lg text-white/75">
          Passwords should be unique and meet enterprise security policy.
        </p>
      </div>

      <div className="text-sm text-white/55">12+ chars · upper/lower · number · symbol</div>
    </div>
  );
}

function SuccessCheck() {
  return (
    <svg viewBox="0 0 52 52" className="check-draw h-12 w-12" aria-label="Success checkmark">
      <circle cx="26" cy="26" r="24" fill="none" stroke="rgba(34,197,94,0.35)" strokeWidth="2" />
      <path d="M14 27 L22 35 L38 18" fill="none" stroke="#86efac" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function ResetPasswordPage() {
  const params = useParams();
  const router = useRouter();
  const token = params.token as string;

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
  });

  const password = watch("password", "");
  const passwordRequirements = [
    { label: "At least 12 characters", met: password.length >= 12 },
    { label: "One uppercase letter", met: /[A-Z]/.test(password) },
    { label: "One lowercase letter", met: /[a-z]/.test(password) },
    { label: "One number", met: /[0-9]/.test(password) },
    { label: "One special character", met: /[^A-Za-z0-9]/.test(password) },
  ];

  const onSubmit = async (data: ResetPasswordFormData) => {
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password: data.password }),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error?.message || "Failed to reset password");
      }

      setIsSuccess(true);
      toast.success("Password reset successfully");
      window.setTimeout(() => router.push("/login"), 2600);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen">
      <LeftBrandPanel />
      <div className="flex flex-1 items-center justify-center bg-background p-8">
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="w-full max-w-md"
        >
          <div className="mb-8 flex items-center justify-center gap-3 lg:hidden">
            <div className="relative h-12 w-12 overflow-hidden rounded-2xl border border-white/20 bg-white/10 p-1">
              <Image src="/logo.svg" alt="EvidentIS logo" fill className="object-contain p-1" />
            </div>
            <span className="text-2xl font-semibold">EvidentIS</span>
          </div>

          {isSuccess ? (
            <Card className="glass">
              <CardHeader className="text-center">
                <div className="mx-auto mb-3 flex items-center justify-center">
                  <SuccessCheck />
                </div>
                <CardTitle className="text-2xl">Password reset complete</CardTitle>
                <CardDescription className="text-white/65">
                  Redirecting you to sign in...
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Link href="/login">
                  <Button className="w-full">Sign in now</Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            <Card className="glass">
              <CardHeader>
                <CardTitle className="text-2xl">Reset your password</CardTitle>
                <CardDescription className="text-white/65">
                  Enter a new strong password for your account.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                  {error ? (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      className="flex items-start gap-2 rounded-lg border border-red-500/35 bg-red-500/12 p-3 text-sm text-red-200"
                    >
                      <XCircle className="mt-0.5 h-4 w-4 shrink-0" />
                      <span>{error}</span>
                    </motion.div>
                  ) : null}

                  <div className="space-y-2">
                    <Label htmlFor="password">New Password</Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••••••"
                        {...register("password")}
                        className="focus-saffron pr-10"
                        disabled={isSubmitting}
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

                  {password ? (
                    <div className="space-y-2 rounded-lg border border-white/15 bg-white/5 p-3">
                      <p className="text-xs text-white/60">Password requirements</p>
                      <ul className="space-y-1">
                        {passwordRequirements.map((requirement) => (
                          <li key={requirement.label} className="flex items-center gap-2 text-xs">
                            {requirement.met ? (
                              <CheckCircle2 className="h-3 w-3 text-green-300" />
                            ) : (
                              <XCircle className="h-3 w-3 text-white/45" />
                            )}
                            <span className={requirement.met ? "text-green-300" : "text-white/55"}>
                              {requirement.label}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}

                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirm Password</Label>
                    <div className="relative">
                      <Input
                        id="confirmPassword"
                        type={showConfirmPassword ? "text" : "password"}
                        placeholder="••••••••••••"
                        {...register("confirmPassword")}
                        className="focus-saffron pr-10"
                        disabled={isSubmitting}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword((value) => !value)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-white/55 hover:text-white"
                        aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
                      >
                        {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    {errors.confirmPassword ? <p className="text-sm text-red-300">{errors.confirmPassword.message}</p> : null}
                  </div>

                  <Button type="submit" className={`w-full ${isSubmitting ? "shimmer-loading text-slate-900" : ""}`} disabled={isSubmitting}>
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Resetting...
                      </>
                    ) : (
                      "Reset password"
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          )}

          <p className="mt-6">
            <Link href="/login" className="inline-flex items-center gap-1 text-sm text-white/60 hover:text-saffron-300">
              <ArrowLeft className="h-3 w-3" />
              Back to sign in
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
