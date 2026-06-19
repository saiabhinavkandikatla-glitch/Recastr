"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type PasswordFieldProps = {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  showStrength?: boolean;
  placeholder?: string;
  label?: string;
  autoComplete?: string;
  error?: string;
};

const strengthLabels = ["Weak", "Fair", "Good", "Strong"];
const strengthColors = ["#ef4444", "#f59e0b", "#eab308", "#22c55e"];

function getStrength(pw: string) {
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  return score;
}

export function PasswordField({
  id = "password",
  value,
  onChange,
  showStrength = false,
  placeholder = "••••••••",
  label = "Password",
  autoComplete = "current-password",
  error,
}: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);
  const strength = showStrength ? getStrength(value) : 0;

  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-xs font-medium text-muted-foreground">
        {label}
      </Label>
      <div className="password-input-wrapper relative">
        <Input
          id={id}
          type={visible ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          minLength={8}
          required
          className="h-11 rounded-xl border-[var(--app-line)] bg-[var(--app-bg)]/60 pr-10 text-sm placeholder:text-muted-foreground/60 focus-visible:border-violet-500/40 focus-visible:ring-violet-500/40"
        />
        <button
          type="button"
          className="password-toggle absolute right-3 top-1/2 flex -translate-y-1/2 items-center text-muted-foreground/60 transition-colors hover:text-foreground"
          onClick={() => setVisible(!visible)}
          aria-label={visible ? "Hide password" : "Show password"}
        >
          {visible ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>

      {showStrength && value.length > 0 && (
        <div className="password-strength flex items-center gap-2">
          <div className="strength-bars flex flex-1 gap-1">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className="strength-bar h-[3px] flex-1 rounded-sm transition-colors duration-200"
                style={{
                  background: i < strength ? strengthColors[strength - 1] : "var(--app-line)",
                }}
              />
            ))}
          </div>
          <span
            className="strength-label min-w-10 text-[11px] font-medium"
            style={{ color: strength > 0 ? strengthColors[strength - 1] : undefined }}
          >
            {strength > 0 ? strengthLabels[strength - 1] : ""}
          </span>
        </div>
      )}

      {error ? <p className="text-xs text-red-400">{error}</p> : null}
    </div>
  );
}
