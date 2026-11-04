const path = require("node:path");
const { existsSync, realpathSync } = require("node:fs");

const WRITE_OPERATIONS = new Set(["create", "write", "overwrite", "move", "delete", "promote"]);
const DESTRUCTIVE_OPERATIONS = new Set(["overwrite", "move", "delete", "promote"]);

function resolveWindowsPath(value) {
  return path.win32.resolve(value.replaceAll("/", "\\"));
}

function usesNativePosixPath(...values) {
  return process.platform !== "win32"
    && values.every((value) => typeof value === "string" && value.startsWith("/") && !value.includes("\\"));
}

function resolvePolicyPath(value) {
  return usesNativePosixPath(value) ? path.resolve(value) : resolveWindowsPath(value);
}

function canonicalizeNearestWindowsPath(value) {
  const resolved = resolvePolicyPath(value);
  const pathApi = usesNativePosixPath(value) ? path : path.win32;
  const missingSegments = [];
  let existingAncestor = resolved;

  while (!existsSync(existingAncestor)) {
    const parent = pathApi.dirname(existingAncestor);
    if (parent === existingAncestor) return null;
    missingSegments.unshift(pathApi.basename(existingAncestor));
    existingAncestor = parent;
  }

  try {
    const canonicalAncestor = realpathSync.native(existingAncestor);
    return pathApi.resolve(canonicalAncestor, ...missingSegments);
  } catch {
    return null;
  }
}

function isPathInside(root, candidate) {
  if (typeof root !== "string" || !root || typeof candidate !== "string" || !candidate) return false;

  const nativePosix = usesNativePosixPath(root, candidate);
  const pathApi = nativePosix ? path : path.win32;
  const normalizeCase = (value) => nativePosix ? value : value.toLowerCase();
  const resolvedRoot = normalizeCase(nativePosix ? path.resolve(root) : resolveWindowsPath(root));
  const resolvedCandidate = normalizeCase(nativePosix ? path.resolve(candidate) : resolveWindowsPath(candidate));
  const relative = pathApi.relative(resolvedRoot, resolvedCandidate);

  return relative === "" || (!relative.startsWith(`..${pathApi.sep}`) && relative !== ".." && !pathApi.isAbsolute(relative));
}

function isCanonicalPathInside(root, candidate) {
  if (typeof root !== "string" || !root || typeof candidate !== "string" || !candidate) return false;
  const canonicalRoot = canonicalizeNearestWindowsPath(root);
  const canonicalCandidate = canonicalizeNearestWindowsPath(candidate);
  if (!canonicalRoot || !canonicalCandidate) return false;
  return isPathInside(canonicalRoot, canonicalCandidate);
}

function hasLiteralParentSegment(candidate) {
  return typeof candidate === "string" && candidate.split(/[\\/]+/u).includes("..");
}

function hasNamedSegment(candidate, segmentName) {
  if (typeof candidate !== "string") return false;
  const expected = segmentName.toLowerCase();
  return candidate.split(/[\\/]+/u).some((segment) => segment.toLowerCase() === expected);
}

function operationPaths({ operation, sourcePath, targetPath }) {
  if (operation === "delete") return [sourcePath];
  if (operation === "move") return [sourcePath, targetPath];
  return sourcePath === undefined ? [targetPath] : [sourcePath, targetPath];
}

/**
 * Decide a autorização para as operações: read, create, write, overwrite,
 * move, delete e promote.
 */
function resolveAgentFileDecision({ operation, sourcePath, targetPath, projectRoot } = {}) {
  if (operation === "read") return "allow";
  if (!WRITE_OPERATIONS.has(operation)) return "deny";

  const candidates = operationPaths({ operation, sourcePath, targetPath });
  if (candidates.some(hasLiteralParentSegment)) return "deny";
  if (candidates.some((candidate) => !isPathInside(projectRoot, candidate))) return "deny";
  if (existsSync(resolvePolicyPath(projectRoot)) && candidates.some((candidate) => !isCanonicalPathInside(projectRoot, candidate))) {
    return "deny";
  }

  const canonicalCandidates = candidates
    .map((candidate) => canonicalizeNearestWindowsPath(candidate))
    .filter(Boolean);
  if ([...candidates, ...canonicalCandidates].some((candidate) => hasNamedSegment(candidate, "ASSINADOS"))) {
    return "confirm_signed";
  }
  if (DESTRUCTIVE_OPERATIONS.has(operation)) return "confirm";

  const workRoot = usesNativePosixPath(projectRoot)
    ? path.join(path.resolve(projectRoot), ".easyaga-work")
    : path.win32.join(resolveWindowsPath(projectRoot), ".easyaga-work");
  return isPathInside(workRoot, targetPath) ? "allow" : "confirm";
}

module.exports = {
  canonicalizeNearestWindowsPath,
  isCanonicalPathInside,
  isPathInside,
  resolveAgentFileDecision,
};
