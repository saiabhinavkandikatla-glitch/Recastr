import type { Metadata } from "next";
import { CreatePasswordForm } from "@/components/auth/CreatePasswordForm";

export const metadata: Metadata = {
  title: "Recastr — Set new password",
  description: "Set a new password for your Recastr account.",
};

export default function ResetPasswordPage() {
  return <CreatePasswordForm />;
}
