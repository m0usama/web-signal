// Prints one compact block per failing Playwright test (from the JSON report)
// as a GitHub annotation, so failures are readable without the full log.
import fs from "node:fs";
const file = "test-results/results.json";
if (!fs.existsSync(file)) process.exit(0);
const report = JSON.parse(fs.readFileSync(file, "utf8"));
const out = [];
const walk = (suite, trail = []) => {
  for (const s of suite.suites ?? []) walk(s, [...trail, s.title]);
  for (const spec of suite.specs ?? []) {
    for (const t of spec.tests ?? []) {
      const last = t.results?.[t.results.length - 1];
      if (!last || last.status === "passed" || last.status === "skipped") continue;
      const err = (last.errors?.[0]?.message ?? last.error?.message ?? "").replace(/\u001b\[[0-9;]*m/g, "");
      const loc = last.errors?.[0]?.location ?? last.error?.location;
      out.push(`[${t.projectName}] ${spec.title} — ${last.status}${loc ? ` @ line ${loc.line}` : ""}\n${err.split("\n").slice(0, 14).join("\n")}`);
    }
  }
};
for (const s of report.suites ?? []) walk(s);
if (out.length) {
  const msg = out.join("\n\n").slice(0, 60000).replace(/%/g, "%25").replace(/\r/g, "").replace(/\n/g, "%0A");
  console.log(`::error title=e2e details::${msg}`);
}
