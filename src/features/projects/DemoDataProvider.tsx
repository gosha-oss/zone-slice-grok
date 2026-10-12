import { useCallback, useRef, useState, type ReactNode } from "react";
import {
  addProject,
  addStage,
  addTask,
  loadStore,
  rememberProject,
  saveStore,
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
      commit({ version: 1, lastProjectId: next.lastProjectId, projects: next.projects });
      return next.created;
    },
    [commit],
  );

  const addStageAction = useCallback(
    (projectId: string, name: string) => {
      const result = addStage(storeRef.current, projectId, name);
      if ("error" in result) return result;
      commit(result.store);
      return { stageId: result.stageId };
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
        persistError,
        createProject,
        addStage: addStageAction,
        addTask: addTaskAction,
        updateTask: updateTaskAction,
        remember,
      }}
    >
      {children}
    </DemoDataContext.Provider>
  );
}
