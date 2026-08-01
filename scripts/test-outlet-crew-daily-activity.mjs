/**
 * Smoke tests for Outlet crew Daily Activity templates.
 * Run: node scripts/test-outlet-crew-daily-activity.mjs
 *
 * Uses dynamic import of compiled-less TS via next/tsx isn't available —
 * we re-implement the critical pure checks against the source modules through
 * a small inline duplicate of normalize + load seed JSON-like structure by
 * parsing the seed file... Actually: use npx tsx if available, else compile with tsc.
 */
import { createRequire } from "module";
import { spawnSync } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

// Prefer tsx; fall back to compiling with tsc --esModuleInterop to /tmp
function loadModules() {
  const tsx = spawnSync(
    "npx",
    ["--yes", "tsx", "-e", `
      import { normalizePositionGroup, resolveStaffPositionGroup } from "./lib/position-groups.ts";
      import {
        matchTemplatesForStaff,
        seedDailyActivityTemplates,
        submitDailyReport,
        generateStaffReportLink,
        setStaffCache,
        getStaffReportByToken,
        listReportTemplates,
      } from "./lib/staff-report-store.ts";
      import { DAILY_ACTIVITY_SEED_TEMPLATES } from "./lib/daily-activity-seed-data.ts";

      const results = [];
      const assert = (name, cond, detail = "") => {
        results.push({ name, ok: Boolean(cond), detail: cond ? "" : detail });
        if (!cond) console.error("FAIL:", name, detail);
        else console.log("OK  :", name);
      };

      // 1) Normalization variants
      for (const v of ["Outlet crew", "Outlet Crew", "OUTLET CREW", " outlet crew ", "OutletCrew"]) {
        assert(
          "normalize " + JSON.stringify(v),
          normalizePositionGroup(v) === "OutletCrew",
          "got " + normalizePositionGroup(v)
        );
      }
      assert(
        "Outlet crew NOT mapped to Waiters/Bar/Kasir/Dapur",
        !["Waiters", "Bar", "Kasir", "Dapur", "PA"].includes(
          normalizePositionGroup("Outlet crew")
        )
      );
      assert("Cook → Dapur", normalizePositionGroup("Cook") === "Dapur");
      assert("Kasir stays", normalizePositionGroup("Kasir") === "Kasir");
      assert("Barista → Bar", normalizePositionGroup("Barista") === "Bar");
      assert("Server → Waiters", normalizePositionGroup("Server") === "Waiters");
      assert("PA stays", normalizePositionGroup("PA") === "PA");

      // Seed staff Hana
      setStaffCache([
        {
          staff_id: "STF-HANA",
          name: "Hana Hadi Sutrisno",
          position: "Outlet crew",
          outlet: "Samtaro Express",
          area: "Floor",
          wa_number: "6281110009999",
          role: "STAFF",
          status: "ACTIVE",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          staff_id: "STF-COOK",
          name: "Budi Dapur",
          position: "Cook",
          outlet: "KBU",
          area: "Dapur",
          wa_number: "6281110008888",
          role: "STAFF",
          status: "ACTIVE",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          staff_id: "STF-KASIR",
          name: "Siti Kasir",
          position: "Kasir",
          outlet: "KBU",
          area: "Kasir",
          wa_number: "6281110007777",
          role: "STAFF",
          status: "ACTIVE",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          staff_id: "STF-BAR",
          name: "Ani Bar",
          position: "Barista",
          outlet: "Kisamen",
          area: "Bar",
          wa_number: "6281110006666",
          role: "STAFF",
          status: "ACTIVE",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          staff_id: "STF-WAIT",
          name: "Rina Waiters",
          position: "Server",
          outlet: "KBU",
          area: "Floor",
          wa_number: "6281110005555",
          role: "STAFF",
          status: "ACTIVE",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          staff_id: "STF-PA",
          name: "Dedi PA",
          position: "PA",
          outlet: "KBU",
          area: "Outdoor",
          wa_number: "6281110004444",
          role: "STAFF",
          status: "ACTIVE",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ]);

      const expectedTitles = [
        "Opening Outlet Mini",
        "Cek Kualitas Minuman Awal",
        "Cek Stok Awal",
        "Kebersihan Area Outlet",
        "Monitoring Operasional",
        "Restock Operasional",
        "Closing dan Kebersihan Akhir",
        "Stok Opname Akhir",
        "Rekap Kas dan Penjualan",
        "Catatan Harian Outlet",
      ];

      const hanaTemplates = matchTemplatesForStaff("Samtaro Express", "Outlet crew");
      const hanaDaily = hanaTemplates.filter((t) => t.kind !== "issue_quick");
      const hanaTitles = hanaDaily.map((t) => t.title);
      assert(
        "Hana sees all 10 Outlet crew templates",
        expectedTitles.every((t, i) => hanaTitles[i] === t) && hanaTitles.length === 10,
        "got: " + JSON.stringify(hanaTitles)
      );

      const hanaCrewCase = matchTemplatesForStaff("Samtaro Express", "Outlet Crew");
      assert(
        "Outlet Crew variant matches",
        hanaCrewCase.filter((t) => t.position_group === "OutletCrew").length === 10
      );

      const required = hanaTemplates.filter((t) => t.is_required_daily);
      assert("Required count = 9 (Restock excluded)", required.length === 9, "got " + required.length);
      assert(
        "Restock not required",
        hanaTemplates.find((t) => t.title === "Restock Operasional")?.is_required_daily === false
      );

      const dapur = matchTemplatesForStaff("KBU", "Cook").filter((t) => t.is_required_daily);
      assert(
        "Dapur still has Opening Dapur",
        dapur.some((t) => t.title === "Opening Dapur"),
        dapur.map((t) => t.title).join(", ")
      );
      assert(
        "Dapur does not get Outlet crew templates",
        !dapur.some((t) => t.id.startsWith("RTPL-OC"))
      );

      for (const [pos, outlet] of [
        ["Kasir", "KBU"],
        ["Barista", "Kisamen"],
        ["Server", "KBU"],
        ["PA", "KBU"],
      ]) {
        const tpls = matchTemplatesForStaff(outlet, pos);
        assert(
          pos + " unchanged (no OC templates)",
          !tpls.some((t) => t.id.startsWith("RTPL-OC")),
          tpls.filter((t) => t.id.startsWith("RTPL-OC")).map((t) => t.id).join(",")
        );
      }

      // Idempotent seed
      const r1 = seedDailyActivityTemplates();
      const r2 = seedDailyActivityTemplates();
      assert("Seed idempotent counts equal", r1.templates === r2.templates);
      const ocCodes = listReportTemplates().filter((t) => t.id.startsWith("RTPL-OC"));
      const unique = new Set(ocCodes.map((t) => t.id));
      assert(
        "No duplicate OC templates after double seed",
        unique.size === ocCodes.length && unique.size === 10,
        "count=" + ocCodes.length + " unique=" + unique.size
      );

      // Kendala still present for Hana
      assert(
        "Lapor Kendala Operasional still available",
        hanaTemplates.some((t) => t.title === "Lapor Kendala Operasional")
      );

      // Submit flow: photo required, note required
      const link = generateStaffReportLink("STF-HANA", "http://localhost:3000");
      assert("Link created", link.success, link.error || "");
      const token = link.data.token;

      const opening = hanaTemplates.find((t) => t.id === "RTPL-OC01");
      const answers = (opening.checklist_items || []).map((i) => ({
        checklist_item_id: i.id,
        checked: true,
      }));

      const noPhoto = submitDailyReport({
        token,
        report_template_id: "RTPL-OC01",
        status_condition: "aman",
        note: "",
        photo_url: null,
        checklist_answers: answers,
      });
      assert("Photo wajib validated", !noPhoto.success && /foto/i.test(noPhoto.error || ""), noPhoto.error);

      const withPhoto = submitDailyReport({
        token,
        report_template_id: "RTPL-OC01",
        status_condition: "aman",
        note: "",
        photo_url: "data:image/jpeg;base64,/9j/4AAQ",
        checklist_answers: answers,
      });
      assert("Opening submit OK with photo", withPhoto.success, withPhoto.error || "");

      const catatan = hanaTemplates.find((t) => t.id === "RTPL-OC10");
      const catatanAnswers = (catatan.checklist_items || []).map((i) => ({
        checklist_item_id: i.id,
        checked: true,
      }));
      const noNote = submitDailyReport({
        token,
        report_template_id: "RTPL-OC10",
        status_condition: "aman",
        note: "   ",
        checklist_answers: catatanAnswers,
      });
      assert("Catatan harian note required", !noNote.success && /catatan/i.test(noNote.error || ""), noNote.error);

      const withNote = submitDailyReport({
        token,
        report_template_id: "RTPL-OC10",
        status_condition: "aman",
        note: "Tidak ada kendala",
        checklist_answers: catatanAnswers,
      });
      assert("Catatan harian submit OK", withNote.success, withNote.error || "");

      // Refresh / reload context keeps submissions
      const ctx = getStaffReportByToken(token);
      assert("Token context OK", ctx.success);
      assert(
        "Submissions persist after reload",
        (ctx.data.today_submissions || []).length >= 2,
        "count=" + (ctx.data.today_submissions || []).length
      );

      // Other outlet with Outlet crew should NOT get Samtaro-scoped templates
      const otherOutlet = matchTemplatesForStaff("KBU", "Outlet crew").filter(
        (t) => t.position_group === "OutletCrew"
      );
      assert(
        "Outlet crew at KBU does not get Samtaro templates",
        otherOutlet.length === 0,
        otherOutlet.map((t) => t.id).join(",")
      );

      assert(
        "Seed file contains OC defs",
        DAILY_ACTIVITY_SEED_TEMPLATES.filter((t) => t.code.startsWith("RTPL-OC")).length === 10
      );

      const failed = results.filter((r) => !r.ok);
      console.log("\\n" + (results.length - failed.length) + "/" + results.length + " passed");
      if (failed.length) process.exit(1);
    `],
    { cwd: root, encoding: "utf8", timeout: 120000 }
  );

  process.stdout.write(tsx.stdout || "");
  process.stderr.write(tsx.stderr || "");
  if (tsx.status !== 0) process.exit(tsx.status || 1);
}

loadModules();
