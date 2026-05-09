const standardVolumes = [0, 1.5, 3, 5, 7.5, 10, 12.5, 15];
const waters = [
  { id: "water1", lp: "2", name: "Woda mineralna I" },
  { id: "water2", lp: "3", name: "Woda mineralna II" },
];

const qs = (selector, root = document) => root.querySelector(selector);
const qsa = (selector, root = document) => Array.from(root.querySelectorAll(selector));

function parseNumber(value) {
  if (typeof value !== "string") return Number.NaN;
  const normalized = value.trim().replace(/\s/g, "").replace(/,/g, ".");
  if (!normalized) return Number.NaN;
  return Number(normalized);
}

function formatNumber(value, digits = 3) {
  if (!Number.isFinite(value)) return "-";
  const rounded = Number(value.toFixed(digits));
  return String(rounded).replace(".", ",");
}

function formatInputValue(value) {
  return String(value).replace(".", ",");
}

function saveStoredInput(input) {
  const key = input.dataset.store;
  if (!key) return;
  const value = input.type === "checkbox" ? String(input.checked) : input.value;
  localStorage.setItem(`ezs-calc:${key}`, value);
}

function restoreStoredInputs() {
  qsa("[data-store]").forEach((input) => {
    if (input.type === "checkbox") return;
    const key = `ezs-calc:${input.dataset.store}`;
    const stored = localStorage.getItem(key);
    if (stored !== null) input.value = stored;
  });
}

function createInput(id, storeKey) {
  const input = document.createElement("input");
  input.id = id;
  input.type = "text";
  input.inputMode = "decimal";
  input.dataset.store = storeKey;
  return input;
}

function createComputedCell(id) {
  const td = document.createElement("td");
  td.id = id;
  td.className = "computed";
  td.textContent = "-";
  return td;
}

function setInvalid(selector, invalid) {
  const element = qs(selector);
  if (element) element.classList.toggle("invalid-input", invalid);
}

function renderExercise3Table() {
  const body = qs("#standardsBody");
  standardVolumes.forEach((volume, index) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${index + 1}</td>
      <td>${index === 0 ? "Wzorcowe - ślepa próba" : "Wzorcowe"}</td>
      <td>${index + 1}</td>
      <td>${formatInputValue(volume)}</td>
      <td></td>
      <td class="computed" id="standardConcentration${index}">-</td>
      <td class="check-cell"></td>
    `;
    const absorbanceCell = tr.children[4];
    absorbanceCell.appendChild(createInput(`standardAbsorbance${index}`, `standardAbsorbance${index}`));

    const checkbox = document.createElement("input");
    checkbox.id = `standardIncluded${index}`;
    checkbox.type = "checkbox";
    checkbox.checked = true;
    checkbox.dataset.store = `standardIncluded${index}`;
    tr.children[6].appendChild(checkbox);
    body.appendChild(tr);
  });
}

function renderExercise4Tables() {
  renderHardnessRows();
  renderIonRows("calciumBody", "calcium", "CCa");
  renderIonRows("magnesiumBody", "magnesium", "CMg");
  renderLabelRows();
}

function renderHardnessRows() {
  const body = qs("#hardnessBody");
  waters.forEach((water) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td>${water.lp}</td><td>${water.name}</td><td></td><td></td>`;
    tr.children[2].appendChild(createInput(`${water.id}-hardness-1`, `${water.id}-hardness-1`));
    tr.children[3].appendChild(createInput(`${water.id}-hardness-2`, `${water.id}-hardness-2`));
    tr.appendChild(createComputedCell(`${water.id}-hardness-avg`));
    tr.appendChild(createComputedCell(`${water.id}-hardness-mmol`));
    tr.appendChild(createComputedCell(`${water.id}-hardness-caco3`));
    tr.appendChild(createComputedCell(`${water.id}-hardness-german`));
    body.appendChild(tr);
  });
}

function renderIonRows(bodyId, prefix, resultPrefix) {
  const body = qs(`#${bodyId}`);
  waters.forEach((water) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td>${water.lp}</td><td>${water.name}</td><td></td><td></td>`;
    tr.children[2].appendChild(createInput(`${water.id}-${prefix}-1`, `${water.id}-${prefix}-1`));
    tr.children[3].appendChild(createInput(`${water.id}-${prefix}-2`, `${water.id}-${prefix}-2`));
    tr.appendChild(createComputedCell(`${water.id}-${prefix}-avg`));
    tr.appendChild(createComputedCell(`${water.id}-${resultPrefix}`));
    body.appendChild(tr);
  });
}

function renderLabelRows() {
  const body = qs("#labelValuesBody");
  waters.forEach((water) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td>${water.name}</td><td></td><td></td>`;
    tr.children[1].appendChild(createInput(`${water.id}-label-ca`, `${water.id}-label-ca`));
    tr.children[2].appendChild(createInput(`${water.id}-label-mg`, `${water.id}-label-mg`));
    tr.appendChild(createComputedCell(`${water.id}-label-hardness`));
    tr.appendChild(createComputedCell(`${water.id}-label-diff`));
    body.appendChild(tr);
  });
}

function getExercise3Data() {
  const x = parseNumber(qs("#no2StandardX").value);
  const flaskVolume = parseNumber(qs("#no2FlaskV").value);
  const sampleVolume = parseNumber(qs("#no2SampleVolume").value);
  const dilutionFactor = Number.isFinite(sampleVolume) && sampleVolume > 0 ? (flaskVolume * 1000) / sampleVolume : Number.NaN;

  const standards = standardVolumes.map((volume, index) => {
    const concentration = Number.isFinite(x) && Number.isFinite(flaskVolume) && flaskVolume > 0 ? (volume * x) / flaskVolume : Number.NaN;
    const absorbance = parseNumber(qs(`#standardAbsorbance${index}`).value);
    const included = qs(`#standardIncluded${index}`).checked;
    return { index, volume, concentration, absorbance, included };
  });

  const sampleAbsorbance = parseNumber(qs("#sampleAbsorbance").value);
  return { x, flaskVolume, sampleVolume, dilutionFactor, standards, sampleAbsorbance };
}

function linearRegression(points) {
  if (points.length < 2) return null;
  const n = points.length;
  const sumX = points.reduce((sum, p) => sum + p.x, 0);
  const sumY = points.reduce((sum, p) => sum + p.y, 0);
  const sumXY = points.reduce((sum, p) => sum + p.x * p.y, 0);
  const sumX2 = points.reduce((sum, p) => sum + p.x * p.x, 0);
  const denominator = n * sumX2 - sumX * sumX;
  if (Math.abs(denominator) < 1e-12) return null;
  const slope = (n * sumXY - sumX * sumY) / denominator;
  const intercept = (sumY - slope * sumX) / n;
  const meanY = sumY / n;
  const ssTot = points.reduce((sum, p) => sum + Math.pow(p.y - meanY, 2), 0);
  const ssRes = points.reduce((sum, p) => sum + Math.pow(p.y - (slope * p.x + intercept), 2), 0);
  const r2 = ssTot === 0 ? 1 : 1 - ssRes / ssTot;
  return { slope, intercept, r2 };
}

function calculateExercise3() {
  const data = getExercise3Data();
  markExercise3Inputs(data);
  data.standards.forEach((row) => {
    qs(`#standardConcentration${row.index}`).textContent = formatNumber(row.concentration, 4);
  });

  const regressionPoints = data.standards
    .filter((row) => row.included && Number.isFinite(row.concentration) && Number.isFinite(row.absorbance))
    .map((row) => ({ x: row.concentration, y: row.absorbance }));
  const regression = linearRegression(regressionPoints);

  let sampleCurve = Number.NaN;
  if (regression && Math.abs(regression.slope) > 1e-12 && Number.isFinite(data.sampleAbsorbance)) {
    sampleCurve = (data.sampleAbsorbance - regression.intercept) / regression.slope;
  }
  const sampleDiluted = Number.isFinite(sampleCurve) && Number.isFinite(data.dilutionFactor) ? sampleCurve * data.dilutionFactor : Number.NaN;
  const validation = validateExercise3(data, regressionPoints, sampleCurve, sampleDiluted);

  qs("#sampleCurveConcentration").textContent = formatNumber(sampleCurve, 4);
  qs("#sampleDilutedConcentration").textContent = formatNumber(sampleDiluted, 4);
  renderExercise3Calculations(data, regression, sampleCurve, sampleDiluted, validation);
  renderExercise3Interpretation(sampleDiluted, validation);
  drawChart(data, regression, sampleCurve);
}

function markExercise3Inputs(data) {
  setInvalid("#no2StandardX", Number.isFinite(data.x) && data.x < 0);
  setInvalid("#no2FlaskV", Number.isFinite(data.flaskVolume) && data.flaskVolume <= 0);
  setInvalid("#no2SampleVolume", Number.isFinite(data.sampleVolume) && data.sampleVolume <= 0);
  setInvalid("#sampleAbsorbance", Number.isFinite(data.sampleAbsorbance) && data.sampleAbsorbance < 0);
  data.standards.forEach((row) => {
    setInvalid(`#standardAbsorbance${row.index}`, Number.isFinite(row.absorbance) && row.absorbance < 0);
  });
}

function validateExercise3(data, regressionPoints, sampleCurve, sampleDiluted) {
  const warnings = [];
  if (Number.isFinite(data.x) && data.x < 0) warnings.push("Stężenie roztworu wzorcowego x nie może być ujemne.");
  if (Number.isFinite(data.flaskVolume) && data.flaskVolume <= 0) warnings.push("Objętość kolby V musi być większa od zera.");
  if (Number.isFinite(data.sampleVolume) && data.sampleVolume <= 0) warnings.push("Objętość próby P1 musi być większa od zera.");
  data.standards.forEach((row) => {
    if (Number.isFinite(row.absorbance) && row.absorbance < 0) {
      warnings.push(`Wzorzec ${row.index + 1}: absorbancja nie powinna być ujemna.`);
    }
  });
  if (Number.isFinite(data.sampleAbsorbance) && data.sampleAbsorbance < 0) warnings.push("Absorbancja próby P1 nie powinna być ujemna.");
  if (regressionPoints.length > 0 && regressionPoints.length < 2) {
    warnings.push("Do wyznaczenia krzywej wzorcowej potrzeba co najmniej dwóch punktów.");
  } else if (regressionPoints.length >= 2 && regressionPoints.length < standardVolumes.length) {
    warnings.push("Do sprawozdania zaleca się użycie pełnej serii wzorców; wynik z mniejszej liczby punktów wymaga ostrożności.");
  }
  const xs = regressionPoints.map((point) => point.x);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const outOfRange = Number.isFinite(sampleCurve) && xs.length >= 2 && (sampleCurve < minX || sampleCurve > maxX);
  const negativeResult = (Number.isFinite(sampleCurve) && sampleCurve < 0) || (Number.isFinite(sampleDiluted) && sampleDiluted < 0);
  if (outOfRange) warnings.push("Wynik P1 znajduje się poza zakresem krzywej wzorcowej. To ekstrapolacja, więc wynik trzeba traktować ostrożnie.");
  if (negativeResult) warnings.push("Wynik ujemny nie jest rzeczywistym stężeniem. Sprawdź ślepą próbę, absorbancję P1 i dane wzorcowe.");
  return { warnings, outOfRange, negativeResult };
}

function renderWarnings(warnings) {
  if (!warnings.length) return "";
  return warnings.map((warning) => `<div class="calc-item warning">${warning}</div>`).join("");
}

function renderExercise3Calculations(data, regression, sampleCurve, sampleDiluted, validation) {
  const container = qs("#exercise3Calculations");
  const firstRows = data.standards.map((row) => `
    <div class="calc-item">
      Wzorzec ${row.index + 1}${row.index === 0 ? " - ślepa próba" : ""}: a = ${formatInputValue(row.volume)} cm³.
      <span class="formula">cNO₂⁻ = a * x / V = ${formatInputValue(row.volume)} * ${formatNumber(data.x, 6)} / ${formatNumber(data.flaskVolume, 3)} = ${formatNumber(row.concentration, 4)} mg/dm³</span>
    </div>
  `).join("");

  const regressionText = regression
    ? `<div class="calc-item">
        Linia trendu z zaznaczonych punktów:
        <span class="formula">A = ${formatNumber(regression.slope, 5)} * c + ${formatNumber(regression.intercept, 5)}, R2 = ${formatNumber(regression.r2, 4)}</span>
      </div>`
    : `<div class="calc-item warning">Do wyznaczenia linii trendu potrzebne są co najmniej dwa poprawne punkty wzorcowe.</div>`;

  const sampleText = Number.isFinite(sampleCurve)
    ? `<div class="calc-item">
        Próba P1 z krzywej wzorcowej:
        <span class="formula">c = (A(P1) - b) / m = (${formatNumber(data.sampleAbsorbance, 4)} - ${formatNumber(regression.intercept, 5)}) / ${formatNumber(regression.slope, 5)} = ${formatNumber(sampleCurve, 4)} mg/dm³</span>
        <span class="formula">Po rozcieńczeniu: ${formatNumber(sampleCurve, 4)} * ${formatNumber(data.dilutionFactor, 2)} = ${formatNumber(sampleDiluted, 4)} mg/dm³</span>
      </div>`
    : `<div class="calc-item warning">Wpisz absorbancję P1 oraz dane wzorcowe, aby obliczyć wynik próby.</div>`;

  container.innerHTML = `<div class="calc-list">${renderWarnings(validation.warnings)}${firstRows}${regressionText}${sampleText}</div>`;
}

function classifyNo2(value) {
  if (!Number.isFinite(value)) return null;
  const drinking = value <= 0.5;
  let waterClass = "poza klasą 3";
  if (value <= 0.02) waterClass = "klasa 1";
  else if (value <= 0.03) waterClass = "klasa 2";
  else if (value <= 0.06) waterClass = "klasa 3";
  return { drinking, waterClass };
}

function renderExercise3Interpretation(value, validation) {
  const container = qs("#exercise3Interpretation");
  if (validation.negativeResult) {
    container.innerHTML = `<p><span class="result-warn">Nie wykonano klasyfikacji.</span> Wynik ujemny nie powinien być interpretowany jako rzeczywiste stężenie.</p>`;
    return;
  }
  const result = classifyNo2(value);
  if (!result) {
    container.innerHTML = `<p>Po obliczeniu wyniku końcowego pojawi się automatyczna interpretacja według progów: 0,02; 0,03; 0,06 mg/dm³ oraz 0,5 mg/dm³ dla wody do picia.</p>`;
    return;
  }
  container.innerHTML = `
    <p>Badana próba ze względu na zawartość azotanów(III) mierzonych metodą spektrofotometryczną: <span class="result-ok">${result.waterClass}</span>.</p>
    ${validation.outOfRange ? '<p><span class="result-warn">Uwaga:</span> wynik P1 jest poza zakresem krzywej wzorcowej, więc jest ekstrapolowany.</p>' : ""}
    <p>Wynik ${formatNumber(value, 4)} mg/dm³ ${result.drinking ? '<span class="result-ok">mieści się</span>' : '<span class="result-warn">nie mieści się</span>'} w limicie dla wody do picia wynoszącym 0,5 mg/dm³.</p>
  `;
}

function drawChart(data, regression, sampleCurve) {
  const canvas = qs("#calibrationChart");
  const ctx = canvas.getContext("2d");
  const width = canvas.width;
  const height = canvas.height;
  ctx.clearRect(0, 0, width, height);

  const validStandards = data.standards.filter((row) => Number.isFinite(row.concentration) && Number.isFinite(row.absorbance));
  const validY = validStandards.map((p) => p.absorbance);
  const validX = validStandards.map((p) => p.concentration);
  if (Number.isFinite(sampleCurve)) validX.push(sampleCurve);
  if (Number.isFinite(data.sampleAbsorbance)) validY.push(data.sampleAbsorbance);

  const margin = { left: 74, right: 32, top: 28, bottom: 64 };
  const plotW = width - margin.left - margin.right;
  const plotH = height - margin.top - margin.bottom;
  const maxX = Math.max(0.01, ...validX) * 1.12;
  const maxY = Math.max(0.1, ...validY) * 1.18;
  const sx = (x) => margin.left + (x / maxX) * plotW;
  const sy = (y) => margin.top + plotH - (y / maxY) * plotH;

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);
  ctx.strokeStyle = "#2a312d";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(margin.left, margin.top);
  ctx.lineTo(margin.left, margin.top + plotH);
  ctx.lineTo(margin.left + plotW, margin.top + plotH);
  ctx.stroke();

  ctx.fillStyle = "#17211c";
  ctx.font = "16px Arial";
  ctx.fillText("Absorbancja", 14, margin.top + 16);
  ctx.fillText("cNO₂⁻ [mg/dm³]", margin.left + plotW / 2 - 58, height - 18);

  ctx.font = "13px Arial";
  ctx.fillStyle = "#5d6862";
  for (let i = 0; i <= 5; i += 1) {
    const xValue = (maxX / 5) * i;
    const yValue = (maxY / 5) * i;
    const x = sx(xValue);
    const y = sy(yValue);
    ctx.strokeStyle = "#e2e7e3";
    ctx.beginPath();
    ctx.moveTo(x, margin.top);
    ctx.lineTo(x, margin.top + plotH);
    ctx.moveTo(margin.left, y);
    ctx.lineTo(margin.left + plotW, y);
    ctx.stroke();
    ctx.fillText(formatNumber(xValue, 3), x - 14, margin.top + plotH + 20);
    ctx.fillText(formatNumber(yValue, 3), margin.left - 54, y + 4);
  }

  if (regression) {
    ctx.strokeStyle = "#1f6f68";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(sx(0), sy(regression.intercept));
    ctx.lineTo(sx(maxX), sy(regression.slope * maxX + regression.intercept));
    ctx.stroke();
  }

  validStandards.forEach((row) => {
    ctx.fillStyle = row.included ? "#1f6f68" : "#b5532d";
    ctx.beginPath();
    ctx.arc(sx(row.concentration), sy(row.absorbance), 6, 0, Math.PI * 2);
    ctx.fill();
  });

  if (Number.isFinite(sampleCurve) && Number.isFinite(data.sampleAbsorbance)) {
    const x = sx(sampleCurve);
    const y = sy(data.sampleAbsorbance);
    ctx.strokeStyle = "#b5532d";
    ctx.setLineDash([8, 6]);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x, margin.top + plotH);
    ctx.moveTo(margin.left, y);
    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = "#b5532d";
    ctx.beginPath();
    ctx.arc(x, y, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillText("P1", x + 10, y - 10);
  }
}

function average(values) {
  const valid = values.filter(Number.isFinite);
  if (valid.length === 0) return Number.NaN;
  return valid.reduce((sum, value) => sum + value, 0) / valid.length;
}

function calculateExercise4() {
  const c = parseNumber(qs("#edtaConcentration").value);
  const v = parseNumber(qs("#sampleVolumeHardness").value);
  const warnings = validateExercise4Globals(c, v);
  setInvalid("#edtaConcentration", Number.isFinite(c) && c <= 0);
  setInvalid("#sampleVolumeHardness", Number.isFinite(v) && v <= 0);
  const rows = waters.map((water) => {
    const hardnessValues = [
      parseNumber(qs(`#${water.id}-hardness-1`).value),
      parseNumber(qs(`#${water.id}-hardness-2`).value),
    ];
    const calciumValues = [
      parseNumber(qs(`#${water.id}-calcium-1`).value),
      parseNumber(qs(`#${water.id}-calcium-2`).value),
    ];
    const magnesiumValues = [
      parseNumber(qs(`#${water.id}-magnesium-1`).value),
      parseNumber(qs(`#${water.id}-magnesium-2`).value),
    ];
    const labelCa = parseNumber(qs(`#${water.id}-label-ca`).value);
    const labelMg = parseNumber(qs(`#${water.id}-label-mg`).value);
    [...hardnessValues, ...calciumValues, ...magnesiumValues].forEach((value, idx) => {
      const ids = [
        `${water.id}-hardness-1`,
        `${water.id}-hardness-2`,
        `${water.id}-calcium-1`,
        `${water.id}-calcium-2`,
        `${water.id}-magnesium-1`,
        `${water.id}-magnesium-2`,
      ];
      setInvalid(`#${ids[idx]}`, Number.isFinite(value) && value < 0);
    });
    setInvalid(`#${water.id}-label-ca`, Number.isFinite(labelCa) && labelCa < 0);
    setInvalid(`#${water.id}-label-mg`, Number.isFinite(labelMg) && labelMg < 0);

    const hardnessAvg = average(hardnessValues);
    const hardnessMmol = Number.isFinite(hardnessAvg) && Number.isFinite(c) && Number.isFinite(v) && v > 0 ? hardnessAvg * c * 1000 / v : Number.NaN;
    const hardnessCaco3 = Number.isFinite(hardnessMmol) ? hardnessMmol * 100.08 : Number.NaN;
    const hardnessGerman = Number.isFinite(hardnessMmol) ? hardnessMmol * 5.61 : Number.NaN;

    const calciumAvg = average(calciumValues);
    const calcium = Number.isFinite(calciumAvg) && Number.isFinite(c) && Number.isFinite(v) && v > 0 ? calciumAvg * c * 1000 * 40.1 / v : Number.NaN;
    const magnesiumAvg = average(magnesiumValues);
    const magnesium = Number.isFinite(magnesiumAvg) && Number.isFinite(c) && Number.isFinite(v) && v > 0 ? magnesiumAvg * c * 1000 * 24.3 / v : Number.NaN;
    const labelHardness = Number.isFinite(labelCa) && Number.isFinite(labelMg) ? labelCa * 100.08 / 40.1 + labelMg * 100.08 / 24.3 : Number.NaN;
    const labelDiff = Number.isFinite(hardnessCaco3) && Number.isFinite(labelHardness) ? hardnessCaco3 - labelHardness : Number.NaN;

    warnings.push(...validateMeasurementPair(water.name, "twardość", hardnessValues));
    warnings.push(...validateMeasurementPair(water.name, "wapń", calciumValues));
    warnings.push(...validateMeasurementPair(water.name, "magnez", magnesiumValues));
    if (Number.isFinite(labelCa) && labelCa < 0) warnings.push(`${water.name}: wapń z etykiety nie może być ujemny.`);
    if (Number.isFinite(labelMg) && labelMg < 0) warnings.push(`${water.name}: magnez z etykiety nie może być ujemny.`);

    setCell(`${water.id}-hardness-avg`, hardnessAvg, 2);
    setCell(`${water.id}-hardness-mmol`, hardnessMmol, 3);
    setCell(`${water.id}-hardness-caco3`, hardnessCaco3, 2);
    setCell(`${water.id}-hardness-german`, hardnessGerman, 2);
    setCell(`${water.id}-calcium-avg`, calciumAvg, 2);
    setCell(`${water.id}-CCa`, calcium, 2);
    setCell(`${water.id}-magnesium-avg`, magnesiumAvg, 2);
    setCell(`${water.id}-CMg`, magnesium, 2);
    setCell(`${water.id}-label-hardness`, labelHardness, 2);
    setCell(`${water.id}-label-diff`, labelDiff, 2);

    return { water, hardnessAvg, hardnessMmol, hardnessCaco3, hardnessGerman, calciumAvg, calcium, magnesiumAvg, magnesium, labelCa, labelMg, labelHardness, labelDiff };
  });

  renderExercise4Calculations(rows, c, v, warnings);
  renderExercise4Interpretation(rows);
}

function validateExercise4Globals(c, v) {
  const warnings = [];
  if (Number.isFinite(c) && c <= 0) warnings.push("Stężenie EDTA musi być większe od zera.");
  if (Number.isFinite(v) && v <= 0) warnings.push("Objętość próbki musi być większa od zera.");
  return warnings;
}

function validateMeasurementPair(waterName, label, values) {
  const warnings = [];
  const filled = values.filter(Number.isFinite);
  if (filled.some((value) => value < 0)) warnings.push(`${waterName}: pomiar dla pozycji "${label}" nie może być ujemny.`);
  if (filled.length === 1) warnings.push(`${waterName}: wpisano tylko jeden z dwóch pomiarów (${label}). Do sprawozdania wymagane są dwa oznaczenia.`);
  return warnings;
}

function setCell(id, value, digits) {
  qs(`#${id}`).textContent = formatNumber(value, digits);
}

function renderExercise4Calculations(rows, c, v, warnings) {
  const content = rows.map(({ water, hardnessAvg, hardnessMmol, hardnessCaco3, hardnessGerman, calciumAvg, calcium, magnesiumAvg, magnesium, labelCa, labelMg, labelHardness, labelDiff }) => `
    <div class="calc-item">
      <strong>${water.name}</strong>
      <span class="formula">a_średnia = ${formatNumber(hardnessAvg, 2)} cm³</span>
      <span class="formula">Two = a * c * 1000 / V = ${formatNumber(hardnessAvg, 2)} * ${formatNumber(c, 4)} * 1000 / ${formatNumber(v, 0)} = ${formatNumber(hardnessMmol, 3)} mmol/dm³</span>
      <span class="formula">TwCaCO₃ = Two * 100,08 = ${formatNumber(hardnessMmol, 3)} * 100,08 = ${formatNumber(hardnessCaco3, 2)} mg CaCO₃/dm³</span>
      <span class="formula">Tw(°n) = Two * 5,61 = ${formatNumber(hardnessMmol, 3)} * 5,61 = ${formatNumber(hardnessGerman, 2)} °n</span>
      <span class="formula">cCa²⁺ = V1 * c * 1000 * 40,1 / V = ${formatNumber(calciumAvg, 2)} * ${formatNumber(c, 4)} * 1000 * 40,1 / ${formatNumber(v, 0)} = ${formatNumber(calcium, 2)} mg/dm³</span>
      <span class="formula">cMg²⁺ = V2 * c * 1000 * 24,3 / V = ${formatNumber(magnesiumAvg, 2)} * ${formatNumber(c, 4)} * 1000 * 24,3 / ${formatNumber(v, 0)} = ${formatNumber(magnesium, 2)} mg/dm³</span>
      <span class="formula">Twardość z etykiety = Ca * 100,08 / 40,1 + Mg * 100,08 / 24,3 = ${formatNumber(labelCa, 2)} * 100,08 / 40,1 + ${formatNumber(labelMg, 2)} * 100,08 / 24,3 = ${formatNumber(labelHardness, 2)} mg CaCO₃/dm³</span>
      <span class="formula">Różnica oznaczenie - etykieta = ${formatNumber(hardnessCaco3, 2)} - ${formatNumber(labelHardness, 2)} = ${formatNumber(labelDiff, 2)} mg CaCO₃/dm³</span>
    </div>
  `).join("");

  qs("#exercise4Calculations").innerHTML = `
    <div class="calc-list">
      ${renderWarnings(warnings)}
      <div class="calc-item">Symbole: a, V1 i V2 oznaczają średnie zużycie EDTA [cm³], c to stężenie titranta [mol/dm³], V to objętość próbki [cm³].</div>
      ${content}
    </div>
  `;
}

function classifyHardness(value) {
  if (!Number.isFinite(value)) return null;
  const drinking = value <= 500;
  let waterClass = "poza klasą 3";
  if (value <= 350) waterClass = "klasa 1";
  else if (value <= 550) waterClass = "klasa 2";
  else if (value <= 700) waterClass = "klasa 3";
  return { drinking, waterClass };
}

function renderExercise4Interpretation(rows) {
  const items = rows.map(({ water, hardnessCaco3 }) => {
    const result = classifyHardness(hardnessCaco3);
    if (!result) return `<p>${water.name}: wpisz pomiary twardości, aby uzyskać interpretację.</p>`;
    return `<p>${water.name}: wynik ${formatNumber(hardnessCaco3, 2)} mg CaCO₃/dm³, klasyfikacja: <span class="result-ok">${result.waterClass}</span>; woda ${result.drinking ? '<span class="result-ok">mieści się</span>' : '<span class="result-warn">nie mieści się</span>'} w limicie dla wody do picia 500 mg CaCO₃/dm³.</p>`;
  }).join("");
  qs("#exercise4Interpretation").innerHTML = items;
}

function handleInput(event) {
  const target = event.target;
  if (target.matches("input, select")) saveStoredInput(target);
  calculateExercise3();
  calculateExercise4();
}

function clearData() {
  Object.keys(localStorage)
    .filter((key) => key.startsWith("ezs-calc:"))
    .forEach((key) => localStorage.removeItem(key));
  window.location.reload();
}

function setupTabs() {
  qsa(".tab-button").forEach((button) => {
    button.addEventListener("click", () => {
      qsa(".tab-button").forEach((item) => item.classList.toggle("active", item === button));
      qsa(".tab-panel").forEach((panel) => panel.classList.toggle("active", panel.id === button.dataset.tab));
    });
  });
}

function init() {
  renderExercise3Table();
  renderExercise4Tables();
  restoreStoredInputs();
  qsa("[data-store]").forEach((input) => {
    if (input.type === "checkbox") {
      const stored = localStorage.getItem(`ezs-calc:${input.dataset.store}`);
      if (stored !== null) input.checked = stored === "true";
      input.addEventListener("change", () => {
        localStorage.setItem(`ezs-calc:${input.dataset.store}`, String(input.checked));
        calculateExercise3();
      });
    }
  });
  document.addEventListener("input", handleInput);
  document.addEventListener("change", handleInput);
  qs("#printButton").addEventListener("click", () => window.print());
  qs("#clearButton").addEventListener("click", clearData);
  setupTabs();
  calculateExercise3();
  calculateExercise4();
}

init();
