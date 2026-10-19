const test = require('node:test');
const assert = require('node:assert/strict');
const D = require('../assets/rankings-data.js');

test('mock and source heuristics never enter measured visual cohort', () => {
  const rows = D.normalize({leaderboard:[
    {model_id:'a/mock',provenance:'measured',evaluation_kind:'rendered-output'},
    {model_id:'b/source',provenance:'measured',evaluation_kind:'source-heuristic'},
    {model_id:'c/render',provenance:'measured',evaluation_kind:'rendered-output'},
    {model_id:'d/unknown'},
  ], model_details:{'a/mock':{telemetry:{is_mock:true}}}});
  assert.deepEqual(rows.map(r=>r.provenance),['mock','unverified','measured','unverified']);
});
test('Pareto frontier removes dominated and failed entries, preserves real zero cost', () => {
  const row=(model_id,cost_usd,score,passed_anti_cheat=true)=>({model_id,cost_usd,score,passed_anti_cheat});
  const rows=[row('free',0,50),row('cheap',1,80),row('dominated',2,70),row('quality',3,90),row('failed',0,100,false)];
  assert.deepEqual(D.frontier(rows).map(r=>r.model_id),['free','cheap','quality']);
});
test('ranking preserves zero, missing values sort last, ties are stable by model ID', () => {
  const rows=[{model_id:'missing',cost_usd:null},{model_id:'b',cost_usd:1},{model_id:'a',cost_usd:1},{model_id:'free',cost_usd:0}];
  assert.deepEqual(D.sortRows(rows,'cost_usd').map(r=>r.model_id),['free','a','b','missing']);
});
test('cost per success uses observed successes and cannot divide by a quality score', () => {
  assert.equal(D.observedCostPerSuccess(12,3),4);
  assert.equal(D.observedCostPerSuccess(12,0),null);
  assert.equal(D.observedCostPerSuccess(12,94.8),null);
});
