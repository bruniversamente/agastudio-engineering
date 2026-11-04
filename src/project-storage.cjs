const { existsSync, mkdirSync } = require("node:fs");
const { copyFile, readFile, rename, rm, writeFile } = require("node:fs/promises");
const path = require("node:path");

const DEFAULT_BACKUP_COUNT = 3;

async function writeProjectAtomically(filePath, bytes, options = {}) {
  const backupCount = Number.isInteger(options.backupCount) ? Math.max(0, options.backupCount) : DEFAULT_BACKUP_COUNT;
  mkdirSync(path.dirname(filePath), { recursive: true });
  const tempPath = `${filePath}.tmp-${process.pid}-${Date.now()}`;
  const rollbackPath = `${filePath}.rollback-${process.pid}-${Date.now()}`;
  let rollbackCreated = false;
  await writeFile(tempPath, bytes);
  try {
    if (existsSync(filePath)) {
      if (backupCount > 0) await rotateProjectBackups(filePath, backupCount);
      await rename(filePath, rollbackPath);
      rollbackCreated = true;
    }
    await rename(tempPath, filePath);
    if (rollbackCreated) await rm(rollbackPath, { force: true });
  } catch (error) {
    await rm(tempPath, { force: true }).catch(() => undefined);
    if (rollbackCreated && !existsSync(filePath)) await rename(rollbackPath, filePath).catch(() => undefined);
    throw error;
  }
}

async function rotateProjectBackups(filePath, count = DEFAULT_BACKUP_COUNT) {
  if (count < 1 || !existsSync(filePath)) return;
  await rm(backupPath(filePath, count), { force: true });
  for (let index = count - 1; index >= 1; index -= 1) {
    const source = backupPath(filePath, index);
    if (!existsSync(source)) continue;
    await rename(source, backupPath(filePath, index + 1));
  }
  await copyFile(filePath, backupPath(filePath, 1));
}

async function saveProjectRecovery(userDataRoot, request) {
  const paths = recoveryPaths(userDataRoot);
  const metadata = {
    capturedAt: String(request.capturedAt || new Date().toISOString()),
    displayName: String(request.displayName || "Projeto recuperado.aga"),
    projectId: String(request.projectId || "unknown"),
  };
  await writeProjectAtomically(paths.archive, request.bytes, { backupCount: 0 });
  await writeProjectAtomically(paths.metadata, Buffer.from(`${JSON.stringify(metadata, null, 2)}\n`, "utf8"), { backupCount: 0 });
}

async function loadProjectRecovery(userDataRoot) {
  const paths = recoveryPaths(userDataRoot);
  if (!existsSync(paths.archive) || !existsSync(paths.metadata)) return null;
  try {
    const [bytes, metadataText] = await Promise.all([readFile(paths.archive), readFile(paths.metadata, "utf8")]);
    const metadata = JSON.parse(metadataText);
    if (!metadata.capturedAt || !metadata.displayName || !metadata.projectId) return null;
    return { ...metadata, bytes: new Uint8Array(bytes) };
  } catch {
    return null;
  }
}

async function clearProjectRecovery(userDataRoot) {
  const paths = recoveryPaths(userDataRoot);
  await Promise.all([
    rm(paths.archive, { force: true }),
    rm(paths.metadata, { force: true }),
  ]);
}

function recoveryPaths(userDataRoot) {
  const root = path.join(userDataRoot, "recovery");
  return {
    archive: path.join(root, "active.aga"),
    metadata: path.join(root, "active.json"),
  };
}

function backupPath(filePath, index) {
  return `${filePath}.bak.${index}`;
}

module.exports = {
  clearProjectRecovery,
  loadProjectRecovery,
  recoveryPaths,
  rotateProjectBackups,
  saveProjectRecovery,
  writeProjectAtomically,
};
