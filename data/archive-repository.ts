import { archiveFixtures } from "./editorial/demo-fixtures.ts"
import { createArchiveRepository } from "../lib/archive/repository.ts"

export const archiveRepository = createArchiveRepository(archiveFixtures)
