import { strFromU8, strToU8, unzipSync, zipSync, type Zippable } from "../vendor/fflate.js";

export const AGA_PROJECT_FORMAT = "aga-studio-project";
export const AGA_PROJECT_MEDIA_TYPE = "application/vnd.aga-studio.project";
export const AGA_PROJECT_SCHEMA_VERSION = 4;
export const AGA_PROJECT_V3_SCHEMA_VERSION = 3;
export const AGA_PROJECT_PREVIOUS_SCHEMA_VERSION = 2;
export const AGA_PROJECT_LEGACY_SCHEMA_VERSION = 1;
export type AgaProjectSchemaVersion =
  | typeof AGA_PROJECT_LEGACY_SCHEMA_VERSION
  | typeof AGA_PROJECT_PREVIOUS_SCHEMA_VERSION
  | typeof AGA_PROJECT_V3_SCHEMA_VERSION
  | typeof AGA_PROJECT_SCHEMA_VERSION;

const MAX_ARCHIVE_BYTES = 100 * 1024 * 1024;
const MAX_EXPANDED_BYTES = 500 * 1024 * 1024;
const MAX_ARCHIVE_ENTRIES = 4096;

export type AgaProjectAttachmentInput = {
  data: Uint8Array;
  id: string;
  mediaType: string;
  name: string;
};

export type AgaProjectAttachment = Omit<AgaProjectAttachmentInput, "data"> & {
  data: Uint8Array;
  path: string;
  size: number;
};

export type AgaProjectManifest = {
  appVersion: string;
  attachments: Array<{
    id: string;
    mediaType: string;
    name: string;
    path: string;
    size: number;
  }>;
  createdAt: string;
  format: typeof AGA_PROJECT_FORMAT;
  mediaType: typeof AGA_PROJECT_MEDIA_TYPE;
  name: string;
  projectId: string;
  schemaVersion: AgaProjectSchemaVersion;
  updatedAt: string;
};

export type CreateAgaProjectOptions<T> = {
  appVersion: string;
  attachments?: AgaProjectAttachmentInput[];
  createdAt: string;
  name: string;
  project: T;
  projectId: string;
  updatedAt: string;
};

export type OpenedAgaProject<T = unknown> = {
  attachments: Map<string, AgaProjectAttachment>;
  manifest: AgaProjectManifest;
  project: T;
};

export async function createAgaProject<T>(options: CreateAgaProjectOptions<T>): Promise<Uint8Array> {
  const attachmentIds = new Set<string>();
  for (const attachment of options.attachments ?? []) {
    if (!attachment.id || attachmentIds.has(attachment.id)) throw new Error("Os anexos do projeto .aga precisam ter identificadores únicos.");
    attachmentIds.add(attachment.id);
  }
  const attachmentEntries = (options.attachments ?? []).map((attachment, index) => {
    const path = `attachments/${String(index + 1).padStart(3, "0")}-${safeArchiveName(attachment.name)}`;
    return {
      ...attachment,
      path,
      size: attachment.data.byteLength
    };
  });
  const manifest: AgaProjectManifest = {
    appVersion: options.appVersion,
    attachments: attachmentEntries.map(({ id, mediaType, name, path, size }) => ({ id, mediaType, name, path, size })),
    createdAt: options.createdAt,
    format: AGA_PROJECT_FORMAT,
    mediaType: AGA_PROJECT_MEDIA_TYPE,
    name: options.name,
    projectId: options.projectId,
    schemaVersion: AGA_PROJECT_SCHEMA_VERSION,
    updatedAt: options.updatedAt
  };

  const files: Record<string, Uint8Array> = {
    "manifest.json": encodeJson(manifest),
    "mimetype": strToU8(AGA_PROJECT_MEDIA_TYPE),
    "project.json": encodeJson(options.project)
  };
  for (const attachment of attachmentEntries) files[attachment.path] = attachment.data;

  const checksums: Record<string, string> = {};
  for (const [path, data] of Object.entries(files)) checksums[path] = await sha256Hex(data);
  files["checksums.json"] = encodeJson(checksums);

  const archive: Zippable = {};
  archive.mimetype = [files.mimetype, { level: 0 }];
  for (const [path, data] of Object.entries(files)) {
    if (path === "mimetype") continue;
    archive[path] = data;
  }
  return zipSync(archive, { level: 6 });
}

export async function openAgaProject<T = unknown>(archiveBytes: Uint8Array): Promise<OpenedAgaProject<T>> {
  if (!archiveBytes.byteLength) throw new Error("O arquivo .aga está vazio.");
  if (archiveBytes.byteLength > MAX_ARCHIVE_BYTES) throw new Error("O arquivo .aga excede o limite de 100 MB.");

  let files: Record<string, Uint8Array>;
  let expandedBytes = 0;
  let archiveEntries = 0;
  try {
    files = unzipSync(archiveBytes, {
      filter: (file) => {
        archiveEntries += 1;
        expandedBytes += file.originalSize;
        if (archiveEntries > MAX_ARCHIVE_ENTRIES) throw new Error("O projeto contém arquivos internos em excesso.");
        if (expandedBytes > MAX_EXPANDED_BYTES) throw new Error("O conteúdo expandido do projeto excede o limite de segurança.");
        return true;
      }
    });
  } catch (error) {
    if (error instanceof Error && (error.message.includes("arquivos internos") || error.message.includes("limite de segurança"))) throw error;
    throw new Error("O arquivo não é um projeto .aga válido.");
  }

  const mediaType = requiredText(files, "mimetype").trim();
  if (mediaType !== AGA_PROJECT_MEDIA_TYPE) throw new Error("O arquivo não pertence ao AGA Studio.");

  const manifest = parseJson(files, "manifest.json") as AgaProjectManifest;
  validateManifest(manifest);
  const checksums = parseJson(files, "checksums.json") as Record<string, string>;
  const contentPaths = Object.keys(files).filter((path) => path !== "checksums.json").sort();
  const checksumPaths = Object.keys(checksums).sort();
  if (contentPaths.length !== checksumPaths.length || contentPaths.some((path, index) => path !== checksumPaths[index])) {
    throw new Error("A lista de integridade do projeto .aga está incompleta.");
  }
  for (const [path, expectedHash] of Object.entries(checksums)) {
    const data = files[path];
    if (!data || !/^[a-f0-9]{64}$/i.test(expectedHash) || (await sha256Hex(data)) !== expectedHash) {
      throw new Error(`O conteúdo "${path}" está ausente ou corrompido.`);
    }
  }

  const project = parseJson(files, "project.json") as T;
  const attachments = new Map<string, AgaProjectAttachment>();
  for (const item of manifest.attachments) {
    const data = files[item.path];
    if (!data || data.byteLength !== item.size) throw new Error(`O anexo "${item.name}" está ausente ou incompleto.`);
    attachments.set(item.id, { ...item, data });
  }

  return { attachments, manifest, project };
}

function validateManifest(value: AgaProjectManifest) {
  if (!value || value.format !== AGA_PROJECT_FORMAT || value.mediaType !== AGA_PROJECT_MEDIA_TYPE) {
    throw new Error("O manifesto do projeto .aga é inválido.");
  }
  if (
    value.schemaVersion !== AGA_PROJECT_LEGACY_SCHEMA_VERSION
    && value.schemaVersion !== AGA_PROJECT_PREVIOUS_SCHEMA_VERSION
    && value.schemaVersion !== AGA_PROJECT_V3_SCHEMA_VERSION
    && value.schemaVersion !== AGA_PROJECT_SCHEMA_VERSION
  ) {
    throw new Error(`A versão ${String(value.schemaVersion)} do projeto .aga ainda não é compatível.`);
  }
  if (!value.projectId || !value.name || !value.createdAt || !value.updatedAt || !Array.isArray(value.attachments)) {
    throw new Error("O manifesto do projeto .aga está incompleto.");
  }
  const attachmentIds = new Set<string>();
  for (const attachment of value.attachments) {
    const validPath = typeof attachment.path === "string"
      && attachment.path.startsWith("attachments/")
      && !attachment.path.includes("../")
      && !attachment.path.includes("\\");
    if (
      !attachment.id
      || attachmentIds.has(attachment.id)
      || !attachment.name
      || !attachment.mediaType
      || !validPath
      || !Number.isSafeInteger(attachment.size)
      || attachment.size < 0
    ) {
      throw new Error("A lista de anexos do projeto .aga é inválida.");
    }
    attachmentIds.add(attachment.id);
  }
}

function requiredText(files: Record<string, Uint8Array>, path: string) {
  const data = files[path];
  if (!data) throw new Error(`O projeto não contém "${path}".`);
  return strFromU8(data);
}

function parseJson(files: Record<string, Uint8Array>, path: string) {
  try {
    return JSON.parse(requiredText(files, path));
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("O projeto não contém")) throw error;
    throw new Error(`O conteúdo "${path}" não é um JSON válido.`);
  }
}

function encodeJson(value: unknown) {
  return strToU8(`${JSON.stringify(value, null, 2)}\n`);
}

function safeArchiveName(value: string) {
  const sanitized = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return sanitized || "arquivo";
}

async function sha256Hex(data: Uint8Array) {
  const digest = await crypto.subtle.digest("SHA-256", data as Uint8Array<ArrayBuffer>);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}
