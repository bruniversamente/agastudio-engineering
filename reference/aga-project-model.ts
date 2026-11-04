import {
  heliportWorkspaceFingerprint,
  normalizeHeliportWorkspace,
  validateHeliportWorkspace,
  type HeliportWorkspaceV1,
} from "./heliport-project-state.ts";

export const AGA_PROJECT_MODEL_VERSION = 4 as const;

export type AgaProjectMode = "opea" | "heliport_pbzph";
export type AgaProjectArea = "viability" | "technical-proof" | "report" | "opea-process" | "technical-drawings";
export type AgaPlanStage = "candidate" | "geometric_incident" | "normative_restrictive" | "not_incident";
export type AgaAnalysisStatus = "pending" | "running" | "completed" | "failed";
export type AgaOverallStatus = "not_evaluated" | "insufficient_data" | "no_incidence" | "viable" | "critical" | "not_viable";
export type AgaArtifactStatus = "pending" | "generating" | "generated" | "validated" | "failed" | "stale";
export type AgaProcessPackageStatus = "draft" | "prepared" | "validated" | "failed" | "stale";
export type AgaAgentChannel = "viability" | "sysaga" | "cad" | "documents";
export type AgaAgentTaskStatus = "preparing" | "running" | "awaiting_review" | "needs_correction" | "interrupted" | "approved";
export type AgaAgentApprovalKind = "overwrite" | "move" | "delete" | "promote" | "signed_file" | "sysaga_sensitive_action";
export type AgaAgentApprovalStatus = "pending" | "approved" | "rejected";

export type AgaProjectIdentity = {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
};

export type AgaProjectSource = {
  id: string;
  kind: "attachment" | "catalog" | "manual" | "extracted_document";
  name: string;
  createdAt: string;
  attachmentId?: string;
  mediaType?: string;
  origin?: string;
  checksumSha256?: string;
};

export type AgaOpeaVertex = {
  id: string;
  latitude: number;
  longitude: number;
  latitudeText?: string;
  longitudeText?: string;
  baseAltitudeM?: number;
  heightM?: number;
  topAltitudeM?: number;
};

export type AgaOpea = {
  id: string;
  name: string;
  geometryType: "point" | "line" | "polygon";
  state: "draft" | "ready";
  horizontalCrs: string;
  verticalDatum?: string;
  sourceId?: string;
  createdAt: string;
  updatedAt: string;
  vertices: AgaOpeaVertex[];
};

export type AgaPlanComponent = {
  id: string;
  name: string;
  visibleByDefault: boolean;
  geometrySnapshot?: unknown;
};

export type AgaPlan = {
  id: string;
  name: string;
  stage: AgaPlanStage;
  sourceId?: string;
  aerodrome?: string;
  oaci?: string;
  planType?: string;
  components: AgaPlanComponent[];
  metadata?: unknown;
};

export type AgaAnalysisResult = {
  overallStatus: AgaOverallStatus;
  points: unknown[];
  criticalSurfaceId?: string;
  criticalPointId?: string;
  altitudeLimitM?: number;
  maxHeightM?: number;
  marginM?: number;
  penetrationM?: number;
  rawResult?: unknown;
};

export type AgaAnalysisRun = {
  id: string;
  createdAt: string;
  completedAt?: string;
  status: AgaAnalysisStatus;
  engineVersion: string;
  catalogVersion: string;
  inputFingerprint: string;
  inputSnapshot: unknown;
  result?: AgaAnalysisResult;
  error?: string;
};

export type AgaArtifact = {
  id: string;
  kind:
    | "technical_map"
    | "height_surface"
    | "technical_sections"
    | "viability_points"
    | "plan_hits"
    | "viability_result"
    | "report"
    | "report_docx"
    | "situation_plan"
    | "profile_plan"
    | "other";
  name: string;
  runId: string;
  status: AgaArtifactStatus;
  createdAt: string;
  updatedAt: string;
  attachmentId?: string;
  mediaType?: string;
  staleReason?: string;
  metadata?: unknown;
};

export type AgaDocument = {
  id: string;
  name: string;
  format: string;
  status: "available" | "extracted" | "reviewed" | "confirmed";
  sourceId?: string;
  attachmentId?: string;
  openUrl?: string;
  downloadUrl?: string;
  extractionProfile?: string;
  evidence?: AgaDocumentEvidenceField[];
  metadata?: unknown;
};

export type AgaDocumentEvidenceField = {
  id: string;
  page: number;
  label: string;
  originalValue: string;
  normalizedValue: string;
  status: "extracted" | "reviewed" | "confirmed";
  extractedAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
  confirmedAt?: string;
  confirmedBy?: string;
  targetPath?: string;
};

export type AgaProcessPackage = {
  id: string;
  kind: "pre_analysis" | "anexo_c2" | "opea_request" | "heliport_request";
  name: string;
  status: AgaProcessPackageStatus;
  createdAt: string;
  updatedAt: string;
  staleReason?: string;
  payload?: unknown;
  attachmentIds?: string[];
};

export type AgaSysagaExecutionState =
  | "awaiting_login"
  | "closed"
  | "closing"
  | "dry_run_approved"
  | "dry_run_running"
  | "failed"
  | "opening"
  | "paused"
  | "prepared"
  | "preparing"
  | "profile_locked"
  | "ready"
  | "running"
  | "stopping"
  | "validated"
  | "validating";

export type AgaSysagaExecutionEvent = {
  at: string;
  state: AgaSysagaExecutionState;
  validationApproved: boolean;
  dryRunApproved: boolean;
  reviewReady: boolean;
  reason?: string;
};

export type AgaSysagaSafeStep = "none" | "package_prepared" | "package_validated" | "dry_run_approved" | "edge_opened";
export type AgaSysagaResumeState = "interrupted" | "awaiting_review";

export type AgaSysagaExecutionRecord = {
  accountLabel?: string;
  changedAccount?: boolean;
  executionId: string;
  projectId: string;
  packageId: string;
  taskId: string;
  mode: Exclude<AgaProcessPackage["kind"], "heliport_request">;
  payloadFingerprint: string;
  packageFingerprint?: string;
  formalRunId: string;
  formalInputFingerprint: string;
  state: AgaSysagaExecutionState;
  resumeState: AgaSysagaResumeState;
  lastSafeStep: AgaSysagaSafeStep;
  completedFields: string[];
  draftId?: string;
  validationApproved: boolean;
  dryRunApproved: boolean;
  reviewReady: boolean;
  createdAt: string;
  updatedAt: string;
  reason?: string;
  protocol?: string;
  events: AgaSysagaExecutionEvent[];
};

export type AgaExternalWorkspace = {
  rootPath?: string;
};

export type AgaAgentProviderMetadata = {
  providerId: string;
  providerConversationId: string;
  model?: string;
};

export type AgaAgentSession = {
  id: string;
  channel: AgaAgentChannel;
  /** Identificador interno do AGA Studio, independente do fornecedor. */
  conversationId: string;
  createdAt: string;
  lastActivityAt: string;
  activeTaskId?: string;
  /** Identificadores externos ficam isolados neste bloco de metadados. */
  providerMetadata?: AgaAgentProviderMetadata;
  workspaceRootPath?: string;
};

export type AgaAgentTask = {
  id: string;
  sessionId: string;
  status: AgaAgentTaskStatus;
  createdAt: string;
  updatedAt: string;
  lastSafeStep?: string;
  skillVersion?: string;
  artifactIds?: string[];
  error?: string;
};

export type AgaAgentApproval = {
  id: string;
  taskId: string;
  kind: AgaAgentApprovalKind;
  status: AgaAgentApprovalStatus;
  createdAt: string;
  resolvedAt?: string;
  requestId?: string | number;
  threadId?: string;
  turnId?: string;
  detail?: string;
  sessionAuthorizationAllowed?: boolean;
};

type AgaStudioProjectBase = {
  kind: "aga-studio-project";
  projectVersion: typeof AGA_PROJECT_MODEL_VERSION;
  identity: AgaProjectIdentity;
  activeArea: AgaProjectArea;
  activeAnalysisRunId?: string;
  sources: AgaProjectSource[];
  opeas: AgaOpea[];
  plans: AgaPlan[];
  analysisRuns: AgaAnalysisRun[];
  artifacts: AgaArtifact[];
  documents: AgaDocument[];
  processPackages: AgaProcessPackage[];
  sysagaExecutions?: AgaSysagaExecutionRecord[];
  externalWorkspace: AgaExternalWorkspace;
  agentSessions: AgaAgentSession[];
  agentTasks: AgaAgentTask[];
  agentApprovals: AgaAgentApproval[];
  uiPreferences: {
    panelLayouts: Record<string, unknown>;
  };
};

export type AgaOpeaStudioProject<TOpeaWorkspace> = AgaStudioProjectBase & {
  projectMode: "opea";
  workspaces: {
    viability: TOpeaWorkspace;
    heliport?: never;
  };
};

export type AgaHeliportStudioProject<THeliportWorkspace> = AgaStudioProjectBase & {
  projectMode: "heliport_pbzph";
  workspaces: {
    viability?: never;
    heliport: THeliportWorkspace;
  };
};

export type AgaStudioProjectV2<TOpeaWorkspace = unknown, THeliportWorkspace = never> =
  | AgaOpeaStudioProject<TOpeaWorkspace>
  | ([THeliportWorkspace] extends [never] ? never : AgaHeliportStudioProject<THeliportWorkspace>);

type AnyAgaStudioProject = AgaStudioProjectV2<unknown, HeliportWorkspaceV1>;

type ProjectAttachmentSource = {
  attachmentId: string;
  mediaType?: string;
  name?: string;
};

type SynchronizeOptions = {
  attachmentSources?: ProjectAttachmentSource[];
};

export function migrateAgaStudioProject<TOpeaWorkspace>(
  payload: unknown,
  sourceSchemaVersion: 1 | 2 | 3,
  identity: AgaProjectIdentity,
): AgaOpeaStudioProject<TOpeaWorkspace>;
export function migrateAgaStudioProject<TOpeaWorkspace, THeliportWorkspace = HeliportWorkspaceV1>(
  payload: unknown,
  sourceSchemaVersion: typeof AGA_PROJECT_MODEL_VERSION,
  identity: AgaProjectIdentity,
): AgaStudioProjectV2<TOpeaWorkspace, THeliportWorkspace>;
export function migrateAgaStudioProject<TOpeaWorkspace, THeliportWorkspace = HeliportWorkspaceV1>(
  payload: unknown,
  sourceSchemaVersion: number,
  identity: AgaProjectIdentity,
): AgaStudioProjectV2<TOpeaWorkspace, THeliportWorkspace>;
export function migrateAgaStudioProject(
  payload: unknown,
  sourceSchemaVersion: number,
  identity: AgaProjectIdentity,
): AnyAgaStudioProject {
  if (sourceSchemaVersion === AGA_PROJECT_MODEL_VERSION) {
    const project: AnyAgaStudioProject = {
      ...cloneJson(payload as AnyAgaStudioProject),
      sysagaExecutions: Array.isArray((payload as AnyAgaStudioProject)?.sysagaExecutions)
        ? cloneJson((payload as AnyAgaStudioProject).sysagaExecutions)
        : [],
    };
    if (
      project.projectMode === "heliport_pbzph"
      && isRecord(project.workspaces)
      && isRecord(project.workspaces.heliport)
    ) {
      project.workspaces.heliport = normalizeHeliportWorkspace(
        project.workspaces.heliport,
      );
    }
    validateAgaStudioProject(project);
    return project;
  }
  if (sourceSchemaVersion === 3) {
    if (!isRecord(payload) || payload.kind !== "aga-studio-project" || payload.projectVersion !== 3) {
      throw new Error("O modelo V3 do projeto .aga é inválido.");
    }
    const project = {
      ...cloneJson(payload),
      projectVersion: AGA_PROJECT_MODEL_VERSION,
      projectMode: "opea" as const,
    };
    validateAgaStudioProject(project);
    return project as AgaOpeaStudioProject<unknown>;
  }
  if (sourceSchemaVersion === 2) {
    if (!isRecord(payload) || payload.kind !== "aga-studio-project" || payload.projectVersion !== 2) {
      throw new Error("O modelo V2 do projeto .aga é inválido.");
    }
    const project = {
      ...cloneJson(payload),
      projectVersion: AGA_PROJECT_MODEL_VERSION,
      projectMode: "opea" as const,
      externalWorkspace: {},
      agentSessions: [],
      agentTasks: [],
      agentApprovals: [],
      sysagaExecutions: [],
    };
    validateAgaStudioProject(project);
    return project as AgaOpeaStudioProject<unknown>;
  }
  if (sourceSchemaVersion !== 1) {
    throw new Error(`A versão ${String(sourceSchemaVersion)} do projeto .aga ainda não é compatível.`);
  }
  assertLegacyViabilityWorkspace(payload);
  const project = buildProjectFromWorkspace(payload, identity);
  validateAgaStudioProject(project);
  return project;
}

export function synchronizeAgaStudioProject<TWorkspace>(
  current: AgaStudioProjectV2<TWorkspace> | null,
  workspace: TWorkspace,
  identity: AgaProjectIdentity,
  options: SynchronizeOptions = {},
): AgaStudioProjectV2<TWorkspace> {
  assertLegacyViabilityWorkspace(workspace);
  if (!current) {
    const created = buildProjectFromWorkspace(workspace, identity, options.attachmentSources);
    validateAgaStudioProject(created);
    return created;
  }
  validateAgaStudioProject(current);

  const derived = deriveWorkspaceEntities(workspace, identity, options.attachmentSources);
  const next: AgaStudioProjectV2<TWorkspace> = {
    ...cloneJson(current),
    projectVersion: AGA_PROJECT_MODEL_VERSION,
    projectMode: "opea",
    identity: cloneJson(identity),
    sources: mergeSources(current.sources, derived.sources),
    opeas: derived.opeas,
    plans: derived.plans,
    documents: mergeDocuments(current.documents, derived.documents),
    sysagaExecutions: cloneJson(current.sysagaExecutions ?? []),
    workspaces: { viability: cloneJson(workspace) },
  };
  const technicalInputsChanged = canonicalFingerprint({
    opeas: technicalEntities(current.opeas),
    plans: technicalEntities(current.plans),
    formalAnalysisDraft: technicalAnalysisDraft(current.workspaces.viability),
  }) !== canonicalFingerprint({
    opeas: technicalEntities(next.opeas),
    plans: technicalEntities(next.plans),
    formalAnalysisDraft: technicalAnalysisDraft(workspace),
  });
  const synchronized = technicalInputsChanged
    ? invalidateAgaDerivedState(next, "Os dados técnicos do projeto foram alterados.", identity.updatedAt)
    : next;
  validateAgaStudioProject(synchronized);
  return synchronized;
}

export function createAgaHeliportProject(
  identity: AgaProjectIdentity,
  workspace: HeliportWorkspaceV1,
): AgaHeliportStudioProject<HeliportWorkspaceV1> {
  validateHeliportWorkspace(workspace);
  const project: AgaHeliportStudioProject<HeliportWorkspaceV1> = {
    kind: "aga-studio-project",
    projectVersion: AGA_PROJECT_MODEL_VERSION,
    projectMode: "heliport_pbzph",
    identity: cloneJson(identity),
    activeArea: "viability",
    sources: [],
    opeas: [],
    plans: [],
    analysisRuns: [],
    artifacts: [],
    documents: [],
    processPackages: [],
    sysagaExecutions: [],
    externalWorkspace: {},
    agentSessions: [],
    agentTasks: [],
    agentApprovals: [],
    workspaces: { heliport: cloneJson(workspace) },
    uiPreferences: { panelLayouts: {} },
  };
  validateAgaStudioProject(project);
  return project;
}

export function synchronizeAgaHeliportProject(
  current: AgaHeliportStudioProject<HeliportWorkspaceV1>,
  workspace: HeliportWorkspaceV1,
  identity: AgaProjectIdentity,
): AgaHeliportStudioProject<HeliportWorkspaceV1> {
  validateAgaStudioProject(current);
  if (current.projectMode !== "heliport_pbzph") {
    throw new Error("A sincronização PBZPH exige um projeto do modo heliport_pbzph.");
  }
  validateHeliportWorkspace(workspace);
  const technicalInputsChanged = heliportWorkspaceFingerprint(current.workspaces.heliport!)
    !== heliportWorkspaceFingerprint(workspace);
  const next: AgaHeliportStudioProject<HeliportWorkspaceV1> = {
    ...cloneJson(current),
    identity: cloneJson(identity),
    workspaces: { heliport: cloneJson(workspace) },
  };
  const synchronized = technicalInputsChanged
    ? invalidateAgaDerivedState(next, "Os dados técnicos do projeto foram alterados.", identity.updatedAt)
    : next;
  validateAgaStudioProject(synchronized);
  return synchronized;
}

export function selectAgaHeliportScenarioForReview(
  current: AgaHeliportStudioProject<HeliportWorkspaceV1>,
  scenarioId: string,
  updatedAt: string,
): AgaHeliportStudioProject<HeliportWorkspaceV1> {
  if (current.projectMode !== "heliport_pbzph") {
    throw new Error("A seleção de alternativa exige um projeto Heliponto/PBZPH.");
  }
  const workspace = current.workspaces.heliport;
  if (!workspace.directionScenarios.some((scenario) => scenario.id === scenarioId)) {
    throw new Error("A alternativa selecionada não existe mais neste projeto.");
  }

  // Selecionar um cartão é apenas navegação para revisão. Essa ação precisa continuar
  // disponível mesmo quando outro campo técnico do projeto ainda aguarda correção.
  const next = cloneJson(current);
  next.identity.updatedAt = updatedAt;
  next.workspaces.heliport.selectedScenarioId = scenarioId;
  next.workspaces.heliport.updatedAt = updatedAt;
  return next;
}

function technicalEntities<T extends { sourceId?: string; createdAt?: string; updatedAt?: string }>(entities: T[]) {
  return entities.map((entity) => {
    const { sourceId: _sourceId, createdAt: _createdAt, updatedAt: _updatedAt, ...technical } = entity;
    return technical;
  });
}

function technicalAnalysisDraft(workspace: unknown) {
  if (!isRecord(workspace) || !isRecord(workspace.input)) return undefined;
  const snapshot = {
    formalAnalysisDraft: workspace.input.formalAnalysisDraft,
    gridAnalysisConfig: workspace.input.gridAnalysisConfig,
    gridSelectedPlanId: workspace.input.gridSelectedPlanId,
  };
  return Object.values(snapshot).every((value) => value === undefined) ? undefined : cloneJson(snapshot);
}

export function invalidateAgaDerivedState<TProject extends AnyAgaStudioProject>(
  current: TProject,
  reason: string,
  changedAt: string,
): TProject {
  validateAgaStudioProject(current);
  const next = {
    ...cloneJson(current),
    activeAnalysisRunId: undefined,
    identity: {
      ...current.identity,
      updatedAt: changedAt,
    },
    artifacts: current.artifacts.map((artifact) => {
      if (artifact.status === "failed" || artifact.status === "stale") return cloneJson(artifact);
      return {
        ...cloneJson(artifact),
        staleReason: reason,
        status: "stale",
        updatedAt: changedAt,
      };
    }),
    processPackages: current.processPackages.map((processPackage) => {
      if (processPackage.status === "failed" || processPackage.status === "stale") return cloneJson(processPackage);
      return {
        ...cloneJson(processPackage),
        staleReason: reason,
        status: "stale",
        updatedAt: changedAt,
      };
    }),
  } as TProject;
  validateAgaStudioProject(next);
  return next;
}

export function appendAgaAnalysisRun<TProject extends AnyAgaStudioProject>(
  current: TProject,
  run: AgaAnalysisRun,
): TProject {
  validateAgaStudioProject(current);
  validateAnalysisRun(run);
  if (current.analysisRuns.some((item) => item.id === run.id)) {
    throw new Error(`A rodada de análise "${run.id}" já existe e não pode ser sobrescrita.`);
  }
  if (run.status !== "completed" && run.status !== "failed") {
    throw new Error("Apenas rodadas concluídas ou com falha podem entrar no histórico imutável.");
  }
  if (run.status === "completed" && (!run.completedAt || !run.result)) {
    throw new Error("Uma rodada concluída precisa registrar data de conclusão e resultado.");
  }
  const recordedRun = cloneJson(run);
  const next = {
    ...cloneJson(current),
    activeAnalysisRunId: run.status === "completed" ? run.id : current.activeAnalysisRunId,
    analysisRuns: [...current.analysisRuns.map(cloneJson), recordedRun],
    identity: {
      ...current.identity,
      updatedAt: run.completedAt || run.createdAt,
    },
  } as TProject;
  validateAgaStudioProject(next);
  return next;
}

export function appendAgaArtifacts<TProject extends AnyAgaStudioProject>(
  current: TProject,
  artifacts: AgaArtifact[],
): TProject {
  validateAgaStudioProject(current);
  if (!artifacts.length) throw new Error("Nenhum artefato foi informado para registro.");
  const existingIds = new Set(current.artifacts.map((artifact) => artifact.id));
  const incomingIds = new Set<string>();
  const runIds = new Set(current.analysisRuns.map((run) => run.id));
  for (const artifact of artifacts) {
    validateArtifact(artifact, runIds);
    if (existingIds.has(artifact.id) || incomingIds.has(artifact.id)) {
      throw new Error(`O artefato "${artifact.id}" já existe e não pode ser sobrescrito.`);
    }
    if (artifact.status !== "generated" && artifact.status !== "validated") {
      throw new Error("Apenas artefatos gerados ou validados podem entrar no registro do projeto.");
    }
    incomingIds.add(artifact.id);
  }
  const updatedAt = artifacts.reduce(
    (latest, artifact) => artifact.updatedAt > latest ? artifact.updatedAt : latest,
    current.identity.updatedAt,
  );
  const next = {
    ...cloneJson(current),
    artifacts: [...current.artifacts.map(cloneJson), ...artifacts.map(cloneJson)],
    identity: { ...current.identity, updatedAt },
  } as TProject;
  validateAgaStudioProject(next);
  return next;
}

export function appendAgaProcessPackage<TProject extends AnyAgaStudioProject>(
  current: TProject,
  processPackage: AgaProcessPackage,
): TProject {
  validateAgaStudioProject(current);
  validateProcessPackage(processPackage);
  if (current.processPackages.some((item) => item.id === processPackage.id)) {
    throw new Error(`O pacote de Processo OPEA "${processPackage.id}" já existe.`);
  }
  const now = processPackage.updatedAt;
  const next = {
    ...cloneJson(current),
    identity: { ...current.identity, updatedAt: now },
    processPackages: [
      ...current.processPackages.map((item) => item.kind === processPackage.kind && item.status !== "stale"
        ? { ...cloneJson(item), status: "stale" as const, staleReason: "Uma nova versão deste pacote foi preparada.", updatedAt: now }
        : cloneJson(item)),
      cloneJson(processPackage),
    ],
  } as TProject;
  validateAgaStudioProject(next);
  return next;
}

export function completeAgaSysagaPackagePreparation<TProject extends AnyAgaStudioProject>(
  current: TProject,
  processPackage: AgaProcessPackage,
  expected: { projectId: string; runId: string; inputFingerprint: string },
) {
  const activeRun = current.analysisRuns.find((run) => run.id === current.activeAnalysisRunId);
  const packagePayload = isRecord(processPackage.payload) ? processPackage.payload : null;
  sysagaFingerprint(packagePayload?.archiveSha256, "arquivo declarado no pacote");
  if (
    current.identity.id !== expected.projectId
    || current.activeAnalysisRunId !== expected.runId
    || activeRun?.status !== "completed"
    || activeRun.inputFingerprint !== expected.inputFingerprint
    || packagePayload?.runId !== expected.runId
    || packagePayload.inputFingerprint !== expected.inputFingerprint
  ) {
    throw new Error("A rodada formal ativa mudou durante o preparo. Descarte esta resposta e prepare o pacote novamente.");
  }
  return appendAgaProcessPackage(current, processPackage);
}

export function recordAgaSysagaExecutionSnapshot<TProject extends AnyAgaStudioProject>(
  current: TProject,
  packageId: string,
  snapshot: Record<string, unknown>,
  recordedAt: string,
): TProject {
  validateAgaStudioProject(current);
  const processPackage = current.processPackages.find((item) => item.id === packageId);
  if (!processPackage) {
    throw new Error("A execução SysAGA não pode ser registrada porque o pacote vinculado não existe neste projeto.");
  }
  const normalized = normalizeSysagaExecutionSnapshot(snapshot, processPackage, current.identity.id, recordedAt);
  if (Date.parse(normalized.recordedAt) < Date.parse(current.identity.updatedAt)) {
    throw new Error("O histórico SysAGA não pode fazer a data do projeto regredir.");
  }
  const executions = current.sysagaExecutions ?? [];
  const existingIndex = executions.findIndex((item) => item.executionId === normalized.executionId);
  const existing = existingIndex >= 0 ? executions[existingIndex] : undefined;
  if (existing) assertSameSysagaExecutionIdentity(existing, normalized);
  if (existing && Date.parse(normalized.recordedAt) < Date.parse(existing.updatedAt)) {
    throw new Error("O histórico SysAGA recebeu um estado mais antigo depois de um estado novo.");
  }

  const event: AgaSysagaExecutionEvent = withoutUndefined({
    at: recordedAt,
    state: normalized.state,
    validationApproved: normalized.validationApproved,
    dryRunApproved: normalized.dryRunApproved,
    reviewReady: normalized.reviewReady,
    reason: normalized.reason,
  });
  const lastEvent = existing?.events.at(-1);
  if (lastEvent) assertSysagaStateProgression(lastEvent.state, event.state);
  const duplicateEvent = lastEvent ? sameSysagaExecutionEvent(lastEvent, event) : false;
  const packageFingerprint = normalized.packageFingerprint ?? existing?.packageFingerprint;
  const completedFields = uniqueSysagaFields([...(existing?.completedFields ?? []), ...normalized.completedFields]);
  if (
    existing
    && duplicateEvent
    && existing.packageFingerprint === packageFingerprint
    && existing.state === normalized.state
    && completedFields.length === existing.completedFields.length
    && existing.accountLabel === normalized.accountLabel
    && existing.changedAccount === normalized.changedAccount
    && existing.draftId === normalized.draftId
    && existing.protocol === normalized.protocol
  ) {
    return current;
  }

  const events = duplicateEvent
    ? existing?.events.map(cloneJson) ?? []
    : compactSysagaExecutionEvents([...(existing?.events ?? []).map(cloneJson), event]);
  const reviewReady = Boolean(existing?.reviewReady || normalized.reviewReady);
  const record: AgaSysagaExecutionRecord = withoutUndefined({
    accountLabel: normalized.accountLabel ?? existing?.accountLabel,
    changedAccount: normalized.changedAccount ?? existing?.changedAccount,
    executionId: normalized.executionId,
    projectId: normalized.projectId,
    packageId,
    taskId: normalized.taskId,
    mode: normalized.mode,
    payloadFingerprint: normalized.payloadFingerprint,
    packageFingerprint,
    formalRunId: normalized.formalRunId,
    formalInputFingerprint: normalized.formalInputFingerprint,
    state: normalized.state,
    resumeState: reviewReady ? "awaiting_review" : "interrupted",
    lastSafeStep: laterSysagaSafeStep(existing?.lastSafeStep ?? "none", safeStepForSysagaState(normalized.state)),
    completedFields,
    draftId: normalized.draftId ?? existing?.draftId,
    validationApproved: Boolean(existing?.validationApproved || normalized.validationApproved),
    dryRunApproved: Boolean(existing?.dryRunApproved || normalized.dryRunApproved),
    reviewReady,
    createdAt: existing?.createdAt ?? recordedAt,
    updatedAt: recordedAt,
    reason: normalized.reason,
    protocol: normalized.protocol ?? existing?.protocol,
    events,
  });
  const nextExecutions = executions.map(cloneJson);
  if (existingIndex >= 0) nextExecutions[existingIndex] = record;
  else nextExecutions.push(record);
  const next = {
    ...cloneJson(current),
    identity: { ...current.identity, updatedAt: recordedAt },
    sysagaExecutions: nextExecutions,
  } as TProject;
  validateAgaStudioProject(next);
  return next;
}

export function agaSysagaTaskIdForPackage(packageId: string, mode: AgaProcessPackage["kind"]) {
  const normalized = packageId.trim().replace(/[^A-Za-z0-9._:-]+/g, "-").slice(0, 128);
  return normalized || `sysaga-${mode}`;
}

export function recordAgaDocumentExtraction<TProject extends AnyAgaStudioProject>(
  current: TProject,
  documentId: string,
  evidence: AgaDocumentEvidenceField[],
  changedAt: string,
): TProject {
  validateAgaStudioProject(current);
  if (!evidence.length) throw new Error("A extração não retornou campos para revisão.");
  const document = current.documents.find((item) => item.id === documentId);
  if (!document) throw new Error("O documento extraído não existe no projeto.");
  const normalized = evidence.map((field) => ({
    ...cloneJson(field),
    status: "extracted" as const,
    extractedAt: changedAt,
    reviewedAt: undefined,
    reviewedBy: undefined,
    confirmedAt: undefined,
    confirmedBy: undefined,
  }));
  validateDocumentEvidence(normalized, documentId);
  const next = {
    ...cloneJson(current),
    identity: { ...current.identity, updatedAt: changedAt },
    documents: current.documents.map((item) => item.id === documentId
      ? { ...cloneJson(item), status: "extracted" as const, evidence: normalized }
      : cloneJson(item)),
  } as TProject;
  validateAgaStudioProject(next);
  return next;
}

export function reviewAgaDocumentExtraction<TProject extends AnyAgaStudioProject>(
  current: TProject,
  documentId: string,
  reviewedBy: string,
  changedAt: string,
): TProject {
  return transitionDocumentEvidence(current, documentId, "reviewed", reviewedBy, changedAt);
}

export function confirmAgaDocumentExtraction<TProject extends AnyAgaStudioProject>(
  current: TProject,
  documentId: string,
  confirmedBy: string,
  changedAt: string,
): TProject {
  return transitionDocumentEvidence(current, documentId, "confirmed", confirmedBy, changedAt);
}

function transitionDocumentEvidence<TProject extends AnyAgaStudioProject>(
  current: TProject,
  documentId: string,
  target: "reviewed" | "confirmed",
  actor: string,
  changedAt: string,
) {
  validateAgaStudioProject(current);
  const document = current.documents.find((item) => item.id === documentId);
  if (!document?.evidence?.length) throw new Error("Extraia os campos do documento antes de revisá-los.");
  if (target === "confirmed" && document.evidence.some((field) => field.status !== "reviewed")) {
    throw new Error("Revise todos os campos extraídos antes de confirmá-los no projeto.");
  }
  const evidence = document.evidence.map((field): AgaDocumentEvidenceField => target === "reviewed"
    ? { ...cloneJson(field), status: "reviewed", reviewedAt: changedAt, reviewedBy: actor }
    : { ...cloneJson(field), status: "confirmed", confirmedAt: changedAt, confirmedBy: actor });
  const next = {
    ...cloneJson(current),
    identity: { ...current.identity, updatedAt: changedAt },
    documents: current.documents.map((item) => item.id === documentId
      ? { ...cloneJson(item), status: target, evidence }
      : cloneJson(item)),
  } as TProject;
  validateAgaStudioProject(next);
  return next;
}

export function setAgaProjectActiveArea<TProject extends AnyAgaStudioProject>(
  current: TProject,
  activeArea: AgaProjectArea,
  changedAt: string,
): TProject {
  validateAgaStudioProject(current);
  const next = {
    ...cloneJson(current),
    activeArea,
    identity: { ...current.identity, updatedAt: changedAt },
  } as TProject;
  validateAgaStudioProject(next);
  return next;
}

export function validateAgaArtifactForRun<TProject extends AnyAgaStudioProject>(
  current: TProject,
  artifactId: string,
  validatedAt: string,
): TProject {
  validateAgaStudioProject(current);
  const artifact = current.artifacts.find((item) => item.id === artifactId);
  if (!artifact) throw new Error("O artefato selecionado não existe no projeto.");
  if (artifact.status === "stale") throw new Error("Um artefato desatualizado não pode ser validado.");
  if (artifact.status !== "generated" && artifact.status !== "validated") {
    throw new Error("O artefato precisa estar gerado antes da validação.");
  }
  if (artifact.runId !== current.activeAnalysisRunId) {
    throw new Error("Somente artefatos da rodada ativa podem ser validados.");
  }
  const next = {
    ...cloneJson(current),
    artifacts: current.artifacts.map((item) => item.id === artifactId ? {
      ...cloneJson(item),
      status: "validated",
      updatedAt: validatedAt,
      metadata: {
        ...(isRecord(item.metadata) ? cloneJson(item.metadata) : {}),
        humanValidatedAt: validatedAt,
      },
    } : cloneJson(item)),
    identity: { ...current.identity, updatedAt: validatedAt },
  } as TProject;
  validateAgaStudioProject(next);
  return next;
}

export function validateAgaStudioProject(
  value: unknown,
): asserts value is AnyAgaStudioProject {
  if (!isRecord(value) || value.kind !== "aga-studio-project" || value.projectVersion !== AGA_PROJECT_MODEL_VERSION) {
    throw new Error("O modelo central do projeto .aga é inválido.");
  }
  validateIdentity(value.identity);
  if (value.projectMode !== "opea" && value.projectMode !== "heliport_pbzph") {
    throw new Error("O modo do projeto .aga é inválido.");
  }
  if (!["viability", "technical-proof", "report", "opea-process", "technical-drawings"].includes(String(value.activeArea))) {
    throw new Error("A área ativa do projeto .aga é inválida.");
  }
  const sources = requireArray(value.sources, "fontes");
  const opeas = requireArray(value.opeas, "OPEAs");
  const plans = requireArray(value.plans, "planos");
  const analysisRuns = requireArray(value.analysisRuns, "rodadas de análise");
  const artifacts = requireArray(value.artifacts, "artefatos");
  const documents = requireArray(value.documents, "documentos");
  const processPackages = requireArray(value.processPackages, "pacotes de processo");
  const sysagaExecutions = value.sysagaExecutions === undefined
    ? []
    : requireArray(value.sysagaExecutions, "execuções SysAGA");
  const agentSessions = requireArray(value.agentSessions, "sessões de agente");
  const agentTasks = requireArray(value.agentTasks, "tarefas de agente");
  const agentApprovals = requireArray(value.agentApprovals, "aprovações de agente");
  assertUniqueIds(sources, "fontes");
  assertUniqueIds(opeas, "OPEAs");
  assertUniqueIds(plans, "planos");
  assertUniqueIds(analysisRuns, "rodadas de análise");
  assertUniqueIds(artifacts, "artefatos");
  assertUniqueIds(documents, "documentos");
  assertUniqueIds(processPackages, "pacotes de processo");
  assertUniqueSysagaTaskIds(processPackages);
  assertUniqueIds(agentSessions, "sessões de agente");
  assertUniqueIds(agentTasks, "tarefas de agente");
  assertUniqueIds(agentApprovals, "aprovações de agente");

  const sourceIds = new Set(sources.map((item) => String((item as Record<string, unknown>).id)));
  for (const source of sources) validateSource(source);
  for (const item of opeas) validateOpea(item, sourceIds);
  for (const item of plans) validatePlan(item, sourceIds);
  const runIds = new Set(analysisRuns.map((item) => String((item as Record<string, unknown>).id)));
  for (const item of analysisRuns) validateAnalysisRun(item);
  const runsById = new Map(
    analysisRuns
      .filter(isRecord)
      .map((item) => [String(item.id), item] as const),
  );
  if (value.activeAnalysisRunId !== undefined && !runIds.has(String(value.activeAnalysisRunId))) {
    throw new Error("A rodada ativa do projeto .aga não existe no histórico.");
  }
  for (const item of artifacts) validateArtifact(item, runIds);
  for (const item of documents) validateDocument(item, sourceIds);
  for (const item of processPackages) {
    validateProcessPackage(item);
    validateProcessPackageFormalRun(item, runsById);
  }
  validateSysagaExecutionHistory(sysagaExecutions, processPackages, String((value.identity as Record<string, unknown>).id));
  validateExternalWorkspace(value.externalWorkspace);
  const artifactIds = new Set(artifacts.map((item) => String((item as Record<string, unknown>).id)));
  const sessionIds = new Set(agentSessions.map((item) => String((item as Record<string, unknown>).id)));
  const conversationIds = new Set<string>();
  for (const item of agentSessions) validateAgentSession(item, conversationIds);
  const tasksById = new Map<string, Record<string, unknown>>();
  for (const item of agentTasks) {
    validateAgentTask(item, sessionIds, artifactIds);
    tasksById.set(String((item as Record<string, unknown>).id), item as Record<string, unknown>);
  }
  const activeSessionChannels = new Set<string>();
  for (const item of agentSessions) {
    const session = item as Record<string, unknown>;
    if (session.activeTaskId === undefined) continue;
    const activeTask = tasksById.get(String(session.activeTaskId));
    if (!activeTask) {
      throw new Error(`A sessão de agente "${String(session.id)}" referencia uma tarefa ativa inexistente.`);
    }
    if (activeTask.sessionId !== session.id) {
      throw new Error(`A tarefa ativa "${String(session.activeTaskId)}" não pertence à sessão "${String(session.id)}".`);
    }
    if (activeTask.status === "approved") {
      throw new Error(`A tarefa aprovada "${String(session.activeTaskId)}" não pode permanecer ativa na sessão "${String(session.id)}".`);
    }
    const channel = String(session.channel);
    if (activeSessionChannels.has(channel)) {
      throw new Error(`O canal de agente "${channel}" não pode possuir duas sessões operacionais ativas.`);
    }
    activeSessionChannels.add(channel);
  }
  const taskIds = new Set(tasksById.keys());
  const pendingApprovalTaskIds = new Set<string>();
  for (const item of agentApprovals) {
    validateAgentApproval(item, taskIds);
    const approval = item as Record<string, unknown>;
    if (approval.status === "pending") pendingApprovalTaskIds.add(String(approval.taskId));
  }
  for (const taskId of pendingApprovalTaskIds) {
    if (tasksById.get(taskId)?.status === "approved") {
      throw new Error(`A tarefa aprovada "${taskId}" não pode possuir uma aprovação pendente.`);
    }
  }
  if (!isRecord(value.workspaces)) {
    throw new Error("Os espaços de trabalho do projeto .aga estão incompletos.");
  }
  if (value.projectMode === "opea") {
    if (!isRecord(value.workspaces.viability)) {
      throw new Error("A área de Viabilidade OPEA do projeto .aga está incompleta.");
    }
    if ("heliport" in value.workspaces) {
      throw new Error("O projeto OPEA não pode conter o espaço exclusivo de heliport PBZPH.");
    }
  }
  if (value.projectMode === "heliport_pbzph") {
    if ("viability" in value.workspaces) {
      throw new Error("O projeto PBZPH não pode conter a área exclusiva de Viabilidade OPEA.");
    }
    const heliportWorkspace = value.workspaces.heliport;
    validateHeliportWorkspace(heliportWorkspace);
    const projectId = String((value.identity as Record<string, unknown>).id);
    for (const evidence of heliportWorkspace.obstacleEvidence?.evidence ?? []) {
      if (evidence.study_id !== projectId) {
        throw new Error(
          `A evidência ${evidence.evidence_id} pertence a outro estudo e não pode ser gravada neste projeto PBZPH.`,
        );
      }
    }
    for (
      const assessment of
        heliportWorkspace.scenarioAssessments?.assessments ?? []
    ) {
      if (assessment.result.study_id !== projectId) {
        throw new Error(
          `A triagem ${assessment.assessment_id} pertence a outro estudo e não pode ser gravada neste projeto PBZPH.`,
        );
      }
    }
  }
  if (!isRecord(value.uiPreferences) || !isRecord(value.uiPreferences.panelLayouts)) {
    throw new Error("As preferências visuais do projeto .aga são inválidas.");
  }
}

function buildProjectFromWorkspace<TWorkspace>(
  workspace: TWorkspace,
  identity: AgaProjectIdentity,
  attachmentSources: ProjectAttachmentSource[] = [],
): AgaStudioProjectV2<TWorkspace> {
  const derived = deriveWorkspaceEntities(workspace, identity, attachmentSources);
  return {
    kind: "aga-studio-project",
    projectVersion: AGA_PROJECT_MODEL_VERSION,
    projectMode: "opea",
    identity: cloneJson(identity),
    activeArea: "viability",
    sources: derived.sources,
    opeas: derived.opeas,
    plans: derived.plans,
    analysisRuns: derived.analysisRuns,
    artifacts: [],
    documents: derived.documents,
    processPackages: [],
    sysagaExecutions: [],
    externalWorkspace: {},
    agentSessions: [],
    agentTasks: [],
    agentApprovals: [],
    workspaces: { viability: cloneJson(workspace) },
    uiPreferences: { panelLayouts: {} },
  };
}

function deriveWorkspaceEntities(
  workspace: unknown,
  identity: AgaProjectIdentity,
  attachmentSources: ProjectAttachmentSource[] = [],
) {
  const root = workspace as Record<string, unknown>;
  const input = root.input as Record<string, unknown>;
  const catalog = root.catalog as Record<string, unknown>;
  const legacySources = root.sources as Record<string, unknown>;
  const sources = deriveSources(legacySources, identity, attachmentSources);
  return {
    sources,
    opeas: deriveOpeas(input, identity, sources),
    plans: derivePlans(input),
    analysisRuns: deriveLegacyAnalysisRuns(input, identity),
    documents: deriveDocuments(catalog),
  };
}

function deriveSources(
  legacySources: Record<string, unknown>,
  identity: AgaProjectIdentity,
  attachmentSources: ProjectAttachmentSource[],
) {
  const suppliedByAttachment = new Map(attachmentSources.map((item) => [item.attachmentId, item]));
  const attachmentIds = new Set<string>();
  for (const value of Object.values(legacySources)) {
    if (typeof value === "string" && value.trim()) attachmentIds.add(value);
  }
  for (const item of attachmentSources) attachmentIds.add(item.attachmentId);
  return Array.from(attachmentIds, (attachmentId): AgaProjectSource => {
    const supplied = suppliedByAttachment.get(attachmentId);
    return {
      id: `attachment:${attachmentId}`,
      kind: "attachment",
      name: supplied?.name || sourceNameFromAttachmentId(attachmentId),
      createdAt: identity.createdAt,
      attachmentId,
      mediaType: supplied?.mediaType,
      origin: "embedded",
    };
  });
}

function deriveOpeas(
  input: Record<string, unknown>,
  identity: AgaProjectIdentity,
  sources: AgaProjectSource[],
): AgaOpea[] {
  const csvImport = isRecord(input.opeaCsvImport) ? input.opeaCsvImport : null;
  const csvFeatures = csvImport && Array.isArray(csvImport.features) ? csvImport.features : [];
  const manualFeature = isRecord(input.manualOpeaMapFeature) ? input.manualOpeaMapFeature : null;
  const features = csvFeatures.length ? csvFeatures : manualFeature ? [manualFeature] : [];
  const formalDraft = isRecord(input.formalAnalysisDraft) ? input.formalAnalysisDraft : null;
  const horizontalCrs = nonEmptyString(formalDraft?.horizontalCrs) || "EPSG:4326";
  const verticalDatum = nonEmptyString(formalDraft?.verticalDatum);
  const sourceId = sources.find((source) => source.attachmentId?.toLowerCase().includes("csv"))?.id;
  const opeas = features
    .filter(isRecord)
    .map((feature, index) => featureToOpea(feature, index, identity, sourceId, horizontalCrs, verticalDatum));
  if (opeas.length) return uniqueById(opeas);

  const manualPoints = Array.isArray(input.manualOpeaPoints) ? input.manualOpeaPoints.filter(isRecord) : [];
  if (!manualPoints.length) return [];
  const vertices = manualPoints.map((point, index) => legacyVertex(point, undefined, index));
  return [{
    id: "opea-draft",
    name: "OPEA em edição",
    geometryType: "polygon",
    state: vertices.length >= 3 ? "ready" : "draft",
    horizontalCrs,
    verticalDatum,
    sourceId,
    createdAt: identity.createdAt,
    updatedAt: identity.updatedAt,
    vertices,
  }];
}

function featureToOpea(
  feature: Record<string, unknown>,
  index: number,
  identity: AgaProjectIdentity,
  sourceId?: string,
  horizontalCrs = "EPSG:4326",
  verticalDatum?: string,
): AgaOpea {
  const points = Array.isArray(feature.points) ? feature.points : [];
  const legacyVertices = Array.isArray(feature.vertices) ? feature.vertices : [];
  const vertexCount = Math.max(points.length, legacyVertices.length);
  const vertices = Array.from({ length: vertexCount }, (_, vertexIndex) => {
    const point = Array.isArray(points[vertexIndex]) ? points[vertexIndex] as unknown[] : undefined;
    const legacy = isRecord(legacyVertices[vertexIndex]) ? legacyVertices[vertexIndex] as Record<string, unknown> : {};
    return legacyVertex(legacy, point, vertexIndex);
  });
  const geometryType = feature.kind === "point" || feature.kind === "line" || feature.kind === "polygon"
    ? feature.kind
    : "polygon";
  return {
    id: nonEmptyString(feature.id) || `opea-${index + 1}`,
    name: nonEmptyString(feature.name) || `OPEA ${index + 1}`,
    geometryType,
    state: hasRequiredVertices(geometryType, vertices.length) ? "ready" : "draft",
    horizontalCrs,
    verticalDatum,
    sourceId,
    createdAt: nonEmptyString(feature.createdAt) || identity.createdAt,
    updatedAt: identity.updatedAt,
    vertices,
  };
}

function legacyVertex(legacy: Record<string, unknown>, point: unknown[] | undefined, index: number): AgaOpeaVertex {
  const latitude = finiteNumber(legacy.latitude) ?? finiteNumber(point?.[0]);
  const longitude = finiteNumber(legacy.longitude) ?? finiteNumber(point?.[1]);
  if (latitude === undefined || longitude === undefined) {
    throw new Error(`O vértice ${index + 1} do OPEA não contém coordenadas válidas.`);
  }
  return withoutUndefined({
    id: nonEmptyString(legacy.vertex) || nonEmptyString(legacy.id) || `V${index + 1}`,
    latitude,
    longitude,
    latitudeText: nonEmptyString(legacy.latitudeText),
    longitudeText: nonEmptyString(legacy.longitudeText),
    baseAltitudeM: finiteNumber(legacy.baseAltitudeM),
    heightM: finiteNumber(legacy.heightM),
    topAltitudeM: finiteNumber(legacy.topAltitudeM),
  });
}

function derivePlans(input: Record<string, unknown>): AgaPlan[] {
  const imported = Array.isArray(input.importedPlans) ? input.importedPlans.filter(isRecord) : [];
  const result = isRecord(input.result) ? input.result : null;
  const resultPlans = result && Array.isArray(result.plans) ? result.plans.filter(isRecord) : [];
  const byId = new Map<string, AgaPlan>();
  for (const [index, legacy] of [...imported, ...resultPlans].entries()) {
    const id = nonEmptyString(legacy.id) || `plan-${index + 1}`;
    const existing = byId.get(id);
    const componentName = nonEmptyString(legacy.layer);
    const stage = planStageFromPayload(legacy);
    const incoming: AgaPlan = {
      id,
      name: nonEmptyString(legacy.title) || `Plano ${index + 1}`,
      stage,
      aerodrome: nonEmptyString(legacy.aerodrome),
      oaci: nonEmptyString(legacy.oaci),
      planType: nonEmptyString(legacy.typeLabel),
      components: componentName ? [{
        id: `${id}:${safeId(componentName)}`,
        name: componentName,
        visibleByDefault: stage !== "candidate",
        geometrySnapshot: legacy.polygons,
      }] : [],
      metadata: cloneJson(legacy),
    };
    if (!existing) {
      byId.set(id, withoutUndefined(incoming));
      continue;
    }
    existing.stage = strongerPlanStage(existing.stage, incoming.stage);
    for (const component of incoming.components) {
      if (!existing.components.some((item) => item.id === component.id)) existing.components.push(component);
    }
  }
  return Array.from(byId.values());
}

function deriveLegacyAnalysisRuns(input: Record<string, unknown>, identity: AgaProjectIdentity): AgaAnalysisRun[] {
  if (!isRecord(input.result)) return [];
  return [{
    id: "legacy-geometric-incidence",
    createdAt: identity.updatedAt,
    completedAt: identity.updatedAt,
    status: "completed",
    engineVersion: "legacy-geometric-incidence",
    catalogVersion: "legacy-unavailable",
    inputFingerprint: "legacy-unavailable",
    inputSnapshot: {},
    result: {
      overallStatus: "not_evaluated",
      points: [],
      rawResult: cloneJson(input.result),
    },
  }];
}

function deriveDocuments(catalog: Record<string, unknown>): AgaDocument[] {
  if (!Array.isArray(catalog.documents)) return [];
  return uniqueById(catalog.documents.filter(isRecord).map((document, index): AgaDocument => withoutUndefined({
    id: nonEmptyString(document.id) || `document-${index + 1}`,
    name: nonEmptyString(document.title) || `Documento ${index + 1}`,
    format: nonEmptyString(document.format) || "FILE",
    status: "available",
    openUrl: nonEmptyString(document.openUrl),
    downloadUrl: nonEmptyString(document.downloadUrl),
    extractionProfile: nonEmptyString(document.extractionProfile),
    metadata: cloneJson(document),
  })));
}

function mergeSources(current: AgaProjectSource[], derived: AgaProjectSource[]) {
  const byId = new Map(current.map((source) => [source.id, cloneJson(source)]));
  for (const source of derived) byId.set(source.id, { ...byId.get(source.id), ...source });
  return Array.from(byId.values());
}

function mergeDocuments(current: AgaDocument[], derived: AgaDocument[]) {
  const byId = new Map(current.map((document) => [document.id, cloneJson(document)]));
  for (const document of derived) {
    const existing = byId.get(document.id);
    byId.set(document.id, existing ? {
      ...existing,
      ...document,
      status: existing.status,
      evidence: existing.evidence,
    } : document);
  }
  return Array.from(byId.values());
}

function validateIdentity(value: unknown) {
  if (!isRecord(value) || !nonEmptyString(value.id) || !nonEmptyString(value.name) || !nonEmptyString(value.createdAt) || !nonEmptyString(value.updatedAt)) {
    throw new Error("A identidade do projeto .aga está incompleta.");
  }
  if (!isCanonicalProjectId(value.id)) {
    throw new Error("O identificador do projeto .aga é inválido.");
  }
}

function isCanonicalProjectId(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const normalized = value.trim();
  return normalized === value
    && normalized.length <= 128
    && !/[\p{Cc}/\\]/u.test(normalized)
    && !normalized.includes("..");
}

function validateSource(value: unknown) {
  if (!isRecord(value) || !nonEmptyString(value.id) || !nonEmptyString(value.name) || !nonEmptyString(value.createdAt)) {
    throw new Error("Uma fonte do projeto .aga está incompleta.");
  }
  if (!["attachment", "catalog", "manual", "extracted_document"].includes(String(value.kind))) {
    throw new Error("Uma fonte do projeto .aga possui tipo inválido.");
  }
}

function validateOpea(value: unknown, sourceIds: Set<string>) {
  if (!isRecord(value) || !nonEmptyString(value.id) || !nonEmptyString(value.name) || !nonEmptyString(value.horizontalCrs)) {
    throw new Error("Um OPEA do projeto .aga está incompleto.");
  }
  if (!["point", "line", "polygon"].includes(String(value.geometryType)) || !["draft", "ready"].includes(String(value.state))) {
    throw new Error(`O OPEA "${String(value.id)}" possui geometria ou estado inválido.`);
  }
  if (value.sourceId !== undefined && !sourceIds.has(String(value.sourceId))) {
    throw new Error(`O OPEA "${String(value.id)}" referencia uma fonte inexistente.`);
  }
  const vertices = requireArray(value.vertices, `vértices do OPEA ${String(value.id)}`);
  assertUniqueIds(vertices, `vértices do OPEA ${String(value.id)}`);
  if (value.state === "ready" && !hasRequiredVertices(value.geometryType as AgaOpea["geometryType"], vertices.length)) {
    throw new Error(`O OPEA "${String(value.id)}" não possui vértices suficientes.`);
  }
  for (const vertex of vertices) {
    if (!isRecord(vertex) || !nonEmptyString(vertex.id) || finiteNumber(vertex.latitude) === undefined || finiteNumber(vertex.longitude) === undefined) {
      throw new Error(`O OPEA "${String(value.id)}" possui um vértice inválido.`);
    }
    const latitude = Number(vertex.latitude);
    const longitude = Number(vertex.longitude);
    if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      throw new Error(`O OPEA "${String(value.id)}" possui coordenadas fora do intervalo geográfico.`);
    }
  }
}

function validatePlan(value: unknown, sourceIds: Set<string>) {
  if (!isRecord(value) || !nonEmptyString(value.id) || !nonEmptyString(value.name)) {
    throw new Error("Um plano do projeto .aga está incompleto.");
  }
  if (!["candidate", "geometric_incident", "normative_restrictive", "not_incident"].includes(String(value.stage))) {
    throw new Error(`O plano "${String(value.id)}" possui classificação inválida.`);
  }
  if (value.sourceId !== undefined && !sourceIds.has(String(value.sourceId))) {
    throw new Error(`O plano "${String(value.id)}" referencia uma fonte inexistente.`);
  }
  const components = requireArray(value.components, `componentes do plano ${String(value.id)}`);
  assertUniqueIds(components, `componentes do plano ${String(value.id)}`);
}

function validateAnalysisRun(value: unknown) {
  if (!isRecord(value) || !nonEmptyString(value.id) || !nonEmptyString(value.createdAt) || !nonEmptyString(value.engineVersion) || !nonEmptyString(value.catalogVersion) || !nonEmptyString(value.inputFingerprint)) {
    throw new Error("Uma rodada de análise do projeto .aga está incompleta.");
  }
  if (!["pending", "running", "completed", "failed"].includes(String(value.status))) {
    throw new Error(`A rodada "${String(value.id)}" possui estado inválido.`);
  }
  if (value.result !== undefined) {
    if (!isRecord(value.result) || !Array.isArray(value.result.points) || !["not_evaluated", "insufficient_data", "no_incidence", "viable", "critical", "not_viable"].includes(String(value.result.overallStatus))) {
      throw new Error(`O resultado da rodada "${String(value.id)}" é inválido.`);
    }
  }
}

function validateArtifact(value: unknown, runIds: Set<string>) {
  if (!isRecord(value) || !nonEmptyString(value.id) || !nonEmptyString(value.name) || !runIds.has(String(value.runId))) {
    throw new Error("Um artefato do projeto .aga está incompleto ou sem rodada de origem.");
  }
  if (!["pending", "generating", "generated", "validated", "failed", "stale"].includes(String(value.status))) {
    throw new Error(`O artefato "${String(value.id)}" possui estado inválido.`);
  }
}

function validateDocument(value: unknown, sourceIds: Set<string>) {
  if (!isRecord(value) || !nonEmptyString(value.id) || !nonEmptyString(value.name) || !nonEmptyString(value.format)) {
    throw new Error("Um documento do projeto .aga está incompleto.");
  }
  if (!["available", "extracted", "reviewed", "confirmed"].includes(String(value.status))) {
    throw new Error(`O documento "${String(value.id)}" possui estado inválido.`);
  }
  if (value.sourceId !== undefined && !sourceIds.has(String(value.sourceId))) {
    throw new Error(`O documento "${String(value.id)}" referencia uma fonte inexistente.`);
  }
  if (value.evidence !== undefined) validateDocumentEvidence(requireArray(value.evidence, `evidências do documento ${String(value.id)}`), String(value.id));
}

function validateDocumentEvidence(evidence: unknown[], documentId: string) {
  assertUniqueIds(evidence, `evidências do documento ${documentId}`);
  for (const field of evidence) {
    if (!isRecord(field) || !nonEmptyString(field.label) || !nonEmptyString(field.originalValue) || !nonEmptyString(field.normalizedValue) || !nonEmptyString(field.extractedAt)) {
      throw new Error(`Uma evidência do documento "${documentId}" está incompleta.`);
    }
    if (!Number.isInteger(field.page) || Number(field.page) < 1 || !["extracted", "reviewed", "confirmed"].includes(String(field.status))) {
      throw new Error(`Uma evidência do documento "${documentId}" possui página ou estado inválido.`);
    }
    if (field.status === "reviewed" && (!nonEmptyString(field.reviewedAt) || !nonEmptyString(field.reviewedBy))) {
      throw new Error(`Uma evidência revisada do documento "${documentId}" não identifica a revisão.`);
    }
    if (field.status === "confirmed" && (!nonEmptyString(field.reviewedAt) || !nonEmptyString(field.reviewedBy) || !nonEmptyString(field.confirmedAt) || !nonEmptyString(field.confirmedBy))) {
      throw new Error(`Uma evidência confirmada do documento "${documentId}" não possui rastreabilidade completa.`);
    }
  }
}

function validateProcessPackage(value: unknown) {
  if (!isRecord(value) || !nonEmptyString(value.id) || !nonEmptyString(value.name)) {
    throw new Error("Um pacote de Processo OPEA está incompleto.");
  }
  if (!["pre_analysis", "anexo_c2", "opea_request", "heliport_request"].includes(String(value.kind)) || !["draft", "prepared", "validated", "failed", "stale"].includes(String(value.status))) {
    throw new Error(`O pacote de Processo OPEA "${String(value.id)}" possui tipo ou estado inválido.`);
  }
  if (value.kind === "opea_request") validatePersistedOpeaRequestPackage(value);
}

function assertUniqueSysagaTaskIds(values: unknown[]) {
  const taskIds = new Set<string>();
  for (const value of values) {
    if (
      !isRecord(value)
      || !nonEmptyString(value.id)
      || !["pre_analysis", "anexo_c2", "opea_request", "heliport_request"].includes(String(value.kind))
    ) continue;
    const mode = value.kind as AgaProcessPackage["kind"];
    const taskId = agaSysagaTaskIdForPackage(String(value.id), mode);
    const scopedTaskId = `${mode}:${taskId}`;
    if (taskIds.has(scopedTaskId)) {
      throw new Error("Dois pacotes SysAGA diferentes geram o mesmo identificador de tarefa.");
    }
    taskIds.add(scopedTaskId);
  }
}

function validateProcessPackageFormalRun(
  value: unknown,
  runsById: Map<string, Record<string, unknown>>,
) {
  if (!isRecord(value) || !isRecord(value.payload)) return;
  const payload = value.payload;
  const hasRunReference = payload.runId !== undefined || payload.inputFingerprint !== undefined;
  if (!hasRunReference) return;
  const runId = nonEmptyString(payload.runId);
  const inputFingerprint = nonEmptyString(payload.inputFingerprint);
  const run = runId ? runsById.get(runId) : undefined;
  if (
    !runId
    || !inputFingerprint
    || !run
    || run.status !== "completed"
    || run.inputFingerprint !== inputFingerprint
  ) {
    throw new Error(`O pacote de Processo OPEA "${String(value.id)}" não corresponde a uma rodada formal concluída.`);
  }
  if (payload.archiveSha256 !== undefined) {
    sysagaFingerprint(payload.archiveSha256, "arquivo declarado no pacote");
  }
}

const SYSAGA_EXECUTION_STATES = new Set<AgaSysagaExecutionState>([
  "awaiting_login",
  "closed",
  "closing",
  "dry_run_approved",
  "dry_run_running",
  "failed",
  "opening",
  "paused",
  "prepared",
  "preparing",
  "profile_locked",
  "ready",
  "running",
  "stopping",
  "validated",
  "validating",
]);
const SYSAGA_EASYAGA_ACCOUNT_LABEL = "Easy Aga Consultoria E Treinamento Ltda";

function normalizeSysagaExecutionSnapshot(
  snapshot: Record<string, unknown>,
  processPackage: AgaProcessPackage,
  projectId: string,
  recordedAt: string,
) {
  if (!isRecord(snapshot)) throw new Error("O estado da execução SysAGA é inválido.");
  if (processPackage.kind === "heliport_request") {
    throw new Error("O pacote do Processo Heliponto não é uma execução do SysAGA.");
  }
  const executionId = sysagaToken(snapshot.executionId, "execução");
  const taskId = sysagaToken(snapshot.taskId, "tarefa");
  const snapshotProjectId = nonEmptyString(snapshot.projectId);
  const mode = snapshot.mode;
  const payloadFingerprint = sysagaFingerprint(snapshot.payloadFingerprint, "payload");
  const packageFingerprint = snapshot.packageFingerprint === null || snapshot.packageFingerprint === undefined
    ? undefined
    : sysagaFingerprint(snapshot.packageFingerprint, "pacote");
  const packagePayload = isRecord(processPackage.payload) ? processPackage.payload : null;
  const declaredArchiveFingerprint = sysagaFingerprint(
    packagePayload?.archiveSha256,
    "arquivo declarado no pacote",
  );
  const formalRunId = boundedRequiredText(packagePayload?.runId, 256, "A rodada formal do pacote SysAGA");
  const formalInputFingerprint = boundedRequiredText(
    packagePayload?.inputFingerprint,
    256,
    "O fingerprint da rodada formal do pacote SysAGA",
  );
  const state = snapshot.state;
  if (snapshotProjectId !== projectId) {
    throw new Error("O estado SysAGA pertence a outro projeto ou a outra execução.");
  }
  if (mode !== processPackage.kind) {
    throw new Error("O estado SysAGA pertence a outro modo ou a outro pacote.");
  }
  if (taskId !== agaSysagaTaskIdForPackage(processPackage.id, processPackage.kind)) {
    throw new Error("O estado SysAGA não corresponde ao identificador exato do pacote vinculado.");
  }
  if (typeof state !== "string" || !SYSAGA_EXECUTION_STATES.has(state as AgaSysagaExecutionState)) {
    throw new Error("O estado operacional da execução SysAGA é inválido.");
  }
  const validationApproved = snapshot.validationApproved === true;
  const dryRunApproved = snapshot.dryRunApproved === true;
  assertSysagaEvidenceForState(state as AgaSysagaExecutionState, validationApproved, dryRunApproved);
  const timestamp = isoTimestamp(recordedAt, "A data do histórico SysAGA");
  const reason = sysagaReason(snapshot.reason, "O motivo do estado SysAGA");
  const completedFields = normalizeSysagaCompletedFields(snapshot.completedFields);
  const accountLabel = boundedOptionalText(snapshot.accountLabel, 160, "A conta da execuÃ§Ã£o SysAGA");
  const draftId = optionalSysagaResultToken(snapshot.draftId, "O identificador do rascunho SysAGA");
  const protocol = optionalSysagaResultToken(snapshot.protocol, "O protocolo SysAGA");
  if (snapshot.changedAccount !== undefined && typeof snapshot.changedAccount !== "boolean") {
    throw new Error("A indicaÃ§Ã£o de troca de conta SysAGA Ã© invÃ¡lida.");
  }
  if (snapshot.reviewReady !== undefined && typeof snapshot.reviewReady !== "boolean") {
    throw new Error("A confirmação de revisão da execução SysAGA é inválida.");
  }
  const reviewReady = snapshot.reviewReady === true;
  const changedAccount = reviewReady && typeof snapshot.changedAccount === "boolean"
    ? snapshot.changedAccount
    : undefined;
  if (
    reviewReady
    && (
      state !== "paused"
      || reason !== "human-review-required"
      || completedFields.length === 0
    )
  ) {
    throw new Error("A revisão SysAGA exige pausa explícita, motivo controlado e campos concluídos.");
  }
  if (
    reviewReady
    && processPackage.kind === "pre_analysis"
    && (
      accountLabel !== SYSAGA_EASYAGA_ACCOUNT_LABEL
      || typeof changedAccount !== "boolean"
      || (!draftId && !protocol)
    )
  ) {
    throw new Error("A revisÃ£o SysAGA exige a conta EasyAGA e a identificaÃ§Ã£o do rascunho salvo.");
  }
  if ((!reviewReady || processPackage.kind !== "pre_analysis") && (accountLabel || draftId || protocol || changedAccount !== undefined)) {
    throw new Error("Dados do rascunho SysAGA sÃ³ podem ser registrados quando a revisÃ£o estiver pronta.");
  }
  if (payloadFingerprint !== declaredArchiveFingerprint) {
    throw new Error("O arquivo recebido não corresponde ao SHA-256 declarado pelo pacote SysAGA.");
  }
  if (packageFingerprint && packageFingerprint !== payloadFingerprint) {
    throw new Error("A cópia privada do pacote SysAGA não corresponde ao payload congelado.");
  }
  return {
    executionId,
    projectId: snapshotProjectId,
    packageId: processPackage.id,
    taskId,
    mode: processPackage.kind,
    payloadFingerprint,
    packageFingerprint,
    formalRunId,
    formalInputFingerprint,
    state: state as AgaSysagaExecutionState,
    validationApproved,
    dryRunApproved,
    reviewReady,
    recordedAt: timestamp,
    reason,
    completedFields,
    accountLabel,
    changedAccount,
    draftId,
    protocol,
  };
}

function assertSameSysagaExecutionIdentity(
  existing: AgaSysagaExecutionRecord,
  incoming: ReturnType<typeof normalizeSysagaExecutionSnapshot>,
) {
  for (const key of ["projectId", "packageId", "taskId", "mode", "payloadFingerprint", "formalRunId", "formalInputFingerprint"] as const) {
    if (existing[key] !== incoming[key]) {
      throw new Error("A identidade congelada da execução SysAGA não pode ser substituída.");
    }
  }
  if (
    existing.packageFingerprint
    && incoming.packageFingerprint
    && existing.packageFingerprint !== incoming.packageFingerprint
  ) {
    throw new Error("O pacote privado da execução SysAGA mudou durante a retomada.");
  }
}

function sameSysagaExecutionEvent(first: AgaSysagaExecutionEvent, second: AgaSysagaExecutionEvent) {
  return first.state === second.state
    && first.validationApproved === second.validationApproved
    && first.dryRunApproved === second.dryRunApproved
    && first.reviewReady === second.reviewReady
    && first.reason === second.reason;
}

function compactSysagaExecutionEvents(events: AgaSysagaExecutionEvent[]) {
  if (events.length <= 256) return events;
  const selectedIndices = new Set<number>();
  for (const predicate of [
    (event: AgaSysagaExecutionEvent) => event.validationApproved,
    (event: AgaSysagaExecutionEvent) => event.dryRunApproved,
    (event: AgaSysagaExecutionEvent) => event.reviewReady,
    (event: AgaSysagaExecutionEvent) => safeStepForSysagaState(event.state) === "edge_opened",
  ]) {
    const index = events.findIndex(predicate);
    if (index >= 0) selectedIndices.add(index);
  }
  for (let index = events.length - 1; index >= 0 && selectedIndices.size < 256; index -= 1) {
    selectedIndices.add(index);
  }
  return [...selectedIndices]
    .sort((first, second) => first - second)
    .map((index) => events[index]);
}

function validateSysagaExecutionHistory(
  values: unknown[],
  processPackages: unknown[],
  projectId: string,
) {
  const packagesById = new Map(processPackages.filter(isRecord).map((item) => [String(item.id), item]));
  const executionIds = new Set<string>();
  for (const value of values) {
    if (!isRecord(value)) throw new Error("Uma execução SysAGA persistida é inválida.");
    assertAllowedKeys(
      value,
      [
        "executionId",
        "accountLabel",
        "changedAccount",
        "projectId",
        "packageId",
        "taskId",
        "mode",
        "payloadFingerprint",
        "packageFingerprint",
        "formalRunId",
        "formalInputFingerprint",
        "state",
        "resumeState",
        "lastSafeStep",
        "completedFields",
        "draftId",
        "validationApproved",
        "dryRunApproved",
        "reviewReady",
        "createdAt",
        "updatedAt",
        "reason",
        "protocol",
        "events",
      ],
      `execução SysAGA "${String(value.executionId)}"`,
    );
    const executionId = sysagaToken(value.executionId, "execução");
    if (executionIds.has(executionId)) throw new Error("O histórico SysAGA possui identificadores de execução repetidos.");
    executionIds.add(executionId);
    const processPackage = packagesById.get(String(value.packageId));
    if (!processPackage) throw new Error(`A execução SysAGA "${executionId}" referencia um pacote inexistente.`);
    if (value.projectId !== projectId || value.mode !== processPackage.kind) {
      throw new Error(`A execução SysAGA "${executionId}" pertence a outro projeto ou pacote.`);
    }
    const packagePayload = isRecord(processPackage.payload) ? processPackage.payload : null;
    if (
      value.formalRunId !== packagePayload?.runId
      || value.formalInputFingerprint !== packagePayload?.inputFingerprint
    ) {
      throw new Error(`A execução SysAGA "${executionId}" não preservou a rodada formal do pacote.`);
    }
    sysagaToken(value.taskId, "tarefa");
    if (value.taskId !== agaSysagaTaskIdForPackage(String(value.packageId), processPackage.kind as AgaProcessPackage["kind"])) {
      throw new Error(`A execução SysAGA "${executionId}" não corresponde ao pacote vinculado.`);
    }
    const payloadFingerprint = sysagaFingerprint(value.payloadFingerprint, "payload");
    const declaredArchiveFingerprint = sysagaFingerprint(
      packagePayload?.archiveSha256,
      "arquivo declarado no pacote",
    );
    if (payloadFingerprint !== declaredArchiveFingerprint) {
      throw new Error(`A execução SysAGA "${executionId}" não corresponde ao arquivo declarado pelo pacote.`);
    }
    if (value.packageFingerprint !== undefined) {
      const packageFingerprint = sysagaFingerprint(value.packageFingerprint, "pacote");
      if (packageFingerprint !== payloadFingerprint) {
        throw new Error(`A execução SysAGA "${executionId}" não preservou a identidade binária do pacote.`);
      }
    }
    if (typeof value.state !== "string" || !SYSAGA_EXECUTION_STATES.has(value.state as AgaSysagaExecutionState)) {
      throw new Error(`A execução SysAGA "${executionId}" possui estado inválido.`);
    }
    if (
      typeof value.validationApproved !== "boolean"
      || typeof value.dryRunApproved !== "boolean"
      || typeof value.reviewReady !== "boolean"
    ) {
      throw new Error(`A execução SysAGA "${executionId}" possui evidências inválidas.`);
    }
    if (value.dryRunApproved && !value.validationApproved) {
      throw new Error(`A execução SysAGA "${executionId}" aprovou dry-run sem validação.`);
    }
    if (!['interrupted', 'awaiting_review'].includes(String(value.resumeState))) {
      throw new Error(`A execução SysAGA "${executionId}" possui política de retomada inválida.`);
    }
    if (!['none', 'package_prepared', 'package_validated', 'dry_run_approved', 'edge_opened'].includes(String(value.lastSafeStep))) {
      throw new Error(`A execução SysAGA "${executionId}" possui última etapa segura inválida.`);
    }
    const completedFields = normalizeSysagaCompletedFields(value.completedFields);
    if ((value.reviewReady ? "awaiting_review" : "interrupted") !== value.resumeState) {
      throw new Error(`A execução SysAGA "${executionId}" possui retomada incompatível com os campos registrados.`);
    }
    if (value.reviewReady && completedFields.length === 0) {
      throw new Error(`A execução SysAGA "${executionId}" marcou revisão sem campos concluídos.`);
    }
    const accountLabel = boundedOptionalText(value.accountLabel, 160, "A conta da execuÃ§Ã£o SysAGA");
    const draftId = optionalSysagaResultToken(value.draftId, "O identificador do rascunho SysAGA");
    const protocol = optionalSysagaResultToken(value.protocol, "O protocolo SysAGA");
    if (value.changedAccount !== undefined && typeof value.changedAccount !== "boolean") {
      throw new Error(`A execuÃ§Ã£o SysAGA "${executionId}" possui indicaÃ§Ã£o de troca de conta invÃ¡lida.`);
    }
    const hasPersistedReviewIdentity = Boolean(accountLabel || draftId || protocol || value.changedAccount !== undefined);
    if (value.reviewReady && processPackage.kind === "pre_analysis" && hasPersistedReviewIdentity && (accountLabel !== SYSAGA_EASYAGA_ACCOUNT_LABEL || (!draftId && !protocol))) {
      throw new Error(`A execuÃ§Ã£o SysAGA "${executionId}" nÃ£o preservou a conta EasyAGA ou o rascunho salvo.`);
    }
    if ((!value.reviewReady || processPackage.kind !== "pre_analysis") && (accountLabel || draftId || protocol || value.changedAccount !== undefined)) {
      throw new Error(`A execuÃ§Ã£o SysAGA "${executionId}" registrou rascunho sem revisÃ£o pronta.`);
    }
    const createdAt = isoTimestamp(value.createdAt, "A data inicial da execução SysAGA");
    const updatedAt = isoTimestamp(value.updatedAt, "A última data da execução SysAGA");
    if (Date.parse(updatedAt) < Date.parse(createdAt)) {
      throw new Error(`A execução SysAGA "${executionId}" possui datas fora de ordem.`);
    }
    sysagaReason(value.reason, "O motivo da execução SysAGA");
    const events = requireArray(value.events, `eventos da execução SysAGA ${executionId}`);
    if (!events.length || events.length > 256) {
      throw new Error(`A execução SysAGA "${executionId}" possui uma sequência de eventos inválida.`);
    }
    const normalizedEvents = events.map((event) => validateSysagaExecutionEvent(event, executionId));
    for (let index = 1; index < normalizedEvents.length; index += 1) {
      if (Date.parse(normalizedEvents[index].at) < Date.parse(normalizedEvents[index - 1].at)) {
        throw new Error(`A execução SysAGA "${executionId}" possui eventos fora de ordem.`);
      }
      assertSysagaStateProgression(normalizedEvents[index - 1].state, normalizedEvents[index].state);
    }
    const lastEvent = normalizedEvents.at(-1)!;
    if (lastEvent.state !== value.state) {
      throw new Error(`A execução SysAGA "${executionId}" não preservou seu último estado.`);
    }
    if (!value.validationApproved && normalizedEvents.some((event) => event.validationApproved)) {
      throw new Error(`A execução SysAGA "${executionId}" não preservou o histórico da validação.`);
    }
    if (!value.dryRunApproved && normalizedEvents.some((event) => event.dryRunApproved)) {
      throw new Error(`A execução SysAGA "${executionId}" não preservou o histórico do dry-run.`);
    }
    if (value.validationApproved && !normalizedEvents.some((event) => event.validationApproved)) {
      throw new Error(`A execução SysAGA "${executionId}" perdeu a evidência da validação.`);
    }
    if (value.dryRunApproved && !normalizedEvents.some((event) => event.dryRunApproved)) {
      throw new Error(`A execução SysAGA "${executionId}" perdeu a evidência do dry-run.`);
    }
    if (value.reviewReady !== normalizedEvents.some((event) => event.reviewReady)) {
      throw new Error(`A execução SysAGA "${executionId}" não preservou a evidência da revisão.`);
    }
    const derivedLastSafeStep = normalizedEvents.reduce<AgaSysagaSafeStep>(
      (safeStep, event) => laterSysagaSafeStep(safeStep, safeStepForSysagaState(event.state)),
      "none",
    );
    if (derivedLastSafeStep !== value.lastSafeStep) {
      throw new Error(`A execução SysAGA "${executionId}" possui uma última etapa segura sem evidência.`);
    }
  }
}

function validateSysagaExecutionEvent(value: unknown, executionId: string): AgaSysagaExecutionEvent {
  if (!isRecord(value)) throw new Error(`Um evento da execução SysAGA "${executionId}" é inválido.`);
  assertAllowedKeys(
    value,
    ["at", "state", "validationApproved", "dryRunApproved", "reviewReady", "reason"],
    `evento da execução SysAGA "${executionId}"`,
  );
  if (typeof value.state !== "string" || !SYSAGA_EXECUTION_STATES.has(value.state as AgaSysagaExecutionState)) {
    throw new Error(`Um evento da execução SysAGA "${executionId}" possui estado inválido.`);
  }
  if (
    typeof value.validationApproved !== "boolean"
    || typeof value.dryRunApproved !== "boolean"
    || typeof value.reviewReady !== "boolean"
  ) {
    throw new Error(`Um evento da execução SysAGA "${executionId}" possui evidências inválidas.`);
  }
  if (value.dryRunApproved && !value.validationApproved) {
    throw new Error(`Um evento da execução SysAGA "${executionId}" aprovou dry-run sem validação.`);
  }
  assertSysagaEvidenceForState(
    value.state as AgaSysagaExecutionState,
    value.validationApproved,
    value.dryRunApproved,
  );
  isoTimestamp(value.at, "A data do evento SysAGA");
  sysagaReason(value.reason, "O motivo do evento SysAGA");
  if (
    value.reviewReady
    && (value.state !== "paused" || value.reason !== "human-review-required")
  ) {
    throw new Error(`Um evento da execução SysAGA "${executionId}" marcou revisão sem pausa explícita.`);
  }
  return value as AgaSysagaExecutionEvent;
}

function sysagaToken(value: unknown, label: string) {
  if (typeof value !== "string" || !/^[A-Za-z0-9._:-]{1,128}$/.test(value)) {
    throw new Error(`O identificador de ${label} SysAGA é inválido.`);
  }
  return value;
}

function sysagaFingerprint(value: unknown, label: string) {
  if (typeof value !== "string" || !/^[a-f0-9]{64}$/i.test(value)) {
    throw new Error(`O fingerprint do ${label} SysAGA é inválido.`);
  }
  return value.toLowerCase();
}

const SYSAGA_STATE_PHASE: Record<AgaSysagaExecutionState, number> = {
  preparing: 0,
  prepared: 1,
  validating: 2,
  validated: 3,
  dry_run_running: 4,
  dry_run_approved: 5,
  opening: 6,
  profile_locked: 6,
  awaiting_login: 6,
  ready: 6,
  running: 6,
  stopping: 7,
  paused: 7,
  closed: 7,
  closing: 7,
  failed: 7,
};

function assertSysagaStateProgression(
  previous: AgaSysagaExecutionState,
  next: AgaSysagaExecutionState,
) {
  if (SYSAGA_STATE_PHASE[next] < SYSAGA_STATE_PHASE[previous]) {
    throw new Error("O histórico SysAGA tentou regredir para uma etapa anterior.");
  }
  if (
    ["ready", "running"].includes(previous)
    && ["opening", "profile_locked", "awaiting_login"].includes(next)
  ) {
    throw new Error("O histórico SysAGA tentou reiniciar o Edge dentro da mesma execução.");
  }
}

function assertSysagaEvidenceForState(
  state: AgaSysagaExecutionState,
  validationApproved: boolean,
  dryRunApproved: boolean,
) {
  const phase = SYSAGA_STATE_PHASE[state];
  const validationRequired = new Set<AgaSysagaExecutionState>([
    "validated",
    "dry_run_running",
    "dry_run_approved",
    "opening",
    "profile_locked",
    "awaiting_login",
    "ready",
    "running",
  ]).has(state);
  const dryRunRequired = new Set<AgaSysagaExecutionState>([
    "dry_run_approved",
    "opening",
    "profile_locked",
    "awaiting_login",
    "ready",
    "running",
  ]).has(state);
  if (dryRunApproved && !validationApproved) {
    throw new Error("O histórico SysAGA aprovou o dry-run sem validação.");
  }
  if (validationApproved && phase < SYSAGA_STATE_PHASE.validated) {
    throw new Error("O histórico SysAGA registrou validação antes da etapa correspondente.");
  }
  if (dryRunApproved && phase < SYSAGA_STATE_PHASE.dry_run_approved) {
    throw new Error("O histórico SysAGA registrou dry-run antes da etapa correspondente.");
  }
  if (validationRequired && !validationApproved) {
    throw new Error("O estado SysAGA exige evidência de validação aprovada.");
  }
  if (dryRunRequired && !dryRunApproved) {
    throw new Error("O estado SysAGA exige evidência de dry-run aprovado.");
  }
}

function sysagaReason(value: unknown, label: string) {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value !== "string" || !/^[A-Za-z0-9._:-]{1,256}$/.test(value)) {
    throw new Error(`${label} deve ser um código técnico controlado.`);
  }
  return value;
}

const SYSAGA_SAFE_STEP_ORDER: AgaSysagaSafeStep[] = [
  "none",
  "package_prepared",
  "package_validated",
  "dry_run_approved",
  "edge_opened",
];

function safeStepForSysagaState(state: AgaSysagaExecutionState): AgaSysagaSafeStep {
  if (state === "prepared" || state === "validating") return "package_prepared";
  if (state === "validated" || state === "dry_run_running") return "package_validated";
  if (state === "dry_run_approved" || state === "opening" || state === "profile_locked") return "dry_run_approved";
  if (["awaiting_login", "ready", "running"].includes(state)) return "edge_opened";
  return "none";
}

function laterSysagaSafeStep(first: AgaSysagaSafeStep, second: AgaSysagaSafeStep) {
  return SYSAGA_SAFE_STEP_ORDER.indexOf(second) > SYSAGA_SAFE_STEP_ORDER.indexOf(first) ? second : first;
}

function normalizeSysagaCompletedFields(value: unknown) {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.length > 256) {
    throw new Error("A lista de campos concluídos da execução SysAGA é inválida.");
  }
  return uniqueSysagaFields(value.map((field) => {
    if (
      typeof field !== "string"
      || !/^[A-Za-z][A-Za-z0-9_-]*(?:[.:][A-Za-z][A-Za-z0-9_-]*)*$/.test(field)
      || field.length > 128
    ) {
      throw new Error("Um identificador de campo concluído da execução SysAGA é inválido.");
    }
    return field;
  }));
}

function optionalSysagaResultToken(value: unknown, label: string) {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value !== "string" || !/^[A-Za-z0-9._-]{1,128}$/.test(value)) {
    throw new Error(`${label} Ã© invÃ¡lido.`);
  }
  return value;
}

function uniqueSysagaFields(fields: string[]) {
  return Array.from(new Set(fields)).slice(0, 256);
}

function isoTimestamp(value: unknown, label: string) {
  const normalized = boundedRequiredText(value, 64, label);
  const parsed = Date.parse(normalized);
  if (!Number.isFinite(parsed) || new Date(parsed).toISOString() !== normalized) {
    throw new Error(`${label} é inválida.`);
  }
  return normalized;
}

function boundedRequiredText(value: unknown, maximumLength: number, label: string) {
  if (typeof value !== "string" || !value.trim() || value.length > maximumLength || value.includes("\0")) {
    throw new Error(`${label} é inválida.`);
  }
  return value.trim();
}

function boundedOptionalText(value: unknown, maximumLength: number, label: string) {
  if (value === undefined || value === null || value === "") return undefined;
  return boundedRequiredText(value, maximumLength, label);
}

function validatePersistedOpeaRequestPackage(value: Record<string, unknown>) {
  const attachmentIds = Array.isArray(value.attachmentIds)
    ? value.attachmentIds.filter((item): item is string => Boolean(nonEmptyString(item)))
    : [];
  const payload = isRecord(value.payload) ? value.payload : null;
  const files = Array.isArray(payload?.files)
    ? payload.files.filter((item): item is string => Boolean(nonEmptyString(item)))
    : [];
  const dryRun = isRecord(payload?.dryRun) ? payload.dryRun : null;
  const dryRunResult = isRecord(dryRun?.dry_run) ? dryRun.dry_run : null;
  const dryRunSafety = isRecord(dryRun?.safety) ? dryRun.safety : null;
  const requestManifest = isRecord(payload?.requestManifest) ? payload.requestManifest : null;
  const humanPauses = Array.isArray(requestManifest?.human_pause_required_for)
    ? requestManifest.human_pause_required_for.filter((item): item is string => typeof item === "string")
    : [];
  const blockedActions = Array.isArray(requestManifest?.blocked_actions)
    ? requestManifest.blocked_actions.filter((item): item is string => typeof item === "string")
    : [];
  const requiredFiles = [
    "aga-studio-context.json",
    "handoff-manifest.json",
    "handoff-run-report.json",
    "opea-request-manifest.json",
  ];
  if (
    attachmentIds.length === 0
    || attachmentIds.length !== (Array.isArray(value.attachmentIds) ? value.attachmentIds.length : 0)
    || new Set(attachmentIds).size !== attachmentIds.length
    || !payload
    || payload.schema !== "aga.sysaga.process_package.v1"
    || !nonEmptyString(payload.runId)
    || !nonEmptyString(payload.inputFingerprint)
    || !nonEmptyString(payload.preparedArtifact)
    || !files.includes(String(payload.preparedArtifact))
    || requiredFiles.some((filename) => !files.includes(filename))
    || payload.neverAutoSubmit !== true
    || dryRun?.schema !== "easyaga.sysaga.handoff_run_report"
    || dryRun.version !== 1
    || dryRunResult?.ok !== true
    || dryRunResult.status !== 0
    || dryRunSafety?.can_fill_sysaga !== false
    || dryRunSafety.never_auto_submit !== true
    || requestManifest?.schema !== "aga.sysaga.opea_request_manifest.v1"
    || requestManifest.mode !== "opea_request"
    || requestManifest.operation !== "prepare_and_dry_run"
    || requestManifest.never_auto_submit !== true
    || OPEA_REQUEST_REQUIRED_HUMAN_PAUSES.some((item) => !humanPauses.includes(item))
    || OPEA_REQUEST_REQUIRED_BLOCKED_ACTIONS.some((item) => !blockedActions.includes(item))
  ) {
    throw new Error(`O pacote do Requerimento OPEA "${String(value.id)}" está incompleto ou não preserva as travas de segurança.`);
  }
}

const OPEA_REQUEST_REQUIRED_HUMAN_PAUSES = [
  "login gov.br",
  "troca de conta PJ",
  "captcha",
  "assinatura",
  "declaracoes juridicas",
  "envio final",
  "salvar o requerimento",
  "avancar o requerimento",
  "enviar o requerimento",
];

const OPEA_REQUEST_REQUIRED_BLOCKED_ACTIONS = [
  "salvar o requerimento",
  "avancar o requerimento",
  "enviar o requerimento",
  "protocolar o processo",
];

function validateExternalWorkspace(value: unknown) {
  if (!isRecord(value)) {
    throw new Error("A pasta externa do projeto .aga é inválida.");
  }
  assertAllowedKeys(value, ["rootPath"], "pasta externa do projeto .aga");
  if (value.rootPath !== undefined && !nonEmptyString(value.rootPath)) {
    throw new Error("A pasta externa do projeto .aga é inválida.");
  }
}

function validateAgentSession(value: unknown, conversationIds: Set<string>) {
  if (
    !isRecord(value)
    || !nonEmptyString(value.id)
    || !nonEmptyString(value.conversationId)
    || !nonEmptyString(value.createdAt)
    || !nonEmptyString(value.lastActivityAt)
  ) {
    throw new Error("Uma sessão de agente do projeto .aga está incompleta.");
  }
  assertAllowedKeys(
    value,
    ["id", "channel", "conversationId", "createdAt", "lastActivityAt", "activeTaskId", "providerMetadata", "workspaceRootPath"],
    `sessão de agente "${String(value.id)}"`,
  );
  if (!["viability", "sysaga", "cad", "documents"].includes(String(value.channel))) {
    throw new Error(`A sessão de agente "${String(value.id)}" possui canal inválido.`);
  }
  const conversationId = String(value.conversationId);
  if (conversationIds.has(conversationId)) {
    throw new Error(`A conversa de agente "${conversationId}" está repetida no projeto .aga.`);
  }
  conversationIds.add(conversationId);
  validateOptionalAgentText(value.activeTaskId, `A sessão de agente "${String(value.id)}" possui uma tarefa ativa inválida.`);
  validateAgentProviderMetadata(value.providerMetadata, String(value.id));
  validateOptionalAgentText(value.workspaceRootPath, `A sessão de agente "${String(value.id)}" possui uma pasta vinculada inválida.`);
}

function validateAgentProviderMetadata(value: unknown, sessionId: string) {
  if (value === undefined) return;
  if (!isRecord(value)) {
    throw new Error(`A sessão de agente "${sessionId}" possui metadados de fornecedor inválidos.`);
  }
  assertAllowedKeys(value, ["providerId", "providerConversationId", "model"], `metadados da sessão de agente "${sessionId}"`);
  if (!nonEmptyString(value.providerId) || !nonEmptyString(value.providerConversationId)) {
    throw new Error(`A sessão de agente "${sessionId}" possui metadados de fornecedor incompletos.`);
  }
  validateOptionalAgentText(value.model, `A sessão de agente "${sessionId}" possui um modelo inválido.`);
}

function validateAgentTask(value: unknown, sessionIds: Set<string>, artifactIds: Set<string>) {
  if (
    !isRecord(value)
    || !nonEmptyString(value.id)
    || !nonEmptyString(value.sessionId)
    || !nonEmptyString(value.createdAt)
    || !nonEmptyString(value.updatedAt)
  ) {
    throw new Error("Uma tarefa de agente do projeto .aga está incompleta.");
  }
  assertAllowedKeys(
    value,
    ["id", "sessionId", "status", "createdAt", "updatedAt", "lastSafeStep", "skillVersion", "artifactIds", "error"],
    `tarefa de agente "${String(value.id)}"`,
  );
  if (!["preparing", "running", "awaiting_review", "needs_correction", "interrupted", "approved"].includes(String(value.status))) {
    throw new Error(`A tarefa de agente "${String(value.id)}" possui estado inválido.`);
  }
  if (!sessionIds.has(String(value.sessionId))) {
    throw new Error(`A tarefa de agente "${String(value.id)}" referencia uma sessão inexistente.`);
  }
  validateOptionalAgentText(value.lastSafeStep, `A tarefa de agente "${String(value.id)}" possui uma última etapa segura inválida.`);
  validateOptionalAgentText(value.skillVersion, `A tarefa de agente "${String(value.id)}" possui uma versão de skill inválida.`);
  validateOptionalAgentText(value.error, `A tarefa de agente "${String(value.id)}" possui uma mensagem de erro inválida.`);
  validateAgentArtifactReferences(value.artifactIds, artifactIds, `tarefa de agente "${String(value.id)}"`);
}

function validateAgentApproval(value: unknown, taskIds: Set<string>) {
  if (
    !isRecord(value)
    || !nonEmptyString(value.id)
    || !nonEmptyString(value.taskId)
    || !nonEmptyString(value.createdAt)
  ) {
    throw new Error("Uma aprovação de agente do projeto .aga está incompleta.");
  }
  assertAllowedKeys(
    value,
    [
      "id",
      "taskId",
      "kind",
      "status",
      "createdAt",
      "resolvedAt",
      "requestId",
      "threadId",
      "turnId",
      "detail",
      "sessionAuthorizationAllowed",
    ],
    `aprovação de agente "${String(value.id)}"`,
  );
  if (!["overwrite", "move", "delete", "promote", "signed_file", "sysaga_sensitive_action"].includes(String(value.kind))) {
    throw new Error(`A aprovação de agente "${String(value.id)}" possui tipo inválido.`);
  }
  if (!["pending", "approved", "rejected"].includes(String(value.status))) {
    throw new Error(`A aprovação de agente "${String(value.id)}" possui estado inválido.`);
  }
  if (!taskIds.has(String(value.taskId))) {
    throw new Error(`A aprovação de agente "${String(value.id)}" referencia uma tarefa inexistente.`);
  }
  if (
    value.requestId !== undefined
    && !nonEmptyString(value.requestId)
    && !(typeof value.requestId === "number" && Number.isSafeInteger(value.requestId) && value.requestId >= 0)
  ) {
    throw new Error(`A aprovação de agente "${String(value.id)}" possui um identificador de protocolo inválido.`);
  }
  validateOptionalAgentText(value.threadId, `A aprovação de agente "${String(value.id)}" possui uma conversa inválida.`);
  validateOptionalAgentText(value.turnId, `A aprovação de agente "${String(value.id)}" possui uma execução inválida.`);
  validateOptionalAgentText(value.detail, `A aprovação de agente "${String(value.id)}" possui um detalhe inválido.`);
  if (value.sessionAuthorizationAllowed !== undefined && typeof value.sessionAuthorizationAllowed !== "boolean") {
    throw new Error(`A aprovação de agente "${String(value.id)}" possui uma autorização de sessão inválida.`);
  }
  if (value.status === "pending" && value.resolvedAt !== undefined) {
    throw new Error(`A aprovação pendente "${String(value.id)}" não pode ter data de resolução.`);
  }
  if (value.status !== "pending" && !nonEmptyString(value.resolvedAt)) {
    throw new Error(`A aprovação resolvida "${String(value.id)}" precisa ter data de resolução.`);
  }
}

function validateAgentArtifactReferences(value: unknown, artifactIds: Set<string>, owner: string) {
  if (value === undefined) return;
  const references = requireArray(value, `artefatos da ${owner}`);
  const seen = new Set<string>();
  for (const reference of references) {
    const artifactId = nonEmptyString(reference);
    if (!artifactId) throw new Error(`A ${owner} possui uma referência de artefato inválida.`);
    if (seen.has(artifactId)) throw new Error(`As referências de artefatos não podem se repetir na ${owner}.`);
    if (!artifactIds.has(artifactId)) throw new Error(`A ${owner} referencia o artefato inexistente "${artifactId}".`);
    seen.add(artifactId);
  }
}

function validateOptionalAgentText(value: unknown, message: string) {
  if (value !== undefined && !nonEmptyString(value)) throw new Error(message);
}

function assertAllowedKeys(value: Record<string, unknown>, allowedKeys: string[], label: string) {
  const allowed = new Set(allowedKeys);
  const unexpectedKey = Object.keys(value).find((key) => !allowed.has(key));
  if (unexpectedKey) throw new Error(`A ${label} possui o campo não permitido "${unexpectedKey}".`);
}

function assertLegacyViabilityWorkspace(value: unknown): asserts value is Record<string, unknown> {
  if (!isRecord(value) || value.kind !== "viability-opea" || value.workspaceVersion !== 1) {
    throw new Error("Este projeto .aga não contém uma área de Viabilidade OPEA compatível.");
  }
  if (!isRecord(value.input) || !isRecord(value.catalog) || !isRecord(value.map) || !isRecord(value.sources)) {
    throw new Error("O estado de trabalho do projeto .aga está incompleto.");
  }
}

function requireArray(value: unknown, label: string): unknown[] {
  if (!Array.isArray(value)) throw new Error(`A lista de ${label} do projeto .aga é inválida.`);
  return value;
}

function assertUniqueIds(items: unknown[], label: string) {
  const ids = new Set<string>();
  for (const item of items) {
    if (!isRecord(item) || !nonEmptyString(item.id) || ids.has(String(item.id))) {
      throw new Error(`A lista de ${label} precisa ter identificadores únicos.`);
    }
    ids.add(String(item.id));
  }
}

function hasRequiredVertices(kind: AgaOpea["geometryType"], count: number) {
  if (kind === "point") return count >= 1;
  if (kind === "line") return count >= 2;
  return count >= 3;
}

function legacyPlanStage(value: unknown): AgaPlanStage {
  const normalized = String(value ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  if (normalized.includes("restrit")) return "normative_restrictive";
  if (normalized.includes("incidente")) return "geometric_incident";
  if (normalized.includes("descart") || normalized.includes("nao incidente")) return "not_incident";
  return "candidate";
}

function planStageFromPayload(value: Record<string, unknown>): AgaPlanStage {
  if (value.normativeStatus === "restrictive") return "normative_restrictive";
  if (value.spatialRelation === "geometric_incidence") return "geometric_incident";
  if (value.spatialRelation === "bbox_candidate") return "candidate";
  return legacyPlanStage(value.status);
}

function strongerPlanStage(first: AgaPlanStage, second: AgaPlanStage): AgaPlanStage {
  const weight: Record<AgaPlanStage, number> = {
    not_incident: 0,
    candidate: 1,
    geometric_incident: 2,
    normative_restrictive: 3,
  };
  return weight[second] > weight[first] ? second : first;
}

function sourceNameFromAttachmentId(id: string) {
  if (id.toLowerCase().includes("csv")) return "Pontos do OPEA (CSV)";
  if (id.toLowerCase().includes("kml")) return "Geometria do OPEA (KML)";
  return id;
}

function safeId(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "component";
}

function uniqueById<T extends { id: string }>(items: T[]) {
  return Array.from(new Map(items.map((item) => [item.id, item])).values());
}

function finiteNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function nonEmptyString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function withoutUndefined<T extends Record<string, unknown>>(value: T) {
  return Object.fromEntries(Object.entries(value).filter(([, item]) => item !== undefined)) as T;
}

function canonicalFingerprint(value: unknown) {
  return JSON.stringify(sortJson(value));
}

function sortJson(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortJson);
  if (!isRecord(value)) return value;
  return Object.fromEntries(Object.keys(value).sort().map((key) => [key, sortJson(value[key])]));
}

function cloneJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}
