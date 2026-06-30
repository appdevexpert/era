/**
 * Exports en.ts + nb.ts into a CSV for client translation review.
 * Output: mobile/locales-export.csv (paste into Google Sheets).
 *
 * Run from mobile/ dir:  node scripts/export-locales.js
 */

const fs = require("fs");
const path = require("path");

function loadLocale(filepath) {
  let content = fs.readFileSync(filepath, "utf-8");
  content = content.replace(/^const \w+ = /m, "module.exports = ");
  content = content.replace(/export default \w+;?\s*$/m, "");
  const tempPath = filepath + ".tmp.cjs";
  fs.writeFileSync(tempPath, content);
  delete require.cache[require.resolve(tempPath)];
  const data = require(tempPath);
  fs.unlinkSync(tempPath);
  return data;
}

function flatten(obj, prefix = "", result = {}) {
  for (const key in obj) {
    const newKey = prefix ? `${prefix}.${key}` : key;
    const val = obj[key];
    if (Array.isArray(val)) {
      val.forEach((item, i) => {
        if (item && typeof item === "object") {
          flatten(item, `${newKey}[${i}]`, result);
        } else {
          result[`${newKey}[${i}]`] = item;
        }
      });
    } else if (val && typeof val === "object") {
      flatten(val, newKey, result);
    } else {
      result[newKey] = val;
    }
  }
  return result;
}

function csvEscape(val) {
  if (val == null) return "";
  const s = String(val);
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

const SECTION_CONTEXT = {
  common: "Shared buttons used across app",
  auth: "Login / signup / forgot password screens",
  getStarted: "First splash screen before onboarding",
  onboarding: "Onboarding flow (gender, age, level, goal, focus, weight, height, paywall, calories, screen time, preview)",
  planGeneration: "Loading screen while plan is built after onboarding",
  tabs: "Bottom tab bar labels",
  screens: "Top-of-screen titles",
  twelveWeekCompletion: "Screen shown after completing 12 weeks",
  cycle2Begins: "Screen shown when starting next 12-week cycle",
  whatComesNow: "Choice after 12 weeks (Restart / Deload / Next program)",
  profile: "Profile + Settings (subscription, language, legal Terms/Privacy)",
  nutrition: "Nutrition tab — daily targets, meal logging, water",
  progress: "Progress tab — stats, leaderboard, PRs, weight, photos",
  weights: "Weights tab — exercise weight progression",
  history: "Exercise history screen",
  workout: "Workout screens — plan, set logging, session complete, rest timer",
  language: "Language picker labels",
};

const localesDir = path.join(__dirname, "..", "app", "locales");
const en = loadLocale(path.join(localesDir, "en.ts"));
const nb = loadLocale(path.join(localesDir, "nb.ts"));

const enFlat = flatten(en);
const nbFlat = flatten(nb);

const rows = ["Section,Key,Context / Where it shows,English,Norwegian (current),Notes for Rami"];
for (const key of Object.keys(enFlat)) {
  const section = key.split(".")[0];
  rows.push(
    [
      csvEscape(section),
      csvEscape(key),
      csvEscape(SECTION_CONTEXT[section] || ""),
      csvEscape(enFlat[key]),
      csvEscape(nbFlat[key] ?? ""),
      "",
    ].join(",")
  );
}

const outPath = path.join(__dirname, "..", "locales-export.csv");
fs.writeFileSync(outPath, rows.join("\n") + "\n");
console.log(`Wrote ${rows.length - 1} rows to ${outPath}`);
