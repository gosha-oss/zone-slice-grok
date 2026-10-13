import { createContext, useContext } from "react";
import type { Interest, JoinRequest, NewProjectInput, ParticipantPost, Project, TaskDraft } from "../../types/project";

export type DemoData = {
  projects: Project[];
  lastProjectId: string;
  interests: Interest[];
  joinRequests: JoinRequest[];
  posts: ParticipantPost[];
  persistError: string | null;
  createProject: (input: NewProjectInput) => Project;
  addStage: (projectId: string, name: string, dependsOn?: string[]) => { stageId: string } | { error: string };
  setStageDependency: (projectId: string, stageId: string, dependsOn: string[]) => { error: string } | { ok: true };
  addTask: (projectId: string, stageId: string, draft: TaskDraft) => { taskId: string } | { error: string };
  updateTask: (projectId: string, stageId: string, taskId: string, draft: TaskDraft) => { error: string } | { ok: true };
  expressInterest: (projectId: string) => { error: string } | { ok: true };
  requestJoin: (projectId: string, message: string) => { error: string } | { ok: true };
  publishPost: (projectId: string, role: string, text: string) => { error: string } | { ok: true };
  remember: (projectId: string) => void;
};

export const DemoDataContext = createContext<DemoData | null>(null);

export function useDemoData(): DemoData {
  const value = useContext(DemoDataContext);
  if (!value) throw new Error("useDemoData must be used inside DemoDataProvider");
  return value;
}
