"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Mail, ArrowRight, RefreshCcw, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function VerifyEmailPage() {
  const [email, setEmail] = useState<string | null>(null);
  const [isResending, setIsResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);

  useEffect(() => {
    // In a real app, this would get the email from the auth provider or local storage
    const storedEmail = localStorage.getItem("recastr_signup_email") || "your email address";
    setEmail(storedEmail);
  }, []);

  const handleResend = async () => {
    setIsResending(true);
    // Simulate API call to resend verification email
    await new Promise((resolve) => setTimeout(resolve, 1500));
    setResendSuccess(true);
    setIsResending(false);
    setTimeout(() => setResendSuccess(false), 5000);
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#090909] px-6">
      <div className="w-full max-w-md text-center">
        <div className="mx-auto mb-8 flex h-20 w-20 items-center justify-center rounded-full bg-[#151515] border border-[#232323]">
          <Mail className="h-10 w-10 text-white" />
        </div>

        <h1 className="mb-4 text-3xl font-bold tracking-tight text-white">Check your email</h1>
        
        <p className="mb-8 text-[#8A8A8A]">
          We sent a verification link to <span className="font-medium text-white">{email}</span>. 
          Please click the link to activate your account and access your workspace.
        </p>

        <div className="space-y-4">
          <Button 
            className="w-full" 
            size="lg" 
            variant="secondary"
            onClick={handleResend}
            disabled={isResending || resendSuccess}
          >
            {isResending ? (
              <RefreshCcw className="mr-2 h-4 w-4 animate-spin" />
            ) : resendSuccess ? (
              <CheckCircle className="mr-2 h-4 w-4 text-green-500" />
            ) : (
              <RefreshCcw className="mr-2 h-4 w-4" />
            )}
            {resendSuccess ? "Verification email sent" : "Resend verification email"}
          </Button>

          <Button className="w-full" size="lg" variant="ghost" asChild>
            <Link href="/login">
              Back to log in <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
