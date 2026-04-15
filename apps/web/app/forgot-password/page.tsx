"use client";

import Link from "next/link";
import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, CheckCircle2, Loader2, Mail } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BrandLogo } from "@/components/india/BrandLogo";

const forgotPasswordSchema = z.object({
  email: z.string().email("Invalid email address"),
});

type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

function LeftBrandPanel() {
  return (
    <div className="hidden w-1/2 flex-col justify-between bg-[radial-gradient(circle_at_top,#203b7a_0%,#0f2557_42%,#071226_100%)] p-12 lg:flex">
      <div className="flex items-center gap-3">
        <BrandLogo size="lg" priority />
        <span className="text-2xl font-semibold text-white">EvidentIS</span>
      </div>

      <div>
        <h1 className="text-4xl font-semibold leading-tight text-white">
          Recover Access
          <br />
          <span className="text-saffron-300">Securely</span>
        </h1>
        <p className="mt-4 max-w-md text-lg text-white/75">
          We will send password reset instructions to your registered email.
        </p>
      </div>

      <div className="text-sm text-white/55">DPDP-compliant recovery workflow</div>
    </div>
  );
}

export default function ForgotPasswordPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  const onSubmit = async (data: ForgotPasswordFormData) => {
    setIsSubmitting(true);

    try {
      await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: data.email }),
      });
      setSubmittedEmail(data.email);
      setIsSubmitted(true);
      toast.success("Check your email for reset instructions");
    } catch {
      setSubmittedEmail(data.email);
      setIsSubmitted(true);
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
            <BrandLogo size="lg" />
            <span className="text-2xl font-semibold">EvidentIS</span>
          </div>

          {isSubmitted ? (
            <Card className="glass">
              <CardHeader className="text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-500/20">
                  <CheckCircle2 className="h-6 w-6 text-green-300" />
                </div>
                <CardTitle className="text-2xl">Check your email</CardTitle>
                <CardDescription className="text-white/65">
                  If an account exists for <strong>{submittedEmail}</strong>, we have sent reset instructions.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-lg border border-white/15 bg-white/5 p-4 text-sm text-white/70">
                  <p className="mb-1">Did not receive an email?</p>
                  <p>Check spam, verify the address, and retry in a few minutes.</p>
                </div>
                <Button variant="outline" className="w-full border-white/25 text-white/80" onClick={() => setIsSubmitted(false)}>
                  <Mail className="mr-2 h-4 w-4" />
                  Try a different email
                </Button>
                <Link href="/login" className="inline-flex items-center gap-1 text-sm text-white/60 hover:text-saffron-300">
                  <ArrowLeft className="h-3 w-3" />
                  Back to sign in
                </Link>
              </CardContent>
            </Card>
          ) : (
            <Card className="glass">
              <CardHeader>
                <CardTitle className="text-2xl">Forgot password?</CardTitle>
                <CardDescription className="text-white/65">
                  Enter your email and we will send a secure reset link.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
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
                  <Button type="submit" className={`w-full ${isSubmitting ? "shimmer-loading text-slate-900" : ""}`} disabled={isSubmitting}>
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      "Send reset link"
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          )}
        </motion.div>
      </div>
    </div>
  );
}
