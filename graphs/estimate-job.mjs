// VÉRTICE ONE: orquestrador determinístico de estimativas (adaptável a LangGraph).
// O webhook REAL deve ser autenticado, verificado e persistido atomicamente pela API.
export const ESTIMATE_STATES = Object.freeze(["queued", "running", "awaiting_review", "approved", "failed", "cancelled"]);
const allowed = Object.freeze({
  queued:["running","cancelled"],
  running:["awaiting_review","failed","cancelled"],
  awaiting_review:["approved","failed","cancelled"],
  approved:[], failed:[], cancelled:[]
});
const filled = x => typeof x === "string" && x.trim().length>0;
export function newEstimate({id,demandId,scopeVersion,idempotencyKey}) {
  if (![id,demandId,idempotencyKey].every(filled)) throw new TypeError("Missing identifiers");
  if (!Number.isSafeInteger(scopeVersion)||scopeVersion<1) throw new TypeError("Invalid scopeVersion");
  return Object.freeze({id,demandId,scopeVersion,idempotencyKey,status:"queued",version:1,estimateRef:null});
}
export function changeEstimate(job,to,{expectedVersion,authorized=false,estimateRef}={}) {
  if (!job||!ESTIMATE_STATES.includes(job.status)) throw new TypeError("Invalid job");
  if (expectedVersion!==job.version) throw new Error("Version conflict");
  if (!authorized) throw new Error("Operator unauthorized");
  if (!allowed[job.status].includes(to)) throw new Error("Invalid transition");
  if (to==="awaiting_review"&&!filled(estimateRef)) throw new Error("Verified estimate reference required");
  if (to==="approved"&&!filled(job.estimateRef)) throw new Error("Review not ready");
  return Object.freeze({...job,status:to,version:job.version+1,estimateRef:to==="awaiting_review"?estimateRef:job.estimateRef});
}
export function validateEstimateCallback(job,{jobId,scopeVersion,expectedVersion}) {
  if (!job||job.id!==jobId) throw new Error("Unknown job");
  if (job.scopeVersion!==scopeVersion) throw new Error("Stale scope");
  if (job.version!==expectedVersion) throw new Error("Version conflict");
  if (job.status!=="running") throw new Error("Unexpected callback");
  return true;
}
