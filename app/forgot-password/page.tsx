import type { Metadata } from "next";
import { ForgotPasswordForm } from "@/components/auth/ForgotPasswordForm";

export const metadata: Metadata = {
  title: "Recastr — Reset password",
  description: "Reset your Recastr account password.",
};

export default function ForgotPasswordPage() {
  return <ForgotPasswordForm />;
}
