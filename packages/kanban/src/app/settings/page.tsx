"use client";

import Link from "next/link";
import { useState } from "react";
import { LogoWordmark } from "@a5c-ai/compendium";
import { Activity, ShieldCheck, Users } from "lucide-react";
import { useStore } from "zustand";
import type { KanbanIntegrationConnection } from "@a5c-ai/agent-mux-core/kanban";

import { Button } from "@/components/ui/button";
import { useGatewayAuth } from "@/components/agent-mux/gateway-provider";
import {
  createDispatchContextLabel,
  deleteDispatchContextLabel,
  updateDispatchContextLabel,
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
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary/80">Settings</p>
        <div className="mt-2">
          <LogoWordmark className="h-6 w-auto" />
        </div>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Gateway and runtime status</h1>
        <p className="mt-2 text-sm leading-6 text-foreground-muted">
          The kanban app does not own deep integrations. It points at a running agent-mux gateway and
          observes Babysitter runs from the filesystem watcher and cached run parser.
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
            <Button
              onClick={logout}
              variant="ghost"
              type="button"
            >
              Forget token
            </Button>
          ) : null}
        </div>
      </section>

      {project?.integrations?.length ? (
        <section className="rounded-3xl border border-border bg-card p-6 shadow-lg" data-testid="integration-settings">
          <h2 className="text-xl font-semibold tracking-tight">Repository integrations</h2>
          <p className="mt-2 text-sm leading-6 text-foreground-muted">
            GitHub and Azure Repos setup lives beside the board so missing auth, scopes, and project binding are
            visible before linked PR actions fail in workspace or review flows.
          </p>
          <div className="mt-4 grid gap-4 xl:grid-cols-2">
            {project.integrations.map((integration) => (
              <IntegrationCard key={integration.provider} integration={integration} />
            ))}
          </div>
        </section>
      ) : null}

      {project ? (
        <section className="rounded-3xl border border-border bg-card p-6 shadow-lg" data-testid="collaboration-settings">
          <h2 className="text-xl font-semibold tracking-tight">Team and collaboration</h2>
          <p className="mt-2 text-sm leading-6 text-foreground-muted">
            Collaboration is now modeled explicitly in shared kanban primitives: team roster,
            project policy, activity scope, and role-based permissions all live alongside the board.
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
                  <div key={member.id} className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card px-3 py-2 text-sm">
                    <div>
                      <div className="font-medium text-foreground">{member.displayName}</div>
                      <div className="text-xs text-foreground-muted">{member.email ?? member.id}</div>
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
                  <div key={permission.action} className="rounded-xl border border-border bg-card px-3 py-3 text-sm">
                    <div className="font-medium text-foreground">{permission.action}</div>
                    <div className="mt-1 text-xs text-foreground-muted">{permission.description}</div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {permission.roles.map((role) => (
                        <span key={`${permission.action}-${role}`} className="rounded-full border border-border px-2.5 py-1 text-xs text-foreground-muted">
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
                <div key={entry.id} className="rounded-xl border border-border bg-card px-3 py-3 text-sm">
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

      <DispatchContextLabelSettings
        dispatchContextLabels={dispatchContextLabels}
        issues={issues}
        onRefresh={refresh}
      />

      {connection}
    </div>
  );
}

function DispatchContextLabelSettings(props: {
  dispatchContextLabels: NonNullable<ReturnType<typeof useBacklog>["snapshot"]>["dispatchContextLabels"];
  issues: NonNullable<ReturnType<typeof useBacklog>["snapshot"]>["issues"];
  onRefresh: () => Promise<void>;
}) {
  const [draft, setDraft] = useState<DispatchContextLabelFormState>(createEmptyDispatchContextLabelForm());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingDraft, setEditingDraft] = useState<DispatchContextLabelFormState | null>(null);
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
      setError(cause instanceof Error ? cause.message : "Dispatch Context Label update failed.");
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
    <section className="rounded-3xl border border-border bg-card p-6 shadow-lg" data-testid="dispatch-context-label-settings">
      <h2 className="text-xl font-semibold tracking-tight">Dispatch Context Labels</h2>
      <p className="mt-2 text-sm leading-6 text-foreground-muted">
        Manage reusable execution-context definitions here. These definitions stay separate from board
        labels, Task Tags, and default agent selection so reviewers can inspect exactly what dispatch
        instructions are reusable and where they are attached.
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
            props.issues.filter((issue) => (issue.dispatch.renderedContext ?? "").length > 0).length,
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
            Define the reusable dispatch instruction once, then attach it by reference on the issue
            surface instead of copying prompt text into board labels or Task Tags.
          </p>
          <div className="mt-4 grid gap-3">
            <label className="text-xs font-semibold uppercase tracking-[0.16em] text-foreground-muted">
              Dispatch Context Label key
              <input
                aria-label="Dispatch Context Label key"
                value={draft.key}
                onChange={(event) => setDraft((current) => ({ ...current, key: event.target.value }))}
                placeholder="tests_first"
                className="mt-2 h-11 w-full rounded-xl border border-border bg-card px-3 text-sm text-foreground"
              />
            </label>
            <label className="text-xs font-semibold uppercase tracking-[0.16em] text-foreground-muted">
              Display label
              <input
                aria-label="Dispatch Context Label name"
                value={draft.label}
                onChange={(event) => setDraft((current) => ({ ...current, label: event.target.value }))}
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
              No Dispatch Context Label definitions exist yet. Create one here, then attach it from the
              issue surface.
            </div>
          ) : null}

          {props.dispatchContextLabels.map((contextLabel) => {
            const attachedIssues = props.issues.filter((issue) =>
              issue.dispatch.contextLabels.some((ref) => ref.labelId === contextLabel.id),
            );
            const isEditing = editingId === contextLabel.id && editingDraft !== null;

            return (
              <div key={contextLabel.id} className="rounded-2xl border border-border bg-background/60 p-4">
                {isEditing ? (
                  <form
                    className="grid gap-3"
                    onSubmit={(event) => {
                      event.preventDefault();
                      void handleSaveEdit().catch(() => undefined);
                    }}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-sm font-semibold text-foreground">Edit definition</div>
                      <span className="rounded-full border border-border px-2.5 py-1 text-xs text-foreground-muted">
                        {attachedIssues.length} issue{attachedIssues.length === 1 ? "" : "s"}
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
                            current ? { ...current, description: event.target.value } : current,
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
                            current ? { ...current, instruction: event.target.value } : current,
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
                        {pendingAction === `save-${contextLabel.id}` ? "Saving…" : "Save definition"}
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
                        {attachedIssues.length} issue{attachedIssues.length === 1 ? "" : "s"}
                      </span>
                    </div>
                    {contextLabel.description ? (
                      <p className="mt-2 text-sm text-foreground-muted">{contextLabel.description}</p>
                    ) : null}
                    <pre className="mt-3 whitespace-pre-wrap rounded-xl border border-border bg-card px-3 py-3 text-xs text-foreground-secondary">
                      {contextLabel.instruction}
                    </pre>
                    {attachedIssues.length > 0 ? (
                      <div className="mt-3 flex flex-wrap gap-2 text-xs text-foreground-muted">
                        {attachedIssues.map((issue) => (
                          <span key={`${contextLabel.id}-${issue.id}`} className="rounded-full border border-border px-2.5 py-1">
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
                        onClick={() => void handleDeleteLabel(contextLabel.id).catch(() => undefined)}
                        disabled={pendingAction === `delete-${contextLabel.id}`}
                        className="inline-flex h-11 items-center justify-center rounded-xl border border-error/30 bg-error-muted px-4 text-sm font-semibold text-error disabled:opacity-50"
                      >
                        {pendingAction === `delete-${contextLabel.id}` ? "Deleting…" : "Delete definition"}
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
      <div className="text-xs uppercase tracking-[0.2em] text-foreground-muted">{props.label}</div>
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
        <span className={`rounded-full border px-2.5 py-1 text-xs ${integrationTone(integration.status)}`}>
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
          <div key={prerequisite.key} className="rounded-xl border border-border bg-card px-3 py-3 text-sm">
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
              <div className="mt-2 text-xs leading-5 text-foreground-muted">{prerequisite.guidance}</div>
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
