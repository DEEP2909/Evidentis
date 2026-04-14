"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Building2, CheckCircle2, Eye, EyeOff, Loader2, Mail, User, XCircle } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const acceptInvitationSchema = z
  .object({
    firstName: z.string().min(1, "First name is required"),
    lastName: z.string().min(1, "Last name is required"),
    password: z
      .string()
      .min(12, "Password must be at least 12 characters")
      .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
      .regex(/[a-z]/, "Password must contain at least one lowercase letter")
      .regex(/[0-9]/, "Password must contain at least one number")
      .regex(/[^A-Za-z0-9]/, "Password must contain at least one special character"),
    confirmPassword: z.string(),
    acceptTerms: z.boolean().refine((value) => value === true, "You must accept the terms"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

type AcceptInvitationFormData = z.infer<typeof acceptInvitationSchema>;

interface InvitationDetails {
  email: string;
  tenantName: string;
  role: string;
  invitedBy: string;
  expiresAt: string;
}

function strengthScore(password: string) {
  let score = 0;
  if (password.length >= 12) score += 25;
  if (/[A-Z]/.test(password)) score += 20;
  if (/[a-z]/.test(password)) score += 20;
  if (/[0-9]/.test(password)) score += 20;
  if (/[^A-Za-z0-9]/.test(password)) score += 15;
  return Math.min(score, 100);
}

function scoreTone(score: number) {
  if (score >= 80) return "bg-green-500";
  if (score >= 55) return "bg-yellow-500";
  return "bg-red-500";
}

export default function InvitationPage() {
  const params = useParams();
  const router = useRouter();
  const token = params.token as string;

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [invitation, setInvitation] = useState<InvitationDetails | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<AcceptInvitationFormData>({
    resolver: zodResolver(acceptInvitationSchema),
    defaultValues: { acceptTerms: false },
  });

  const password = watch("password", "");
  const acceptTerms = watch("acceptTerms");
  const score = useMemo(() => strengthScore(password), [password]);

  useEffect(() => {
    async function fetchInvitation() {
      try {
        const response = await fetch(`/api/invitations/${token}`);
        if (!response.ok) {
          const result = await response.json();
          throw new Error(result.error?.message || "Invalid or expired invitation");
        }
        const result = await response.json();
        setInvitation(result.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load invitation");
      } finally {
        setIsLoading(false);
      }
    }
    fetchInvitation();
  }, [token]);

  const onSubmit = async (data: AcceptInvitationFormData) => {
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`/api/invitations/${token}/accept`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: data.firstName,
          lastName: data.lastName,
          password: data.password,
        }),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error?.message || "Failed to accept invitation");
      }

      setIsSuccess(true);
      toast.success("Account created successfully");
      window.setTimeout(() => router.push("/login"), 2600);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-8">
        <div className="text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-saffron-300" />
          <p className="mt-3 text-sm text-white/65">Loading invitation...</p>
        </div>
      </div>
    );
  }

  if (error && !invitation) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-8">
        <Card className="glass w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-500/15">
              <XCircle className="h-6 w-6 text-red-300" />
            </div>
            <CardTitle className="text-2xl">Invitation not available</CardTitle>
            <CardDescription className="text-white/65">{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/login">
              <Button className="w-full" variant="outline">
                Go to sign in
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,#203b7a_0%,#0f2557_42%,#071226_100%)] p-8">
      <motion.div
        initial={{ opacity: 0, y: 18, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.35 }}
        className="w-full max-w-2xl"
      >
        <Card className="glass border-white/20">
          <CardHeader className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="relative h-12 w-12 overflow-hidden rounded-2xl border border-white/20 bg-white/10 p-1">
                <Image src="/logo.svg" alt="EvidentIS logo" fill className="object-contain p-1" priority />
              </div>
              <div>
                <p className="text-sm uppercase tracking-[0.2em] text-saffron-300">Invitation</p>
                <CardTitle className="text-2xl">Welcome to {invitation?.tenantName}</CardTitle>
              </div>
            </div>
            <CardDescription className="text-white/70">
              Complete your profile to activate your workspace access.
            </CardDescription>
            <Badge className="w-fit bg-saffron-500 text-slate-900">
              Role: {invitation?.role?.replaceAll("_", " ")}
            </Badge>
          </CardHeader>

          <CardContent>
            <AnimatePresence mode="wait">
              {isSuccess ? (
                <motion.div
                  key="success"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="space-y-4 text-center"
                >
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-green-500/15">
                    <CheckCircle2 className="h-7 w-7 text-green-300" />
                  </div>
                  <h3 className="text-xl font-semibold">Account created successfully</h3>
                  <p className="text-sm text-white/65">Redirecting you to sign in...</p>
                  <Link href="/login">
                    <Button className="w-full">Sign in now</Button>
                  </Link>
                </motion.div>
              ) : (
                <motion.form
                  key="form"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  onSubmit={handleSubmit(onSubmit)}
                  className="space-y-4"
                >
                  {error ? (
                    <div className="rounded-lg border border-red-500/35 bg-red-500/12 p-3 text-sm text-red-200">{error}</div>
                  ) : null}

                  <div className="grid gap-4 sm:grid-cols-3">
                    <div className="rounded-lg border border-white/12 bg-white/5 p-3 text-sm">
                      <div className="mb-1 flex items-center gap-2 text-white/55">
                        <Building2 className="h-4 w-4" />
                        Organization
                      </div>
                      <p>{invitation?.tenantName}</p>
                    </div>
                    <div className="rounded-lg border border-white/12 bg-white/5 p-3 text-sm">
                      <div className="mb-1 flex items-center gap-2 text-white/55">
                        <Mail className="h-4 w-4" />
                        Email
                      </div>
                      <p className="truncate">{invitation?.email}</p>
                    </div>
                    <div className="rounded-lg border border-white/12 bg-white/5 p-3 text-sm">
                      <div className="mb-1 flex items-center gap-2 text-white/55">
                        <User className="h-4 w-4" />
                        Invited by
                      </div>
                      <p className="truncate">{invitation?.invitedBy ?? "Admin"}</p>
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="firstName">First Name</Label>
                      <Input id="firstName" {...register("firstName")} className="focus-saffron" disabled={isSubmitting} />
                      {errors.firstName ? <p className="text-sm text-red-300">{errors.firstName.message}</p> : null}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lastName">Last Name</Label>
                      <Input id="lastName" {...register("lastName")} className="focus-saffron" disabled={isSubmitting} />
                      {errors.lastName ? <p className="text-sm text-red-300">{errors.lastName.message}</p> : null}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
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
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/15">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${score}%` }}
                        className={`h-full ${scoreTone(score)}`}
                      />
                    </div>
                    <p className="text-xs text-white/55">Password strength: {score}%</p>
                    {errors.password ? <p className="text-sm text-red-300">{errors.password.message}</p> : null}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirm Password</Label>
                    <div className="relative">
                      <Input
                        id="confirmPassword"
                        type={showConfirmPassword ? "text" : "password"}
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

                  <div className="flex items-start space-x-2">
                    <Checkbox
                      id="acceptTerms"
                      checked={acceptTerms}
                      onCheckedChange={(checked) => setValue("acceptTerms", checked as boolean)}
                      disabled={isSubmitting}
                    />
                    <label htmlFor="acceptTerms" className="cursor-pointer text-sm text-white/65">
                      I agree to the{" "}
                      <Link href="/terms" className="text-saffron-300 hover:underline">
                        Terms of Service
                      </Link>{" "}
                      and{" "}
                      <Link href="/privacy" className="text-saffron-300 hover:underline">
                        Privacy Policy
                      </Link>
                    </label>
                  </div>
                  {errors.acceptTerms ? <p className="text-sm text-red-300">{errors.acceptTerms.message}</p> : null}

                  <Button type="submit" className={`w-full ${isSubmitting ? "shimmer-loading text-slate-900" : ""}`} disabled={isSubmitting}>
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating account...
                      </>
                    ) : (
                      "Accept & Create Account"
                    )}
                  </Button>
                </motion.form>
              )}
            </AnimatePresence>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
