/**
 * Interface de checkpoint do grafo. O adaptador em memória é somente para testes.
 * Um backend de produção deve implementar CAS + inserção de evento numa mesma
 * transação PostgreSQL usando a migração 0001_workflow_checkpoints.sql.
 */
const valid = x => typeof x === "string" && x.length > 0;
export function createMemoryCheckpointStore() {
  const states = new Map();
  const events = new Map();
  return Object.freeze({
    async initialize({tenantId, workflowId, state}) {
      if (![tenantId, workflowId].every(valid)) throw new TypeError("Identificadores obrigatórios");
      if (!state || state.version !== 1) throw new Error("Estado inicial deve ter versão 1");
      const key = JSON.stringify([tenantId, workflowId]);
      if (states.has(key)) throw new Error("Workflow já existe");
      states.set(key, structuredClone(state));
      events.set(key, new Map());
      return structuredClone(state);
    },
    async load({tenantId, workflowId}) {
      const value = states.get(JSON.stringify([tenantId, workflowId]));
      return value === undefined ? null : structuredClone(value);
    },
    async commit({tenantId, workflowId, expectedVersion, state, eventId, event}) {
      const key = JSON.stringify([tenantId, workflowId]);
      const old = states.get(key);
      if (!old) throw new Error("Workflow desconhecido");
      if (!valid(eventId)) throw new TypeError("ID de evento obrigatório");
      if (!Number.isSafeInteger(expectedVersion)) throw new Error("Versão inválida");
      const ledger = events.get(key);
      if (ledger.has(eventId)) {
        return {applied:false, duplicate:true, state:structuredClone(old)};
      }
      if (old.version !== expectedVersion) throw new Error("Conflito de versão");
      if (!state || state.version !== old.version + 1) throw new Error("Versão seguinte inválida");
      ledger.set(eventId,structuredClone(event));
      states.set(key,structuredClone(state));
      return {applied:true, duplicate:false, state:structuredClone(state)};
    },
    async listEvents({tenantId, workflowId}) {
      const ledger = events.get(JSON.stringify([tenantId, workflowId]));
      return ledger ? [...ledger.entries()].map(([eventId,event])=>({eventId,event:structuredClone(event)})) : [];
    }
  });
}

export async function runGraphStep({store, tenantId, workflowId, eventId, transition}) {
  if (typeof transition !== "function") throw new TypeError("Transição obrigatória");
  const current = await store.load({tenantId,workflowId});
  if (!current) throw new Error("Workflow não localizado");
  const outcome = transition(structuredClone(current));
  if (!outcome || outcome.advanced !== true || !outcome.state) {
    return {applied:false, waitingFor:outcome?.waitingFor || null, state:current};
  }
  const saved = await store.commit({
    tenantId,workflowId,expectedVersion:current.version,eventId,
    state:outcome.state,
    event:{from:current.node,to:outcome.state.node,version:outcome.state.version}
  });
  return {...saved,waitingFor:null};
}
