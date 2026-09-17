import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8")

test("CIO 100 is a past event that directs visitors to its gallery", () => {
  for (const path of ["src/data/EventsData.ts", "src/portal/data/EventsData.ts"]) {
    const source = read(path)
    assert.match(source, /slug: 'cio-100-awards-conference'/)
    assert.match(source, /date: '17-19 August, 2026'/)
    assert.match(source, /heroImage: '\/events\/cio100-banner\.png'/)
    assert.match(source, /registrationOpen: false/)
    assert.match(source, /lifecycleStatus: 'past'/)
    assert.match(source, /galleryUrl: '\/gallery\/cio-100-awards-conference'/)
  }
})

test("CIO 100 gallery presents the seven-day access form", () => {
  const galleryDetail = read("src/components/gallery/GalleryDetail.tsx")
  const access = read("src/components/events/CIO100MediaAccess.tsx")

  assert.match(galleryDetail, /gallery\.slug === "cio-100-awards-conference"/)
  assert.match(galleryDetail, /<CIO100MediaAccess\s*\/>/)
  assert.match(access, /events\/gallery-leads/)
  assert.match(access, /globalcxocircle\.sharepoint\.com/)
  assert.match(access, /LinkedIn Profile/)
  assert.match(access, /placeholder="https:\/\/www\.linkedin\.com\/in\/your-name"/)
  assert.match(access, /company: linkedinProfile\.trim\(\)/)
})
