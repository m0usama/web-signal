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
      for (const [i, r] of (t.results ?? []).entries()) {
        if (r.status === "passed" || r.status === "skipped") continue;
        for (const e of r.errors?.length ? r.errors : [r.error ?? {}]) {
          const err = (e.message ?? "").replace(/\u001b\[[0-9;]*m/g, "");
          out.push(`[${t.projectName}] ${spec.title} — try ${i + 1} ${r.status}${e.location ? ` @ line ${e.location.line}` : ""}\n${err.split("\n").slice(0, 12).join("\n")}`);
        }
      }
    }
  }
};
for (const s of report.suites ?? []) walk(s);
const titles = [];
const collect = (suite) => {
  for (const s of suite.suites ?? []) collect(s);
  for (const spec of suite.specs ?? []) for (const t of spec.tests ?? []) {
    const last = t.results?.[t.results.length - 1];
    titles.push(`${last?.status === "passed" ? "✓" : last?.status ?? "?"} [${t.projectName}] ${spec.title}`);
  }
};
for (const s of report.suites ?? []) collect(s);
console.log(`::notice title=e2e results::${titles.join("%0A")}`);
if (out.length) {
  const msg = out.join("\n\n").slice(0, 60000).replace(/%/g, "%25").replace(/\r/g, "").replace(/\n/g, "%0A");
  console.log(`::error title=e2e details::${msg}`);
}
