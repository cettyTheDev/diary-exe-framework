import { archiveFixtures } from "../data/editorial/demo-fixtures.ts"
import { generateArchiveQualityReport } from "../lib/archive/quality.ts"

const report = generateArchiveQualityReport(archiveFixtures, "fixture")
process.stdout.write(`${JSON.stringify(report, null, 2)}\n`)

if (!report.valid) process.exitCode = 1
