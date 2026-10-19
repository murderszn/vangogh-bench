/* Data-driven rankings. No model scores or costs are embedded in this view. */
(async function () {
  'use strict';
  const D = window.VanGoghRankings;
  const $ = id => document.getElementById(id);
  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const number = (v, places = 1) => D.finite(v) ? v.toFixed(places) : '—';
  const dollars = v => D.finite(v) ? '$' + v.toFixed(4) : '—';
  const palette = ['#7aa2f7', '#6fd4b1', '#f4c76b', '#b99af7', '#f493b4', '#74d2e7'];
  let rows = [], visible = [], selected = null, providerColors = {};
  const color = r => providerColors[r.provider] || palette[0];
  const empty = message => `<p class="empty-state">${esc(message || 'No results match these filters.')}</p>`;
  const selectedMetric = () => $('rank-metric').value;
  const metricValue = (r, key) => key === 'score_adjusted_cost' ? r.score > 0 && D.finite(r.cost_usd) ? r.cost_usd * 100 / r.score : null : r[key];
  const formatMetric = (v, key) => key.includes('cost') ? dollars(v) : key.endsWith('_ms') ? `${number(D.finite(v) ? v / 1000 : null, 2)}s` : number(v);
  function barChart(data, key, maximum, stacked = false) {
    if (!data.length) return empty();
    return data.map(r => {
      const v = metricValue(r, key), width = D.finite(v) && maximum > 0 ? Math.max(0, Math.min(100, v / maximum * 100)) : 0;
      const detail = stacked ? D.components.map(c => `${c.label}: ${number(r[c.key])}/${c.max}`).join('; ') : `${formatMetric(v, key)}`;
      const fill = stacked ? D.components.map(c => `<span class="bar-fill" style="width:${Math.max(0, Math.min(c.max, r[c.key] || 0))}%;background:${c.color}"></span>`).join('')
        : `<span class="bar-fill" style="width:${width}%;background:${color(r)}"></span>`;
      const ttft = key === 'latency_ms' && D.finite(r.ttft_ms) && maximum > 0 ? `<span style="position:absolute;left:${Math.min(100, r.ttft_ms / maximum * 100)}%;height:100%;width:2px;background:#f4c76b"></span>` : '';
      return `<button type="button" class="bar-row" data-model="${esc(r.model_id)}" aria-pressed="${selected === r.model_id}" aria-label="${esc(r.name + ': ' + detail)}" title="${esc(detail)}"><span class="bar-name">${esc(r.name)}</span><span class="bar-track" style="position:relative">${fill}${ttft}</span><span class="bar-value">${formatMetric(v, key)}</span></button>`;
    }).join('');
  }
  function renderScatter() {
    const plotted = visible.filter(r => D.finite(r.cost_usd) && r.cost_usd > 0 && D.finite(r.score));
    if (!plotted.length) { $('frontier-chart').innerHTML = empty('No positive-cost results in this view.'); $('provider-legend').innerHTML = ''; return; }
    const minLog = Math.floor(Math.log10(Math.min(...plotted.map(r => r.cost_usd))));
    const maxLog = Math.max(minLog + 1, Math.ceil(Math.log10(Math.max(...plotted.map(r => r.cost_usd)))));
    const x = r => 58 + (Math.log10(r.cost_usd) - minLog) / (maxLog - minLog) * 672;
    const y = r => 270 - r.score / 100 * 240;
    let grid = '';
    for (let score = 0; score <= 100; score += 25) { const yy = 270 - score / 100 * 240; grid += `<line x1="58" x2="730" y1="${yy}" y2="${yy}" stroke="#ffffff15"/><text x="45" y="${yy+4}" text-anchor="end">${score}</text>`; }
    for (let power = minLog; power <= maxLog; power++) { const xx = 58 + (power-minLog)/(maxLog-minLog)*672; grid += `<line x1="${xx}" x2="${xx}" y1="30" y2="270" stroke="#ffffff10"/><text x="${xx}" y="294" text-anchor="middle">$${(10**power).toFixed(Math.max(0,-power))}</text>`; }
    const front = D.frontier(plotted);
    const line = front.length > 1 ? `<polyline points="${front.map(r=>`${x(r)},${y(r)}`).join(' ')}" fill="none" stroke="#b8bfd0" stroke-dasharray="5 5" stroke-width="1.5"/>` : '';
    const dots = plotted.map(r=>`<a class="plot-point" href="#model-detail" data-model="${esc(r.model_id)}" aria-label="${esc(`${r.name}, ${number(r.score)} points, ${dollars(r.cost_usd)} per generation`)}"><title>${esc(`${r.name} · ${number(r.score)} pts · ${dollars(r.cost_usd)}`)}</title><circle cx="${x(r)}" cy="${y(r)}" r="${selected===r.model_id?8:6}" fill="${color(r)}" stroke="${selected===r.model_id?'#f3ead3':'#0b1122'}" stroke-width="2"/></a>`).join('');
    $('frontier-chart').innerHTML = `<svg class="chart-svg" viewBox="0 0 760 335" role="img" aria-label="Score versus generation cost scatter plot. Exact values are available in the results table.">${grid}${line}${dots}<text x="394" y="324" text-anchor="middle">Generation cost · USD · log scale</text><text x="58" y="16">Score / 100</text></svg>`;
    $('provider-legend').innerHTML = [...new Set(plotted.map(r=>r.provider))].map(p=>`<span><i class="swatch" style="--swatch:${providerColors[p]}"></i>${esc(p)}</span>`).join('');
  }
  function renderTable() {
    if (!visible.length) { $('results-table').innerHTML = empty(); return; }
    const key = selectedMetric(); let previous, rank;
    $('results-table').innerHTML = `<table><caption>${esc($('rank-cohort').selectedOptions[0].textContent)} · sorted by ${esc($('rank-metric').selectedOptions[0].textContent)}. Scroll horizontally for all components.</caption><thead><tr><th scope="col">Model / rank</th><th scope="col">Overall / 100</th>${D.components.map(c=>`<th scope="col">${c.label} / ${c.max}</th>`).join('')}<th scope="col">Generation cost</th><th scope="col">Latency</th><th scope="col">Evidence</th></tr></thead><tbody>${visible.map((r,i)=>{
      const value = metricValue(r,key); if (i===0 || value !== previous) rank=i+1; previous=value;
      return `<tr class="${selected===r.model_id?'is-selected':''}"><td><button type="button" data-model="${esc(r.model_id)}">${D.finite(value)?rank:'—'} · ${esc(r.name)}<small>${esc(r.provider)}</small></button></td><td>${number(r.score)}</td>${D.components.map(c=>`<td style="color:${c.color}">${number(r[c.key])}</td>`).join('')}<td>${dollars(r.cost_usd)}</td><td>${number(D.finite(r.latency_ms)?r.latency_ms/1000:null,2)}s</td><td>${esc(r.provenance)}</td></tr>`;
    }).join('')}</tbody></table>`;
  }
  function renderCoverage() {
    if (!visible.length) { $('coverage-chart').innerHTML=empty(); return; }
    const providers = [...new Set(visible.map(r=>r.provider))].map(provider=>({provider,count:visible.filter(r=>r.provider===provider).length})).sort((a,b)=>b.count-a.count||a.provider.localeCompare(b.provider));
    $('coverage-chart').innerHTML = `<div class="coverage-track" aria-hidden="true">${providers.map(p=>`<span style="width:${100*p.count/visible.length}%;background:${providerColors[p.provider]}"></span>`).join('')}</div>${providers.map(p=>`<div class="coverage-row"><span><i class="swatch" style="--swatch:${providerColors[p.provider]}"></i> ${esc(p.provider)}</span><span>${p.count} / ${visible.length} records · ${number(100*p.count/visible.length,0)}%</span></div>`).join('')}`;
  }
  function renderDetail() {
    const r = visible.find(r=>r.model_id===selected);
    if (!r) { $('detail-card').innerHTML=empty('Select a model to inspect its evidence.'); return; }
    const fields = [['Evidence',r.provenance],['Evaluation',r.evaluation_kind],['Recorded at',r.eval_timestamp || 'Unknown'],['Generation cost',dollars(r.cost_usd)],['Time to first token',D.finite(r.ttft_ms)?`${r.ttft_ms} ms`:'Unknown'],['Total tokens',r.total_tokens ?? 'Unknown']];
    const path = r.code_artifact || '';
    const safePath = /^[a-zA-Z0-9_/-]+\.html$/.test(path) && !path.includes('..');
    const source = safePath ? `<a class="rank-button" href="benchmark/results/${esc(path)}" target="_blank" rel="noopener noreferrer">Inspect generation ↗</a>` : '';
    const sum = D.components.reduce((a,c)=>a+(D.finite(r[c.key])?r[c.key]:0),0);
    $('detail-card').innerHTML=`<span class="eyebrow">Selected result / ${esc(r.provider)}</span><h2>${esc(r.name)}</h2><span class="status-chip">${esc(r.provenance==='mock'?'Mock generation · illustrative scores':r.provenance==='measured'?'Rendered-output record':'Unverified source checks')}</span><dl class="detail-grid">${fields.map(([k,v])=>`<div><dt>${k}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl><p class="muted">${r.provenance==='mock'?'This output and its telemetry were generated by the offline mock provider. These numbers cannot establish model performance.':'Inspect the artifacts and evaluation protocol before interpreting this result.'}${Math.abs(sum-r.score)>.11?' Component sum differs from the reported total; inspect the source manifest.':''}</p><div class="detail-links" style="margin-top:20px">${source}<a class="rank-button" href="benchmark/results/leaderboard_results.json">Full result manifest ↗</a></div>`;
  }
  function render() {
    const query=$('rank-search').value.trim().toLowerCase(), cohort=$('rank-cohort').value, key=selectedMetric();
    visible=D.sortRows(rows.filter(r=>r.provenance===cohort && r.model_id.toLowerCase().includes(query)),key);
    if (!visible.some(r=>r.model_id===selected)) selected=visible[0]?.model_id || null;
    $('filter-count').textContent=`${visible.length} result${visible.length===1?'':'s'} in this view · ${cohort==='mock'?'demonstration data':cohort==='measured'?'measured visual records':'unverified source checks'}`;
    $('composition-chart').innerHTML=barChart(visible,'score',100,true);
    $('ranking-title').textContent=$('rank-metric').selectedOptions[0].textContent;
    const max = key==='score'?100:D.components.find(c=>c.key===key)?.max || Math.max(1e-9,...visible.map(r=>metricValue(r,key)||0));
    $('ranking-chart').innerHTML=barChart(visible,key,max);
    $('cost-chart').innerHTML=barChart(D.sortRows(visible,'cost_usd'),'cost_usd',Math.max(1e-9,...visible.map(r=>r.cost_usd||0)));
    $('latency-chart').innerHTML=barChart(D.sortRows(visible,'latency_ms'),'latency_ms',Math.max(1,...visible.map(r=>r.latency_ms||0)));
    renderScatter(); renderTable(); renderCoverage(); renderDetail();
  }
  function csv() {
    const keys=['model_id','provenance','evaluation_kind','score',...D.components.map(c=>c.key),'cost_usd','latency_ms','ttft_ms','eval_timestamp'];
    const quote = v => '"'+String(v??'').replace(/"/g,'""')+'"';
    const content=[keys,...visible.map(r=>keys.map(k=>r[k]))].map(row=>row.map(quote).join(',')).join('\r\n');
    const url=URL.createObjectURL(new Blob([content],{type:'text/csv;charset=utf-8'}));
    const link=document.createElement('a'); link.href=url; link.download=`vangogh-${$('rank-cohort').value}-results.csv`; link.click(); setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  try {
    let response;
    try { response=await fetch('api/leaderboard'); if (!response.ok) throw new Error('API unavailable'); }
    catch { response=await fetch('benchmark/results/leaderboard_results.json'); }
    if (!response.ok) throw new Error('Result manifest unavailable');
    const manifest=await response.json();
    if (!Array.isArray(manifest.leaderboard)) throw new Error('Invalid result manifest');
    rows=D.normalize(manifest);
    const providers=[...new Set(rows.map(r=>r.provider))].sort();
    providerColors=Object.fromEntries(providers.map((p,i)=>[p,palette[i%palette.length]]));
    const measured=rows.filter(r=>r.provenance==='measured').length, mocks=rows.filter(r=>r.provenance==='mock').length;
    $('rank-cohort').value=measured?'measured':mocks?'mock':'unverified';
    $('dataset-status').textContent=measured?'Measured results available':'Research preview · no measured visual results';
    const dates=rows.map(r=>r.eval_timestamp).filter(Boolean).sort();
    $('release-meta').textContent=`Export v${manifest.benchmark_metadata?.version || 'unknown'} · latest record ${dates.at(-1)?.slice(0,10) || 'unknown'}`;
    $('provenance-notice').textContent=measured?`${measured} measured visual records available. Demonstration and unverified records are kept in separate views.`:`The current export contains ${mocks} mock results and ${rows.length-mocks} unverified records. Demonstration charts let you explore the interface; they are not measured model rankings.`;
    $('rank-stats').innerHTML=[[rows.length,'Result records'],[measured,'Measured visual results'],[providers.length,'Providers represented'],[D.components.length,'Legacy score components']].map(([v,k])=>`<div><strong>${v}</strong><span>${k}</span></div>`).join('');
    $('component-legend').innerHTML=D.components.map(c=>`<span><i class="swatch" style="--swatch:${c.color}"></i>${c.label} / ${c.max}</span>`).join('');
    $('rank-filters').addEventListener('submit',e=>e.preventDefault());
    $('rank-search').addEventListener('input',render);
    $('rank-cohort').addEventListener('change',render);
    $('rank-metric').addEventListener('change',render);
    $('export-csv').addEventListener('click',csv);
    document.querySelector('.rank-main').addEventListener('click',e=>{
      const target=e.target.closest('[data-model]'); if (!target) return;
      selected=target.dataset.model; render();
    });
    render();
  } catch(error) {
    $('dataset-status').textContent='Results unavailable';
    $('provenance-notice').textContent='Could not load the result manifest. No fallback scores are shown. Reload the page or download the source JSON above.';
    $('rank-filters').hidden=true;
    $('filter-count').textContent=error.message;
  }
})();
