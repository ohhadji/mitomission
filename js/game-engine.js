import {
  BRIDGE_STEPS,
  FINAL_GATE_SECTIONS,
  MISSION_SEQUENCE,
  getChallengeBySequenceEntry
} from "./game-data.js";
import {
  applyPenalty,
  clearSavedState,
  completeChallenge,
  completeFinalSection,
  createInitialState,
  hasSavedGame,
  purchaseExtraLife,
  purchaseHint,
  recordAttempt,
  saveState
} from "./game-state.js";
import { createInteraction } from "./interactions.js";
import { createFinalGateInteraction, validateFinalAnswer } from "./final-gate.js";
import {
  announce,
  refreshStateDisplays,
  renderGameScreen,
  renderResults,
  renderReview,
  renderTitle,
  showFeedback
} from "./ui.js";

const sameSet = (actual = [], expected = []) =>
  actual.length === expected.length && expected.every((entry) => actual.includes(entry));

function sameOrderedArray(actual = [], expected = []) {
  return actual.length === expected.length && expected.every((entry, index) => actual[index] === entry);
}

function validateChallenge(challenge, answer) {
  switch (challenge.type) {
    case "choice":
    case "placement":
      return answer === challenge.correct;
    case "exactSet":
    case "dockSet":
      return sameSet(answer, challenge.correct);
    case "placementSequence":
      return sameOrderedArray(answer, challenge.correct);
    case "sorting":
      return Object.entries(challenge.correct).every(([token, category]) => answer?.[token] === category);
    case "multiPart":
      return challenge.parts.every((part) => answer?.[part.id] === part.correct);
    case "multiPlacement":
      return challenge.docks.every((dock) => answer?.[dock.id] === dock.correct);
    case "wiring":
      return challenge.sources.every((source) => answer?.[source.id] === source.correct);
    default:
      return false;
  }
}

function specificIncorrectMessage(challenge, answer) {
  if (typeof answer === "string" && challenge.incorrectByChoice?.[answer]) {
    return challenge.incorrectByChoice[answer];
  }
  if (challenge.type === "multiPart") {
    const wrong = challenge.parts.filter((part) => answer?.[part.id] !== part.correct).map((part) => part.label.replace(/^\d\s*·\s*/, ""));
    return `${wrong.join(" and ")} ${wrong.length === 1 ? "does" : "do"} not match Complex II's biochemistry.`;
  }
  if (challenge.type === "multiPlacement") {
    const wrong = challenge.docks.filter((dock) => answer?.[dock.id] !== dock.correct).map((dock) => dock.label.toLowerCase());
    return `Recheck the ${wrong.join(" and ")}. The submitted arrangement would not produce L-malate.`;
  }
  if (challenge.type === "sorting") {
    const count = Object.entries(challenge.correct).filter(([token, category]) => answer?.[token] !== category).length;
    return `${count} signal${count === 1 ? " is" : "s are"} assigned to the wrong metabolic response.`;
  }
  if (challenge.type === "wiring") {
    const wrong = challenge.sources.filter((source) => answer?.[source.id] !== source.correct).map((source) => source.label);
    return `The connection${wrong.length === 1 ? "" : "s"} from ${wrong.join(" and ")} ${wrong.length === 1 ? "does" : "do"} not complete the respiratory circuit.`;
  }
  if (Array.isArray(answer) && challenge.options) {
    const selectedDistractor = answer
      .map((id) => challenge.options.find((option) => option.id === id))
      .find((option) => option && !option.correct);
    if (selectedDistractor?.detail) return `${selectedDistractor.label} is not part of this product set: ${selectedDistractor.detail}.`;
  }
  return challenge.incorrect;
}

function finalSuccessContent(section, state) {
  if (section.id === "final-ledgers") {
    return {
      summary: section.success,
      reaction: "One TCA turn: 3 NADH × 2.5 + 1 FADH2-equivalent × 1.5 + 1 GTP ≈ 10 ATP equivalents",
      facts: [
        "The one-turn calculation excludes the bridge-reaction NADH.",
        "Oxaloacetate is regenerated and is not a net cycle product.",
        "Mito Bucks remain separate from all biochemical products."
      ],
      ledger: `Stored totals verified: bridge NADH ${state.bridgeLedger.nadh}; TCA NADH ${state.tcaLedger.nadh}, FADH2-equivalent ${state.tcaLedger.fadh2Equivalent}, GTP ${state.tcaLedger.gtp}, CO2 ${state.tcaLedger.co2}.`
    };
  }
  if (section.id === "final-sequence") {
    return {
      summary: section.success,
      reaction: "OAA + acetyl-CoA → citrate → isocitrate → alpha-ketoglutarate → succinyl-CoA → succinate → fumarate → malate → OAA",
      facts: ["The carbon path moves 6C → 6C → 5C → 4C, then remains 4C through regeneration."],
      ledger: "Sequence verification does not change either molecular ledger."
    };
  }
  if (section.id === "final-regulation") {
    return {
      summary: section.success,
      reaction: "ADP/Ca2+ promote flux; ATP/NADH suppress flux",
      facts: [
        "Citrate synthase, isocitrate dehydrogenase and alpha-ketoglutarate dehydrogenase are the three major regulated TCA reactions used here.",
        "NADH and succinyl-CoA inhibit alpha-ketoglutarate dehydrogenase."
      ],
      ledger: "Regulatory verification does not change molecular output."
    };
  }
  return {
    summary: section.success,
    reaction: "Carbon flow + respiration + anaplerosis → integrated mitochondrial function",
    facts: [
      "Oxygen supports TCA flux indirectly through ETC electron acceptance and NAD+ regeneration.",
      "Cataplerosis and anaplerosis connect the cycle to biosynthesis.",
      "Incoming acetyl carbons are not necessarily the first-turn CO2 carbons."
    ],
    ledger: "All four Final Gate sections are verified; the cycle is ready for restoration."
  };
}

export class GameEngine {
  constructor(state) {
    this.state = state;
    this.resumePhase = state.phase === "title" ? null : state.phase;
    if (this.resumePhase) this.state.phase = "title";
    this.processing = false;
    this.continuePending = false;
  }

  render() {
    this.processing = false;
    this.continuePending = false;
    switch (this.state.phase) {
      case "bridge":
        this.renderBridge();
        break;
      case "mission":
        this.renderMission();
        break;
      case "final":
        this.renderFinalGate();
        break;
      case "results":
        renderResults(this.state, {
          onReplay: () => this.replay(),
          onReview: () => this.openReview(),
          onReset: () => this.resetGame()
        });
        break;
      case "review":
        renderReview(this.state, { onBack: () => this.backToResults() });
        break;
      case "title":
      default:
        renderTitle(this.state, {
          hasSavedGame: hasSavedGame(),
          onStart: () => this.startMission(),
          onReset: () => this.resetGame()
        });
    }
  }

  interactionCallbacks(challenge, kind) {
    return {
      hintPurchased: this.state.hintsPurchased.includes(challenge.id),
      guidedMode: this.state.guidedMode && this.state.guidedChallengeId === challenge.id,
      answerDetailsUnlocked:
        (this.state.attempts[challenge.id] ?? 0) > 0 || this.isChallengeCompleted(challenge),
      onSubmit: (answer) => this.submitChallenge(challenge, answer, kind),
      onIncomplete: (message) => this.showNotice(message),
      onNonPenalizedError: (message) => this.showNotice(message)
    };
  }

  screenHandlers(challenge, kind) {
    return {
      onHint: () => this.buyHint(challenge),
      onLife: () => this.buyLife(),
      onReset: () => this.resetGame(),
      kind
    };
  }

  renderBridge() {
    const challenge = BRIDGE_STEPS[this.state.bridgeStep] ?? BRIDGE_STEPS[0];
    const interaction = createInteraction(challenge, this.interactionCallbacks(challenge, "bridge"));
    renderGameScreen(this.state, challenge, interaction, this.screenHandlers(challenge, "bridge"), { kind: "bridge" });
    if (this.isChallengeCompleted(challenge)) this.restoreCompletedFeedback(challenge, interaction, "bridge");
  }

  renderMission() {
    const entry = MISSION_SEQUENCE[this.state.sequencePosition] ?? MISSION_SEQUENCE[0];
    const challenge = getChallengeBySequenceEntry(entry);
    if (!challenge) {
      this.state.phase = "final";
      this.state.finalGateProgress.section = 0;
      saveState(this.state);
      this.render();
      return;
    }
    this.state.currentEvent = challenge.phaseKind === "event" ? challenge.id : null;
    if (challenge.phaseKind === "level") this.state.currentTcaLevel = challenge.level;
    const interaction = createInteraction(challenge, this.interactionCallbacks(challenge, "mission"));
    renderGameScreen(this.state, challenge, interaction, this.screenHandlers(challenge, "mission"), { kind: "mission" });
    if (this.isChallengeCompleted(challenge)) this.restoreCompletedFeedback(challenge, interaction, "mission");
  }

  renderFinalGate() {
    const section = FINAL_GATE_SECTIONS[this.state.finalGateProgress.section] ?? FINAL_GATE_SECTIONS[0];
    const challenge = {
      ...section,
      phaseKind: "final",
      eyebrow: `Final Gate: Prove the Cycle Is Restored · Section ${section.number} of 4`,
      equation:
        section.id === "final-ledgers"
          ? "Bridge ledger + TCA ledger → ATP-equivalent verification"
          : section.id === "final-regulation"
            ? "Irreversible control points + energy signals + product feedback"
            : section.id === "final-integration"
              ? "Carbon flow · respiration · biosynthesis"
              : "Oxaloacetate + acetyl-CoA → ... → oxaloacetate"
    };
    const callbacks = this.interactionCallbacks(challenge, "final");
    const interaction = createFinalGateInteraction(challenge, this.state, callbacks);
    renderGameScreen(this.state, challenge, interaction, this.screenHandlers(challenge, "final"), { kind: "final" });
    if (this.state.finalGateProgress.completed.includes(section.id)) {
      this.restoreCompletedFeedback(challenge, interaction, "final");
    }
  }

  startMission() {
    if (this.resumePhase) {
      this.state.phase = this.resumePhase === "review" ? "results" : this.resumePhase;
      this.resumePhase = null;
      saveState(this.state);
      this.render();
      return;
    }
    if (this.state.completedBridgeSteps.length >= BRIDGE_STEPS.length) {
      if (this.state.sequencePosition >= MISSION_SEQUENCE.length - 1 && this.state.completedEvents.includes("event-anaplerosis")) {
        this.state.phase = "final";
      } else {
        this.state.phase = "mission";
        if (this.state.sequencePosition < 0) this.state.sequencePosition = 0;
      }
    } else {
      this.state.phase = "bridge";
      this.state.bridgeStep = Math.min(this.state.completedBridgeSteps.length, BRIDGE_STEPS.length - 1);
    }
    saveState(this.state);
    this.render();
  }

  isChallengeCompleted(challenge) {
    if (challenge.phaseKind === "bridge") return this.state.completedBridgeSteps.includes(challenge.id);
    if (challenge.phaseKind === "level") return this.state.completedLevels.includes(challenge.id);
    if (challenge.phaseKind === "event") return this.state.completedEvents.includes(challenge.id);
    if (challenge.phaseKind === "final") return this.state.finalGateProgress.completed.includes(challenge.id);
    return false;
  }

  submitChallenge(challenge, answer, kind) {
    if (this.processing || this.isChallengeCompleted(challenge)) return;
    this.processing = true;
    recordAttempt(this.state, challenge.id);

    const validation =
      kind === "final"
        ? validateFinalAnswer(challenge, answer, this.state)
        : { correct: validateChallenge(challenge, answer), message: "" };

    if (validation.correct) {
      let completion;
      if (kind === "final") {
        completion = { reward: 0, ledgerChanged: false };
        completeFinalSection(this.state, challenge.id);
      } else {
        completion = completeChallenge(this.state, challenge);
      }
      saveState(this.state);
      refreshStateDisplays(this.state, challenge, kind, { lockShop: true });
      showFeedback(
        this.state,
        {
          status: "success",
          heading: kind === "final" ? "Section verified" : "Correct",
          content: kind === "final" ? finalSuccessContent(challenge, this.state) : challenge.success,
          reward: completion.reward,
          continueLabel:
            kind === "final" && challenge.number === FINAL_GATE_SECTIONS.length
              ? "Restore the cycle"
              : "Continue"
        },
        { onContinue: () => this.continueFrom(challenge, kind) }
      );
    } else {
      const penaltyKind = kind === "final" ? "final" : challenge.phaseKind;
      const penalty = applyPenalty(this.state, penaltyKind, challenge.id);
      saveState(this.state);
      refreshStateDisplays(this.state, challenge, kind, { lockShop: true });
      const message = kind === "final" ? validation.message : specificIncorrectMessage(challenge, answer);
      const rebootMessage = penalty.rebooted
        ? ` Lives reached zero, so Mission Control restored three lives, charged ${penalty.rebootCost} Mito Bucks for the reboot and activated Guided Mode for this challenge.`
        : "";
      showFeedback(
        this.state,
        {
          status: "error",
          heading: penalty.rebooted ? "Systems rebooted - guided retry" : "Recalibrate and retry",
          message: `${message}${rebootMessage}`,
          clue: penalty.rebooted ? challenge.guidedCue : null,
          penalty
        },
        { onRetry: () => this.render() }
      );
    }
    this.processing = false;
  }

  restoreCompletedFeedback(challenge, interaction, kind) {
    refreshStateDisplays(this.state, challenge, kind, { lockShop: true });
    if (interaction.lock) {
      interaction.lock();
    } else {
      interaction.root.classList.add("is-locked");
      interaction.root.querySelectorAll("button, select, input").forEach((control) => {
        control.disabled = true;
      });
    }
    showFeedback(
      this.state,
      {
        status: "success",
        heading: "Already verified",
        content: kind === "final" ? finalSuccessContent(challenge, this.state) : challenge.success,
        reward: 0,
        continueLabel: kind === "final" && challenge.number === 4 ? "Restore the cycle" : "Continue"
      },
      { onContinue: () => this.continueFrom(challenge, kind) }
    );
  }

  continueFrom(challenge, kind) {
    if (this.continuePending) return;
    this.continuePending = true;
    if (kind === "bridge") {
      if (this.state.bridgeStep < BRIDGE_STEPS.length - 1) {
        this.state.bridgeStep += 1;
      } else {
        this.state.phase = "mission";
        this.state.sequencePosition = 0;
        this.state.currentEvent = null;
      }
    } else if (kind === "mission") {
      if (this.state.sequencePosition < MISSION_SEQUENCE.length - 1) {
        this.state.sequencePosition += 1;
      } else {
        this.state.phase = "final";
        this.state.finalGateProgress.section = 0;
      }
    } else if (kind === "final") {
      if (this.state.finalGateProgress.section < FINAL_GATE_SECTIONS.length - 1) {
        this.state.finalGateProgress.section += 1;
      } else {
        this.state.phase = "results";
      }
    }
    saveState(this.state);
    this.render();
  }

  showNotice(message) {
    showFeedback(this.state, { status: "notice", heading: "Arrangement incomplete", message });
  }

  buyHint(challenge) {
    const result = purchaseHint(this.state, challenge.id);
    if (!result.ok) {
      const reason =
        result.reason === "challenge-completed"
          ? "This challenge is already complete."
          : result.reason === "already-purchased"
            ? "Hint already purchased."
            : "Not enough Mito Bucks for a hint.";
      announce(reason);
      return;
    }
    saveState(this.state);
    announce(`Hint purchased for ${result.cost} Mito Bucks.`);
    this.render();
  }

  buyLife() {
    const result = purchaseExtraLife(this.state);
    if (!result.ok) {
      announce(result.reason === "lives-full" ? "Lives are already full." : "Not enough Mito Bucks for an extra life.");
      return;
    }
    saveState(this.state);
    announce(`Extra life purchased for ${result.cost} Mito Bucks. ${this.state.lives} lives now available.`);
    this.render();
  }

  replay() {
    this.state = createInitialState();
    this.state.phase = "bridge";
    this.resumePhase = null;
    saveState(this.state);
    this.render();
  }

  resetGame() {
    const confirmed = window.confirm("Reset all MITOMISSION progress, scores and molecular ledgers?");
    if (!confirmed) return;
    clearSavedState();
    this.state = createInitialState();
    this.resumePhase = null;
    this.render();
    announce("Saved mission progress reset.");
  }

  openReview() {
    this.state.phase = "review";
    this.state.reviewMode = true;
    saveState(this.state);
    this.render();
  }

  backToResults() {
    this.state.phase = "results";
    this.state.reviewMode = false;
    saveState(this.state);
    this.render();
  }
}
