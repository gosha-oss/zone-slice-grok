import type { Project } from "../../types/project";

export type AssistantRequest = {
  command: string;
  project: Project;
  selectedTaskTitle?: string;
};

/** A full reply. Demo mode never streams tokens. */
export type AssistantReply = {
  mode: "demo";
  text: string;
};

/**
 * Seam for a later live provider. A live provider must run on the server:
 * this interface is not a place for API keys, and the demo implementation
 * does not call the network.
 */
export interface AssistantProvider {
  readonly id: string;
  readonly label: string;
  reply(request: AssistantRequest): AssistantReply;
}
