// Ontario Commission Tax Calculator — calculation logic + UI
// All rates sourced from CONFIG (config.js). No hardcoded values here.

// ─── Tax math ────────────────────────────────────────────────────────────────

function federalBPA(annualIncome) {
  const b = CONFIG.federal.bpa;
  if (annualIncome <= b.phaseoutStart) return b.max;
  if (annualIncome >= b.phaseoutEnd)   return b.min;
  const ratio = (annualIncome - b.phaseoutStart) / (b.phaseoutEnd - b.phaseoutStart);
  return b.max - ratio * (b.max - b.min);
}

function bracketTax(income, brackets) {
  let tax = 0;
  let floor = 0;
  for (const b of brackets) {
    if (income <= floor) break;
    const ceiling = b.upTo ?? Infinity;
    tax += (Math.min(income, ceiling) - floor) * b.rate;
    floor = ceiling;
  }
  return tax;
}

function federalTax(annualIncome) {
  const gross  = bracketTax(annualIncome, CONFIG.federal.brackets);
  const credit = federalBPA(annualIncome) * CONFIG.federal.bpa.creditRate;
  return Math.max(0, gross - credit);
}

function ontarioTax(annualIncome) {
  const basic    = bracketTax(annualIncome, CONFIG.ontario.brackets);
  const bpaCred  = CONFIG.ontario.bpa.amount * CONFIG.ontario.bpa.creditRate;
  const netBasic = Math.max(0, basic - bpaCred);
  const st       = CONFIG.ontario.surtax;
  const surtax   = Math.max(0, netBasic - st.threshold1) * st.rate1
                 + Math.max(0, netBasic - st.threshold2) * st.rate2;
  return netBasic + surtax;
}

// Income-tax withholding on commission (per payment), using annualisation.
// For Mode B, netCommission = commission - expenses; CPP/EI still use gross.
function incomeTaxOnCommission(commission, annualSalary, payPeriods, expenses, td1xFiled) {
  const annComm  = td1xFiled ? (commission - expenses) * payPeriods
                             : commission * payPeriods;
  const total    = annualSalary + annComm;

  const fedAnnual = federalTax(total) - federalTax(annualSalary);
  const ontAnnual = ontarioTax(total) - ontarioTax(annualSalary);

  return {
    federal: Math.max(0, fedAnnual / payPeriods),
    ontario: Math.max(0, ontAnnual / payPeriods)
  };
}

// CPP1 — T4127/T4032 prorated exemption methodology
function calcCPP1(commission, payPeriods, ytdCPP1) {
  const cfg             = CONFIG.cpp1;
  const perPeriodExempt = cfg.basicExemption / payPeriods;
  const insurable       = Math.max(0, commission - perPeriodExempt);
  const contribution    = insurable * cfg.rate;
  const remaining       = Math.max(0, cfg.maxContribution - ytdCPP1);
  return Math.min(contribution, remaining);
}

// CPP2 — on earnings between YMPE and YAMPE, annualised then prorated
function calcCPP2(commission, annualSalary, payPeriods, ytdCPP2) {
  const cfg        = CONFIG.cpp2;
  const annualized = annualSalary + commission * payPeriods;
  const tier2      = Math.max(0, Math.min(annualized, cfg.yampe) - cfg.ympe);
  const annual     = tier2 * cfg.rate;
  const perPeriod  = annual / payPeriods;
  const remaining  = Math.max(0, cfg.maxContribution - ytdCPP2);
  return Math.min(perPeriod, remaining);
}

// EI — always on gross commission, capped by annual max
function calcEI(commission, ytdEI) {
  const cfg       = CONFIG.ei;
  const premium   = commission * cfg.rate;
  const remaining = Math.max(0, cfg.maxPremium - ytdEI);
  return Math.min(premium, remaining);
}

// Main entry point — returns full result set
function calculate(inputs) {
  const { annualSalary, commission, payPeriods, td1xFiled, expenses, ytdCPP1, ytdCPP2, ytdEI } = inputs;

  const cpp1 = calcCPP1(commission, payPeriods, ytdCPP1);
  const cpp2 = calcCPP2(commission, annualSalary, payPeriods, ytdCPP2);
  const ei   = calcEI(commission, ytdEI);

  const modeA = incomeTaxOnCommission(commission, annualSalary, payPeriods, 0,        false);
  const modeB = td1xFiled
    ? incomeTaxOnCommission(commission, annualSalary, payPeriods, expenses, true)
    : null;

  function buildResult(fed, ont) {
    const total  = fed + ont + cpp1 + cpp2 + ei;
    const net    = commission - total;
    const effRate = commission > 0 ? total / commission : 0;
    const margRate = commission > 0 ? (fed + ont) / commission : 0;
    return { federal: fed, ontario: ont, cpp1, cpp2, ei, total, net, effRate, margRate };
  }

  return {
    modeA: buildResult(modeA.federal, modeA.ontario),
    modeB: modeB ? buildResult(modeB.federal, modeB.ontario) : null
  };
}

// ─── UI helpers ──────────────────────────────────────────────────────────────

function fmt(n) {
  if (n < 0) return '−$' + Math.abs(n).toLocaleString('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return '$' + n.toLocaleString('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtPct(n) {
  return (n * 100).toFixed(2) + '%';
}

// Build single-mode result HTML
function renderSingleMode(r, label) {
  return `
    <div class="result-table" aria-label="${label}">
      <div class="result-row"><span>Federal income tax</span><span class="rr-value">${fmt(r.federal)}</span></div>
      <div class="result-row"><span>Ontario income tax</span><span class="rr-value">${fmt(r.ontario)}</span></div>
      <div class="result-row"><span>CPP1</span><span class="rr-value">${fmt(r.cpp1)}</span></div>
      <div class="result-row"><span>CPP2</span><span class="rr-value">${fmt(r.cpp2)}</span></div>
      <div class="result-row"><span>EI</span><span class="rr-value">${fmt(r.ei)}</span></div>
      <div class="result-row result-bold"><span>Total withholding</span><span class="rr-value">${fmt(r.total)}</span></div>
      <div class="result-row result-highlight"><span>Net commission</span><span class="rr-value">${fmt(r.net)}</span></div>
    </div>
    <div class="rate-blocks">
      <div class="rate-block">
        <div class="rate-label">Effective withholding rate</div>
        <div class="rate-value">${fmtPct(r.effRate)}</div>
        <div class="rate-sub">Total withholding ÷ gross commission</div>
      </div>
      <div class="rate-block">
        <div class="rate-label">Combined marginal rate</div>
        <div class="rate-value">${fmtPct(r.margRate)}</div>
        <div class="rate-sub">Federal + Ontario income tax only</div>
      </div>
    </div>`;
}

// Build two-column TD1X comparison HTML
function renderComparison(modeA, modeB) {
  function row(label, a, b, isMoney) {
    const fA = isMoney ? fmt(a) : fmtPct(a);
    const fB = isMoney ? fmt(b) : fmtPct(b);
    return `<div class="result-row">
      <span class="rr-label">${label}</span>
      <span class="rr-value">${fA}</span>
      <span class="rr-value rr-b">${fB}</span>
    </div>`;
  }
  return `
    <div class="compare-header">
      <span></span>
      <span class="col-head">Mode A<br><small>No TD1X</small></span>
      <span class="col-head">Mode B<br><small>TD1X filed</small></span>
    </div>
    <div class="result-table compare-table" aria-label="TD1X comparison">
      ${row('Federal income tax', modeA.federal, modeB.federal, true)}
      ${row('Ontario income tax', modeA.ontario, modeB.ontario, true)}
      ${row('CPP1', modeA.cpp1, modeB.cpp1, true)}
      ${row('CPP2', modeA.cpp2, modeB.cpp2, true)}
      ${row('EI', modeA.ei, modeB.ei, true)}
      <div class="result-row result-bold">
        <span class="rr-label">Total withholding</span>
        <span class="rr-value">${fmt(modeA.total)}</span>
        <span class="rr-value rr-b">${fmt(modeB.total)}</span>
      </div>
      <div class="result-row result-highlight">
        <span class="rr-label">Net commission</span>
        <span class="rr-value">${fmt(modeA.net)}</span>
        <span class="rr-value rr-b">${fmt(modeB.net)}</span>
      </div>
      ${row('Effective rate', modeA.effRate, modeB.effRate, false)}
      ${row('Marginal rate (income tax)', modeA.margRate, modeB.margRate, false)}
    </div>
    <div class="compare-saving">
      TD1X saves <strong>${fmt(modeA.total - modeB.total)}</strong> in withholding on this payment
      (refunded at year-end either way — TD1X improves cash flow).
    </div>`;
}

// ─── DOM init ─────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  const form        = document.getElementById('calc-form');
  const resultsEl   = document.getElementById('results');
  const td1xRadios  = form.querySelectorAll('input[name="td1x"]');
  const expRow      = document.getElementById('expense-row');
  const ytdToggle   = document.getElementById('ytd-toggle');
  const ytdSection  = document.getElementById('ytd-section');
  const payPeriodsSelect = document.getElementById('pay-periods');
  const customRow   = document.getElementById('custom-periods-row');

  // Show/hide expense field based on TD1X selection
  function syncTD1X() {
    const filed = form.querySelector('input[name="td1x"]:checked')?.value === 'yes';
    expRow.hidden = !filed;
    if (!filed) document.getElementById('expenses').value = '';
  }
  td1xRadios.forEach(r => r.addEventListener('change', syncTD1X));
  syncTD1X();

  // Show/hide custom pay periods input
  payPeriodsSelect.addEventListener('change', () => {
    customRow.hidden = payPeriodsSelect.value !== 'custom';
  });

  // YTD section toggle
  if (ytdToggle && ytdSection) {
    ytdToggle.addEventListener('click', () => {
      const open = ytdSection.hidden === false;
      ytdSection.hidden = open;
      ytdToggle.setAttribute('aria-expanded', String(!open));
      ytdToggle.textContent = open ? '▸ YTD contributions (optional)' : '▾ YTD contributions (optional)';
    });
  }

  // Form submit
  form.addEventListener('submit', e => {
    e.preventDefault();

    const annualSalary = parseFloat(document.getElementById('annual-salary').value) || 0;
    const commission   = parseFloat(document.getElementById('commission').value)    || 0;

    let payPeriods;
    if (payPeriodsSelect.value === 'custom') {
      payPeriods = parseInt(document.getElementById('custom-periods').value, 10) || 1;
    } else {
      payPeriods = parseInt(payPeriodsSelect.value, 10);
    }
    payPeriods = Math.max(1, payPeriods);

    const td1xFiled = form.querySelector('input[name="td1x"]:checked')?.value === 'yes';
    const expenses  = parseFloat(document.getElementById('expenses').value) || 0;
    const ytdCPP1   = parseFloat(document.getElementById('ytd-cpp1').value) || 0;
    const ytdCPP2   = parseFloat(document.getElementById('ytd-cpp2').value) || 0;
    const ytdEI     = parseFloat(document.getElementById('ytd-ei').value)   || 0;

    if (commission <= 0) {
      resultsEl.innerHTML = '<p class="error-msg">Please enter a commission amount greater than $0.</p>';
      resultsEl.hidden = false;
      return;
    }

    const result = calculate({ annualSalary, commission, payPeriods, td1xFiled, expenses, ytdCPP1, ytdCPP2, ytdEI });

    let html = '<div class="results-inner">';
    html += '<h3 class="results-title">Withholding on This Commission Payment</h3>';

    if (td1xFiled && result.modeB) {
      html += renderComparison(result.modeA, result.modeB);
    } else {
      html += renderSingleMode(result.modeA, 'Withholding results');
    }

    html += '</div>';
    resultsEl.innerHTML = html;
    resultsEl.hidden = false;
    resultsEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
});
