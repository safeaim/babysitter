"use client";

import { useEffect, useState, type FormEvent } from "react";
import type {
  KanbanIntegrationConnection,
  KanbanTaskTag,
} from "@a5c-ai/agent-mux-core/kanban";
import { LogoWordmark } from "@a5c-ai/compendium";
import { Activity, ShieldCheck, Users } from "lucide-react";
import Link from "next/link";
import { useStore } from "zustand";

import { useGatewayAuth } from "@/components/agent-mux/gateway-provider";
import { Button } from "@/components/ui/button";
import {
  createDispatchContextLabel,
  createTaskTag,
  deleteDispatchContextLabel,
  deleteTaskTag,
  loadTaskTags,
  updateDispatchContextLabel,
  updateTaskTag,
  useBacklog,
} from "@/hooks/use-backlog";
import { useConnection, useGateway } from "@/lib/agent-mux-ui";

interface DispatchContextLabelFormState {
  key: string;
  label: string;
  description: string;
  instruction: string;
}

function createEmptyDispatchContextLabelForm(): DispatchContextLabelFormState {
  return {
    key: "",
    label: "",
    description: "",
    instruction: "",
  };
}

export default function SettingsPage() {
  const { auth, logout, isAuthenticated } = useGatewayAuth();
  const { snapshot, refresh } = useBacklog();
  const connection = isAuthenticated ? <SettingsConnected /> : null;
  const project = snapshot?.projects[0];
  const dispatchContextLabels = snapshot?.dispatchContextLabels ?? [];
  const issues = snapshot?.issues ?? [];

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-6 py-6">
      <section className="rounded-3xl border border-border bg-card p-6 shadow-lg">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary/80">
          Settings
        </p>
        <div className="mt-2">
          <LogoWordmark className="h-6 w-auto" />
        </div>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">
          Gateway and runtime status
        </h1>
        <p className="mt-2 text-sm leading-6 text-foreground-muted">
          The kanban app does not own deep integrations. It points at a running agent-mux
          gateway and observes Babysitter runs from the filesystem watcher and cached run parser.
        </p>
      </section>

      <section className="rounded-3xl border border-border bg-card p-6 shadow-lg">
        <h2 className="text-xl font-semibold tracking-tight">Gateway auth</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <SettingCard label="Gateway URL" value={auth?.gatewayUrl ?? "not connected"} />
          <SettingCard label="Saved token" value={auth ? "configured" : "missing"} />
        </div>
        <div className="mt-4 flex gap-3">
          <Button asChild variant="primary">
            <Link href="/login">
              {isAuthenticated ? "Reconnect gateway" : "Connect gateway"}
            </Link>
          </Button>
          {isAuthenticated ? (
            <Button onClick={logout} variant="ghost" type="button">
              Forget token
            </Button>
          ) : null}
        </div>
      </section>

      {project?.integrations?.length ? (
        <section
          className="rounded-3xl border border-border bg-card p-6 shadow-lg"
          data-testid="integration-settings"
        >
          <h2 className="text-xl font-semibold tracking-tight">Repository integrations</h2>
          <p className="mt-2 text-sm leading-6 text-foreground-muted">
            GitHub and Azure Repos setup lives beside the board so missing auth, scopes, and
            project binding are visible before linked PR actions fail in workspace or review
            flows.
          </p>
          <div className="mt-4 grid gap-4 xl:grid-cols-2">
            {project.integrations.map((integration) => (
              <IntegrationCard key={integration.provider} integration={integration} />
            ))}
          </div>
        </section>
      ) : null}

      {project ? (
        <section
          className="rounded-3xl border border-border bg-card p-6 shadow-lg"
          data-testid="collaboration-settings"
        >
          <h2 className="text-xl font-semibold tracking-tight">Team and collaboration</h2>
          <p className="mt-2 text-sm leading-6 text-foreground-muted">
            Collaboration is now modeled explicitly in shared kanban primitives: team roster,
            project policy, activity scope, and role-based permissions all live alongside the
            board.
          </p>
          <div className="mt-4 grid gap-3 lg:grid-cols-3">
            <SettingCard
              label="Team"
              value={`${project.team.name} (${project.team.members.length} members)`}
            />
            <SettingCard
              label="Visibility"
              value={`${project.team.settings.visibility} / default ${project.team.settings.defaultRole}`}
            />
            <SettingCard
              label="Workspace policy"
              value={project.settings.workspaceProvisioning}
            />
          </div>

          <div className="mt-5 grid gap-4 xl:grid-cols-2">
            <div className="rounded-2xl border border-border bg-background/60 p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <Users className="h-4 w-4" />
                Team roster
              </div>
              <div className="mt-3 space-y-2">
                {project.team.members.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card px-3 py-2 text-sm"
                  >
                    <div>
                      <div className="font-medium text-foreground">
                        {member.displayName}
                      </div>
                      <div className="text-xs text-foreground-muted">
                        {member.email ?? member.id}
                      </div>
                    </div>
                    <span className="rounded-full border border-border px-2.5 py-1 text-xs text-foreground-muted">
                      {member.role}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-background/60 p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <ShieldCheck className="h-4 w-4" />
                Permission policy
              </div>
              <div className="mt-3 space-y-2">
                {project.permissions.map((permission) => (
                  <div
                    key={permission.action}
                    className="rounded-xl border border-border bg-card px-3 py-3 text-sm"
                  >
                    <div className="font-medium text-foreground">{permission.action}</div>
                    <div className="mt-1 text-xs text-foreground-muted">
                      {permission.description}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {permission.roles.map((role) => (
                        <span
                          key={`${permission.action}-${role}`}
                          className="rounded-full border border-border px-2.5 py-1 text-xs text-foreground-muted"
                        >
                          {role}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-5 rounded-2xl border border-border bg-background/60 p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <Activity className="h-4 w-4" />
              Recent activity
            </div>
            <div className="mt-3 space-y-2">
              {project.activity.slice(0, 4).map((entry) => (
                <div
                  key={entry.id}
                  className="rounded-xl border border-border bg-card px-3 py-3 text-sm"
                >
                  <div className="flex items-center justify-between gap-3 text-xs text-foreground-muted">
                    <span>{entry.actor.displayName}</span>
                    <span>{new Date(entry.createdAt).toLocaleString()}</span>
                  </div>
                  <div className="mt-1 text-foreground">{entry.summary}</div>
                </div>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      <TaskTagSettings />

      <DispatchContextLabelSettings
        dispatchContextLabels={dispatchContextLabels}
        issues={issues}
        onRefresh={refresh}
      />

      {connection}
    </div>
  );
}

const taskTagKeyPattern = /^[a-z0-9]+(?:_[a-z0-9]+)*$/;

interface TaskTagDraft {
  key: string;
  label: string;
  content: string;
  description: string;
}

interface TaskTagFieldErrors {
  key?: string;
  label?: string;
  content?: string;
}

const emptyTaskTagDraft: TaskTagDraft = {
  key: "",
  label: "",
  content: "",
  description: "",
};

function sortTaskTags(taskTags: readonly KanbanTaskTag[]): KanbanTaskTag[] {
  return [...taskTags].sort(
    (left, right) =>
      left.order - right.order ||
      left.key.localeCompare(right.key) ||
      left.label.localeCompare(right.label),
  );
}

function validateTaskTagDraft(
  draft: TaskTagDraft,
  taskTags: readonly KanbanTaskTag[],
  editingId: string | null,
): { normalized: TaskTagDraft; errors: TaskTagFieldErrors } {
  const normalized: TaskTagDraft = {
    key: draft.key.trim(),
    label: draft.label.trim(),
    content: draft.content.trim(),
    description: draft.description.trim(),
  };

  const errors: TaskTagFieldErrors = {};

  if (!normalized.key) {
    errors.key = "Key is required.";
  } else if (!taskTagKeyPattern.test(normalized.key)) {
    errors.key = "Key must use lowercase snake_case.";
  } else if (
    taskTags.some((taskTag) => taskTag.key === normalized.key && taskTag.id !== editingId)
  ) {
    errors.key = `Key ${normalized.key} already exists.`;
  }

  if (!normalized.label) {
    errors.label = "Label is required.";
  }

  if (!normalized.content) {
    errors.content = "Snippet content is required.";
  }

  return { normalized, errors };
}

function createFieldErrorsFromMessage(message: string): TaskTagFieldErrors {
  if (message.includes("snake_case")) {
    return { key: "Key must use lowercase snake_case." };
  }

  if (message.includes("already exists")) {
    return { key: message };
  }

  return {};
}

function TaskTagSettings() {
  const [taskTags, setTaskTags] = useState<KanbanTaskTag[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingError, setLoadingError] = useState<string | null>(null);
  const [draft, setDraft] = useState<TaskTagDraft>(emptyTaskTagDraft);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<TaskTagFieldErrors>({});
  const [actionError, setActionError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [pendingTaskTagId, setPendingTaskTagId] = useState<string | null>(null);

  useEffect(() => {
    let isActive = true;

    async function hydrateTaskTags() {
      setIsLoading(true);
      setLoadingError(null);

      try {
        const loadedTaskTags = await loadTaskTags();
        if (!isActive) {
          return;
        }
        setTaskTags(sortTaskTags(loadedTaskTags));
      } catch (error) {
        if (!isActive) {
          return;
        }
        setLoadingError(
          error instanceof Error ? error.message : "Failed to load Task Tags.",
        );
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    }

    void hydrateTaskTags();

    return () => {
      isActive = false;
    };
  }, []);

  const orderedTaskTags = sortTaskTags(taskTags);

  function resetForm() {
    setDraft(emptyTaskTagDraft);
    setEditingId(null);
    setFieldErrors({});
  }

  function startEditing(taskTag: KanbanTaskTag) {
    setEditingId(taskTag.id);
    setDraft({
      key: taskTag.key,
      label: taskTag.label,
      content: taskTag.content,
      description: taskTag.description ?? "",
    });
    setFieldErrors({});
    setActionError(null);
    setNotice(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const { normalized, errors } = validateTaskTagDraft(draft, orderedTaskTags, editingId);
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setActionError(null);
      return;
    }

    setIsSaving(true);
    setFieldErrors({});
    setActionError(null);
    setNotice(null);

    try {
      const payload = {
        key: normalized.key,
        label: normalized.label,
        content: normalized.content,
        description: normalized.description || undefined,
      };

      const result = editingId
        ? await updateTaskTag(editingId, payload)
        : await createTaskTag({
            ...payload,
            order: orderedTaskTags.length,
          });

      setTaskTags(sortTaskTags(result.taskTags));
      setNotice(editingId ? `Updated @${normalized.key}.` : `Created @${normalized.key}.`);
      resetForm();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to save Task Tag.";
      const nextFieldErrors = createFieldErrorsFromMessage(message);
      setFieldErrors(nextFieldErrors);
      setActionError(Object.keys(nextFieldErrors).length > 0 ? null : message);
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(taskTag: KanbanTaskTag) {
    setPendingTaskTagId(taskTag.id);
    setActionError(null);
    setNotice(null);

    try {
      const result = await deleteTaskTag(taskTag.id);
      setTaskTags(sortTaskTags(result.taskTags));
      setNotice(`Deleted @${taskTag.key}.`);
      if (editingId === taskTag.id) {
        resetForm();
      }
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Failed to delete Task Tag.");
    } finally {
      setPendingTaskTagId(null);
    }
  }

  async function handleMove(taskTagId: string, direction: -1 | 1) {
    const currentIndex = orderedTaskTags.findIndex((taskTag) => taskTag.id === taskTagId);
    const targetIndex = currentIndex + direction;

    if (currentIndex < 0 || targetIndex < 0 || targetIndex >= orderedTaskTags.length) {
      return;
    }

    const reorderedTaskTags = [...orderedTaskTags];
    const [movedTaskTag] = reorderedTaskTags.splice(currentIndex, 1);
    if (!movedTaskTag) {
      return;
    }
    reorderedTaskTags.splice(targetIndex, 0, movedTaskTag);

    const nextOrder = reorderedTaskTags.map((taskTag, index) => ({
      ...taskTag,
      order: index,
    }));

    setPendingTaskTagId(taskTagId);
    setActionError(null);
    setNotice(null);

    try {
      let latestTaskTags = taskTags;

      for (const taskTag of nextOrder) {
        const currentTaskTag = orderedTaskTags.find(
          (candidate) => candidate.id === taskTag.id,
        );
        if (!currentTaskTag || currentTaskTag.order === taskTag.order) {
          continue;
        }

        const result = await updateTaskTag(taskTag.id, { order: taskTag.order });
        latestTaskTags = [...result.taskTags];
      }

      setTaskTags(sortTaskTags(latestTaskTags));
      setNotice("Updated Task Tag order.");
    } catch (error) {
      setActionError(
        error instanceof Error ? error.message : "Failed to reorder Task Tags.",
      );
    } finally {
      setPendingTaskTagId(null);
    }
  }

  return (
    <section
      className="rounded-3xl border border-border bg-card p-6 shadow-lg"
      data-testid="task-tag-settings"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-3xl">
          <h2 className="text-xl font-semibold tracking-tight">Task Tags</h2>
          <p className="mt-2 text-sm leading-6 text-foreground-muted">
            Reusable snippet tags stay separate from issue labels and Dispatch Context Labels.
            This Settings surface manages the shared `@` library that authoring flows consume.
          </p>
        </div>
        <div className="grid min-w-[220px] gap-3 sm:grid-cols-2">
          <SettingCard label="Definitions" value={String(orderedTaskTags.length)} />
          <SettingCard
            label="Sort rule"
            value={orderedTaskTags.length > 0 ? "order then key" : "empty library"}
          />
        </div>
      </div>

      <div className="mt-5 grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,1.4fr)]">
        <div className="rounded-2xl border border-border bg-background/60 p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-foreground">
                {editingId ? "Edit Task Tag" : "Create Task Tag"}
              </div>
              <div className="mt-1 text-xs text-foreground-muted">
                Keys must be unique lowercase snake_case tokens used after `@`.
              </div>
            </div>
            {editingId ? (
              <Button type="button" variant="ghost" onClick={resetForm}>
                Cancel edit
              </Button>
            ) : null}
          </div>

          <form className="mt-4 space-y-4" onSubmit={handleSubmit}>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="text-xs font-semibold uppercase tracking-[0.16em] text-foreground-muted">
                Key
                <input
                  aria-label="Task Tag key"
                  value={draft.key}
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, key: event.target.value }))
                  }
                  placeholder="bug_report"
                  className="mt-2 h-11 w-full rounded-xl border border-border bg-card px-3 font-mono text-sm text-foreground placeholder:text-foreground-muted/60"
                />
                {fieldErrors.key ? (
                  <span className="mt-2 block text-xs normal-case tracking-normal text-error">
                    {fieldErrors.key}
                  </span>
                ) : null}
              </label>

              <label className="text-xs font-semibold uppercase tracking-[0.16em] text-foreground-muted">
                Label
                <input
                  aria-label="Task Tag label"
                  value={draft.label}
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, label: event.target.value }))
                  }
                  placeholder="Bug Report"
                  className="mt-2 h-11 w-full rounded-xl border border-border bg-card px-3 text-sm text-foreground placeholder:text-foreground-muted/60"
                />
                {fieldErrors.label ? (
                  <span className="mt-2 block text-xs normal-case tracking-normal text-error">
                    {fieldErrors.label}
                  </span>
                ) : null}
              </label>
            </div>

            <label className="block text-xs font-semibold uppercase tracking-[0.16em] text-foreground-muted">
              Description
              <input
                aria-label="Task Tag description"
                value={draft.description}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, description: event.target.value }))
                }
                placeholder="Optional guidance for when this snippet should be used."
                className="mt-2 h-11 w-full rounded-xl border border-border bg-card px-3 text-sm text-foreground placeholder:text-foreground-muted/60"
              />
            </label>

            <label className="block text-xs font-semibold uppercase tracking-[0.16em] text-foreground-muted">
              Snippet content
              <textarea
                aria-label="Task Tag content"
                value={draft.content}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, content: event.target.value }))
                }
                placeholder="Describe the bug, impact, expected behavior, and steps to reproduce."
                className="mt-2 min-h-28 w-full rounded-xl border border-border bg-card px-3 py-2 text-sm text-foreground placeholder:text-foreground-muted/60"
              />
              {fieldErrors.content ? (
                <span className="mt-2 block text-xs normal-case tracking-normal text-error">
                  {fieldErrors.content}
                </span>
              ) : null}
            </label>

            {actionError ? (
              <div className="rounded-2xl border border-error/30 bg-error-muted px-4 py-3 text-sm text-error">
                {actionError}
              </div>
            ) : null}

            {notice ? (
              <div className="rounded-2xl border border-success/30 bg-success-muted px-4 py-3 text-sm text-success">
                {notice}
              </div>
            ) : null}

            <Button
              type="submit"
              variant="primary"
              disabled={isSaving || pendingTaskTagId !== null}
            >
              {isSaving ? "Saving Task Tag…" : editingId ? "Save Task Tag" : "Create Task Tag"}
            </Button>
          </form>
        </div>

        <div className="rounded-2xl border border-border bg-background/60 p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-foreground">Reusable library</div>
              <div className="mt-1 text-xs text-foreground-muted">
                Ordering is explicit. Move controls patch stored `order` values to keep
                autocomplete deterministic.
              </div>
            </div>
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setIsLoading(true);
                setLoadingError(null);
                void loadTaskTags()
                  .then((loadedTaskTags) => setTaskTags(sortTaskTags(loadedTaskTags)))
                  .catch((error) =>
                    setLoadingError(
                      error instanceof Error
                        ? error.message
                        : "Failed to load Task Tags.",
                    ),
                  )
                  .finally(() => setIsLoading(false));
              }}
              disabled={isLoading}
            >
              Refresh
            </Button>
          </div>

          {loadingError ? (
            <div className="mt-4 rounded-2xl border border-error/30 bg-error-muted px-4 py-3 text-sm text-error">
              {loadingError}
            </div>
          ) : null}

          {isLoading ? (
            <div className="mt-4 rounded-2xl border border-border bg-card px-4 py-4 text-sm text-foreground-muted">
              Loading Task Tags…
            </div>
          ) : orderedTaskTags.length === 0 ? (
            <div className="mt-4 rounded-2xl border border-dashed border-border bg-card px-4 py-4 text-sm text-foreground-muted">
              No Task Tags yet. Create one to seed the reusable snippet library.
            </div>
          ) : (
            <div className="mt-4 space-y-3">
              {orderedTaskTags.map((taskTag, index) => (
                <article
                  key={taskTag.id}
                  className="rounded-2xl border border-border bg-card p-4"
                  data-testid={`task-tag-item-${taskTag.id}`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="font-medium text-foreground">{taskTag.label}</div>
                        <span className="rounded-full border border-border px-2.5 py-1 text-xs font-mono text-foreground-muted">
                          @{taskTag.key}
                        </span>
                        <span className="rounded-full border border-border px-2.5 py-1 text-xs text-foreground-muted">
                          order {taskTag.order}
                        </span>
                      </div>
                      {taskTag.description ? (
                        <p className="mt-2 text-sm text-foreground-muted">
                          {taskTag.description}
                        </p>
                      ) : null}
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => void handleMove(taskTag.id, -1)}
                        disabled={index === 0 || pendingTaskTagId !== null || isSaving}
                        aria-label={`Move ${taskTag.label} up`}
                      >
                        Move up
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => void handleMove(taskTag.id, 1)}
                        disabled={
                          index === orderedTaskTags.length - 1 ||
                          pendingTaskTagId !== null ||
                          isSaving
                        }
                        aria-label={`Move ${taskTag.label} down`}
                      >
                        Move down
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => startEditing(taskTag)}
                        disabled={pendingTaskTagId !== null || isSaving}
                      >
                        Edit
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => void handleDelete(taskTag)}
                        disabled={pendingTaskTagId !== null || isSaving}
                      >
                        {pendingTaskTagId === taskTag.id ? "Deleting…" : "Delete"}
                      </Button>
                    </div>
                  </div>

                  <pre className="mt-3 whitespace-pre-wrap rounded-xl border border-border bg-background/80 px-3 py-3 text-xs text-foreground-secondary">
                    {taskTag.content}
                  </pre>
                </article>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function DispatchContextLabelSettings(props: {
  dispatchContextLabels: NonNullable<
    ReturnType<typeof useBacklog>["snapshot"]
  >["dispatchContextLabels"];
  issues: NonNullable<ReturnType<typeof useBacklog>["snapshot"]>["issues"];
  onRefresh: () => Promise<void>;
}) {
  const [draft, setDraft] = useState<DispatchContextLabelFormState>(
    createEmptyDispatchContextLabelForm(),
  );
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingDraft, setEditingDraft] =
    useState<DispatchContextLabelFormState | null>(null);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function runAction(actionId: string, work: () => Promise<void>) {
    setPendingAction(actionId);
    setError(null);
    setNotice(null);
    try {
      await work();
      await props.onRefresh();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Dispatch Context Label update failed.",
      );
      throw cause;
    } finally {
      setPendingAction(null);
    }
  }

  async function handleCreateLabel() {
    await runAction("create-dispatch-context-label", async () => {
      await createDispatchContextLabel({
        key: draft.key,
        label: draft.label,
        description: draft.description || undefined,
        instruction: draft.instruction,
      });
      setDraft(createEmptyDispatchContextLabelForm());
      setNotice("Created Dispatch Context Label definition.");
    });
  }

  async function handleSaveEdit() {
    if (!editingId || !editingDraft) {
      return;
    }

    await runAction(`save-${editingId}`, async () => {
      await updateDispatchContextLabel(editingId, {
        key: editingDraft.key,
        label: editingDraft.label,
        description: editingDraft.description || undefined,
        instruction: editingDraft.instruction,
      });
      setEditingId(null);
      setEditingDraft(null);
      setNotice("Updated Dispatch Context Label definition.");
    });
  }

  async function handleDeleteLabel(labelId: string) {
    await runAction(`delete-${labelId}`, async () => {
      await deleteDispatchContextLabel(labelId);
      if (editingId === labelId) {
        setEditingId(null);
        setEditingDraft(null);
      }
      setNotice("Deleted Dispatch Context Label definition.");
    });
  }

  return (
    <section
      className="rounded-3xl border border-border bg-card p-6 shadow-lg"
      data-testid="dispatch-context-label-settings"
    >
      <h2 className="text-xl font-semibold tracking-tight">Dispatch Context Labels</h2>
      <p className="mt-2 text-sm leading-6 text-foreground-muted">
        Manage reusable execution-context definitions here. These definitions stay separate from
        board labels, Task Tags, and default agent selection so reviewers can inspect exactly
        what dispatch instructions are reusable and where they are attached.
      </p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <SettingCard label="Definitions" value={String(props.dispatchContextLabels.length)} />
        <SettingCard
          label="Attached issues"
          value={String(
            props.issues.filter((issue) => issue.dispatch.contextLabels.length > 0).length,
          )}
        />
        <SettingCard
          label="Rendered projections"
          value={String(
            props.issues.filter((issue) => (issue.dispatch.renderedContext ?? "").length > 0)
              .length,
          )}
        />
      </div>

      {error ? (
        <div className="mt-4 rounded-2xl border border-error/25 bg-error-muted px-4 py-3 text-sm text-error">
          {error}
        </div>
      ) : null}

      {notice ? (
        <div className="mt-4 rounded-2xl border border-success/30 bg-success-muted px-4 py-3 text-sm text-success">
          {notice}
        </div>
      ) : null}

      <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,360px)_minmax(0,1fr)]">
        <form
          className="rounded-2xl border border-border bg-background/60 p-4"
          onSubmit={(event) => {
            event.preventDefault();
            void handleCreateLabel().catch(() => undefined);
          }}
        >
          <div className="text-sm font-semibold text-foreground">Create reusable definition</div>
          <p className="mt-2 text-sm leading-6 text-foreground-muted">
            Define the reusable dispatch instruction once, then attach it by reference on the
            issue surface instead of copying prompt text into board labels or Task Tags.
          </p>
          <div className="mt-4 grid gap-3">
            <label className="text-xs font-semibold uppercase tracking-[0.16em] text-foreground-muted">
              Dispatch Context Label key
              <input
                aria-label="Dispatch Context Label key"
                value={draft.key}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, key: event.target.value }))
                }
                placeholder="tests_first"
                className="mt-2 h-11 w-full rounded-xl border border-border bg-card px-3 text-sm text-foreground"
              />
            </label>
            <label className="text-xs font-semibold uppercase tracking-[0.16em] text-foreground-muted">
              Display label
              <input
                aria-label="Dispatch Context Label name"
                value={draft.label}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, label: event.target.value }))
                }
                placeholder="Tests First"
                className="mt-2 h-11 w-full rounded-xl border border-border bg-card px-3 text-sm text-foreground"
              />
            </label>
            <label className="text-xs font-semibold uppercase tracking-[0.16em] text-foreground-muted">
              Helper description
              <textarea
                aria-label="Dispatch Context Label description"
                value={draft.description}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, description: event.target.value }))
                }
                placeholder="Explain when to attach this reusable context label."
                className="mt-2 min-h-20 w-full rounded-xl border border-border bg-card px-3 py-2 text-sm text-foreground"
              />
            </label>
            <label className="text-xs font-semibold uppercase tracking-[0.16em] text-foreground-muted">
              Dispatch instruction
              <textarea
                aria-label="Dispatch Context Label instruction"
                value={draft.instruction}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, instruction: event.target.value }))
                }
                placeholder="Write or update deterministic verification before implementation changes."
                className="mt-2 min-h-32 w-full rounded-xl border border-border bg-card px-3 py-2 text-sm text-foreground"
              />
            </label>
            <button
              type="submit"
              disabled={pendingAction === "create-dispatch-context-label"}
              className="inline-flex h-11 items-center justify-center rounded-xl border border-primary/30 bg-primary/10 px-4 text-sm font-semibold text-primary disabled:opacity-50"
            >
              {pendingAction === "create-dispatch-context-label"
                ? "Creating definition…"
                : "Create Dispatch Context Label"}
            </button>
          </div>
        </form>

        <div className="space-y-3">
          {props.dispatchContextLabels.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-background/40 p-4 text-sm text-foreground-muted">
              No Dispatch Context Label definitions exist yet. Create one here, then attach it
              from the issue surface.
            </div>
          ) : null}

          {props.dispatchContextLabels.map((contextLabel) => {
            const attachedIssues = props.issues.filter((issue) =>
              issue.dispatch.contextLabels.some((ref) => ref.labelId === contextLabel.id),
            );
            const isEditing = editingId === contextLabel.id && editingDraft !== null;

            return (
              <div
                key={contextLabel.id}
                className="rounded-2xl border border-border bg-background/60 p-4"
              >
                {isEditing ? (
                  <form
                    className="grid gap-3"
                    onSubmit={(event) => {
                      event.preventDefault();
                      void handleSaveEdit().catch(() => undefined);
                    }}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-sm font-semibold text-foreground">
                        Edit definition
                      </div>
                      <span className="rounded-full border border-border px-2.5 py-1 text-xs text-foreground-muted">
                        {attachedIssues.length} issue
                        {attachedIssues.length === 1 ? "" : "s"}
                      </span>
                    </div>
                    <label className="text-xs font-semibold uppercase tracking-[0.16em] text-foreground-muted">
                      Dispatch Context Label key
                      <input
                        aria-label={`Dispatch Context Label key ${contextLabel.key}`}
                        value={editingDraft.key}
                        onChange={(event) =>
                          setEditingDraft((current) =>
                            current ? { ...current, key: event.target.value } : current,
                          )
                        }
                        className="mt-2 h-11 w-full rounded-xl border border-border bg-card px-3 text-sm text-foreground"
                      />
                    </label>
                    <label className="text-xs font-semibold uppercase tracking-[0.16em] text-foreground-muted">
                      Display label
                      <input
                        aria-label={`Dispatch Context Label name ${contextLabel.key}`}
                        value={editingDraft.label}
                        onChange={(event) =>
                          setEditingDraft((current) =>
                            current ? { ...current, label: event.target.value } : current,
                          )
                        }
                        className="mt-2 h-11 w-full rounded-xl border border-border bg-card px-3 text-sm text-foreground"
                      />
                    </label>
                    <label className="text-xs font-semibold uppercase tracking-[0.16em] text-foreground-muted">
                      Helper description
                      <textarea
                        aria-label={`Dispatch Context Label description ${contextLabel.key}`}
                        value={editingDraft.description}
                        onChange={(event) =>
                          setEditingDraft((current) =>
                            current
                              ? { ...current, description: event.target.value }
                              : current,
                          )
                        }
                        className="mt-2 min-h-20 w-full rounded-xl border border-border bg-card px-3 py-2 text-sm text-foreground"
                      />
                    </label>
                    <label className="text-xs font-semibold uppercase tracking-[0.16em] text-foreground-muted">
                      Dispatch instruction
                      <textarea
                        aria-label={`Dispatch Context Label instruction ${contextLabel.key}`}
                        value={editingDraft.instruction}
                        onChange={(event) =>
                          setEditingDraft((current) =>
                            current
                              ? { ...current, instruction: event.target.value }
                              : current,
                          )
                        }
                        className="mt-2 min-h-28 w-full rounded-xl border border-border bg-card px-3 py-2 text-sm text-foreground"
                      />
                    </label>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="submit"
                        disabled={pendingAction === `save-${contextLabel.id}`}
                        className="inline-flex h-11 items-center justify-center rounded-xl border border-primary/30 bg-primary/10 px-4 text-sm font-semibold text-primary disabled:opacity-50"
                      >
                        {pendingAction === `save-${contextLabel.id}`
                          ? "Saving…"
                          : "Save definition"}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingId(null);
                          setEditingDraft(null);
                          setError(null);
                        }}
                        className="inline-flex h-11 items-center justify-center rounded-xl border border-border px-4 text-sm font-semibold text-foreground-muted"
                      >
                        Cancel edit
                      </button>
                    </div>
                  </form>
                ) : (
                  <>
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="font-medium text-foreground">{contextLabel.label}</div>
                        <div className="text-xs text-foreground-muted">{contextLabel.key}</div>
                      </div>
                      <span className="rounded-full border border-border px-2.5 py-1 text-xs text-foreground-muted">
                        {attachedIssues.length} issue
                        {attachedIssues.length === 1 ? "" : "s"}
                      </span>
                    </div>
                    {contextLabel.description ? (
                      <p className="mt-2 text-sm text-foreground-muted">
                        {contextLabel.description}
                      </p>
                    ) : null}
                    <pre className="mt-3 whitespace-pre-wrap rounded-xl border border-border bg-card px-3 py-3 text-xs text-foreground-secondary">
                      {contextLabel.instruction}
                    </pre>
                    {attachedIssues.length > 0 ? (
                      <div className="mt-3 flex flex-wrap gap-2 text-xs text-foreground-muted">
                        {attachedIssues.map((issue) => (
                          <span
                            key={`${contextLabel.id}-${issue.id}`}
                            className="rounded-full border border-border px-2.5 py-1"
                          >
                            {issue.key}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <div className="mt-3 text-xs text-foreground-muted">
                        Not attached to any issue yet.
                      </div>
                    )}
                    <div className="mt-4 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingId(contextLabel.id);
                          setEditingDraft({
                            key: contextLabel.key,
                            label: contextLabel.label,
                            description: contextLabel.description ?? "",
                            instruction: contextLabel.instruction,
                          });
                          setError(null);
                          setNotice(null);
                        }}
                        className="inline-flex h-11 items-center justify-center rounded-xl border border-border bg-card px-4 text-sm font-semibold text-foreground"
                      >
                        Edit definition
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          void handleDeleteLabel(contextLabel.id).catch(() => undefined)
                        }
                        disabled={pendingAction === `delete-${contextLabel.id}`}
                        className="inline-flex h-11 items-center justify-center rounded-xl border border-error/30 bg-error-muted px-4 text-sm font-semibold text-error disabled:opacity-50"
                      >
                        {pendingAction === `delete-${contextLabel.id}`
                          ? "Deleting…"
                          : "Delete definition"}
                      </button>
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function SettingsConnected() {
  const connection = useConnection();
  const { store } = useGateway();
  const agentCount = useStore(store, (state) => state.agents.items.length);
  const sessionCount = useStore(store, (state) => Object.keys(state.sessions.byId).length);
  const runCount = useStore(store, (state) => Object.keys(state.runs.byId).length);

  return (
    <section className="rounded-3xl border border-border bg-card p-6 shadow-lg">
      <h2 className="text-xl font-semibold tracking-tight">Live state</h2>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <SettingCard label="Socket status" value={connection.status} />
        <SettingCard label="Agents" value={String(agentCount)} />
        <SettingCard label="Sessions" value={String(sessionCount)} />
        <SettingCard label="Runs" value={String(runCount)} />
      </div>
      {connection.error ? (
        <div className="mt-4 rounded-2xl border border-error/20 bg-error-muted px-4 py-3 text-sm text-error">
          {connection.error}
        </div>
      ) : null}
    </section>
  );
}

function SettingCard(props: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-background/60 p-4">
      <div className="text-xs uppercase tracking-[0.2em] text-foreground-muted">
        {props.label}
      </div>
      <div className="mt-2 text-sm font-medium">{props.value}</div>
    </div>
  );
}

function integrationTone(status: KanbanIntegrationConnection["status"]): string {
  switch (status) {
    case "connected":
      return "border-success/20 bg-success/10 text-success";
    case "partial-setup":
    case "missing-scopes":
      return "border-warning/20 bg-warning/10 text-warning";
    case "expired-auth":
    case "failing":
      return "border-error/20 bg-error/10 text-error";
    default:
      return "border-border bg-background text-foreground-muted";
  }
}

function IntegrationCard(props: { integration: KanbanIntegrationConnection }) {
  const { integration } = props;
  const blockedActions = [
    integration.actions.canCreatePullRequest ? null : "create linked PRs",
    integration.actions.canManagePullRequest ? null : "sync linked PR state",
    integration.actions.canApproveFromReview ? null : "approve from review",
  ].filter(Boolean);

  return (
    <article className="rounded-2xl border border-border bg-background/60 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-foreground">{integration.label}</div>
          <div className="mt-1 text-xs text-foreground-muted">
            {integration.accountLabel ?? "No account selected"}
          </div>
        </div>
        <span
          className={`rounded-full border px-2.5 py-1 text-xs ${integrationTone(integration.status)}`}
        >
          {integration.status.replace(/-/g, " ")}
        </span>
      </div>

      <p className="mt-3 text-sm leading-6 text-foreground-muted">{integration.guidance}</p>

      {integration.failureMessage ? (
        <div className="mt-3 rounded-2xl border border-error/20 bg-error/10 px-3 py-2 text-sm text-error">
          {integration.failureMessage}
        </div>
      ) : null}

      {integration.missingScopes?.length ? (
        <div className="mt-3 rounded-2xl border border-warning/20 bg-warning/10 px-3 py-2 text-sm text-warning">
          Missing scopes: {integration.missingScopes.join(", ")}
        </div>
      ) : null}

      <div className="mt-4 space-y-2">
        {integration.prerequisites.map((prerequisite) => (
          <div
            key={prerequisite.key}
            className="rounded-xl border border-border bg-card px-3 py-3 text-sm"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="font-medium text-foreground">{prerequisite.label}</span>
              <span
                className={`rounded-full border px-2 py-0.5 text-xs ${
                  prerequisite.satisfied
                    ? "border-success/20 bg-success/10 text-success"
                    : "border-warning/20 bg-warning/10 text-warning"
                }`}
              >
                {prerequisite.satisfied ? "ready" : "missing"}
              </span>
            </div>
            {prerequisite.guidance ? (
              <div className="mt-2 text-xs leading-5 text-foreground-muted">
                {prerequisite.guidance}
              </div>
            ) : null}
          </div>
        ))}
      </div>

      {blockedActions.length > 0 ? (
        <div className="mt-4 rounded-2xl border border-border bg-card px-3 py-3 text-sm text-foreground-muted">
          Blocked actions: {blockedActions.join(", ")}.
          {integration.actions.reason ? ` ${integration.actions.reason}` : ""}
        </div>
      ) : null}
    </article>
  );
}
