/**
 * VÉRTICE ONE — núcleo de demandas.
 * Funções puras: persistência e autenticação são responsabilidades da API.
 */
export const DEMAND_STATUSES = Object.freeze([
  "RECEIVED", "TRIAGING", "ESTIMATING", "PROPOSAL_PENDING",
  "ACCEPTED", "DISPATCHING", "CONTRACTING", "READY",
  "IN_PROGRESS", "CUSTOMER_REVIEW", "REWORK",
  "COMPLETED", "CANCELLED"
]);

const transitions = Object.freeze({
  RECEIVED: ["TRIAGING", "CANCELLED"],
  TRIAGING: ["ESTIMATING", "CANCELLED"],
  ESTIMATING: ["PROPOSAL_PENDING", "CANCELLED"],
  PROPOSAL_PENDING: ["ACCEPTED", "ESTIMATING", "CANCELLED"],
  ACCEPTED: ["DISPATCHING", "CANCELLED"],
  DISPATCHING: ["CONTRACTING", "CANCELLED"],
  CONTRACTING: ["READY", "CANCELLED"],
  READY: ["IN_PROGRESS", "CANCELLED"],
  IN_PROGRESS: ["CUSTOMER_REVIEW", "CANCELLED"],
  CUSTOMER_REVIEW: ["COMPLETED", "REWORK"],
  REWORK: ["IN_PROGRESS", "CANCELLED"],
  COMPLETED: [],
  CANCELLED: []
});

const requiredLinks = Object.freeze({
  ESTIMATING: ["technicalScopeId"],
  ACCEPTED: ["acceptedProposalId"],
  READY: ["partnerId", "workOrderId"],
  IN_PROGRESS: ["workOrderId"],
  CUSTOMER_REVIEW: ["workOrderId"],
  COMPLETED: ["workOrderId"]
});

const isNonEmpty = value => typeof value === "string" && value.trim().length > 0;

export function createDemand({ id, customerId, propertyId }) {
  for (const [field, value] of Object.entries({ id, customerId, propertyId })) {
    if (!isNonEmpty(value)) throw new TypeError(field + " is required");
  }
  return Object.freeze({ id, customerId, propertyId, status: "RECEIVED", version: 1, blockers: [] });
}

export function transitionDemand(demand, nextStatus, { expectedVersion, updates = {}, authorized = false } = {}) {
  if (!demand || typeof demand !== "object" || !Number.isSafeInteger(demand.version) || demand.version < 1) {
    throw new TypeError("Valid demand required");
  }
  if (expectedVersion !== demand.version) throw new Error("Version conflict");
  if (!authorized) throw new Error("Authorized approval required");
  if (!DEMAND_STATUSES.includes(demand.status) || !DEMAND_STATUSES.includes(nextStatus)) {
    throw new Error("Unknown demand status");
  }
  if (!transitions[demand.status].includes(nextStatus)) {
    throw new Error("Invalid transition: " + demand.status + " -> " + nextStatus);
  }
  const permitted = ["technicalScopeId", "estimateVersionId", "acceptedProposalId", "partnerId", "workOrderId"];
  if (!updates || Array.isArray(updates) || Object.keys(updates).some(k => !permitted.includes(k))) {
    throw new Error("Unsupported field update");
  }
  const changed = { ...demand, ...updates, status: nextStatus, version: demand.version + 1 };
  if (Array.isArray(changed.blockers) && changed.blockers.length && nextStatus !== "CANCELLED") {
    throw new Error("Demand has unresolved blockers");
  }
  for (const field of requiredLinks[nextStatus] || []) {
    if (!isNonEmpty(changed[field])) throw new Error("Missing required link: " + field);
  }
  return Object.freeze(changed);
}
