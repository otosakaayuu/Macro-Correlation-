// ═══════════════════════════════════════════════════════════════════════
// APP LOGIC
// ═══════════════════════════════════════════════════════════════════════

// ── CLOCK ──
function tickClock(){
  const now = new Date();
  const t = now.toLocaleTimeString('id-ID',{hour:'2-digit',minute:'2-digit',second:'2-digit'});
  const d = now.toLocaleDateString('id-ID',{weekday:'short',day:'2-digit',month:'short',year:'numeric'});
  document.getElementById('clockTime').textContent = t;
  document.getElementById('clockDate').textContent = d;
}
setInterval(tickClock,1000); tickClock();

// ── NAV ROUTER ──
function go(view){
  document.querySelectorAll('.view').forEach(v=>v.classList.remove('active'));
  document.querySelectorAll('.navbtn').forEach(b=>b.classList.remove('active'));
  document.getElementById('view-'+view).classList.add('active');
  document.querySelector(`.navbtn[data-view="${view}"]`).classList.add('active');
  if(view==='corr') renderCorr();
  if(view==='calendar') renderCalendar();
}

// ═══════════════════════════════════════════════════════════════════════
// VIEW: SIGNAL
// ═══════════════════════════════════════════════════════════════════════
function initEventSelect(){
  const sel = document.getElementById('evSelect');
  sel.innerHTML = MACRO_CALENDAR.map(ev=>`<option value="${ev.id}">${ev.name}</option>`).join('');
  onEventChange();
}

function onEventChange(){
  const evId = document.getElementById('evSelect').value;
  const ev = MACRO_CALENDAR.find(e=>e.id===evId);
  const outSel = document.getElementById('outSelect');
  outSel.innerHTML = ev.outcomes.map(o=>{
    const label = outcomeLabel(o);
    return `<option value="${o}">${label}</option>`;
  }).join('');
  document.getElementById('eventNote').innerHTML =
    `<b style="color:var(--txt)">${ev.name}</b> · ${ev.freq} · sumber: ${ev.source}<br>` +
    `<span class="muted">Yang dilihat:</span> ${ev.watch}<br>` +
    `<span class="muted">Kenapa penting:</span> ${ev.why}`;
  renderSignals();
}

function outcomeLabel(code){
  const map = {
    HAWKISH:"📈 Hawkish (lebih ketat dari ekspektasi)",
    DOVISH:"📉 Dovish (lebih lunak dari ekspektasi)",
    HOT:"🔥 Hot / Lebih tinggi dari ekspektasi",
    COOL:"🧊 Cool / Lebih rendah dari ekspektasi",
    STRONG:"💪 Strong / Lebih baik dari ekspektasi",
    WEAK:"📉 Weak / Lebih buruk dari ekspektasi",
    INLINE:"➖ Inline / Sesuai ekspektasi",
    RISKOFF:"⚠️ Risk-Off (shock negatif)",
    RISKON:"✅ Risk-On (de-escalation)",
  };
  return map[code] || code;
}

function renderSignals(){
  const evId = document.getElementById('evSelect').value;
  const outId = document.getElementById('outSelect').value;
  const ev = MACRO_CALENDAR.find(e=>e.id===evId);
  const key = `${evId}_${outId}`;
  const sig = SIGNALS[key];

  if(!sig){
    document.getElementById('signalResults').innerHTML =
      `<div class="panel"><div class="panel-sub">Belum ada data sinyal untuk kombinasi ini.</div></div>`;
    document.getElementById('biasBanner').innerHTML = '';
    return;
  }

  // Outcome description banner
  const outDesc = ev.outcomeDesc[outId] || '';

  // Compute overall "bias" summary
  let longCount=0, shortCount=0, neutralCount=0, sumProb=0;
  sig.forEach(s=>{
    if(s.d===DIR.LONG) longCount++;
    else if(s.d===DIR.SHORT) shortCount++;
    else neutralCount++;
    sumProb += s.p;
  });
  const avgProb = Math.round(sumProb/sig.length);

  let biasClass='neutral', biasText='', biasTag='NETRAL';
  const total = sig.length;
  if(longCount > shortCount && longCount/total >= 0.45){
    biasClass='long'; biasTag='RISK-ON / LONG BIAS';
    biasText = `<b>${longCount}/${total}</b> aset condong <b>LONG</b>, ${shortCount} SHORT, ${neutralCount} netral. Rata-rata confidence <b>${avgProb}%</b>.`;
  } else if(shortCount > longCount && shortCount/total >= 0.45){
    biasClass='short'; biasTag='RISK-OFF / SHORT BIAS';
    biasText = `<b>${shortCount}/${total}</b> aset condong <b>SHORT</b>, ${longCount} LONG, ${neutralCount} netral. Rata-rata confidence <b>${avgProb}%</b>.`;
  } else if(Math.abs(longCount-shortCount) <= 2 && (longCount+shortCount) > neutralCount){
    biasClass='mixed'; biasTag='MIXED / SELEKTIF';
    biasText = `Sinyal tercampur — ${longCount} LONG vs ${shortCount} SHORT. Pilih berdasarkan aset per-kategori, jangan generalisasi arah.`;
  } else {
    biasClass='neutral'; biasTag='NETRAL / WAIT';
    biasText = `Mayoritas (${neutralCount}/${total}) aset netral. Hasil ini cenderung sudah priced-in — hati-hati whipsaw.`;
  }

  document.getElementById('biasBanner').innerHTML = `
    <div class="bias-banner ${biasClass}">
      <div class="bias-tag">${biasTag}</div>
      <div class="desc"><b>${ev.name} → ${outcomeLabel(outId).replace(/^[^\s]+\s/,'')}</b>: ${outDesc}.<br>${biasText}</div>
    </div>`;

  // Group by category, sort by probability desc within category
  const byCat = {};
  sig.forEach(s=>{
    const meta = ASSET_MAP[s.a];
    if(!meta) return;
    if(!byCat[meta.cat]) byCat[meta.cat]=[];
    byCat[meta.cat].push({...s, label:meta.l});
  });

  let html='';
  CATS.forEach(cat=>{
    if(!byCat[cat]) return;
    const rows = byCat[cat].sort((a,b)=>b.p-a.p);
    html += `<div class="cat-block"><h3>${cat}</h3>`;
    rows.forEach(r=>{
      const barColor = r.d===DIR.LONG?'var(--teal)':r.d===DIR.SHORT?'var(--rose)':'var(--txt3)';
      html += `
        <div class="sigrow">
          <div class="asset">${r.a}<small>${r.label}</small></div>
          <div><span class="dirpill ${r.d}">${r.d}</span></div>
          <div class="probcell">${r.p}%
            <div class="probbar"><i style="width:${r.p}%;background:${barColor}"></i></div>
          </div>
          <div class="note">${r.n || '<span class="muted">—</span>'}</div>
        </div>`;
    });
    html += `</div>`;
  });

  document.getElementById('signalResults').innerHTML = `<div class="panel">${html}</div>`;
}

// ═══════════════════════════════════════════════════════════════════════
// VIEW: CORRELATION
// ═══════════════════════════════════════════════════════════════════════
function renderCorr(){
  // Pair list sorted by abs value desc
  const sorted = [...CORR_PAIRS].sort((x,y)=>Math.abs(y.v)-Math.abs(x.v));
  let html='';
  sorted.forEach(p=>{
    const am = ASSET_MAP[p.a], bm = ASSET_MAP[p.b];
    const strength = corrStrength(p.v);
    const valClass = p.v>=0?'pos':'neg';
    const sign = p.v>=0?'+':'';
    html += `
      <div class="pairrow">
        <div class="pa">${p.a} ↔ ${p.b}<br><span class="tag-cat">${am?.cat||''} / ${bm?.cat||''}</span></div>
        <div class="pv ${valClass}">${sign}${p.v.toFixed(2)}</div>
        <div><span class="strengthpill ${strength.cls}">${strength.label}</span></div>
        <div class="pn">${p.note}</div>
      </div>`;
  });
  document.getElementById('pairList').innerHTML = html;

  // Build matrix for a curated set of assets (most relevant pairs)
  const matrixAssets = ["BTC","ETH","ALT","BTCD","DXY","EURUSD","GBPUSD","USDJPY","AUDUSD","NZDUSD","USDCAD","USDCHF","GOLD","SILVER","OIL","COPPER","SPX","VIX","US10Y"];

  // build lookup map both directions
  const lookup = {};
  CORR_PAIRS.forEach(p=>{
    lookup[p.a+'|'+p.b]=p.v;
    lookup[p.b+'|'+p.a]=p.v;
  });

  let thead = `<th class="rowhead"></th>` + matrixAssets.map(a=>`<th>${a}</th>`).join('');
  let rows = matrixAssets.map(rowA=>{
    let cells = matrixAssets.map(colB=>{
      if(rowA===colB) return `<td class="ccell self">—</td>`;
      const v = lookup[rowA+'|'+colB];
      if(v===undefined) return `<td class="ccell" style="color:var(--txt3)">·</td>`;
      const bg = corrColor(v);
      return `<td class="ccell" style="background:${bg.bg};color:${bg.fg}" title="${rowA} vs ${colB}: ${v.toFixed(2)}">${v.toFixed(2)}</td>`;
    }).join('');
    return `<tr><th class="rowhead">${rowA}</th>${cells}</tr>`;
  }).join('');

  document.getElementById('matrixWrap').innerHTML = `<table class="matrix"><thead><tr>${thead}</tr></thead><tbody>${rows}</tbody></table>`;
}

function corrColor(v){
  // map -1..1 to rose..teal with intensity
  const av = Math.min(Math.abs(v),1);
  if(v>0){
    // teal
    const alpha = 0.08 + av*0.45;
    return {bg:`rgba(45,212,191,${alpha.toFixed(2)})`, fg: av>0.55 ? '#06281f':'#9fdfd6'};
  } else if(v<0){
    const alpha = 0.08 + av*0.45;
    return {bg:`rgba(251,113,133,${alpha.toFixed(2)})`, fg: av>0.55 ? '#330a10':'#f6c4cb'};
  }
  return {bg:'rgba(255,255,255,.04)', fg:'var(--txt3)'};
}

// ═══════════════════════════════════════════════════════════════════════
// VIEW: CALENDAR
// ═══════════════════════════════════════════════════════════════════════
function renderCalendar(){
  let html='';
  MACRO_CALENDAR.forEach(ev=>{
    const chips = ev.outcomes.map(o=>
      `<span class="outc-chip" onclick="jumpToSignal('${ev.id}','${o}')">${outcomeLabel(o)}</span>`
    ).join('');
    html += `
      <div class="cal-card">
        <div class="cal-head">
          <h4>${ev.name}</h4>
          <span class="cal-meta">${ev.freq} · ${ev.time}</span>
        </div>
        <div class="cal-row"><b>Sumber:</b> ${ev.source}</div>
        <div class="cal-row"><b>Yang dilihat:</b> ${ev.watch}</div>
        <div class="cal-row"><b>Kenapa penting:</b> ${ev.why}</div>
        <div class="cal-outcomes">${chips}</div>
      </div>`;
  });
  document.getElementById('calendarList').innerHTML = html;
}

function jumpToSignal(evId, outId){
  document.getElementById('evSelect').value = evId;
  onEventChange();
  document.getElementById('outSelect').value = outId;
  renderSignals();
  go('signal');
  window.scrollTo({top:0,behavior:'smooth'});
}

// ═══════════════════════════════════════════════════════════════════════
// INIT
// ═══════════════════════════════════════════════════════════════════════
initEventSelect();
