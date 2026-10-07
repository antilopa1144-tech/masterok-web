import { readWorkspaceFile } from "./workspace";
import { saveWorkspace } from "./storage";

/** Validate and persist a separate copy before navigating away from the entry page. */
export async function importAndSaveWorkspace(file: Pick<File, "size" | "text">, signal?: AbortSignal): Promise<string> {
  const workspace = await readWorkspaceFile(file);
  signal?.throwIfAborted();
  await saveWorkspace(workspace);
  return workspace.project.id;
}
