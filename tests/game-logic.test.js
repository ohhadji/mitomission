import test from "node:test";
import assert from "node:assert/strict";

import {
  BRIDGE_STEPS,
  FINAL_GATE_SECTIONS,
  MAX_SCORE,
  METABOLIC_EVENTS,
  MISSION_SEQUENCE,
  SCORE_RULES,
  TCA_LEVELS,
  getChallengeBySequenceEntry
} from "../js/game-data.js";
import {
  applyLedgerUpdate,
  applyPenalty,
  awardChallenge,
  calculateTcaAtpEquivalents,
  clearSavedState,
  completeChallenge,
  completeFinalSection,
  createInitialState,
  isPerfectMolecularAccounting,
  loadState,
  purchaseExtraLife,
  purchaseHint,
  rankForCredits,
  saveState,
  validateState
} from "../js/game-state.js";
import { validateFinalAnswer } from "../js/final-gate.js";

function memoryStorage() {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key)
  };
}

test("fresh state starts at the bridge with five Credits, three lives and empty ledgers", () => {
  const state = createInitialState();
  assert.equal(state.phase, "title");
  assert.equal(state.atpCredits, 5);
  assert.equal(state.lives, 3);
  assert.equal(state.currentIntermediate, "pyruvate");
  assert.deepEqual(state.bridgeLedger, { acetylCoA: 0, nadh: 0, co2: 0, directAtp: 0 });
  assert.deepEqual(state.tcaLedger, {
    nadh: 0,
    fadh2Equivalent: 0,
    gtp: 0,
    co2: 0,
    oxaloacetateRegenerated: false
  });
});

test("bridge completion awards exactly five Credits and applies its ledger once", () => {
  const state = createInitialState();
  const bridge = BRIDGE_STEPS.at(-1);
  const first = completeChallenge(state, bridge);
  const second = completeChallenge(state, bridge);

  assert.equal(first.reward, 5);
  assert.equal(first.ledgerChanged, true);
  assert.equal(second.reward, 0);
  assert.equal(second.ledgerChanged, false);
  assert.equal(state.atpCredits, 10);
  assert.deepEqual(state.bridgeLedger, { acetylCoA: 1, nadh: 1, co2: 1, directAtp: 0 });
});

test("the fixed mission sequence places every level and event in the required order", () => {
  assert.deepEqual(
    MISSION_SEQUENCE.map((entry) => entry.id),
    [
      "level-1",
      "level-2",
      "level-3",
      "event-demand",
      "event-thiamine",
      "level-4",
      "level-5",
      "level-6",
      "level-7",
      "event-oxygen",
      "level-8",
      "event-anaplerosis"
    ]
  );
  assert.equal(MISSION_SEQUENCE.filter((entry) => entry.kind === "level").length, 8);
  assert.equal(MISSION_SEQUENCE.filter((entry) => entry.kind === "event").length, 4);
});

test("a perfect run reaches exactly 50 Mito Bucks and the correct molecular ledgers", () => {
  const state = createInitialState();
  completeChallenge(state, BRIDGE_STEPS.at(-1));
  MISSION_SEQUENCE.forEach((entry) => completeChallenge(state, getChallengeBySequenceEntry(entry)));

  assert.equal(state.atpCredits, MAX_SCORE);
  assert.equal(state.rewardedChallenges.length, 13);
  assert.equal(state.completedLevels.length, 8);
  assert.equal(state.completedEvents.length, 4);
  assert.deepEqual(state.bridgeLedger, { acetylCoA: 1, nadh: 1, co2: 1, directAtp: 0 });
  assert.deepEqual(state.tcaLedger, {
    nadh: 3,
    fadh2Equivalent: 1,
    gtp: 1,
    co2: 2,
    oxaloacetateRegenerated: true
  });
  assert.equal(isPerfectMolecularAccounting(state), true);
  assert.deepEqual(calculateTcaAtpEquivalents(state.tcaLedger), {
    nadhAtp: 7.5,
    fadh2Atp: 1.5,
    gtpAtp: 1,
    total: 10
  });
});

test("reward and ledger services reject repeated IDs", () => {
  const state = createInitialState();
  assert.equal(awardChallenge(state, "level-test", 3), 3);
  assert.equal(awardChallenge(state, "level-test", 3), 0);
  assert.equal(state.atpCredits, 8);
  assert.equal(applyLedgerUpdate(state, "ledger-test", { scope: "tca", values: { nadh: 1 } }), true);
  assert.equal(applyLedgerUpdate(state, "ledger-test", { scope: "tca", values: { nadh: 1 } }), false);
  assert.equal(state.tcaLedger.nadh, 1);
});

test("penalties match bridge, level, event and Final Gate rules", () => {
  const bridge = createInitialState();
  const bridgePenalty = applyPenalty(bridge, "bridge", "bridge-test");
  assert.equal(bridgePenalty.creditLoss, 0);
  assert.equal(bridgePenalty.lifeLoss, 0);
  assert.equal(bridge.atpCredits, 5);
  assert.equal(bridge.lives, 3);

  const level = createInitialState();
  const levelPenalty = applyPenalty(level, "level", "level-test");
  assert.equal(levelPenalty.scientificCreditLoss, 1);
  assert.equal(levelPenalty.lifeLoss, 1);
  assert.equal(level.atpCredits, 4);
  assert.equal(level.lives, 2);

  const event = createInitialState();
  const eventPenalty = applyPenalty(event, "event", "event-test");
  assert.equal(eventPenalty.scientificCreditLoss, 2);
  assert.equal(eventPenalty.lifeLoss, 1);
  assert.equal(event.atpCredits, 3);
  assert.equal(event.lives, 2);

  const finalGate = createInitialState();
  const finalPenalty = applyPenalty(finalGate, "final", "final-test");
  assert.equal(finalPenalty.scientificCreditLoss, 1);
  assert.equal(finalPenalty.lifeLoss, 0);
  assert.equal(finalGate.atpCredits, 4);
  assert.equal(finalGate.lives, 3);
});

test("Credits never fall below zero and lives never exceed three", () => {
  const state = createInitialState();
  state.atpCredits = 1;
  applyPenalty(state, "event", "event-test");
  assert.equal(state.atpCredits, 0);
  state.lives = 3;
  assert.deepEqual(purchaseExtraLife(state), { ok: false, reason: "lives-full" });
  assert.equal(state.lives, 3);
});

test("zero lives restarts the challenge with three lives, a reboot cost and Guided Mode", () => {
  const state = createInitialState();
  state.atpCredits = 10;
  state.lives = 1;
  state.completedLevels.push("level-1");
  state.tcaLedger.nadh = 1;

  const result = applyPenalty(state, "level", "level-2");
  assert.equal(result.rebooted, true);
  assert.equal(result.scientificCreditLoss, 1);
  assert.equal(result.rebootCost, 3);
  assert.equal(state.atpCredits, 6);
  assert.equal(state.lives, 3);
  assert.equal(state.guidedMode, true);
  assert.equal(state.guidedChallengeId, "level-2");
  assert.deepEqual(state.completedLevels, ["level-1"]);
  assert.equal(state.tcaLedger.nadh, 1);
});

test("hints cost two once per challenge and extra lives cost five", () => {
  const state = createInitialState();
  assert.deepEqual(purchaseHint(state, "level-1"), { ok: true, cost: 2 });
  assert.equal(state.atpCredits, 3);
  assert.deepEqual(purchaseHint(state, "level-1"), { ok: false, reason: "already-purchased" });
  assert.equal(state.atpCredits, 3);

  state.atpCredits = 7;
  state.lives = 2;
  assert.deepEqual(purchaseExtraLife(state), { ok: true, cost: 5 });
  assert.equal(state.atpCredits, 2);
  assert.equal(state.lives, 3);
});

test("hints reject unknown and already-completed challenges", () => {
  const state = createInitialState();
  assert.deepEqual(purchaseHint(state, "not-a-challenge"), { ok: false, reason: "unknown-challenge" });
  completeChallenge(state, TCA_LEVELS[0]);
  assert.deepEqual(purchaseHint(state, "level-1"), { ok: false, reason: "challenge-completed" });
  assert.equal(state.atpCredits, 8);
  assert.deepEqual(state.hintsPurchased, []);
});

test("unaffordable shop purchases do not mutate state", () => {
  const state = createInitialState();
  state.atpCredits = 1;
  state.lives = 2;
  assert.deepEqual(purchaseHint(state, "level-1"), { ok: false, reason: "insufficient-credits" });
  assert.deepEqual(purchaseExtraLife(state), { ok: false, reason: "insufficient-credits" });
  assert.equal(state.atpCredits, 1);
  assert.equal(state.lives, 2);
});

test("rank thresholds are exact", () => {
  assert.equal(rankForCredits(50), "Mito Master");
  assert.equal(rankForCredits(45), "Mito Master");
  assert.equal(rankForCredits(44), "TCA Trainee");
  assert.equal(rankForCredits(35), "TCA Trainee");
  assert.equal(rankForCredits(34), "Cycle Survivor");
  assert.equal(rankForCredits(25), "Cycle Survivor");
  assert.equal(rankForCredits(24), "Assisted Completion");
  assert.equal(rankForCredits(0), "Assisted Completion");
});

test("saved progress validates and cannot farm a completed reward after refresh", () => {
  const storage = memoryStorage();
  const state = createInitialState();
  BRIDGE_STEPS.forEach((step) => completeChallenge(state, step));
  completeChallenge(state, TCA_LEVELS[0]);
  saveState(state, storage);

  const reloaded = loadState(storage);
  assert.equal(reloaded.atpCredits, 13);
  assert.deepEqual(reloaded.completedLevels, ["level-1"]);
  completeChallenge(reloaded, TCA_LEVELS[0]);
  assert.equal(reloaded.atpCredits, 13);
});

test("invalid saved structures fall back safely to a fresh state", () => {
  const invalidVersion = validateState({ version: 999, atpCredits: 999 });
  assert.equal(invalidVersion.atpCredits, SCORE_RULES.startingCredits);

  const partlyInvalid = validateState({
    ...createInitialState(),
    atpCredits: -50,
    lives: 99,
    completedLevels: ["level-1", "level-1", 4],
    tcaLedger: { nadh: -3, fadh2Equivalent: 200, gtp: 1, co2: 1, oxaloacetateRegenerated: "yes" }
  });
  assert.equal(partlyInvalid.atpCredits, 0);
  assert.equal(partlyInvalid.lives, 3);
  assert.deepEqual(partlyInvalid.completedLevels, []);
  assert.equal(partlyInvalid.tcaLedger.nadh, 0);
  assert.equal(partlyInvalid.tcaLedger.oxaloacetateRegenerated, false);
});

test("save validation preserves only ordered completion prefixes and reconciles the phase", () => {
  const forged = validateState({
    ...createInitialState(),
    phase: "results",
    completedBridgeSteps: ["bridge-transport", "bridge-control", "unknown-bridge"],
    completedLevels: ["level-1", "level-3", "unknown-level"],
    completedEvents: ["event-demand"],
    rewardedChallenges: ["level-1", "level-3", "unknown-level"],
    ledgerAppliedChallenges: ["level-1", "unknown-level"],
    finalGateProgress: { section: 3, completed: ["final-ledgers"] }
  });

  assert.equal(forged.phase, "bridge");
  assert.deepEqual(forged.completedBridgeSteps, ["bridge-transport", "bridge-control"]);
  assert.deepEqual(forged.completedLevels, []);
  assert.deepEqual(forged.completedEvents, []);
  assert.deepEqual(forged.rewardedChallenges, []);
  assert.deepEqual(forged.ledgerAppliedChallenges, []);
  assert.deepEqual(forged.finalGateProgress, { section: 0, completed: [] });
});

test("a saved zero-life mission resumes safely in Guided Mode with a floored reboot cost", () => {
  const candidate = createInitialState();
  candidate.phase = "mission";
  candidate.completedBridgeSteps = BRIDGE_STEPS.map((step) => step.id);
  candidate.sequencePosition = 0;
  candidate.atpCredits = 2;
  candidate.lives = 0;

  const state = validateState(candidate);
  assert.equal(state.phase, "mission");
  assert.equal(state.atpCredits, 0);
  assert.equal(state.lives, 3);
  assert.equal(state.guidedMode, true);
  assert.equal(state.guidedChallengeId, "level-1");
});

test("Final Gate sections can complete only once and in fixed order", () => {
  const state = createInitialState();
  assert.equal(completeFinalSection(state, "final-ledgers"), false);
  assert.equal(completeFinalSection(state, "final-sequence"), true);
  assert.equal(completeFinalSection(state, "final-sequence"), false);
  assert.equal(completeFinalSection(state, "unknown-final"), false);
  assert.deepEqual(state.finalGateProgress.completed, ["final-sequence"]);
});

test("Final Gate ledger validation compares the player's entries with the live ledgers", () => {
  const state = createInitialState();
  completeChallenge(state, BRIDGE_STEPS.at(-1));
  MISSION_SEQUENCE.forEach((entry) => completeChallenge(state, getChallengeBySequenceEntry(entry)));
  const ledgerSection = FINAL_GATE_SECTIONS.find((section) => section.type === "ledgerCheck");
  const correct = validateFinalAnswer(
    ledgerSection,
    { bridge: { ...state.bridgeLedger }, tca: { ...state.tcaLedger } },
    state
  );
  const incorrect = validateFinalAnswer(
    ledgerSection,
    { bridge: { ...state.bridgeLedger }, tca: { ...state.tcaLedger, nadh: 2 } },
    state
  );
  assert.equal(correct.correct, true);
  assert.equal(incorrect.correct, false);
});

test("clearSavedState removes the resumable save", () => {
  const storage = memoryStorage();
  saveState(createInitialState(), storage);
  assert.equal(storage.getItem("mitomission-carbon-circuit-v1") !== null, true);
  assert.equal(clearSavedState(storage), true);
  assert.equal(storage.getItem("mitomission-carbon-circuit-v1"), null);
});

test("configuration contains eight reusable levels and four events", () => {
  assert.equal(TCA_LEVELS.length, 8);
  assert.equal(METABOLIC_EVENTS.length, 4);
  assert.deepEqual(TCA_LEVELS.map((level) => level.type), [
    "placement",
    "placement",
    "exactSet",
    "exactSet",
    "dockSet",
    "multiPart",
    "multiPlacement",
    "exactSet"
  ]);
});
