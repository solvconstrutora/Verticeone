import test from "node:test";
import assert from "node:assert/strict";
import { DEMAND_GRAPH, GRAPH_GATES, startDemandGraph, advanceDemandGraph } from "../graphs/demand-graph.mjs";
const approve = (state, extra = {}) => advanceDemandGraph(state, { expectedVersion: state.version, authorized: true, ...extra });

test("grafo começa em intake e versão 1", () => {
  const s = startDemandGraph({ demandId: "d1" });
  assert.equal(s.node, "intake"); assert.equal(s.version, 1);
});
test("identificação é etapa seguinte", () => assert.equal(approve(startDemandGraph({ demandId: "d1" })).state.node, "identify_customer"));
test("grafo rejeita autorização ausente", () => assert.throws(() => advanceDemandGraph(startDemandGraph({ demandId:"d1" }), { expectedVersion:1 }), /authorization/));
test("grafo rejeita versão desatualizada", () => assert.throws(() => advanceDemandGraph(startDemandGraph({ demandId:"d1" }), { expectedVersion:2, authorized:true }), /conflict/));
test("gate técnico bloqueia avanço sem aprovação", () => {
  let s=startDemandGraph({demandId:"d1"});
  for(let i=0;i<3;i++)s=approve(s).state;
  assert.equal(s.node,"technical_scope");
  const wait=approve(s);
  assert.equal(wait.advanced,false); assert.equal(wait.waitingFor,"technical_approval"); assert.equal(wait.state.version,s.version);
});
test("aprovação sem evidência não passa", () => {
  let s=startDemandGraph({demandId:"d1"}); for(let i=0;i<3;i++)s=approve(s).state;
  assert.throws(()=>approve(s,{approvals:{technical_approval:true}}),/evidence/);
  const ok=approve(s,{approvals:{technical_approval:true},evidence:{id:"ev-1"}});
  assert.equal(ok.state.node,"quantify");assert.equal(ok.state.history.at(-1).evidenceId,"ev-1");
});
test("todos os gates declarados têm nomes exclusivos", () => assert.equal(GRAPH_GATES.length,new Set(GRAPH_GATES).size));
test("todos os próximos nós existem",()=>{for(const node of Object.values(DEMAND_GRAPH)){if(node.next)assert.ok(DEMAND_GRAPH[node.next]);}});
test("sem ciclos no fluxo principal",()=>{
  const seen=new Set();let node="intake";
  while(node){assert.ok(!seen.has(node));seen.add(node);node=DEMAND_GRAPH[node].next;}
  assert.ok(seen.has("retention"));
});
test("fluxo completo só avança com todas as evidências",()=>{
  let s=startDemandGraph({demandId:"d1"});
  while(s.node!=="retention"){
    const gate=DEMAND_GRAPH[s.node].gate;
    const result=approve(s,gate?{approvals:{[gate]:true},evidence:{id:"ev-"+s.version}}:{});
    s=result.state;
  }
  assert.equal(s.history.length,Object.keys(DEMAND_GRAPH).length-1);
  assert.throws(()=>approve(s),/already finished/);
});
