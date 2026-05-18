"use client";

import ProjectEstimateView from "@/components/projects/ProjectEstimateView";

export default function ProjectDetailClient({ projectId }: { projectId: string }) {
  return <ProjectEstimateView projectId={projectId} />;
}
