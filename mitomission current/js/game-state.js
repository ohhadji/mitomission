import {
  BRIDGE_STEPS,
  FINAL_GATE_SECTIONS,
  MAX_SCORE,
  MISSION_SEQUENCE,
  SCORE_RULES
} from "./game-data.js";

export const STORAGE_KEY = "mitomission-carbon-circuit-v1";
export const STATE_VERSION = 1;

const isStringArray = (value) => Array.isArray(value) && value.every((item) => typeof item === "string");
const clamp = (value, min, max = Number.POSITIVE_INFINITY) => Math.min(max, Math.max(min, value));
const BRIDGE_IDS = BRIDGE_STEPS.map((step) => step.id);
const MISSION_IDS = MISSION_SEQUENCE.map((entry) => entry.id);
const FINAL_IDS = FINAL_GATE_SECTIONS.map((section) => section.id);
const BASE_CHALLENGE_IDS = new Set([...BRIDGE_IDS, ...MISSION_IDS]);
const ALL_CHALLENGE_IDS = new Set([...BASE_CHALLENGE_IDS, ...FINAL_IDS]);

function orderedPrefix(value, orderedIds) {
  const supplied = new Set(isStringArray(value) ? value : []);
  const prefix = [];
  for (const id of orderedIds) {
    if (!supplied.has(id)) break;
    prefix.push(id);
  }
  return prefix;
}

function filteredUnique(value, allowed) {
  return isStringArray(value) ? [...new Set(value.filter((id) => allowed.has(id)))] : [];
}

function normaliseActiveIndex(candidate, completedCount, maximum) {
  const proposed = clamp(Number.isFinite(candidate) ? Math.trunc(candidate) : 0, 0, maximum);
  const earliestValid = Math.max(0, Math.min(completedCount - 1, maximum));
  const latestValid = Math.min(completedCount, maximum);
  return proposed >= earliestValid && proposed <= latestValid ? proposed : latestValid;
}

export function createInitialState() {
  return {
    version: STATE_VERSION,
    phase: "title",
    bridgeStep: 0,
    currentTcaLevel: 0,
    currentEvent: null,
    sequencePosition: -1,
    atpCredits: SCORE_RULES.startingCredits,
    lives: SCORE_RULES.startingLives,
    currentIntermediate: "pyruvate",
    completedBridgeSteps: [],
    completedLevels: [],
    completedEvents: [],
    rewardedChallenges: [],
    ledgerAppliedChallenges: [],
    hintsPurchased: [],
    guidedMode: false,
    guidedChallengeId: null,
    attempts: {},
    bridgeLedger: {
      acetylCoA: 0,
      nadh: 0,
      co2: 0,
      directAtp: 0
    },
    tcaLedger: {
      nadh: 0,
      fadh2Equivalent: 0,
      gtp: 0,
      co2: 0,
      oxaloacetateRegenerated: false
    },
    regulatoryFlags: {
      pdcActive: false,
      energyDemandHandled: false,
      thiamineRestored: false,
      oxygenLinkRestored: false,
      anaplerosisCompleted: false
    },
    oxaloacetateRegenerated: false,
    finalGateProgress: {
      section: 0,
      completed: []
    },
    incorrectSubmissions: 0,
    reviewMode: false,
    savedAt: null
  };
}

function sanitiseLedger(candidate, defaults) {
  const ledger = { ...defaults };
  for (const [key, defaultValue] of Object.entries(defaults)) {
    if (typeof defaultValue === "boolean") {
      ledger[key] = candidate?.[key] === true;
    } else if (Number.isFinite(candidate?.[key])) {
      ledger[key] = clamp(Math.trunc(candidate[key]), 0, 99);
    }
  }
  return ledger;
}

export function validateState(candidate) {
  if (!candidate || typeof candidate !== "object" || candidate.version !== STATE_VERSION) {
    return createInitialState();
  }

  const fresh = createInitialState();
  const validPhases = new Set(["title", "bridge", "mission", "final", "results", "review"]);
  const completedBridgeSteps = orderedPrefix(candidate.completedBridgeSteps, BRIDGE_IDS);
  const suppliedLevels = new Set(filteredUnique(candidate.completedLevels, new Set(MISSION_IDS)));
  const suppliedEvents = new Set(filteredUnique(candidate.completedEvents, new Set(MISSION_IDS)));
  const completedMissionEntries = [];
  if (completedBridgeSteps.length === BRIDGE_IDS.length) {
    for (const entry of MISSION_SEQUENCE) {
      const supplied = entry.kind === "level" ? suppliedLevels : suppliedEvents;
      if (!supplied.has(entry.id)) break;
      completedMissionEntries.push(entry);
    }
  }
  const completedLevels = completedMissionEntries.filter((entry) => entry.kind === "level").map((entry) => entry.id);
  const completedEvents = completedMissionEntries.filter((entry) => entry.kind === "event").map((entry) => entry.id);
  const completedFinalSections =
    completedMissionEntries.length === MISSION_SEQUENCE.length
      ? orderedPrefix(candidate.finalGateProgress?.completed, FINAL_IDS)
      : [];
  const completedChallengeIds = new Set([...completedBridgeSteps, ...completedLevels, ...completedEvents]);
  const rewardedChallenges = filteredUnique(candidate.rewardedChallenges, BASE_CHALLENGE_IDS).filter((id) => completedChallengeIds.has(id));
  const ledgerAppliedChallenges = filteredUnique(candidate.ledgerAppliedChallenges, BASE_CHALLENGE_IDS).filter((id) => completedChallengeIds.has(id));
  const hintsPurchased = filteredUnique(candidate.hintsPurchased, ALL_CHALLENGE_IDS);

  const attempts = {};
  if (candidate.attempts && typeof candidate.attempts === "object") {
    for (const [key, value] of Object.entries(candidate.attempts)) {
      if (ALL_CHALLENGE_IDS.has(key) && Number.isFinite(value)) attempts[key] = clamp(Math.trunc(value), 0, 999);
    }
  }

  let phase = validPhases.has(candidate.phase) ? candidate.phase : fresh.phase;
  if (["mission", "final", "results", "review"].includes(phase) && completedBridgeSteps.length < BRIDGE_IDS.length) {
    phase = "bridge";
  } else if (["final", "results", "review"].includes(phase) && completedMissionEntries.length < MISSION_SEQUENCE.length) {
    phase = "mission";
  } else if (["results", "review"].includes(phase) && completedFinalSections.length < FINAL_IDS.length) {
    phase = "final";
  }

  const state = {
    ...fresh,
    phase,
    bridgeStep: normaliseActiveIndex(candidate.bridgeStep, completedBridgeSteps.length, BRIDGE_STEPS.length - 1),
    currentTcaLevel: clamp(Number.isFinite(candidate.currentTcaLevel) ? Math.trunc(candidate.currentTcaLevel) : 0, 0, 8),
    currentEvent: typeof candidate.currentEvent === "string" ? candidate.currentEvent : null,
    sequencePosition:
      completedBridgeSteps.length < BRIDGE_IDS.length
        ? -1
        : normaliseActiveIndex(candidate.sequencePosition, completedMissionEntries.length, MISSION_SEQUENCE.length - 1),
    atpCredits: clamp(Number.isFinite(candidate.atpCredits) ? Math.trunc(candidate.atpCredits) : fresh.atpCredits, 0, MAX_SCORE),
    lives: clamp(Number.isFinite(candidate.lives) ? Math.trunc(candidate.lives) : fresh.lives, 0, SCORE_RULES.startingLives),
    currentIntermediate: typeof candidate.currentIntermediate === "string" ? candidate.currentIntermediate : fresh.currentIntermediate,
    completedBridgeSteps,
    completedLevels,
    completedEvents,
    rewardedChallenges,
    ledgerAppliedChallenges,
    hintsPurchased,
    guidedMode: candidate.guidedMode === true,
    guidedChallengeId: ALL_CHALLENGE_IDS.has(candidate.guidedChallengeId) ? candidate.guidedChallengeId : null,
    attempts,
    bridgeLedger: sanitiseLedger(candidate.bridgeLedger, fresh.bridgeLedger),
    tcaLedger: sanitiseLedger(candidate.tcaLedger, fresh.tcaLedger),
    regulatoryFlags: {
      ...fresh.regulatoryFlags,
      ...(candidate.regulatoryFlags && typeof candidate.regulatoryFlags === "object"
        ? Object.fromEntries(
            Object.keys(fresh.regulatoryFlags).map((key) => [key, candidate.regulatoryFlags[key] === true])
          )
        : {})
    },
    oxaloacetateRegenerated: candidate.oxaloacetateRegenerated === true,
    finalGateProgress: {
      section: normaliseActiveIndex(candidate.finalGateProgress?.section, completedFinalSections.length, FINAL_GATE_SECTIONS.length - 1),
      completed: completedFinalSections
    },
    incorrectSubmissions: clamp(
      Number.isFinite(candidate.incorrectSubmissions) ? Math.trunc(candidate.incorrectSubmissions) : 0,
      0,
      9999
    ),
    reviewMode: candidate.reviewMode === true,
    savedAt: typeof candidate.savedAt === "string" ? candidate.savedAt : null
  };

  // If a saved state was captured exactly at zero lives, resume through the same safe reboot rule.
  if (state.lives === 0 && (state.phase === "mission" || state.phase === "final")) {
    state.lives = SCORE_RULES.startingLives;
    state.atpCredits = clamp(state.atpCredits - SCORE_RULES.rebootCost, 0);
    state.guidedMode = true;
    state.guidedChallengeId =
      state.guidedChallengeId ??
      (state.phase === "mission"
        ? MISSION_SEQUENCE[state.sequencePosition]?.id
        : FINAL_GATE_SECTIONS[state.finalGateProgress.section]?.id) ??
      null;
  }

  return state;
}

export function loadState(storage = globalThis.localStorage) {
  try {
    const saved = storage?.getItem(STORAGE_KEY);
    if (!saved) return createInitialState();
    return validateState(JSON.parse(saved));
  } catch {
    return createInitialState();
  }
}

export function saveState(state, storage = globalThis.localStorage) {
  try {
    state.savedAt = new Date().toISOString();
    storage?.setItem(STORAGE_KEY, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}

export function clearSavedState(storage = globalThis.localStorage) {
  try {
    storage?.removeItem(STORAGE_KEY);
    return true;
  } catch {
    return false;
  }
}

export function hasSavedGame(storage = globalThis.localStorage) {
  try {
    const raw = storage?.getItem(STORAGE_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw);
    return parsed?.version === STATE_VERSION;
  } catch {
    return false;
  }
}

export function recordAttempt(state, challengeId) {
  state.attempts[challengeId] = (state.attempts[challengeId] ?? 0) + 1;
  return state.attempts[challengeId];
}

export function awardChallenge(state, challengeId, reward) {
  if (!reward || state.rewardedChallenges.includes(challengeId)) return 0;
  state.rewardedChallenges.push(challengeId);
  state.atpCredits = clamp(state.atpCredits + reward, 0, MAX_SCORE);
  return reward;
}

export function applyLedgerUpdate(state, challengeId, ledgerDelta) {
  if (!ledgerDelta || state.ledgerAppliedChallenges.includes(challengeId)) return false;
  const ledger = ledgerDelta.scope === "bridge" ? state.bridgeLedger : state.tcaLedger;
  for (const [key, value] of Object.entries(ledgerDelta.values ?? {})) {
    if (typeof value === "boolean") {
      ledger[key] = value;
    } else if (Number.isFinite(value)) {
      ledger[key] = clamp((ledger[key] ?? 0) + value, 0);
    }
  }
  state.ledgerAppliedChallenges.push(challengeId);
  state.oxaloacetateRegenerated = state.tcaLedger.oxaloacetateRegenerated === true;
  return true;
}

function markCompleted(state, challenge) {
  if (challenge.phaseKind === "bridge" && !state.completedBridgeSteps.includes(challenge.id)) {
    state.completedBridgeSteps.push(challenge.id);
  }
  if (challenge.phaseKind === "level" && !state.completedLevels.includes(challenge.id)) {
    state.completedLevels.push(challenge.id);
    state.currentTcaLevel = Math.max(state.currentTcaLevel, challenge.level);
  }
  if (challenge.phaseKind === "event" && !state.completedEvents.includes(challenge.id)) {
    state.completedEvents.push(challenge.id);
  }
}

function setRegulatoryFlag(state, challengeId) {
  const flagByChallenge = {
    "bridge-control": "pdcActive",
    "event-demand": "energyDemandHandled",
    "event-thiamine": "thiamineRestored",
    "event-oxygen": "oxygenLinkRestored",
    "event-anaplerosis": "anaplerosisCompleted"
  };
  const flag = flagByChallenge[challengeId];
  if (flag) state.regulatoryFlags[flag] = true;
}

export function completeChallenge(state, challenge) {
  const wasCompleted =
    state.completedBridgeSteps.includes(challenge.id) ||
    state.completedLevels.includes(challenge.id) ||
    state.completedEvents.includes(challenge.id);

  markCompleted(state, challenge);
  setRegulatoryFlag(state, challenge.id);
  const reward = awardChallenge(state, challenge.id, challenge.reward ?? 0);
  const ledgerChanged = applyLedgerUpdate(state, challenge.id, challenge.ledgerDelta);
  if (challenge.nextIntermediate) state.currentIntermediate = challenge.nextIntermediate;

  if (state.guidedChallengeId === challenge.id || (state.guidedMode && !state.guidedChallengeId)) {
    state.guidedMode = false;
    state.guidedChallengeId = null;
  }

  return { wasCompleted, reward, ledgerChanged };
}

export function applyPenalty(state, challengeKind, challengeId) {
  const rule = SCORE_RULES.penalties[challengeKind] ?? SCORE_RULES.penalties.level;
  const creditsBefore = state.atpCredits;
  const livesBefore = state.lives;

  state.atpCredits = clamp(state.atpCredits - rule.credits, 0);
  state.lives = clamp(state.lives - rule.lives, 0, SCORE_RULES.startingLives);
  state.incorrectSubmissions += 1;

  let rebooted = false;
  let rebootCost = 0;
  if (state.lives === 0 && (challengeKind === "level" || challengeKind === "event")) {
    rebooted = true;
    rebootCost = Math.min(SCORE_RULES.rebootCost, state.atpCredits);
    state.atpCredits = clamp(state.atpCredits - SCORE_RULES.rebootCost, 0);
    state.lives = SCORE_RULES.startingLives;
    state.guidedMode = true;
    state.guidedChallengeId = challengeId;
  }

  return {
    creditLoss: creditsBefore - state.atpCredits,
    scientificCreditLoss: Math.min(rule.credits, creditsBefore),
    lifeLoss: livesBefore - Math.max(livesBefore - rule.lives, 0),
    rebooted,
    rebootCost,
    credits: state.atpCredits,
    lives: state.lives
  };
}

export function purchaseHint(state, challengeId) {
  if (!ALL_CHALLENGE_IDS.has(challengeId)) return { ok: false, reason: "unknown-challenge" };
  const completed =
    state.completedBridgeSteps.includes(challengeId) ||
    state.completedLevels.includes(challengeId) ||
    state.completedEvents.includes(challengeId) ||
    state.finalGateProgress.completed.includes(challengeId);
  if (completed) return { ok: false, reason: "challenge-completed" };
  if (state.hintsPurchased.includes(challengeId)) return { ok: false, reason: "already-purchased" };
  if (state.atpCredits < SCORE_RULES.hintCost) return { ok: false, reason: "insufficient-credits" };
  state.atpCredits -= SCORE_RULES.hintCost;
  state.hintsPurchased.push(challengeId);
  return { ok: true, cost: SCORE_RULES.hintCost };
}

export function purchaseExtraLife(state) {
  if (state.lives >= SCORE_RULES.startingLives) return { ok: false, reason: "lives-full" };
  if (state.atpCredits < SCORE_RULES.extraLifeCost) return { ok: false, reason: "insufficient-credits" };
  state.atpCredits -= SCORE_RULES.extraLifeCost;
  state.lives = clamp(state.lives + 1, 0, SCORE_RULES.startingLives);
  return { ok: true, cost: SCORE_RULES.extraLifeCost };
}

export function completeFinalSection(state, sectionId) {
  const expectedSectionId = FINAL_IDS[state.finalGateProgress.completed.length];
  if (sectionId !== expectedSectionId || state.finalGateProgress.completed.includes(sectionId)) return false;
  state.finalGateProgress.completed.push(sectionId);
  return true;
}

export function rankForCredits(credits) {
  if (credits >= 45) return "Mito Master";
  if (credits >= 35) return "TCA Trainee";
  if (credits >= 25) return "Cycle Survivor";
  return "Assisted Completion";
}

export function calculateTcaAtpEquivalents(tcaLedger) {
  const nadhAtp = (tcaLedger.nadh ?? 0) * 2.5;
  const fadh2Atp = (tcaLedger.fadh2Equivalent ?? 0) * 1.5;
  const gtpAtp = tcaLedger.gtp ?? 0;
  return {
    nadhAtp,
    fadh2Atp,
    gtpAtp,
    total: nadhAtp + fadh2Atp + gtpAtp
  };
}

export function isPerfectMolecularAccounting(state) {
  return (
    state.bridgeLedger.acetylCoA === 1 &&
    state.bridgeLedger.nadh === 1 &&
    state.bridgeLedger.co2 === 1 &&
    state.bridgeLedger.directAtp === 0 &&
    state.tcaLedger.nadh === 3 &&
    state.tcaLedger.fadh2Equivalent === 1 &&
    state.tcaLedger.gtp === 1 &&
    state.tcaLedger.co2 === 2 &&
    state.tcaLedger.oxaloacetateRegenerated === true
  );
}
