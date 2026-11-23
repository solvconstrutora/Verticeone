import test from "node:test";
import assert from "node:assert/strict";
import {createMemoryCheckpointStore,runGraphStep} from "../graphs/checkpoint-store.mjs";
import {startDemandGraph,advanceDemandGraph} from "../graphs/demand-graph.mjs";

const ids={tenantId:"test-tenant",workflowId:"demand-123"};
const create=()=>startDemandGraph({demandId:"demand-123"});
const next=state=>advanceDemandGraph(state,{expectedVersion:state.version,authorized:true});

test("checkpoint permite retomar de outra execução",async()=>{
 const store=createMemoryCheckpointStore();
 await store.initialize({...ids,state:create()});
 const a=await runGraphStep({...ids,store,eventId:"message-1",transition:next});
 assert.equal(a.state.node,"identify_customer");
 const resumed=await store.load(ids);
 assert.equal(resumed.node,"identify_customer");
 assert.equal(resumed.version,2);
});
test("evento duplicado não aplica atualização duas vezes",async()=>{
 const store=createMemoryCheckpointStore();
 await store.initialize({...ids,state:create()});
 await runGraphStep({...ids,store,eventId:"message-1",transition:next});
 const result=await runGraphStep({...ids,store,eventId:"message-1",transition:next});
 assert.equal(result.duplicate,true);
 assert.equal((await store.load(ids)).version,2);
 assert.equal((await store.listEvents(ids)).length,1);
});
test("escrita com versão desatualizada é rejeitada",async()=>{
 const store=createMemoryCheckpointStore();
 await store.initialize({...ids,state:create()});
 const initial=await store.load(ids);
 await runGraphStep({...ids,store,eventId:"message-1",transition:next});
 assert.rejects(()=>store.commit({...ids,expectedVersion:initial.version,eventId:"message-2",state:{...initial,version:2},event:{}}),/Conflito/);
});
test("outro locatário não consegue ler o workflow",async()=>{
 const store=createMemoryCheckpointStore();
 await store.initialize({...ids,state:create()});
 assert.equal(await store.load({tenantId:"outro",workflowId:ids.workflowId}),null);
});
test("gate não aprovado preserva estado",async()=>{
 const store=createMemoryCheckpointStore();
 await store.initialize({...ids,state:create()});
 for(let n=0;n<3;n++)await runGraphStep({...ids,store,eventId:"event-"+n,transition:next});
 const before=await store.load(ids);
 const result=await runGraphStep({...ids,store,eventId:"gate-1",transition:next});
 assert.equal(result.waitingFor,"technical_approval");
 assert.equal(result.applied,false);
 assert.deepEqual(await store.load(ids),before);
 assert.equal((await store.listEvents(ids)).length,3);
});
test("store não devolve referência mutável",async()=>{
 const store=createMemoryCheckpointStore();await store.initialize({...ids,state:create()});
 const value=await store.load(ids);value.node="tampered";
 assert.equal((await store.load(ids)).node,"intake");
});
