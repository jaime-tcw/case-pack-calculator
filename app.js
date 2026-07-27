const SKUS = [
  { sku: "TCW9074", style: "Caribbean Sea", contents: "Chartreuse, Lime Green, Ocean Blue, Turquoise", defaultNeed: 95, defaultPriority: 1 },
  { sku: "TCW9075", style: "Mardi Gras", contents: "Fuchsia, Orchid, Champagne, Marigold", defaultNeed: 62, defaultPriority: 2 },
  { sku: "TCW9076", style: "Holiday", contents: "Crimson, Terre Verte, Champagne Gold, Pearl White", defaultNeed: 0, defaultPriority: 3 },
  { sku: "TCW9115", style: "Blooms", contents: "Hydrangea, Watermelon, Pink Lemonade, Summer Sky", defaultNeed: 57, defaultPriority: 2 },
  { sku: "TCW9118", style: "Formal", contents: "Pearl White, Copper, Black, Platinum", defaultNeed: 32, defaultPriority: 3 },
  { sku: "TCW9119", style: "Celebration", contents: "Platinum, Pearl White, Black, Champagne Gold", defaultNeed: 96, defaultPriority: 1 },
  { sku: "TCW9134", style: "Coastal", contents: "Oyster, Beach Grass, Ocean Mist, Dune", defaultNeed: 213, defaultPriority: 1 },
  { sku: "TCW9135", style: "Beach House", contents: "Seashell, Driftwood, Sea Glass, Stormy", defaultNeed: 0, defaultPriority: 3 },
  { sku: "TCW9151", style: "Petals and Herbs", contents: "Blush, Rose, Sage, Olive", defaultNeed: 100, defaultPriority: 2 },
  { sku: "TCW9157", style: "Blueberry Meadow", contents: "Navy, Cornflower Blue, Violet, Orchid", defaultNeed: 55, defaultPriority: 2 },
  { sku: "TCW9204", style: "Masquerade", contents: "Orchid, Lime Green, Fuchsia, Champagne Gold", defaultNeed: 60, defaultPriority: 2 },
  { sku: "TCW9216", style: "Cottage Garden", contents: "Dusty Pink, Dusty Blue, Pistachio, Mulberry", defaultNeed: 0, defaultPriority: 3 },
];

const $ = (sel) => document.querySelector(sel);
const body = $("#skuBody");

function buildRows() {
  body.innerHTML = "";
  SKUS.forEach((item, i) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${item.sku}<br><span class="style-name hide-mobile">${item.style}</span></td>
      <td class="hide-mobile"><span class="style-name">${item.contents}</span></td>
      <td><input type="number" min="0" value="${item.defaultNeed}" data-field="need" data-idx="${i}"></td>
      <td><input type="number" min="0" value="0" data-field="perCase" data-idx="${i}"></td>
      <td class="total-shipped" data-idx="${i}">0</td>
      <td class="diff" data-idx="${i}">0</td>
      <td>
        <select data-field="priority" data-idx="${i}">
          <option value="1"${item.defaultPriority === 1 ? " selected" : ""}>1-High</option>
          <option value="2"${item.defaultPriority === 2 ? " selected" : ""}>2-Norm</option>
          <option value="3"${item.defaultPriority === 3 ? " selected" : ""}>3-Low</option>
        </select>
      </td>
    `;
    body.appendChild(tr);
  });
}

function getValues() {
  return SKUS.map((item, i) => {
    const need = parseInt(body.querySelector(`input[data-field="need"][data-idx="${i}"]`).value) || 0;
    const priority = parseInt(body.querySelector(`select[data-field="priority"][data-idx="${i}"]`).value);
    const perCase = parseInt(body.querySelector(`input[data-field="perCase"][data-idx="${i}"]`).value) || 0;
    return { ...item, need, priority, perCase };
  });
}

function recalc() {
  const unitsPerCase = parseInt($("#unitsPerCase").value) || 27;
  const caseMultiple = parseInt($("#caseMultiple").value) || 5;
  const numCases = parseInt($("#numCases").value) || 0;
  const values = getValues();

  const totalNeed = values.reduce((s, v) => s + v.need, 0);
  const suggestedCases = caseMultiple > 0 ? Math.ceil((totalNeed / unitsPerCase) / caseMultiple) * caseMultiple : 0;
  const totalShipping = numCases * unitsPerCase;
  const perCaseSum = values.reduce((s, v) => s + v.perCase, 0);

  $("#suggestedCases").textContent = suggestedCases;
  $("#totalShipping").textContent = totalShipping;

  const checkEl = $("#perCaseCheck");
  if (perCaseSum === unitsPerCase) {
    checkEl.textContent = `✓ ${perCaseSum}`;
    checkEl.className = "stat-value valid";
  } else {
    checkEl.textContent = `✗ ${perCaseSum}/${unitsPerCase}`;
    checkEl.className = "stat-value invalid";
  }

  let footNeed = 0, footPerCase = 0, footTotal = 0, footDiff = 0;

  values.forEach((v, i) => {
    const totalShipped = v.perCase * numCases;
    const diff = totalShipped - v.need;

    body.querySelector(`.total-shipped[data-idx="${i}"]`).textContent = totalShipped;

    const diffEl = body.querySelector(`.diff[data-idx="${i}"]`);
    diffEl.textContent = diff > 0 ? `+${diff}` : diff;
    diffEl.className = `diff${diff > 0 ? " diff-pos" : diff < 0 ? " diff-neg" : " diff-zero"}`;

    footNeed += v.need;
    footPerCase += v.perCase;
    footTotal += totalShipped;
    footDiff += diff;
  });

  $("#footNeed").textContent = footNeed;
  $("#footPerCase").textContent = footPerCase;
  $("#footTotal").textContent = footTotal;
  $("#footDiff").textContent = footDiff > 0 ? `+${footDiff}` : footDiff;
}

function autoDistribute() {
  const unitsPerCase = parseInt($("#unitsPerCase").value) || 27;
  const caseMultiple = parseInt($("#caseMultiple").value) || 5;
  const values = getValues();

  const totalNeed = values.reduce((s, v) => s + v.need, 0);
  if (totalNeed === 0) return;

  // Calculate suggested cases and update
  const suggestedCases = caseMultiple > 0 ? Math.ceil((totalNeed / unitsPerCase) / caseMultiple) * caseMultiple : 0;
  $("#numCases").value = suggestedCases;
  const numCases = suggestedCases;
  const totalUnits = numCases * unitsPerCase;

  // Calculate ideal per-case for each SKU
  const active = values.map((v, i) => ({
    idx: i,
    need: v.need,
    priority: v.priority,
    idealPerCase: numCases > 0 ? (v.need / totalNeed) * unitsPerCase : 0,
    perCase: 0,
  })).filter((v) => v.need > 0);

  // Start with floor values
  active.forEach((v) => { v.perCase = Math.floor(v.idealPerCase); });

  let currentSum = active.reduce((s, v) => s + v.perCase, 0);
  let remaining = unitsPerCase - currentSum;

  // Distribute remaining units, prioritizing by: priority (1 first), then largest fractional remainder
  const ranked = [...active].sort((a, b) => {
    if (a.priority !== b.priority) return a.priority - b.priority;
    const fracA = a.idealPerCase - Math.floor(a.idealPerCase);
    const fracB = b.idealPerCase - Math.floor(b.idealPerCase);
    return fracB - fracA;
  });

  for (let j = 0; j < ranked.length && remaining > 0; j++) {
    ranked[j].perCase++;
    remaining--;
  }

  // Apply to inputs
  SKUS.forEach((_, i) => {
    const match = active.find((a) => a.idx === i);
    body.querySelector(`input[data-field="perCase"][data-idx="${i}"]`).value = match ? match.perCase : 0;
  });

  recalc();
}

function clearNeeds() {
  SKUS.forEach((_, i) => {
    body.querySelector(`input[data-field="need"][data-idx="${i}"]`).value = 0;
    body.querySelector(`input[data-field="perCase"][data-idx="${i}"]`).value = 0;
  });
  recalc();
}

function resetAll() {
  SKUS.forEach((item, i) => {
    body.querySelector(`input[data-field="need"][data-idx="${i}"]`).value = item.defaultNeed;
    body.querySelector(`select[data-field="priority"][data-idx="${i}"]`).value = item.defaultPriority;
    body.querySelector(`input[data-field="perCase"][data-idx="${i}"]`).value = 0;
  });
  $("#unitsPerCase").value = 27;
  $("#caseMultiple").value = 5;
  $("#numCases").value = 30;
  recalc();
}

// Event listeners
document.addEventListener("input", (e) => {
  if (e.target.matches("input, select")) recalc();
});

$("#autoDistribute").addEventListener("click", autoDistribute);
$("#clearNeeds").addEventListener("click", clearNeeds);
$("#createPdf").addEventListener("click", createPdf);

function createPdf() {
  const unitsPerCase = parseInt($("#unitsPerCase").value) || 27;
  const numCases = parseInt($("#numCases").value) || 0;
  const values = getValues();
  const totalNeed = values.reduce((s, v) => s + v.need, 0);
  const totalShipping = numCases * unitsPerCase;

  const today = new Date();
  const dateStr = today.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

  const activeRows = values.filter(v => v.need > 0 || v.perCase > 0);

  let tableRows = activeRows.map(v => {
    const total = v.perCase * numCases;
    const item = SKUS[values.indexOf(v)];
    return `<tr>
      <td style="padding:6px 10px;border:1px solid #ccc;font-weight:600">${v.sku}</td>
      <td style="padding:6px 10px;border:1px solid #ccc;font-size:12px">${item.contents}</td>
      <td style="padding:6px 10px;border:1px solid #ccc;text-align:center">${v.need}</td>
      <td style="padding:6px 10px;border:1px solid #ccc;text-align:center">${v.perCase}</td>
      <td style="padding:6px 10px;border:1px solid #ccc;text-align:center">${total}</td>
    </tr>`;
  }).join("");

  const totalPerCase = activeRows.reduce((s, v) => s + v.perCase, 0);
  const totalShipped = activeRows.reduce((s, v) => s + v.perCase * numCases, 0);

  const html = `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>Amazon 4-Pack Shipment ${dateStr}</title>
<style>
  @page { size: letter; margin: 0.75in; }
  body { font-family: Arial, Helvetica, sans-serif; color: #111; margin: 0; padding: 40px; }
  h1 { font-size: 22px; margin: 0 0 24px 0; text-align: center; }
  .stats { display: flex; gap: 40px; margin-bottom: 20px; }
  .stat { font-size: 14px; }
  .stat strong { font-size: 16px; }
  table { width: 100%; border-collapse: collapse; margin-top: 12px; }
  th { padding: 8px 10px; border: 1px solid #999; background: #f0f0f0; font-size: 12px; text-transform: uppercase; text-align: center; }
  th:first-child, th:nth-child(2) { text-align: left; }
  td { font-size: 13px; }
  tfoot td { font-weight: 700; background: #f0f0f0; border: 1px solid #999; padding: 8px 10px; }
</style></head><body>
<h1>Amazon 4-Pack Shipment ${dateStr}</h1>
<div class="stats">
  <div class="stat">Units Per Case: <strong>${unitsPerCase}</strong></div>
  <div class="stat">Number of Cases: <strong>${numCases}</strong></div>
  <div class="stat">Total Shipping: <strong>${totalShipping}</strong></div>
</div>
<table>
  <thead><tr>
    <th style="text-align:left">SKU</th>
    <th style="text-align:left">Contents</th>
    <th>Need</th>
    <th>Per Case</th>
    <th>Total</th>
  </tr></thead>
  <tbody>${tableRows}</tbody>
  <tfoot><tr>
    <td style="text-align:left;border:1px solid #999">TOTAL</td>
    <td style="border:1px solid #999"></td>
    <td style="text-align:center;border:1px solid #999">${totalNeed}</td>
    <td style="text-align:center;border:1px solid #999">${totalPerCase}</td>
    <td style="text-align:center;border:1px solid #999">${totalShipped}</td>
  </tr></tfoot>
</table>
<script>window.onload = function() { window.print(); }</script>
</body></html>`;

  const win = window.open("", "_blank");
  win.document.write(html);
  win.document.close();
}

// Initialize
buildRows();
autoDistribute();
