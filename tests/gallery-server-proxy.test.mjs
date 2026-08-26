import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

const source = readFileSync(
  new URL("../src/components/events/CIO100MediaAccess.tsx", import.meta.url),
  "utf8",
)
const nextConfig = readFileSync(
  new URL("../next.config.ts", import.meta.url),
  "utf8",
)

test("CIO100 gallery form submits through the same-origin server route", () => {
  assert.doesNotMatch(source, /from "@\/portal\/api\/config"/)
  assert.doesNotMatch(source, /gcio-backend-production\.up\.railway\.app/)
  assert.match(source, /fetch\("\/api\/gallery-leads"/)
})

test("gallery proxy is deployed as a Next server route, not a static export", () => {
  assert.doesNotMatch(nextConfig, /output:\s*["']export["']/)
})
