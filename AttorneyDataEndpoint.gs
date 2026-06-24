// Manifest Law — B2B Attorney Hub Data Endpoint
// Paste into Extensions → Apps Script inside the attorney Google Sheet.
// Deploy as Web App: Execute as Me, Who has access: Anyone.
// After editing, create a NEW deployment and paste the new URL into
// APPS_SCRIPT_URL in the HTML dashboard.

const NAME_MAP = {
  'n.zaidi@manifestlaw.com':   'Nadia Zaidi',
  'l.maxwell@manifestlaw.com': 'Lucia Maxwell',
};

const VISA_TYPES = [
  'H-1B Cap','H-1B Transfer/Ext','H-1B Amendment','O-1A/O-1B',
  'EB-1A','EB-1B','EB-1C','EB-2 NIW','EB-2 PERM','EB-3 PERM',
  'L-1A/L-1B','Blanket L','TN','J-1','E-1','E-2','E-3',
  'PERM/Labor Cert','Green Card/AOS','EAD/AP','RFE Response',
  'I-130/Family','Removal of Conditions','Naturalization','I-539',
  'EB-4','EB-5','B-1','I-131','O-2 Support',
];

// BQ returns slightly different visa type names than the Visa Weights tab.
// This map normalises BQ values → canonical Visa Weights tab names.
const BQ_NAME_MAP = {
  'EB1A':                            'EB-1A (I-140)',
  'EB2 NIW':                         'EB-2 NIW (I-140)',
  'EB2-NIW (I-140)':                 'EB-2 NIW (I-140)',
  'EB3 PERM + I-140':                'EB-3 PERM + I-140',
  'O1':                              'O-1A',
  'RFE':                             'RFE Response',
  'NOID':                            'RFE Response',
  'L1':                              'L-1A (Initial)',
  'AOS package':                     'I-485 Adjustment of Status',
  'I-485 Adjustment of Status (1)':  'I-485 Adjustment of Status',
  'I-485 Adjustment of Status (2)':  'I-485 Adjustment of Status',
  'I-485 Adjustment of Status (3)':  'I-485 Adjustment of Status',
};

function normalizeBQVisa(name) {
  const t = String(name || '').trim();
  return BQ_NAME_MAP[t] || t;
}

// Split a comma-separated string, ignoring commas inside parentheses.
// "Tech (e.g., engineers, founders), AI" → ["Tech (e.g., engineers, founders)", "AI"]
function splitOutsideParens(str) {
  const parts = [];
  let depth = 0, current = '';
  for (let i = 0; i < str.length; i++) {
    const ch = str[i];
    if      (ch === '(') depth++;
    else if (ch === ')') depth--;
    else if (ch === ',' && depth === 0) {
      const t = current.trim();
      if (t) parts.push(t);
      current = '';
      continue;
    }
    current += ch;
  }
  const t = current.trim();
  if (t) parts.push(t);
  return parts;
}

// ── Helpers ───────────────────────────────────────────────────────────────

function getSheet(name) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(name);
  if (!sheet) throw new Error('Sheet not found: ' + name);
  return sheet;
}

// ── Read Visa Weights tab → { visaName: weight } ──────────────────────────

function readVisaWeights() {
  try {
    const sheet = getSheet('Visa Weights');
    const rows  = sheet.getDataRange().getValues();
    const map   = {};
    // Row 0 = header (visa_type, weight); data starts at row 1
    for (let i = 1; i < rows.length; i++) {
      const visa   = String(rows[i][0] || '').trim();
      const weight = parseFloat(String(rows[i][1] || '0')) || 0;
      if (visa) map[visa] = weight;
    }
    return map;
  } catch (_) { return {}; }
}

// ── GET: attorneys + pod capacity (+ optional BQ refresh trigger) ─────────
// Pass ?action=refreshBQ to trigger a live BQ refresh before returning data.

function doGet(e) {
  try {
    const params = (e && e.parameter) ? e.parameter : {};

    if (params.action === 'checkAvailability') {
      const result = checkAvailability(params);
      return ContentService.createTextOutput(JSON.stringify(result))
        .setMimeType(ContentService.MimeType.JSON);
    }

    if (params.action === 'refreshBQ') {
      refreshFromBQ(true); // silent — no UI alert
    }
    const attorneys   = readAttorneys();
    const podCapacity = readPodCapacity();
    const payload = JSON.stringify({
      attorneys,
      podCapacity,
      updated: new Date().toISOString(),
    });
    return ContentService.createTextOutput(payload)
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ error: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// ── Read Attorney Capacity tab → email → capacity fields ──────────────────

function readAttorneyCapacityMap() {
  try {
    const sheet   = getSheet('Attorney Capacity');
    const rows    = sheet.getDataRange().getValues();
    if (rows.length < 2) return {};
    const headers = rows[0].map(h => String(h).trim().toLowerCase().replace(/[\s-]+/g, '_'));
    const iEmail = headers.findIndex(h => h.includes('email'));
    const iLead  = headers.findIndex(h => h.includes('is_practice_lead'));
    const iTier  = headers.findIndex(h => h === 'tier' || h === 'type');
    const iMax   = headers.findIndex(h => h.includes('max_load'));
    const iLoad  = headers.findIndex(h => h.includes('weighted_load'));
    if (iEmail === -1) return {};
    const map = {};
    for (let i = 1; i < rows.length; i++) {
      const rawEmail = String(rows[i][iEmail] || '').trim();
      if (!rawEmail) continue;
      const isPracticeLead = iLead !== -1 ? String(rows[i][iLead] || '').toUpperCase() === 'TRUE' : false;
      const tier           = iTier !== -1 ? String(rows[i][iTier]  || '').trim() : '';
      const maxLoad        = iMax  !== -1 ? parseFloat(String(rows[i][iMax]  || '0')) || 0 : 0;
      const weightedLoad   = iLoad !== -1 ? parseFloat(String(rows[i][iLoad] || '0')) || 0 : 0;
      const emails = rawEmail.split('&').map(x => x.trim()).filter(Boolean);
      for (const email of emails) {
        map[email] = { isPracticeLead, tier, maxLoad, weightedLoad };
      }
    }
    return map;
  } catch (_) { return {}; }
}

// ── Read attorneys tab ─────────────────────────────────────────────────────

function readAttorneys() {
  const sheet = getSheet('Attorneys');
  const rows  = sheet.getDataRange().getValues();

  let headerIdx = -1;
  for (let i = 0; i < Math.min(rows.length, 5); i++) {
    const r = rows[i].map(c => String(c).toLowerCase().trim());
    if (r.includes('name') && r.includes('email')) { headerIdx = i; break; }
  }
  if (headerIdx === -1) throw new Error('Attorneys header row not found');

  const headers = rows[headerIdx].map(c => String(c).trim());
  const col = name => headers.findIndex(h => h.toLowerCase() === name.toLowerCase());

  const iName  = col('name');
  const iSlug  = col('slug');
  const iEmail = col('email');
  const iSizes = col('client_sizes');
  const iLink  = col('scheduling_link');
  const iDNS   = col('do_not_send');
  const iTags  = col('tags');
  const iLangs = col('languages');
  const iInds  = col('industries');
  const iYoe   = col('year of experience');

  const visaCols = {};
  for (const visa of VISA_TYPES) {
    const idx = headers.findIndex(h => h === visa);
    if (idx !== -1) visaCols[visa] = idx;
  }

  const podSlugByEmail  = readPodSlugMap();
  const capacityByEmail = readAttorneyCapacityMap();

  const attorneys = [];
  for (let i = headerIdx + 1; i < rows.length; i++) {
    const row      = rows[i];
    const rawEmail = String(row[iEmail] || '').trim();
    const rawName  = String(row[iName]  || '').trim();
    if (!rawEmail.includes('@') || !rawName) continue;

    const scores = {};
    for (const [visa, idx] of Object.entries(visaCols)) {
      const val = parseInt(String(row[idx] || '0'), 10);
      scores[visa] = isNaN(val) ? 0 : val;
    }

    const clientSizes       = String(row[iSizes] || '').split(',').map(s => s.trim()).filter(Boolean);
    const tags              = String(row[iTags]  || '').split(',').map(t => t.trim()).filter(Boolean);
    const doNotSend         = String(row[iDNS]   || '').toUpperCase() === 'TRUE';
    const rawLink           = String(row[iLink]  || '').trim();
    const link              = (rawLink && rawLink !== 'N/A') ? rawLink : null;
    const slug              = String(row[iSlug]  || '').trim();
    const languages         = String(row[iLangs] || '').split(',').map(l => l.trim()).filter(Boolean);
    const industries        = splitOutsideParens(String(row[iInds] || '')).filter(x => x && x !== 'Other:');
    const yearsOfExperience = String(row[iYoe]   || '').trim();

    const emails = rawEmail.split('&').map(x => x.trim()).filter(Boolean);
    const names  = rawName.split('&').map(n => n.trim()).filter(Boolean);

    for (let j = 0; j < emails.length; j++) {
      const email   = emails[j];
      const name    = NAME_MAP[email] || names[j] || names[0];
      const podSlug = podSlugByEmail[email] || slug;
      const cap     = capacityByEmail[email] || {};
      attorneys.push({
        name, email, podSlug,
        slug: j === 0 ? slug : slug + '-' + j,
        clientSizes, tags, doNotSend, link, scores,
        languages, industries, yearsOfExperience,
        isPracticeLead: cap.isPracticeLead || false,
        tier:           cap.tier           || '',
        maxLoad:        cap.maxLoad        || 0,
        weightedLoad:   cap.weightedLoad   || 0,
      });
    }
  }
  return attorneys;
}

// ── Read Attorney Capacity tab → email → pod_slug map ─────────────────────

function readPodSlugMap() {
  try {
    const sheet = getSheet('Attorney Capacity');
    const rows  = sheet.getDataRange().getValues();
    if (rows.length < 2) return {};
    const headers  = rows[0].map(h => String(h).trim().toLowerCase());
    const iEmail   = headers.findIndex(h => h.includes('email'));
    const iPodSlug = headers.findIndex(h => h.includes('pod_slug'));
    if (iEmail === -1 || iPodSlug === -1) return {};
    const map = {};
    for (let i = 1; i < rows.length; i++) {
      const rawEmail = String(rows[i][iEmail]   || '').trim();
      const podSlug  = String(rows[i][iPodSlug] || '').trim();
      if (!rawEmail || !podSlug) continue;
      const emails = rawEmail.split('&').map(x => x.trim()).filter(Boolean);
      for (const email of emails) { map[email] = podSlug; }
    }
    return map;
  } catch (_) { return {}; }
}

// ── Read Pod Capacity tab ─────────────────────────────────────────────────

function readPodCapacity() {
  try {
    const podSheet = getSheet('Pod Capacity');
    const podRows  = podSheet.getDataRange().getValues();
    if (podRows.length < 2) return {};

    const headers  = podRows[0].map(h => String(h).trim().toLowerCase());
    const iSlug    = headers.findIndex(h => h.includes('pod_slug'));
    const iName    = headers.findIndex(h => h.includes('pod_name'));
    const iUtil    = headers.findIndex(h => h.includes('utilization'));
    const iLabel   = headers.findIndex(h => h.includes('capacity_label'));
    const iRefresh = headers.findIndex(h => h.includes('last_refreshed'));

    const capacity = {};
    for (let i = 1; i < podRows.length; i++) {
      const slug = String(podRows[i][iSlug] || '').trim();
      if (!slug || !/^[a-z0-9-]+$/.test(slug)) continue;
      const rawUtil = podRows[i][iUtil];
      capacity[slug] = {
        podName:              String(podRows[i][iName]    || '').trim(),
        utilization:          typeof rawUtil === 'number' ? rawUtil : parseFloat(rawUtil) || 0,
        label:                String(podRows[i][iLabel]   || '').trim(),
        lastRefreshed:        iRefresh !== -1 ? String(podRows[i][iRefresh] || '').trim() : '',
        productionAttorneys:  [],
      };
    }

    // Cross-reference Attorney Capacity tab to get production attorney names per pod
    try {
      const acSheet   = getSheet('Attorney Capacity');
      const acRows    = acSheet.getDataRange().getValues();
      const acHeaders = acRows[0].map(h => String(h).trim().toLowerCase());
      const acIName    = acHeaders.findIndex(h => h === 'name');
      const acIPodSlug = acHeaders.findIndex(h => h.includes('pod_slug'));
      const acILead    = acHeaders.findIndex(h => h.includes('is_practice_lead'));
      if (acIName !== -1 && acIPodSlug !== -1 && acILead !== -1) {
        for (let i = 1; i < acRows.length; i++) {
          const name    = String(acRows[i][acIName]    || '').trim();
          const podSlug = String(acRows[i][acIPodSlug] || '').trim();
          const isLead  = String(acRows[i][acILead]    || '').toUpperCase() === 'TRUE';
          if (!name || !podSlug || isLead) continue;
          if (capacity[podSlug]) capacity[podSlug].productionAttorneys.push(name);
        }
      }
    } catch (_) {}

    return capacity;
  } catch (_) { return {}; }
}

// ── BQ Refresh ────────────────────────────────────────────────────────────
// Queries BQ for active cases grouped by attorney + visa_type.
// Multiplies each visa type count by its weight from the Visa Weights tab.
// Writes the resulting weighted_load to the Attorney Capacity tab.
// The Pod Capacity tab utilization formula then recalculates automatically.
// Called via daily trigger or live from the dashboard via ?action=refreshBQ.

const BQ_PROJECT = 'manifestlaw-prod';

const BQ_SQL =
'WITH roster AS (' +
  "SELECT 'David Santiago' AS attorney, 1 AS sort_order UNION ALL " +
  "SELECT 'Ana Louzada', 2 UNION ALL " +
  "SELECT 'Cheryl Kilborn', 3 UNION ALL " +
  "SELECT 'Mayra Faz', 4 UNION ALL " +
  "SELECT 'Blake Burch', 5 UNION ALL " +
  "SELECT 'Kyle McLaughlin', 6 UNION ALL " +
  "SELECT 'Nadia & Lucia', 7 UNION ALL " +
  "SELECT 'Nandini Nair', 8 UNION ALL " +
  "SELECT 'Arielle Sheinfeld', 9" +
'), ' +
'qualified_cases AS (' +
'SELECT ' +
'  vct.case_id, ' +
"  COALESCE(vp.name, vct.visa_type, 'Unknown') AS visa_type, " +
'  CASE ' +
"    WHEN LOWER(vct.primary_lawyer_name) LIKE '%david%santiago%'    THEN 'David Santiago' " +
"    WHEN LOWER(vct.primary_lawyer_name) LIKE '%ana%louzada%'       THEN 'Ana Louzada' " +
"    WHEN LOWER(vct.primary_lawyer_name) LIKE '%cheryl%kilborn%'    THEN 'Cheryl Kilborn' " +
"    WHEN LOWER(vct.primary_lawyer_name) LIKE '%mayra%faz%'         THEN 'Mayra Faz' " +
"    WHEN LOWER(vct.primary_lawyer_name) LIKE '%blake%burch%'       THEN 'Blake Burch' " +
"    WHEN LOWER(vct.primary_lawyer_name) LIKE '%kyle%mclaughlin%'   THEN 'Kyle McLaughlin' " +
"    WHEN LOWER(vct.primary_lawyer_name) LIKE '%nadia%' " +
"      OR LOWER(vct.primary_lawyer_name) LIKE '%lucia%maxwell%'     THEN 'Nadia & Lucia' " +
"    WHEN LOWER(vct.primary_lawyer_name) LIKE '%nandini%nair%'      THEN 'Nandini Nair' " +
"    WHEN LOWER(vct.primary_lawyer_name) LIKE '%arielle%sheinfeld%' THEN 'Arielle Sheinfeld' " +
'  END AS attorney ' +
'FROM `manifestlaw-prod.analytics_view.view_case_tracker` vct ' +
'LEFT JOIN `manifestlaw-prod.analytics_staging.stg_be_cm_case` cm ' +
'  ON cm.id = vct.case_id ' +
'LEFT JOIN `manifestlaw-prod.analytics_staging.stg_be_visa_product` vp ' +
'  ON vp.id = cm.product_id ' +
'LEFT JOIN `manifestlaw-prod.analytics_staging.stg_be_legal_entity` le ' +
'  ON le.legal_name = vct.legal_entity_name AND le.deleted_at IS NULL ' +
'LEFT JOIN `manifestlaw-prod.analytics_staging.stg_be_corporate_group` cg ' +
'  ON cg.id = le.corporate_group_id ' +
"WHERE LOWER(vct.status) = 'active' " +
'AND (vct.is_non_manifest IS NULL OR vct.is_non_manifest = FALSE) ' +
'AND (' +
"  vct.source_channel = 'b2c' " +
'  OR (' +
"    vct.source_channel = 'b2b' " +
'    AND cg.deleted_at IS NULL AND cg.prospect IS NOT TRUE ' +
"    AND (cg.id IS NULL OR cg.id NOT IN (" +
"      '0ab249ab-790d-4b20-a4d1-1613efed448e','58670a7e-b705-4d7a-aaf8-c1b9091eea4d'," +
"      '462f6fab-4cb8-427f-be89-095a03bfb27f','f459512d-ce60-412d-a84e-2c23342657e8'," +
"      'e98f2c15-0a64-4f79-8d36-88b7cb85851b','e13e8f18-409e-4cc2-b327-5288ef9bf886'," +
"      'd6c5f926-baa6-481c-b5eb-dd57f39e80c6','d2c9297c-3e08-4a87-95d4-38ceb1a9c163'," +
"      '02a600b5-867e-4adf-81f1-f74f698f1db2','e59c367c-b793-4ef2-a2f2-8426585b4e52'," +
"      'aa4c8d68-2227-4c3e-90a6-bdfdf8283f6d','c6c7c39c-9bf7-46b4-9b82-e88241a0c0f1'," +
"      'c9543395-c7bc-42a3-a3c3-95019d0908a1'" +
'    )) ' +
"    AND LOWER(COALESCE(cg.title,'')) NOT LIKE '%dunder mifflin%' " +
"    AND LOWER(COALESCE(cg.title,'')) NOT LIKE '%test corp group%' " +
"    AND LOWER(COALESCE(cg.title,'')) NOT LIKE '%test legal entity%' " +
"    AND LOWER(COALESCE(cg.title,'')) NOT LIKE '%test 11/%' " +
"    AND LOWER(COALESCE(cg.title,'')) NOT LIKE '%test 12/%' " +
"    AND LOWER(COALESCE(cg.title,'')) NOT LIKE '%test 3%' " +
"    AND LOWER(COALESCE(cg.title,'')) NOT LIKE '%seva test%' " +
"    AND LOWER(COALESCE(cg.title,'')) NOT LIKE '%ulad test%' " +
"    AND LOWER(COALESCE(cg.title,'')) NOT LIKE '%ulad-test%' " +
"    AND LOWER(COALESCE(cg.title,'')) NOT LIKE '%kfoury%' " +
'  ) ' +
') ' +
') ' +
'SELECT ' +
'  r.sort_order, ' +
'  qc.attorney, ' +
'  qc.visa_type, ' +
'  COUNT(qc.case_id) AS case_count ' +
'FROM roster r ' +
'JOIN qualified_cases qc ON qc.attorney = r.attorney ' +
'GROUP BY r.sort_order, qc.attorney, qc.visa_type ' +
'ORDER BY r.sort_order ASC, qc.visa_type ASC';

function refreshFromBQ(silent) {
  // 1. Read visa weights from the sheet
  const visaWeights = readVisaWeights();
  if (!Object.keys(visaWeights).length) throw new Error('Visa Weights tab is empty or missing');

  // 2. Submit async BQ job
  const job = BigQuery.Jobs.insert({
    configuration: { query: { query: BQ_SQL, useLegacySql: false } }
  }, BQ_PROJECT);
  const jobId = job.jobReference.jobId;

  // 3. Poll until done (max 2 min)
  let status, attempts = 0;
  do {
    Utilities.sleep(3000);
    status = BigQuery.Jobs.get(BQ_PROJECT, jobId).status;
    attempts++;
  } while (status.state !== 'DONE' && attempts < 40);

  if (status.errorResult) throw new Error('BQ error: ' + status.errorResult.message);

  // 4. Collect all result pages
  // Columns: sort_order(0), attorney(1), visa_type(2), case_count(3)
  const allRows = [];
  let pageToken;
  do {
    const page = BigQuery.Jobs.getQueryResults(BQ_PROJECT, jobId, {
      maxResults: 1000, pageToken: pageToken,
    });
    (page.rows || []).forEach(r => allRows.push(r.f.map(c => c.v)));
    pageToken = page.pageToken;
  } while (pageToken);

  // 5. Calculate weighted_load per attorney
  // weighted_load = SUM(case_count × visa_weight) across all visa types
  const weightedLoads = {};
  const unmappedVisas = new Set();

  for (const row of allRows) {
    const attorney = String(row[1] || '').trim();
    const rawVisa  = String(row[2] || '').trim();
    const count    = parseInt(row[3] || '0', 10) || 0;
    if (!attorney || !count) continue;

    const canonicalVisa = normalizeBQVisa(rawVisa);
    const weight        = visaWeights[canonicalVisa];

    if (weight === undefined) {
      unmappedVisas.add(rawVisa);
    }

    // Unknown visa type → default weight of 2 so it still contributes
    const effectiveWeight = (weight !== undefined) ? weight : 2;
    weightedLoads[attorney] = (weightedLoads[attorney] || 0) + (count * effectiveWeight);
  }

  if (unmappedVisas.size) {
    Logger.log('Unmapped visa types (used default weight 2): ' + Array.from(unmappedVisas).join(', '));
  }

  // 6. Split Nadia & Lucia total evenly across both attorneys
  const nadiaLuciaTotal = weightedLoads['Nadia & Lucia'] || 0;
  delete weightedLoads['Nadia & Lucia'];
  weightedLoads['Nadia Zaidi']   = Math.ceil(nadiaLuciaTotal  / 2);
  weightedLoads['Lucia Maxwell'] = Math.floor(nadiaLuciaTotal / 2);

  // 7. Write weighted_load to Attorney Capacity tab
  const acSheet = getSheet('Attorney Capacity');
  const acData  = acSheet.getDataRange().getValues();
  const headers = acData[0].map(h => String(h).trim().toLowerCase());
  const iName   = headers.findIndex(h => h === 'name');
  const iLoad   = headers.findIndex(h => h.includes('weighted_load'));
  if (iName === -1 || iLoad === -1) throw new Error('Attorney Capacity missing name or weighted_load column');

  let updated = 0;
  for (let i = 1; i < acData.length; i++) {
    const sheetName = String(acData[i][iName] || '').trim();
    if (!sheetName) continue;
    for (const [bqName, load] of Object.entries(weightedLoads)) {
      if (namesMatch(bqName, sheetName)) {
        acSheet.getRange(i + 1, iLoad + 1).setValue(load);
        updated++;
        break;
      }
    }
  }

  // Pod Capacity utilization recalculates automatically via sheet formula.
  _stampPodRefreshTime();

  const msg = 'BQ refresh done: ' + updated + ' attorney rows updated.' +
    (unmappedVisas.size ? ' Unmapped visas (default weight 2): ' + Array.from(unmappedVisas).join(', ') : '');
  Logger.log(msg);
  if (!silent) SpreadsheetApp.getUi().alert(msg);
  return { success: true, updated, message: msg };
}

// Fuzzy name match — handles minor spelling variants
function namesMatch(a, b) {
  const norm = s => s.toLowerCase().replace(/[^a-z]/g, '');
  const na = norm(a), nb = norm(b);
  return na === nb || na.startsWith(nb) || nb.startsWith(na);
}

function _stampPodRefreshTime() {
  try {
    const sheet   = getSheet('Pod Capacity');
    const rows    = sheet.getDataRange().getValues();
    const headers = rows[0].map(h => String(h).trim().toLowerCase());
    const iRefresh = headers.findIndex(h => h.includes('last_refreshed'));
    if (iRefresh === -1) return;
    const now = new Date().toISOString();
    for (let i = 1; i < rows.length; i++) {
      if (rows[i][0]) sheet.getRange(i + 1, iRefresh + 1).setValue(now);
    }
  } catch (_) {}
}

// Run ONCE from the editor to install a daily 6 AM BQ refresh trigger.
function createBQRefreshTrigger() {
  ScriptApp.getProjectTriggers()
    .filter(t => t.getHandlerFunction() === 'refreshFromBQ')
    .forEach(t => ScriptApp.deleteTrigger(t));

  ScriptApp.newTrigger('refreshFromBQ')
    .timeBased()
    .everyDays(1)
    .atHour(6)
    .create();
  SpreadsheetApp.getUi().alert('Daily 6 AM refresh trigger installed.');
}

// ── Calendar Availability Check ──────────────────────────────────────────
// Called via ?action=checkAvailability&emails=a@b.com,c@d.com&slots=iso1,iso2
// Returns: { email: { accessible: bool, slots: { iso: bool }, nextAvailable: iso|null } }

function checkAvailability(params) {
  params = params || {};
  var emails = (params.emails || '').split(',').map(function(e){ return e.trim(); }).filter(Boolean);
  var slots  = (params.slots  || '').split(',').map(function(s){ return s.trim(); }).filter(Boolean);
  if (!emails.length || !slots.length) return {};

  var SLOT_MS = 30 * 60 * 1000;
  var result  = {};

  for (var ei = 0; ei < emails.length; ei++) {
    var email = emails[ei];
    var entry = { accessible: true, slots: {}, nextAvailable: null };
    try {
      var cal = CalendarApp.getCalendarById(email);
      if (!cal) { entry.accessible = false; result[email] = entry; continue; }

      var allBusy = true;
      for (var si = 0; si < slots.length; si++) {
        var iso    = slots[si];
        var start  = new Date(iso);
        var end    = new Date(start.getTime() + SLOT_MS);
        var events = cal.getEvents(start, end);
        var free   = events.length === 0;
        entry.slots[iso] = free;
        if (free) allBusy = false;
      }

      if (allBusy) {
        var slotDates = slots.map(function(s){ return new Date(s); }).sort(function(a,b){ return a-b; });
        entry.nextAvailable = findNextAvailable(cal, slotDates[0]);
      }
    } catch(err) {
      entry.accessible = false;
      entry.error = err.message;
    }
    result[email] = entry;
  }
  return result;
}

function findNextAvailable(cal, startFrom) {
  var SLOT_MS  = 30 * 60 * 1000;
  var MAX_ITER = 600; // ~12.5 days of 30-min slots
  var current  = new Date(startFrom.getTime() + SLOT_MS);

  for (var i = 0; i < MAX_ITER; i++) {
    var estHour = parseInt(Utilities.formatDate(current, 'America/New_York', 'H'), 10);
    var estMin  = parseInt(Utilities.formatDate(current, 'America/New_York', 'm'), 10);
    var dayStr  = Utilities.formatDate(current, 'America/New_York', 'yyyy-MM-dd');

    if (estHour < 11) {
      current = _makeETTime(dayStr, 11, 0);
      continue;
    }
    if (estHour >= 17) {
      var p = dayStr.split('-').map(Number);
      var nextDay = new Date(Date.UTC(p[0], p[1]-1, p[2]+1));
      var nextStr = Utilities.formatDate(nextDay, 'America/New_York', 'yyyy-MM-dd');
      current = _makeETTime(nextStr, 11, 0);
      continue;
    }
    if (estMin !== 0 && estMin !== 30) {
      var alignMin = estMin < 30 ? 30 : 0;
      var alignHr  = estMin < 30 ? estHour : estHour + 1;
      if (alignHr >= 17) {
        var p2 = dayStr.split('-').map(Number);
        var nd = new Date(Date.UTC(p2[0], p2[1]-1, p2[2]+1));
        current = _makeETTime(Utilities.formatDate(nd, 'America/New_York', 'yyyy-MM-dd'), 11, 0);
      } else {
        current = _makeETTime(dayStr, alignHr, alignMin);
      }
      continue;
    }
    var end    = new Date(current.getTime() + SLOT_MS);
    var events = cal.getEvents(current, end);
    if (events.length === 0) return current.toISOString();
    current = new Date(current.getTime() + SLOT_MS);
  }
  return null;
}

function _makeETTime(etDateStr, hour, minute) {
  var p = etDateStr.split('-').map(Number);
  var tryEDT  = new Date(Date.UTC(p[0], p[1]-1, p[2], hour + 4, minute));
  var checkH  = parseInt(Utilities.formatDate(tryEDT, 'America/New_York', 'H'), 10);
  if (checkH === hour) return tryEDT;
  return new Date(Date.UTC(p[0], p[1]-1, p[2], hour + 5, minute));
}

// ── Calendar Access Test ──────────────────────────────────────────────────
// Run this function once from the Apps Script editor to verify calendar access.
// Open View → Logs after running to see results.

function testCalendarAccess() {
  const emails = [
    'm.dillinger@manifestlaw.com',
    'n.nair@manifestlaw.com',
    'a.sheinfeld@manifestlaw.com',
    'k.mclaughlin@manifestlaw.com',
    'n.zaidi@manifestlaw.com',
    'l.maxwell@manifestlaw.com',
  ];

  const now  = new Date();
  const end  = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  emails.forEach(email => {
    try {
      const cal = CalendarApp.getCalendarById(email);
      if (!cal) {
        Logger.log('FAIL – calendar not found: ' + email);
        return;
      }
      const events = cal.getEvents(now, end);
      Logger.log('OK – ' + email + ' | events next 7 days: ' + events.length);
    } catch (err) {
      Logger.log('ERROR – ' + email + ': ' + err.message);
    }
  });
}

// ── POST: append to Assignment Log ────────────────────────────────────────

function doPost(e) {
  try {
    const body     = JSON.parse(e.postData.contents);
    const logSheet = getSheet('Assignment Log');

    if (logSheet.getLastRow() === 0) {
      logSheet.appendRow([
        'timestamp','ae_name','company','client_size',
        'visa_types','recommended_pod','booked','notes',
      ]);
    }

    logSheet.appendRow([
      new Date().toISOString(),
      body.ae_name        || '',
      body.company        || '',
      body.client_size    || '',
      Array.isArray(body.visa_types) ? body.visa_types.join(', ') : (body.visa_types || ''),
      body.recommended_pod || '',
      body.booked ? 'TRUE' : 'FALSE',
      body.notes          || '',
    ]);

    return ContentService.createTextOutput(JSON.stringify({ success: true }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ error: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
