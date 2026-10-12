import { createContext, useContext } from "react";
import type { NewProjectInput, Project, TaskDraft } from "../../types/project";

export type DemoData = {
  projects: Project[];
  lastProjectId: string;
  persistError: string | null;
  createProject: (input: NewProjectInput) => Project;
  addStage: (projectId: string, name: string) => { stageId: string } | { error: string };
  addTask: (projectId: string, stageId: string, draft: TaskDraft) => { taskId: string } | { error: string };
  updateTask: (projectId: string, stageId: string, taskId: string, draft: TaskDraft) => { error: string } | { ok: true };
  remember: (projectId: string) => void;
};

export const DemoDataContext = createContext<DemoData | null>(null);

export function useDemoData(): DemoData {
  const value = useContext(DemoDataContext);
  if (!value) throw new Error("useDemoData must be used inside DemoDataProvider");
  return value;
}
