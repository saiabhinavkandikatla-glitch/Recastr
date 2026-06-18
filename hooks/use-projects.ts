import { useQuery } from "@tanstack/react-query";
import { getProjects } from "@/services/project-service";

export function useProjects() {
  return useQuery({
    queryKey: ["projects"],
    queryFn: getProjects,
  });
}
