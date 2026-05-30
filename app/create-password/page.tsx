import type { Metadata } from "next";
import { CreatePasswordForm } from "@/components/auth/CreatePasswordForm";

export const metadata: Metadata = {
  title: "Create password | Recastr",
};

export default function CreatePasswordPage() {
  return <CreatePasswordForm />;
}
