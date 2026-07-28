import { createHash } from "node:crypto"
import {
  chmod,
  mkdir,
  readFile,
  realpath,
  stat,
  writeFile,
} from "node:fs/promises"
import path from "node:path"

import type { FileInventory, VaultReceipt } from "./contracts.ts"

function isInsideDirectory(filePath: string, directoryPath: string) {
  const relative = path.relative(directoryPath, filePath)
  return (
    relative !== "" && !relative.startsWith("..") && !path.isAbsolute(relative)
  )
}

function slashPath(filePath: string) {
  return filePath.split(path.sep).join("/")
}

function mimeTypeFor(fileName: string) {
  switch (path.extname(fileName).toLowerCase()) {
    case ".pdf":
      return "application/pdf"
    case ".json":
      return "application/json"
    case ".txt":
      return "text/plain"
    default:
      return "application/octet-stream"
  }
}

function sha256(contents: Uint8Array) {
  return createHash("sha256").update(contents).digest("hex")
}

export type StoreVaultObjectInput = {
  inputFile: string
  allowedInputRoot: string
  vaultRoot: string
  sourceId: string
  recordedAt: string
  isFixture: boolean
}

export async function storeVaultObject({
  inputFile,
  allowedInputRoot,
  vaultRoot,
  sourceId,
  recordedAt,
  isFixture,
}: StoreVaultObjectInput): Promise<VaultReceipt> {
  const [realInputFile, realInputRoot] = await Promise.all([
    realpath(inputFile),
    realpath(allowedInputRoot),
  ])

  if (!isInsideDirectory(realInputFile, realInputRoot)) {
    throw new Error(
      `Vault refused input outside allowed root: ${realInputFile}`
    )
  }

  const [contents, inputStats] = await Promise.all([
    readFile(realInputFile),
    stat(realInputFile),
  ])
  if (!inputStats.isFile()) {
    throw new Error(`Vault intake requires a regular file: ${realInputFile}`)
  }

  const digest = sha256(contents)
  const objectId = `sha256:${digest}`
  const objectDirectory = path.resolve(vaultRoot, digest)
  const destination = path.join(objectDirectory, path.basename(realInputFile))
  const resolvedVaultRoot = path.resolve(vaultRoot)
  if (!isInsideDirectory(destination, resolvedVaultRoot)) {
    throw new Error(
      `Vault refused destination outside vault root: ${destination}`
    )
  }

  await mkdir(objectDirectory, { recursive: true })
  let action: VaultReceipt["action"] = "created"

  try {
    await writeFile(destination, contents, { flag: "wx", mode: 0o444 })
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error
    const existing = await readFile(destination)
    if (sha256(existing) !== digest) {
      throw new Error(`Vault object collision at ${destination}`)
    }
    action = "reused"
  }

  await chmod(destination, 0o444)
  const originalRelativePath = slashPath(
    path.relative(realInputRoot, realInputFile)
  )
  const storedRelativePath = slashPath(
    path.relative(resolvedVaultRoot, destination)
  )
  const fileId = `file-${digest.slice(0, 16)}`
  const file: FileInventory = {
    id: fileId,
    relativePath: originalRelativePath,
    fileName: path.basename(realInputFile),
    mimeType: mimeTypeFor(realInputFile),
    byteLength: contents.byteLength,
    checksumAlgorithm: "sha256",
    sha256: digest,
  }

  return {
    schemaVersion: "1.0",
    receiptId: `vault-${digest.slice(0, 16)}`,
    sourceId,
    objectId,
    originalRelativePath,
    storedRelativePath,
    file,
    recordedAt,
    action,
    isFixture,
  }
}
