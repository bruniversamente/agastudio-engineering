const { constants: fsConstants } = require("node:fs");
const {
  appendFile,
  copyFile,
  lstat,
  mkdir,
  readFile,
  readdir,
  realpath,
  rename,
  rm,
  stat,
  writeFile,
} = require("node:fs/promises");
const path = require("node:path");

const MAX_LIST_ENTRIES = 500;
const MAX_LIST_DEPTH = 12;
const MAX_READ_BYTES = 25 * 1024 * 1024;
const MAX_TEXT_READ_BYTES = 4 * 1024 * 1024;
const MAX_TEXT_RESULT_BYTES = 24 * 1024;
const MAX_WRITE_BYTES = 1024 * 1024;
const MAX_SEARCH_FILES = 1_000;
const MAX_SEARCH_FILE_BYTES = 5 * 1024 * 1024;
const MAX_SEARCH_TOTAL_BYTES = 64 * 1024 * 1024;
const MAX_SEARCH_MATCHES = 100;
const MAX_RELATIVE_PATH_LENGTH = 480;

const BLOCKED_DIRECTORY_NAMES = new Set([".git", ".next", ".easyaga-work", "node_modules"]);
const BLOCKED_FILE_PATTERNS = [
  /^\.env(?:\.|$)/iu,
  /^\.(?:netrc|npmrc|pypirc)$/iu,
  /^(?:credentials?|secrets?)(?:\.|$)/iu,
  /^(?:authorized_keys|id_ed25519|id_rsa|known_hosts)(?:\.|$)/iu,
  /\.(?:jks|key|keystore|pem|p12|pfx)$/iu,
];
const WINDOWS_RESERVED_NAME = /^(?:aux|con|nul|prn|com[1-9]|lpt[1-9])(?:\.|$)/iu;
const BINARY_MEDIA_TYPES = new Map([
  [".pdf", "application/pdf"],
  [".png", "image/png"],
  [".jpg", "image/jpeg"],
  [".jpeg", "image/jpeg"],
  [".webp", "image/webp"],
  [".rtf", "application/rtf"],
  [".doc", "application/msword"],
  [".docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
  [".xls", "application/vnd.ms-excel"],
  [".xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"],
  [".odt", "application/vnd.oasis.opendocument.text"],
  [".ods", "application/vnd.oasis.opendocument.spreadsheet"],
  [".kmz", "application/vnd.google-earth.kmz"],
  [".dwg", "application/acad"],
]);
const TEXT_EXTENSIONS = new Set([
  "", ".bat", ".c", ".cjs", ".cpp", ".cs", ".css", ".csv", ".dxf", ".go", ".h", ".hpp",
  ".html", ".ini", ".java", ".js", ".json", ".jsx", ".kml", ".log", ".md", ".mjs", ".php",
  ".ps1", ".py", ".rb", ".rs", ".scss", ".sh", ".sql", ".svg", ".toml", ".ts", ".tsx", ".txt",
  ".xml", ".yaml", ".yml",
]);

async function executeProjectFileOperation({ approved = false, operation, projectRoot }) {
  const root = await canonicalProjectRoot(projectRoot);
  const normalized = normalizeOperation(operation);
  if (requiresConfirmation(normalized, await inspectOperation(root, normalized)) && approved !== true) {
    return {
      confirmationMessage: confirmationMessage(normalized),
      confirmationRequired: true,
      operation: normalized.type,
    };
  }

  switch (normalized.type) {
    case "list":
      return listProjectFiles(root, normalized);
    case "read":
      return readProjectFile(root, normalized);
    case "search":
      return searchProjectFiles(root, normalized);
    case "write":
      return writeProjectFile(root, normalized);
    case "mkdir":
      return createProjectDirectory(root, normalized);
    case "copy":
      return copyProjectFile(root, normalized);
    case "move":
      return moveProjectEntry(root, normalized);
    case "delete":
      return deleteProjectEntry(root, normalized);
    default:
      throw new Error("A operação de arquivo não é permitida.");
  }
}

async function listProjectFiles(root, operation) {
  const relativePath = normalizeRelativePath(operation.path, { allowRoot: true });
  const start = await resolveExistingPath(root, relativePath, { directory: true });
  const entries = [];
  let protectedEntriesSkipped = 0;
  let truncated = false;

  async function visit(currentPath, currentRelative, depth) {
    if (entries.length >= operation.maxEntries) {
      truncated = true;
      return;
    }
    const children = await readdir(currentPath, { withFileTypes: true });
    children.sort((left, right) => left.name.localeCompare(right.name, "pt-BR"));
    for (const child of children) {
      if (entries.length >= operation.maxEntries) {
        truncated = true;
        return;
      }
      const childRelative = toPosixPath(path.join(currentRelative, child.name));
      if (isProtectedRelativePath(childRelative)) {
        protectedEntriesSkipped += 1;
        continue;
      }
      const childPath = path.join(currentPath, child.name);
      const metadata = await lstat(childPath);
      if (metadata.isSymbolicLink()) {
        protectedEntriesSkipped += 1;
        continue;
      }
      const type = metadata.isDirectory() ? "directory" : metadata.isFile() ? "file" : "other";
      entries.push({
        modifiedAt: metadata.mtime.toISOString(),
        path: childRelative,
        size: metadata.isFile() ? metadata.size : 0,
        type,
      });
      if (operation.recursive && type === "directory" && depth < operation.maxDepth) {
        await visit(childPath, childRelative, depth + 1);
      }
    }
  }

  await visit(start, relativePath, 0);
  return {
    confirmationRequired: false,
    entries,
    operation: "list",
    protectedEntriesSkipped,
    root: relativePath || ".",
    truncated,
  };
}

async function readProjectFile(root, operation) {
  const relativePath = normalizeRelativePath(operation.path);
  const filePath = await resolveExistingPath(root, relativePath, { file: true });
  const metadata = await stat(filePath);
  if (metadata.size > MAX_READ_BYTES) throw new Error("O arquivo excede o limite de leitura de 25 MB.");
  const extension = path.extname(relativePath).toLowerCase();
  const binaryMediaType = BINARY_MEDIA_TYPES.get(extension);
  if (binaryMediaType) {
    const bytes = new Uint8Array(await readFile(filePath));
    return {
      attachment: {
        bytes,
        mediaType: binaryMediaType,
        name: path.basename(relativePath),
      },
      confirmationRequired: false,
      operation: "read",
      path: relativePath,
      size: metadata.size,
    };
  }
  if (metadata.size > MAX_TEXT_READ_BYTES) {
    throw new Error("O arquivo de texto excede 4 MB. Use a busca para localizar o trecho necessário.");
  }
  const bytes = await readFile(filePath);
  if (!TEXT_EXTENSIONS.has(extension) && looksBinary(bytes)) {
    throw new Error("Este formato binário não possui leitura compatível com o assistente.");
  }
  const content = new TextDecoder("utf-8", { fatal: false }).decode(bytes).replace(/\u0000/gu, "");
  const lines = content.split(/\r?\n/gu);
  const startLine = Math.min(operation.startLine, Math.max(1, lines.length));
  const endLine = Math.min(lines.length, startLine + operation.maxLines - 1);
  const selected = limitUtf8(lines.slice(startLine - 1, endLine).join("\n"), MAX_TEXT_RESULT_BYTES);
  return {
    confirmationRequired: false,
    content: selected.value,
    endLine,
    operation: "read",
    path: relativePath,
    size: metadata.size,
    startLine,
    totalLines: lines.length,
    truncated: selected.truncated || endLine < lines.length,
  };
}

async function searchProjectFiles(root, operation) {
  const relativePath = normalizeRelativePath(operation.path, { allowRoot: true });
  const start = await resolveExistingPath(root, relativePath, { directory: true });
  const matches = [];
  let filesScanned = 0;
  let bytesScanned = 0;
  let protectedEntriesSkipped = 0;
  let truncated = false;
  const needle = operation.caseSensitive ? operation.query : operation.query.toLocaleLowerCase("pt-BR");

  async function visit(currentPath, currentRelative, depth) {
    if (truncated || depth > MAX_LIST_DEPTH) return;
    const children = await readdir(currentPath, { withFileTypes: true });
    children.sort((left, right) => left.name.localeCompare(right.name, "pt-BR"));
    for (const child of children) {
      if (matches.length >= operation.maxMatches || filesScanned >= MAX_SEARCH_FILES || bytesScanned >= MAX_SEARCH_TOTAL_BYTES) {
        truncated = true;
        return;
      }
      const childRelative = toPosixPath(path.join(currentRelative, child.name));
      if (isProtectedRelativePath(childRelative)) {
        protectedEntriesSkipped += 1;
        continue;
      }
      const childPath = path.join(currentPath, child.name);
      const metadata = await lstat(childPath);
      if (metadata.isSymbolicLink()) {
        protectedEntriesSkipped += 1;
        continue;
      }
      if (metadata.isDirectory()) {
        await visit(childPath, childRelative, depth + 1);
        continue;
      }
      if (!metadata.isFile() || metadata.nlink > 1 || metadata.size > MAX_SEARCH_FILE_BYTES || !isSearchableTextFile(childRelative)) continue;
      filesScanned += 1;
      bytesScanned += metadata.size;
      const content = new TextDecoder("utf-8", { fatal: false }).decode(await readFile(childPath)).replace(/\u0000/gu, "");
      for (const [index, line] of content.split(/\r?\n/gu).entries()) {
        const haystack = operation.caseSensitive ? line : line.toLocaleLowerCase("pt-BR");
        const column = haystack.indexOf(needle);
        if (column < 0) continue;
        matches.push({
          column: column + 1,
          excerpt: line.trim().slice(0, 500),
          line: index + 1,
          path: childRelative,
        });
        if (matches.length >= operation.maxMatches) {
          truncated = true;
          return;
        }
      }
    }
  }

  await visit(start, relativePath, 0);
  return {
    bytesScanned,
    confirmationRequired: false,
    filesScanned,
    matches,
    operation: "search",
    protectedEntriesSkipped,
    query: operation.query,
    root: relativePath || ".",
    truncated,
  };
}

async function writeProjectFile(root, operation) {
  const relativePath = normalizeRelativePath(operation.path);
  const targetPath = await resolveWritablePath(root, relativePath);
  const contentBytes = Buffer.byteLength(operation.content, "utf8");
  if (contentBytes > MAX_WRITE_BYTES) throw new Error("A escrita excede o limite de 1 MB por operação.");
  const exists = await pathExists(targetPath);
  if (operation.mode === "create" && exists) throw new Error("O arquivo já existe; use overwrite para substituí-lo.");
  if (operation.mode !== "create" && !exists) throw new Error("O arquivo ainda não existe; use create para criá-lo.");
  if (exists) {
    const metadata = await lstat(targetPath);
    if (!metadata.isFile() || metadata.isSymbolicLink()) throw new Error("O destino não é um arquivo comum.");
  }
  if (operation.mode === "append") {
    await appendFile(targetPath, operation.content, { encoding: "utf8", flag: "a" });
  } else {
    await writeFile(targetPath, operation.content, {
      encoding: "utf8",
      flag: operation.mode === "create" ? "wx" : "w",
      mode: 0o600,
    });
  }
  return {
    bytesWritten: contentBytes,
    confirmationRequired: false,
    created: !exists,
    mode: operation.mode,
    operation: "write",
    path: relativePath,
  };
}

async function createProjectDirectory(root, operation) {
  const relativePath = normalizeRelativePath(operation.path);
  const targetPath = path.resolve(root, ...relativePath.split("/"));
  await assertPathInsideRoot(root, targetPath);
  await assertNoSymbolicLinks(root, targetPath);
  const existingAncestor = await nearestExistingAncestor(targetPath, root);
  const canonicalAncestor = await realpath(existingAncestor);
  await assertPathInsideRoot(root, canonicalAncestor);
  const canonicalAncestorRelative = toPosixPath(path.relative(root, canonicalAncestor));
  if (canonicalAncestorRelative && isProtectedRelativePath(canonicalAncestorRelative)) {
    throw new Error("Este caminho é protegido e não pode ser enviado ao assistente.");
  }
  if (await pathExists(targetPath)) throw new Error("A pasta ou arquivo de destino já existe.");
  if (!operation.recursive) {
    const parent = path.dirname(targetPath);
    const parentMetadata = await lstat(parent);
    if (!parentMetadata.isDirectory() || parentMetadata.isSymbolicLink()) throw new Error("A pasta de destino não existe.");
  }
  await mkdir(targetPath, { recursive: operation.recursive });
  await assertPathInsideRoot(root, targetPath);
  return { confirmationRequired: false, operation: "mkdir", path: relativePath };
}

async function copyProjectFile(root, operation) {
  const sourcePath = normalizeRelativePath(operation.sourcePath);
  const destinationPath = normalizeRelativePath(operation.destinationPath);
  const source = await resolveExistingPath(root, sourcePath, { file: true });
  const destination = await resolveWritablePath(root, destinationPath);
  await copyFile(source, destination, fsConstants.COPYFILE_EXCL);
  return {
    confirmationRequired: false,
    destinationPath,
    operation: "copy",
    sourcePath,
  };
}

async function moveProjectEntry(root, operation) {
  const sourcePath = normalizeRelativePath(operation.sourcePath);
  const destinationPath = normalizeRelativePath(operation.destinationPath);
  const source = await resolveExistingPath(root, sourcePath);
  const destination = await resolveWritablePath(root, destinationPath);
  if (await pathExists(destination)) throw new Error("O destino já existe.");
  await rename(source, destination);
  return {
    confirmationRequired: false,
    destinationPath,
    operation: "move",
    sourcePath,
  };
}

async function deleteProjectEntry(root, operation) {
  const relativePath = normalizeRelativePath(operation.path);
  const target = await resolveExistingPath(root, relativePath);
  const metadata = await lstat(target);
  if (metadata.isDirectory() && !operation.recursive) {
    const children = await readdir(target);
    if (children.length) throw new Error("A pasta não está vazia; confirme a exclusão recursiva para removê-la.");
  }
  if (metadata.isDirectory() && operation.recursive) await assertTreeContainsNoLinks(target);
  await rm(target, { force: false, recursive: operation.recursive });
  return { confirmationRequired: false, operation: "delete", path: relativePath };
}

function normalizeOperation(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("A operação de arquivo é inválida.");
  const type = requiredText(value.type, "type", 20);
  if (type === "list") {
    assertExactKeys(value, ["maxDepth", "maxEntries", "path", "recursive", "type"]);
    return {
      maxDepth: optionalInteger(value.maxDepth, 1, MAX_LIST_DEPTH, 6),
      maxEntries: optionalInteger(value.maxEntries, 1, MAX_LIST_ENTRIES, 200),
      path: optionalText(value.path, "path", MAX_RELATIVE_PATH_LENGTH, ""),
      recursive: optionalBoolean(value.recursive, false),
      type,
    };
  }
  if (type === "read") {
    assertExactKeys(value, ["maxLines", "path", "startLine", "type"]);
    return {
      maxLines: optionalInteger(value.maxLines, 1, 2_000, 400),
      path: requiredText(value.path, "path", MAX_RELATIVE_PATH_LENGTH),
      startLine: optionalInteger(value.startLine, 1, 10_000_000, 1),
      type,
    };
  }
  if (type === "search") {
    assertExactKeys(value, ["caseSensitive", "maxMatches", "path", "query", "type"]);
    return {
      caseSensitive: optionalBoolean(value.caseSensitive, false),
      maxMatches: optionalInteger(value.maxMatches, 1, MAX_SEARCH_MATCHES, 50),
      path: optionalText(value.path, "path", MAX_RELATIVE_PATH_LENGTH, ""),
      query: requiredText(value.query, "query", 300),
      type,
    };
  }
  if (type === "write") {
    assertExactKeys(value, ["content", "mode", "path", "type"]);
    const mode = requiredText(value.mode, "mode", 20);
    if (!["append", "create", "overwrite"].includes(mode)) throw new Error("O modo de escrita deve ser create, overwrite ou append.");
    if (typeof value.content !== "string") throw new Error("O conteúdo do arquivo deve ser texto.");
    return { content: value.content, mode, path: requiredText(value.path, "path", MAX_RELATIVE_PATH_LENGTH), type };
  }
  if (type === "mkdir") {
    assertExactKeys(value, ["path", "recursive", "type"]);
    return {
      path: requiredText(value.path, "path", MAX_RELATIVE_PATH_LENGTH),
      recursive: optionalBoolean(value.recursive, true),
      type,
    };
  }
  if (type === "copy" || type === "move") {
    assertExactKeys(value, ["destinationPath", "sourcePath", "type"]);
    return {
      destinationPath: requiredText(value.destinationPath, "destinationPath", MAX_RELATIVE_PATH_LENGTH),
      sourcePath: requiredText(value.sourcePath, "sourcePath", MAX_RELATIVE_PATH_LENGTH),
      type,
    };
  }
  if (type === "delete") {
    assertExactKeys(value, ["path", "recursive", "type"]);
    return {
      path: requiredText(value.path, "path", MAX_RELATIVE_PATH_LENGTH),
      recursive: optionalBoolean(value.recursive, false),
      type,
    };
  }
  throw new Error(`A operação de arquivo “${type}” não é permitida.`);
}

async function inspectOperation(root, operation) {
  if (operation.type !== "write") return {};
  const relativePath = normalizeRelativePath(operation.path);
  const targetPath = await resolveWritablePath(root, relativePath);
  const targetExists = await pathExists(targetPath);
  if (operation.mode === "create" && targetExists) {
    throw new Error("O arquivo já existe; use overwrite para substituí-lo.");
  }
  return { targetExists };
}

function requiresConfirmation(operation, inspection) {
  if (operation.type === "delete" || operation.type === "move") return true;
  return operation.type === "write" && (operation.mode !== "create" || inspection.targetExists);
}

function confirmationMessage(operation) {
  if (operation.type === "delete") {
    return `O assistente quer excluir “${operation.path}”${operation.recursive ? " e todo o seu conteúdo" : ""}. Deseja permitir?`;
  }
  if (operation.type === "move") {
    return `O assistente quer mover ou renomear “${operation.sourcePath}” para “${operation.destinationPath}”. Deseja permitir?`;
  }
  return `O assistente quer ${operation.mode === "append" ? "acrescentar conteúdo a" : "substituir"} “${operation.path}”. Deseja permitir?`;
}

async function canonicalProjectRoot(value) {
  if (typeof value !== "string" || !value.trim() || value.includes("\0") || !path.isAbsolute(value.trim())) {
    throw new Error("A pasta autorizada do projeto é inválida.");
  }
  const requested = path.resolve(value.trim());
  const metadata = await lstat(requested);
  if (!metadata.isDirectory() || metadata.isSymbolicLink()) throw new Error("A pasta autorizada precisa ser um diretório comum.");
  return realpath(requested);
}

function normalizeRelativePath(value, options = {}) {
  const raw = typeof value === "string" ? value.trim() : "";
  if (!raw) {
    if (options.allowRoot) return "";
    throw new Error("Informe um caminho relativo dentro da pasta do projeto.");
  }
  if (raw.includes("\0") || raw.length > MAX_RELATIVE_PATH_LENGTH || path.isAbsolute(raw) || path.win32.isAbsolute(raw) || path.posix.isAbsolute(raw)) {
    throw new Error("Use somente um caminho relativo dentro da pasta do projeto.");
  }
  const segments = raw.replace(/\\/gu, "/").split("/");
  if (segments.some((segment) => (
    !segment
    || segment === "."
    || segment === ".."
    || segment.includes(":")
    || /[. ]$/u.test(segment)
    || WINDOWS_RESERVED_NAME.test(segment)
  ))) {
    throw new Error("O caminho relativo contém uma parte não permitida.");
  }
  const normalized = segments.join("/");
  if (isProtectedRelativePath(normalized)) throw new Error("Este caminho é protegido e não pode ser enviado ao assistente.");
  return normalized;
}

function isProtectedRelativePath(relativePath) {
  const segments = relativePath.replace(/\\/gu, "/").split("/").filter(Boolean);
  return segments.some((segment) => BLOCKED_DIRECTORY_NAMES.has(segment.toLocaleLowerCase("en-US")))
    || segments.some((segment) => BLOCKED_FILE_PATTERNS.some((pattern) => pattern.test(segment)));
}

async function resolveExistingPath(root, relativePath, options = {}) {
  const candidate = path.resolve(root, ...relativePath.split("/").filter(Boolean));
  await assertPathInsideRoot(root, candidate);
  await assertNoSymbolicLinks(root, candidate);
  const canonical = await realpath(candidate);
  await assertPathInsideRoot(root, canonical);
  const canonicalRelative = toPosixPath(path.relative(root, canonical));
  if (canonicalRelative && isProtectedRelativePath(canonicalRelative)) throw new Error("Este caminho é protegido e não pode ser enviado ao assistente.");
  const metadata = await lstat(canonical);
  if (metadata.isFile() && metadata.nlink > 1) throw new Error("Arquivos com vínculos físicos não podem ser usados pelo assistente.");
  if (options.file && !metadata.isFile()) throw new Error("O caminho solicitado não é um arquivo.");
  if (options.directory && !metadata.isDirectory()) throw new Error("O caminho solicitado não é uma pasta.");
  if (!metadata.isFile() && !metadata.isDirectory()) throw new Error("O caminho solicitado não é um arquivo ou pasta comum.");
  return canonical;
}

async function resolveWritablePath(root, relativePath) {
  const candidate = path.resolve(root, ...relativePath.split("/"));
  await assertPathInsideRoot(root, candidate);
  const parent = path.dirname(candidate);
  await assertPathInsideRoot(root, parent);
  await assertNoSymbolicLinks(root, parent);
  const canonicalParent = await realpath(parent);
  await assertPathInsideRoot(root, canonicalParent);
  const canonicalParentRelative = toPosixPath(path.relative(root, canonicalParent));
  if (canonicalParentRelative && isProtectedRelativePath(canonicalParentRelative)) {
    throw new Error("Este caminho é protegido e não pode ser enviado ao assistente.");
  }
  const parentMetadata = await lstat(canonicalParent);
  if (!parentMetadata.isDirectory()) throw new Error("A pasta de destino não existe.");
  const canonicalCandidate = path.join(canonicalParent, path.basename(candidate));
  if (await pathExists(canonicalCandidate)) {
    await assertNoSymbolicLinks(root, canonicalCandidate);
    const metadata = await lstat(canonicalCandidate);
    if (metadata.isFile() && metadata.nlink > 1) throw new Error("Arquivos com vínculos físicos não podem ser usados pelo assistente.");
  }
  return canonicalCandidate;
}

async function assertPathInsideRoot(root, candidate) {
  const relative = path.relative(root, candidate);
  if (relative === "" || (!relative.startsWith(`..${path.sep}`) && relative !== ".." && !path.isAbsolute(relative))) return;
  throw new Error("A operação tentou sair da pasta autorizada do projeto.");
}

async function assertNoSymbolicLinks(root, candidate) {
  const relative = path.relative(root, candidate);
  if (!relative) return;
  let current = root;
  for (const segment of relative.split(path.sep)) {
    current = path.join(current, segment);
    try {
      const metadata = await lstat(current);
      if (metadata.isSymbolicLink()) throw new Error("Links simbólicos e junctions não podem ser usados pelo assistente.");
    } catch (error) {
      if (error?.code === "ENOENT") return;
      throw error;
    }
  }
}

async function nearestExistingAncestor(candidate, root) {
  let current = candidate;
  while (!await pathExists(current)) {
    const parent = path.dirname(current);
    if (parent === current) throw new Error("Não foi possível localizar uma pasta de destino segura.");
    current = parent;
  }
  await assertPathInsideRoot(root, current);
  return current;
}

async function assertTreeContainsNoLinks(root) {
  const entries = await readdir(root, { withFileTypes: true });
  for (const entry of entries) {
    const candidate = path.join(root, entry.name);
    const metadata = await lstat(candidate);
    if (metadata.isSymbolicLink()) throw new Error("A pasta contém um link simbólico ou junction e não pode ser excluída recursivamente.");
    if (metadata.isDirectory()) await assertTreeContainsNoLinks(candidate);
  }
}

function isSearchableTextFile(relativePath) {
  return TEXT_EXTENSIONS.has(path.extname(relativePath).toLowerCase());
}

function looksBinary(bytes) {
  const sample = bytes.subarray(0, Math.min(bytes.length, 8_192));
  let suspicious = 0;
  for (const byte of sample) {
    if (byte === 0) return true;
    if (byte < 7 || (byte > 13 && byte < 32)) suspicious += 1;
  }
  return sample.length > 0 && suspicious / sample.length > 0.08;
}

function limitUtf8(value, maxBytes) {
  const bytes = Buffer.from(value, "utf8");
  if (bytes.byteLength <= maxBytes) return { truncated: false, value };
  return { truncated: true, value: bytes.subarray(0, maxBytes).toString("utf8") };
}

function toPosixPath(value) {
  return value.split(path.sep).join("/");
}

async function pathExists(value) {
  try {
    await lstat(value);
    return true;
  } catch (error) {
    if (error?.code === "ENOENT") return false;
    throw error;
  }
}

function requiredText(value, name, maxLength) {
  if (typeof value !== "string" || !value.trim() || value.length > maxLength || value.includes("\0")) {
    throw new Error(`O campo ${name} é inválido.`);
  }
  return value.trim();
}

function optionalText(value, name, maxLength, fallback) {
  return value === undefined ? fallback : requiredText(value, name, maxLength);
}

function optionalBoolean(value, fallback) {
  if (value === undefined) return fallback;
  if (typeof value !== "boolean") throw new Error("Uma opção booleana da operação é inválida.");
  return value;
}

function optionalInteger(value, minimum, maximum, fallback) {
  if (value === undefined) return fallback;
  if (!Number.isInteger(value) || value < minimum || value > maximum) throw new Error(`Um limite deve estar entre ${minimum} e ${maximum}.`);
  return value;
}

function assertExactKeys(value, allowed) {
  const allowedSet = new Set(allowed);
  const unexpected = Object.keys(value).filter((key) => !allowedSet.has(key));
  if (unexpected.length) throw new Error(`A operação contém propriedades não permitidas: ${unexpected.join(", ")}.`);
}

module.exports = {
  BLOCKED_DIRECTORY_NAMES,
  MAX_READ_BYTES,
  MAX_WRITE_BYTES,
  executeProjectFileOperation,
};
