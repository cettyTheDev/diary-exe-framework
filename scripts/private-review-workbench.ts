import { readFile, realpath } from "node:fs/promises"
import path from "node:path"

import {
  createPrivateReviewWorkbenchServer,
  parsePrivateReviewArtifacts,
} from "../lib/ingestion/private-review-workbench.ts"

function argument(name: string) {
  const index = process.argv.indexOf(name)
  return index >= 0 ? process.argv[index + 1] : undefined
}

function isInside(filePath: string, directoryPath: string) {
  const relative = path.relative(directoryPath, filePath)
  return (
    relative !== "" && !relative.startsWith("..") && !path.isAbsolute(relative)
  )
}

const queueArgument = argument("--queue")
const decisionsArgument = argument("--decisions")
const reviewer = argument("--reviewer")?.trim()
const portValue = argument("--port") ?? "4173"
const port = Number(portValue)
if (
  !queueArgument ||
  !decisionsArgument ||
  !reviewer ||
  !Number.isSafeInteger(port) ||
  port < 0 ||
  port > 65535
) {
  throw new Error(
    "Usage: npm run review:workbench -- --queue data/editorial/review-queues/<run>/queue.json --decisions data/editorial/review-queues/<run>/decisions.json --reviewer <name> [--port 4173]"
  )
}

const projectRoot = process.cwd()
const reviewRoot = await realpath(
  path.resolve(projectRoot, "data/editorial/review-queues")
)
const queueFile = await realpath(path.resolve(projectRoot, queueArgument))
const decisionsFile = await realpath(
  path.resolve(projectRoot, decisionsArgument)
)
if (
  !isInside(queueFile, reviewRoot) ||
  !isInside(decisionsFile, reviewRoot) ||
  path.dirname(queueFile) !== path.dirname(decisionsFile)
) {
  throw new Error(
    "The review workbench refuses artifacts outside one private review-queue directory."
  )
}

const { queue } = parsePrivateReviewArtifacts(
  JSON.parse(await readFile(queueFile, "utf8")),
  JSON.parse(await readFile(decisionsFile, "utf8"))
)
const { server, token } = createPrivateReviewWorkbenchServer({
  queueFile,
  decisionsFile,
  reviewer,
})
server.listen(port, "127.0.0.1", () => {
  const address = server.address()
  const selectedPort =
    typeof address === "object" && address ? address.port : port
  process.stdout.write(
    `${JSON.stringify({ runId: queue.runId, candidates: queue.candidates.length, bind: `127.0.0.1:${selectedPort}`, rawTextPublic: false }, null, 2)}\n`
  )
  process.stdout.write(
    `Open locally: http://127.0.0.1:${selectedPort}/?token=${token}\n`
  )
})

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => server.close(() => process.exit(0)))
}
