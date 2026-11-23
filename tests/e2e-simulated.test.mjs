import test from "node:test";
import assert from "node:assert/strict";
import {createDemand,transitionDemand} from "../packages/domain/demand.mjs";
import {DEMAND_GRAPH,startDemandGraph,advanceDemandGraph} from "../graphs/demand-graph.mjs";
import {newEstimate,changeEstimate,validateEstimateCallback} from "../graphs/estimate-job.mjs";

function runScenario({ rejectTechnical = false, rejectCallback = false } = {}) {
  const audit = [];
  let demand = createDemand({id:"d-e2e-1",customerId:"client-e2e-1",propertyId:"property-e2e-1"});
  let graph = startDemandGraph({demandId:demand.id});
  let estimate = null;
  function advance({approval=true}={}) {
    const node = graph.node;
    const gate = DEMAND_GRAPH[node].gate;
    const result = advanceDemandGraph(graph,{
      expectedVersion:graph.version,
      authorized:true,
      approvals: gate && approval ? {[gate]:true} : {},
      evidence: gate ? {id:`evidence-${graph.version}`} : null
    });
    if(result.advanced){
      audit.push({from:node,to:result.state.node,gate:gate||null});
      graph=result.state;
    }
    return result;
  }
  while(graph.node!=="retention"){
    if(graph.node==="triage") demand=transitionDemand(demand,"TRIAGING",{expectedVersion:demand.version,authorized:true});
    if(graph.node==="technical_scope"){
      if(rejectTechnical){
        const blocked=advance({approval:false});
        assert.equal(blocked.advanced,false);
        return {graph,demand,estimate,audit,blocked};
      }
      demand=transitionDemand(demand,"ESTIMATING",{expectedVersion:demand.version,authorized:true,updates:{technicalScopeId:"scope-1"}});
    }
    if(graph.node==="pricing"){
      estimate=newEstimate({id:"estimate-task-1",demandId:demand.id,scopeVersion:1,idempotencyKey:"estimate-request-1"});
      estimate=changeEstimate(estimate,"running",{expectedVersion:estimate.version,authorized:true});
      if(rejectCallback){
        assert.throws(()=>validateEstimateCallback(estimate,{
          jobId:estimate.id,scopeVersion:999,expectedVersion:estimate.version
        }),/Stale scope/);
        return {graph,demand,estimate,audit};
      }
      assert.equal(validateEstimateCallback(estimate,{
        jobId:estimate.id,scopeVersion:1,expectedVersion:estimate.version
      }),true);
      estimate=changeEstimate(estimate,"awaiting_review",{
        expectedVersion:estimate.version,authorized:true,estimateRef:"validated-estimate-1"
      });
      estimate=changeEstimate(estimate,"approved",{expectedVersion:estimate.version,authorized:true});
      demand=transitionDemand(demand,"PROPOSAL_PENDING",{expectedVersion:demand.version,authorized:true,updates:{estimateVersionId:"validated-estimate-1"}});
    }
    if(graph.node==="await_customer_acceptance"){
      demand=transitionDemand(demand,"ACCEPTED",{expectedVersion:demand.version,authorized:true,updates:{acceptedProposalId:"proposal-1"}});
    }
    if(graph.node==="partner_match"){
      demand=transitionDemand(demand,"DISPATCHING",{expectedVersion:demand.version,authorized:true});
    }
    if(graph.node==="contract"){
      demand=transitionDemand(demand,"CONTRACTING",{expectedVersion:demand.version,authorized:true});
    }
    if(graph.node==="release_os"){
      demand=transitionDemand(demand,"READY",{expectedVersion:demand.version,authorized:true,updates:{partnerId:"partner-1",workOrderId:"os-1"}});
    }
    if(graph.node==="execute"){
      demand=transitionDemand(demand,"IN_PROGRESS",{expectedVersion:demand.version,authorized:true});
    }
    if(graph.node==="customer_review"){
      demand=transitionDemand(demand,"CUSTOMER_REVIEW",{expectedVersion:demand.version,authorized:true});
    }
    if(graph.node==="billing"){
      demand=transitionDemand(demand,"COMPLETED",{expectedVersion:demand.version,authorized:true});
    }
    const result=advance();
    assert.equal(result.advanced,true,`Node ${graph.node} should advance`);
  }
  return {graph,demand,estimate,audit};
}
test("E2E simulado: demanda -> orçamento -> aceite -> OS -> encerramento",()=>{
  const {graph,demand,estimate,audit}=runScenario();
  assert.equal(graph.node,"retention");
  assert.equal(demand.status,"COMPLETED");
  assert.equal(estimate.status,"approved");
  assert.equal(audit.length,Object.keys(DEMAND_GRAPH).length-1);
  assert.equal(audit.filter(x=>x.gate!==null).length,Object.values(DEMAND_GRAPH).filter(x=>x.gate).length);
});
test("E2E simulado: gate técnico impede sequência",()=>{
  const {graph,estimate,blocked}=runScenario({rejectTechnical:true});
  assert.equal(graph.node,"technical_scope");
  assert.equal(estimate,null);
  assert.equal(blocked.waitingFor,"technical_approval");
});
test("E2E simulado: callback de versão errada não libera orçamento",()=>{
  const {graph,estimate}=runScenario({rejectCallback:true});
  assert.equal(graph.node,"pricing");
  assert.equal(estimate.status,"running");
});
