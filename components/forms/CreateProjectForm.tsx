"use client";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useProjectForm } from "@/hooks/useProjectForm";

export function CreateProjectForm() {
  const form = useProjectForm();

  const onSubmit = form.handleSubmit((values) => {
    console.log(values);
  });

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <Input placeholder="Project title" {...form.register("title")} />
      <Input placeholder="Description" {...form.register("description")} />
      <Button type="submit">Create Project</Button>
    </form>
  );
}
