import { useCallback, useRef, useState, type ReactNode } from "react";
import {
  addProject,
  addStage,
  addTask,
  expressInterest,
  loadStore,
  publishParticipantPost,
  rememberProject,
  saveJoinRequest,
  saveStore,
  setStageDependency,
  updateTask,
  type DemoStore,
} from "../../services/demoStore";
import type { NewProjectInput, Project, TaskDraft } from "../../types/project";
import { DemoDataContext } from "./demo-data-context";

export function DemoDataProvider({ children }: { children: ReactNode }) {
  const [store, setStore] = useState<DemoStore>(() => loadStore());
  const [persistError, setPersistError] = useState<string | null>(null);
  const storeRef = useRef(store);

  const commit = useCallback((next: DemoStore) => {
    storeRef.current = next;
    setStore(next);
    setPersistError(saveStore(next));
  }, []);

  const createProject = useCallback(
    (input: NewProjectInput): Project => {
      const next = addProject(storeRef.current, input);
      const { created, ...store } = next;
      commit(store);
      return created;
    },
    [commit],
  );

  const addStageAction = useCallback(
    (projectId: string, name: string, dependsOn?: string[]) => {
      const result = addStage(storeRef.current, projectId, name, dependsOn ?? []);
      if ("error" in result) return result;
      commit(result.store);
      return { stageId: result.stageId };
    },
    [commit],
  );

  const setStageDependencyAction = useCallback(
    (projectId: string, stageId: string, dependsOn: string[]) => {
      const result = setStageDependency(storeRef.current, projectId, stageId, dependsOn);
      if ("error" in result) return result;
      commit(result.store);
      return { ok: true as const };
    },
    [commit],
  );

  const addTaskAction = useCallback(
    (projectId: string, stageId: string, draft: TaskDraft) => {
      const result = addTask(storeRef.current, projectId, stageId, draft);
      if ("error" in result) return result;
      commit(result.store);
      return { taskId: result.taskId };
    },
    [commit],
  );

  const updateTaskAction = useCallback(
    (projectId: string, stageId: string, taskId: string, draft: TaskDraft) => {
      const result = updateTask(storeRef.current, projectId, stageId, taskId, draft);
      if ("error" in result) return result;
      commit(result.store);
      return { ok: true as const };
    },
    [commit],
  );

  const expressInterestAction = useCallback(
    (projectId: string) => {
      const result = expressInterest(storeRef.current, projectId);
      if ("error" in result) return result;
      if (result.store !== storeRef.current) commit(result.store);
      return { ok: true as const };
    },
    [commit],
  );

  const requestJoinAction = useCallback(
    (projectId: string, message: string) => {
      const result = saveJoinRequest(storeRef.current, projectId, message);
      if ("error" in result) return result;
      if (result.store !== storeRef.current) commit(result.store);
      return { ok: true as const };
    },
    [commit],
  );

  const publishPostAction = useCallback(
    (projectId: string, role: string, text: string) => {
      const result = publishParticipantPost(storeRef.current, projectId, role, text);
      if ("error" in result) return result;
      commit(result.store);
      return { ok: true as const };
    },
    [commit],
  );

  const remember = useCallback(
    (projectId: string) => {
      const next = rememberProject(storeRef.current, projectId);
      if (next === storeRef.current) return;
      commit(next);
    },
    [commit],
  );

  return (
    <DemoDataContext.Provider
      value={{
        projects: store.projects,
        lastProjectId: store.lastProjectId,
        interests: store.interests,
        joinRequests: store.joinRequests,
        posts: store.posts,
        persistError,
        createProject,
        addStage: addStageAction,
        setStageDependency: setStageDependencyAction,
        addTask: addTaskAction,
        updateTask: updateTaskAction,
        expressInterest: expressInterestAction,
        requestJoin: requestJoinAction,
        publishPost: publishPostAction,
        remember,
      }}
    >
      {children}
    </DemoDataContext.Provider>
  );
}
