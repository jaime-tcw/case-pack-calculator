const SKUS = [
  { sku: "TCW9074", style: "Caribbean Sea", defaultNeed: 95, defaultPriority: 1 },
  { sku: "TCW9075", style: "Mardi Gras", defaultNeed: 62, defaultPriority: 2 },
  { sku: "TCW9076", style: "Holiday", defaultNeed: 0, defaultPriority: 3 },
  { sku: "TCW9115", style: "Blooms", defaultNeed: 57, defaultPriority: 2 },
  { sku: "TCW9118", style: "Formal", defaultNeed: 32, defaultPriority: 3 },
  { sku: "TCW9119", style: "Celebration", defaultNeed: 96, defaultPriority: 1 },
  { sku: "TCW9134", style: "Coastal", defaultNeed: 213, defaultPriority: 1 },
  { sku: "TCW9135", style: "Beach House", defaultNeed: 0, defaultPriority: 3 },
  { sku: "TCW9151", style: "Petals and Herbs", defaultNeed: 100, defaultPriority: 2 },
  { sku: "TCW9157", style: "Blueberry Meadow", defaultNeed: 55, defaultPriority: 2 },
  { sku: "TCW9204", style: "Masquerade", defaultNeed: 60, defaultPriority: 2 },
];

const $ = (sel) => document.querySelector(sel);
const body = $("#skuBody");

function buildRows() {
  body.innerHTML = "";
  SKUS.forEach((item, i) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${item.sku}<br><span class="style-name hide-mobile">${item.style}</span></td>
      <td class="hide-mobile"><span class="style-name">${item.style}</span></td>
      <td><input type="number" min="0" value="${item.defaultNeed}" data-field="need" data-idx="${i}"></td>
      <td>
        <select data-field="priority" data-idx="${i}">
          <option value="1"${item.defaultPriority === 1 ? " selected" : ""}>1-High</option>
          <option value="2"${item.defaultPriority === 2 ? " selected" : ""}>2-Norm</option>
          <option value="3"${item.defaultPriority === 3 ? " selected" : ""}>3-Low</option>
        </select>
      </td>
      <td class="pct" data-idx="${i}">—</td>
      <td><input type="number" min="0" value="0" data-field="perCase" data-idx="${i}"></td>
      <td class="total-shipped" data-idx="${i}">0</td>
      <td class="diff" data-idx="${i}">0</td>
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

  $("#totalNeed").textContent = totalNeed;
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
    const pct = totalNeed > 0 ? (v.need / totalNeed) : 0;
    const totalShipped = v.perCase * numCases;
    const diff = totalShipped - v.need;

    body.querySelector(`.pct[data-idx="${i}"]`).textContent = totalNeed > 0 ? (pct * 100).toFixed(1) + "%" : "—";
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
  $("#footPct").textContent = "100%";
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
$("#resetAll").addEventListener("click", resetAll);

// Initialize
buildRows();
autoDistribute();
