import test from "node:test";
import assert from "node:assert/strict";
import { createDemand, transitionDemand, DEMAND_STATUSES } from "../packages/domain/demand.mjs";

const newDemand = () => createDemand({ id: "dem-1", customerId: "c-1", propertyId: "p-1" });
const move = (d, status, updates = {}) => transitionDemand(d, status, {
  expectedVersion: d.version, authorized: true, updates
});

test("new demand starts RECEIVED and version 1", () => {
  const d = newDemand();
  assert.equal(d.status, "RECEIVED");
  assert.equal(d.version, 1);
  assert.ok(Object.isFrozen(d));
});
test("status names are unique", () => assert.equal(new Set(DEMAND_STATUSES).size, DEMAND_STATUSES.length));
test("missing customer is rejected", () =>
  assert.throws(() => createDemand({ id: "x", customerId: "", propertyId: "p" }), /customerId/));
test("transition requires authorization", () =>
  assert.throws(() => transitionDemand(newDemand(), "TRIAGING", { expectedVersion: 1 }), /Authorized/));
test("transition requires matching version", () =>
  assert.throws(() => transitionDemand(newDemand(), "TRIAGING", { expectedVersion: 2, authorized: true }), /Version conflict/));
test("cannot skip stages", () => assert.throws(() => move(newDemand(), "COMPLETED"), /Invalid transition/));
test("technical scope required before estimating", () => {
  const triage = move(newDemand(), "TRIAGING");
  assert.throws(() => move(triage, "ESTIMATING"), /technicalScopeId/);
  assert.equal(move(triage, "ESTIMATING", { technicalScopeId: "scope-1" }).version, 3);
});
test("proposal must be linked before acceptance", () => {
  const p = move(move(move(newDemand(), "TRIAGING"), "ESTIMATING", { technicalScopeId: "s" }), "PROPOSAL_PENDING");
  assert.throws(() => move(p, "ACCEPTED"), /acceptedProposalId/);
  assert.equal(move(p, "ACCEPTED", { acceptedProposalId: "proposal-1" }).status, "ACCEPTED");
});
test("unresolved blockers stop progress", () =>
  assert.throws(() => move({ ...newDemand(), blockers: ["pending safety check"] }, "TRIAGING"), /blockers/));
test("protected fields cannot be overwritten", () =>
  assert.throws(() => move(newDemand(), "TRIAGING", { customerId: "other" }), /Unsupported/));
test("cancelled demand cannot reopen", () =>
  assert.throws(() => move(move(newDemand(), "CANCELLED"), "TRIAGING"), /Invalid transition/));
