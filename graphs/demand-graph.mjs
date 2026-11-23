/**
 * Grafo operacional declarativo VÉRTICE ONE.
 * Implementação determinística inicial, sem dependência de serviço externo.
 * Uma futura adaptação para LangGraph deve preservar as mesmas regras/gates.
 */
export const DEMAND_GRAPH = Object.freeze({
  intake: { next: "identify_customer" },
  identify_customer: { next: "triage" },
  triage: { next: "technical_scope" },
  technical_scope: { next: "quantify", gate: "technical_approval" },
  quantify: { next: "sinapi_lookup" },
  sinapi_lookup: { next: "pricing", gate: "valid_sinapi" },
  pricing: { next: "credit", gate: "pricing_approval" },
  credit: { next: "proposal", gate: "credit_approval" },
  proposal: { next: "await_customer_acceptance" },
  await_customer_acceptance: { next: "partner_match", gate: "customer_acceptance" },
  partner_match: { next: "dispatch" },
  dispatch: { next: "contract", gate: "partner_confirmation" },
  contract: { next: "plan_resources", gate: "signed_contract" },
  plan_resources: { next: "release_os" },
  release_os: { next: "execute", gate: "os_authorization" },
  execute: { next: "customer_review", gate: "execution_evidence" },
  customer_review: { next: "billing", gate: "customer_approval" },
  billing: { next: "reconciliation", gate: "fiscal_validation" },
  reconciliation: { next: "payout", gate: "payment_settled" },
  payout: { next: "retention", gate: "payout_authorization" },
  retention: { next: null }
});
const gateList = [...new Set(Object.values(DEMAND_GRAPH).map(n => n.gate).filter(Boolean))];
export const GRAPH_GATES = Object.freeze(gateList);

const checkId = x => typeof x === "string" && x.trim().length > 0;
export function startDemandGraph({ demandId }) {
  if (!checkId(demandId)) throw new TypeError("demandId required");
  return Object.freeze({ demandId, node: "intake", version: 1, history: [] });
}

/**
 * The caller must authenticate/authorize approvers, persist state and audit atomically.
 * Passing evidence here never grants permission on its own.
 */
export function advanceDemandGraph(state, { expectedVersion, approvals = {}, evidence = null, authorized = false } = {}) {
  if (!state || !checkId(state.demandId) || !Array.isArray(state.history) || !Number.isSafeInteger(state.version)) {
    throw new TypeError("Invalid graph state");
  }
  if (expectedVersion !== state.version) throw new Error("Graph version conflict");
  if (!authorized) throw new Error("Operator authorization required");
  const current = DEMAND_GRAPH[state.node];
  if (!current) throw new Error("Unknown graph node");
  if (!current.next) throw new Error("Graph already finished");
  if (current.gate && approvals[current.gate] !== true) {
    return Object.freeze({ state, waitingFor: current.gate, advanced: false });
  }
  if (current.gate && !checkId(evidence?.id)) throw new Error("Gate evidence id required");
  const event = Object.freeze({ from: state.node, to: current.next, gate: current.gate || null, evidenceId: evidence?.id || null });
  const next = Object.freeze({
    ...state,
    node: current.next,
    version: state.version + 1,
    history: Object.freeze([...state.history, event])
  });
  return Object.freeze({ state: next, waitingFor: null, advanced: true });
}
