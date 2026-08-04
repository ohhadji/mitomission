import {
  ATP_CREDITS_EXPLANATION,
  PATHWAY_NODES,
  REVIEW_FACTS,
  SCORE_RULES
} from "./game-data.js";
import { calculateTcaAtpEquivalents, rankForCredits } from "./game-state.js";
import { createShopControls } from "./shop.js";

const main = () => document.querySelector("#main-content");
const modalRoot = () => document.querySelector("#modal-root");

function element(tag, className, content = "") {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (content) node.textContent = content;
  return node;
}

export function announce(message) {
  const live = document.querySelector("#announcer");
  if (!live) return;
  live.textContent = "";
  window.setTimeout(() => {
    live.textContent = message;
  }, 30);
}

function iconLabel(icon, textContent) {
  return `<span aria-hidden="true">${icon}</span><span>${textContent}</span>`;
}

function createModal(title, body, trigger) {
  const appMain = main();
  appMain.inert = true;
  appMain.setAttribute("aria-hidden", "true");
  const backdrop = element("div", "modal-backdrop");
  const dialog = element("section", "modal-dialog");
  dialog.setAttribute("role", "dialog");
  dialog.setAttribute("aria-modal", "true");
  dialog.setAttribute("aria-labelledby", "modal-title");

  const header = element("header", "modal-header");
  const heading = element("h2", "modal-title", title);
  heading.id = "modal-title";
  const close = element("button", "icon-button modal-close", "×");
  close.type = "button";
  close.setAttribute("aria-label", "Close dialog");
  header.append(heading, close);

  const content = element("div", "modal-content");
  if (typeof body === "string") content.innerHTML = body;
  else content.append(body);
  dialog.append(header, content);
  backdrop.append(dialog);
  modalRoot().replaceChildren(backdrop);

  const closeModal = () => {
    modalRoot().replaceChildren();
    appMain.inert = false;
    appMain.removeAttribute("aria-hidden");
    trigger?.focus();
  };
  close.addEventListener("click", closeModal);
  backdrop.addEventListener("click", (event) => {
    if (event.target === backdrop) closeModal();
  });
  dialog.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeModal();
    if (event.key === "Tab") {
      const focusable = [...dialog.querySelectorAll("button, [href], input, select, [tabindex]:not([tabindex='-1'])")];
      const first = focusable[0];
      const last = focusable.at(-1);
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
  });
  window.setTimeout(() => close.focus(), 0);
  return closeModal;
}

export function openHowToPlay(trigger) {
  createModal(
    "How to Play",
    `<div class="how-to-grid">
      <article><span class="how-to-number">01</span><h3>Prepare the fuel</h3><p>Complete four guided bridge-reaction tasks to convert pyruvate into acetyl-CoA.</p></article>
      <article><span class="how-to-number">02</span><h3>Complete the circuit</h3><p>Move through all eight TCA reactions in order. Select, place, sort and wire biochemical components.</p></article>
      <article><span class="how-to-number">03</span><h3>Respond to the cell</h3><p>Solve four clinical and physiological events involving regulation, thiamine, oxygen and anaplerosis.</p></article>
      <article><span class="how-to-number">04</span><h3>Protect your resources</h3><p>Correct work earns Mito Bucks. Submitted scientific errors cost Mito Bucks and lives; incomplete or cancelled actions do not.</p></article>
      <article><span class="how-to-number">05</span><h3>Use the shop</h3><p>Buy one targeted hint per challenge for 2 Mito Bucks, or an extra life for 5 Mito Bucks when below three lives.</p></article>
      <article><span class="how-to-number">06</span><h3>Prove the pathway</h3><p>Track real products in the molecular ledgers, then complete all four ordered Final Gate sections.</p></article>
    </div>
    <div class="modal-note"><strong>Controls:</strong> every draggable item also works by selecting the item and then selecting its target. Use Tab, Enter and Space for keyboard play.</div>`,
    trigger
  );
}

export function openMetabolismInfo(trigger) {
  createModal(
    "Score vs. real metabolism",
    `<div class="definition-stack">
      <div class="definition-row credits-definition"><span class="legend-swatch credits-swatch">M</span><div><h3>Mito Bucks</h3><p>${ATP_CREDITS_EXPLANATION}</p></div></div>
      <div class="definition-row nadh-definition"><span class="legend-swatch nadh-swatch">H</span><div><h3>NADH</h3><p>A diffusible reduced cofactor that donates electrons to ETC Complex I; approximately 2.5 ATP per mitochondrial NADH.</p></div></div>
      <div class="definition-row fadh-definition"><span class="legend-swatch fadh-swatch">F</span><div><h3>FADH2-equivalent</h3><p>The reducing equivalent captured by enzyme-bound FAD at succinate dehydrogenase/Complex II; approximately 1.5 ATP.</p></div></div>
      <div class="definition-row gtp-definition"><span class="legend-swatch gtp-swatch">G</span><div><h3>GTP</h3><p>A real nucleotide triphosphate made directly by substrate-level phosphorylation; approximately one ATP equivalent.</p></div></div>
      <div class="definition-row atpeq-definition"><span class="legend-swatch atpeq-swatch">≈</span><div><h3>ATP equivalents</h3><p>An approximate calculation from the reduced cofactors and GTP generated during one TCA turn.</p></div></div>
    </div>`,
    trigger
  );
}

export function openMitoBucksShop(trigger) {
  const shop = element("div", "mbucks-shop");
  shop.innerHTML = `
    <article class="mbucks-shop-card">
      <div class="mbucks-token-stage">
        <div class="mbucks-token-stack" role="img" aria-label="A stack of three glowing Mito Bucks tokens marked with the letter M">
          <span class="mbucks-token token-one" aria-hidden="true">M</span>
          <span class="mbucks-token token-two" aria-hidden="true">M</span>
          <span class="mbucks-token token-three" aria-hidden="true">M</span>
        </div>
      </div>
      <div class="mbucks-product-copy">
        <p class="panel-kicker">PREMIUM MITOCHONDRIAL FINANCE</p>
        <h3>10 M-Bucks</h3>
        <p>A completely unreasonable mitochondrial investment.</p>
        <div class="mbucks-price"><span>Price</span><strong>$50.00</strong></div>
        <div class="mbucks-shop-actions">
          <button class="primary-button mbucks-buy-button" type="button" aria-describedby="mbucks-purchase-message">Buy now</button>
          <button class="secondary-button mbucks-return-button" type="button">Return to Game</button>
        </div>
        <p id="mbucks-purchase-message" class="mbucks-purchase-message" role="status" aria-live="polite" hidden></p>
      </div>
    </article>
    <p class="modal-note">Note: No payment will occur. Mitochondria can't process credit cards... yet.</p>`;

  const purchaseMessage = shop.querySelector(".mbucks-purchase-message");
  shop.querySelector(".mbucks-buy-button").addEventListener("click", () => {
    purchaseMessage.hidden = false;
    purchaseMessage.textContent = "Purchase unavailable. M-Bucks must be earned by restoring the TCA cycle.";
  });
  const closeModal = createModal("M-Bucks Shop", shop, trigger);
  shop.querySelector(".mbucks-return-button").addEventListener("click", closeModal);
}

function createMitoBucksShopButton() {
  const button = element("button", "secondary-button mbucks-shop-trigger", "M-Bucks Shop");
  button.type = "button";
  button.addEventListener("click", () => openMitoBucksShop(button));
  return button;
}

function titleMitochondrion() {
  const visual = element("div", "mitochondrion-visual");
  visual.setAttribute("aria-label", "Stylised mitochondrion with illuminated inner membrane folds");
  visual.setAttribute("role", "img");
  visual.innerHTML = `
    <div class="mito-shell">
      <span class="crista crista-1"></span><span class="crista crista-2"></span><span class="crista crista-3"></span>
      <span class="crista crista-4"></span><span class="crista crista-5"></span>
      <span class="energy-particle particle-1"></span><span class="energy-particle particle-2"></span><span class="energy-particle particle-3"></span>
    </div>
    <div class="visual-caption"><span class="pulse-dot"></span> Matrix systems awaiting carbon input</div>`;
  return visual;
}

export function renderTitle(state, handlers) {
  document.body.className = "title-mode";
  const root = element("section", "title-screen");
  const top = element("header", "title-nav");
  top.innerHTML = `<div class="brand-mark"><span class="brand-icon" aria-hidden="true">M</span><span>MITOMISSION LAB</span></div>`;
  const titleNavTools = element("div", "title-nav-tools");
  const offline = element("div", "offline-pill");
  offline.innerHTML = `<span aria-hidden="true">●</span> Offline mission`;
  titleNavTools.append(createMitoBucksShopButton(), offline);
  top.append(titleNavTools);

  const hero = element("div", "title-hero");
  const copy = element("div", "title-copy");
  copy.innerHTML = `
    <p class="eyebrow">CHIEF MITOCHONDRIAL ENGINEER · MISSION 01</p>
    <h1><span>MitoMission:</span> Carbon Circuit</h1>
    <p class="hero-subtitle">Restore mitochondrial metabolism one carbon at a time.</p>
    <p class="hero-objective">Guide a three-carbon pyruvate through the bridge reaction, complete one full TCA turn, stabilise four metabolic emergencies and verify the molecular ledger.</p>
    <div class="mission-metadata">
      <span>${iconLabel("◷", "8-12 minutes")}</span>
      <span>${iconLabel("◎", "BMED12-209 Medical Biochemistry 2")}</span>
      <span>${iconLabel("⌁", "Keyboard + pointer")}</span>
    </div>`;

  const actions = element("div", "title-actions");
  const start = element("button", "primary-button hero-start", handlers.hasSavedGame ? "Resume Mission" : "Start Mission");
  start.type = "button";
  start.addEventListener("click", handlers.onStart);
  const how = element("button", "secondary-button", "How to Play");
  how.type = "button";
  how.addEventListener("click", () => openHowToPlay(how));
  actions.append(start, how);
  if (handlers.hasSavedGame) {
    const reset = element("button", "text-button danger-text", "Reset Saved Game");
    reset.type = "button";
    reset.addEventListener("click", handlers.onReset);
    actions.append(reset);
  }
  copy.append(actions);
  hero.append(copy, titleMitochondrion());

  const missionStrip = element("div", "mission-strip");
  missionStrip.innerHTML = `
    <div><strong>04</strong><span>Bridge operations</span></div>
    <div><strong>08</strong><span>TCA reactions</span></div>
    <div><strong>04</strong><span>Metabolic events</span></div>
    <div><strong>10</strong><span>ATP eq / turn</span></div>`;
  root.append(top, hero, missionStrip);
  main().replaceChildren(root);
  start.focus();
}

function progressText(state, challenge, kind) {
  if (kind === "bridge") return `Bridge ${challenge.number}/4`;
  if (kind === "final") return `Final Gate ${challenge.number}/4`;
  if (challenge.phaseKind === "event") return `${state.completedLevels.length}/8 levels · event`;
  return `Level ${challenge.level} of 8`;
}

function answerDetailsUnlocked(state, challenge) {
  if (!challenge?.id) return true;
  const completed = [
    ...(state.completedBridgeSteps ?? []),
    ...(state.completedLevels ?? []),
    ...(state.completedEvents ?? []),
    ...(state.finalGateProgress?.completed ?? [])
  ].includes(challenge.id);
  return (state.attempts?.[challenge.id] ?? 0) > 0 || completed;
}

function concealAnswerPart(state, challenge, part) {
  return !answerDetailsUnlocked(state, challenge) && challenge.concealBeforeAttempt?.includes(part);
}

function createStatusBar(state, challenge, handlers, kind) {
  const bar = element("header", "status-bar");
  const mission = element("div", "status-mission");
  mission.innerHTML = `<span class="status-brand">MM</span><div><strong>${kind === "final" ? "FINAL GATE" : kind === "bridge" ? "BRIDGE REACTION" : "CARBON CIRCUIT"}</strong><span>${progressText(state, challenge, kind)}</span></div>`;

  const resources = element("div", "status-resources");
  resources.setAttribute("aria-live", "polite");
  resources.innerHTML = `
    <div class="resource-chip credits-chip" aria-label="${state.atpCredits} M-Bucks"><span class="resource-icon">M</span><span><strong>${state.atpCredits}</strong><small>M-Bucks</small></span></div>
    <div class="resource-chip lives-chip" aria-label="${state.lives} of 3 lives"><span class="resource-icon">♥</span><span><strong>${state.lives}/3</strong><small>Lives</small></span></div>`;

  const actions = element("div", "status-actions");
  if (kind !== "bridge") {
    actions.append(
      createShopControls(
        state,
        challenge,
        { onHint: handlers.onHint, onLife: handlers.onLife },
        { allowHint: true }
      )
    );
  }
  const info = element("button", "icon-button info-button", "i");
  info.type = "button";
  const infoConcealed = concealAnswerPart(state, challenge, "info");
  info.disabled = infoConcealed;
  info.setAttribute(
    "aria-label",
    infoConcealed
      ? "Metabolism information unlocks after the first submitted attempt"
      : "Explain Mito Bucks and molecular products"
  );
  if (!infoConcealed) info.addEventListener("click", () => openMetabolismInfo(info));
  const reset = element("button", "text-button status-reset", "Reset Game");
  reset.type = "button";
  reset.addEventListener("click", handlers.onReset);
  actions.append(createMitoBucksShopButton(), info, reset);
  bar.append(mission, resources, actions);
  return bar;
}

function pathwayStatus(state, node, challenge, review) {
  if (review || state.completedLevels.includes(`level-${node.level}`)) return "complete";
  if (challenge?.phaseKind === "level" && challenge.level === node.level) return "active";
  return "locked";
}

export function createPathway(state, challenge, { review = false } = {}) {
  const panel = element("section", "pathway-panel");
  panel.setAttribute("aria-labelledby", "pathway-title");
  const header = element("div", "panel-heading");
  header.innerHTML = `<div><p class="panel-kicker">LIVE PATHWAY MAP</p><h2 id="pathway-title">One TCA turn</h2></div><span class="pathway-progress-label">${review ? 8 : state.completedLevels.length}/8 complete</span>`;

  const map = element("div", "pathway-map");
  const completed = review ? 8 : state.completedLevels.length;
  map.style.setProperty("--progress-deg", `${completed * 45}deg`);
  const orbit = element("div", "pathway-orbit");
  orbit.setAttribute("role", "list");
  orbit.setAttribute("aria-label", "TCA intermediates in biochemical order");
  const centre = element("div", "pathway-centre");
  centre.setAttribute("aria-hidden", "true");
  centre.innerHTML = `<span class="centre-small">CITRIC ACID</span><strong>TCA</strong><span>CYCLE</span><small>matrix · 1 acetyl-CoA</small>`;
  orbit.append(centre);

  const acetyl = element("div", "acetyl-entry");
  acetyl.setAttribute("aria-hidden", "true");
  acetyl.classList.toggle("is-current", state.currentIntermediate === "acetyl-coa");
  acetyl.innerHTML = `<span>Acetyl-CoA</span><strong>2C</strong><i aria-hidden="true">↓</i>`;
  orbit.append(acetyl);

  PATHWAY_NODES.forEach((node, index) => {
    const status = pathwayStatus(state, node, challenge, review);
    const current = state.currentIntermediate === node.id || (node.id === "malate" && state.currentIntermediate === "l-malate");
    const concealed =
      concealAnswerPart(state, challenge, "pathway") ||
      (status === "active" && concealAnswerPart(state, challenge, "activePathway"));
    const visibleCurrent = current && !concealed;
    const card = element("div", `pathway-node node-${index} is-${status}${visibleCurrent ? " is-current" : ""}`);
    card.setAttribute("role", "listitem");
    card.setAttribute(
      "aria-label",
      concealed
        ? `Intermediate hidden until the first submitted attempt, ${status}`
        : `${node.name}, ${node.carbons} carbons, ${status}${current ? ", current intermediate" : ""}`
    );
    card.innerHTML = `<span class="node-state-icon" aria-hidden="true">${status === "complete" ? "✓" : status === "active" ? "▶" : "·"}</span><span class="node-name">${concealed ? "?" : node.short ?? node.name}</span><strong>${concealed ? "?C" : `${node.carbons}C`}</strong>${visibleCurrent ? '<span class="current-marker">CURRENT</span>' : ""}`;
    orbit.append(card);
  });
  map.append(orbit);

  const legend = element("div", "pathway-legend");
  legend.innerHTML = `<span><i class="legend-dot complete-dot"></i>Completed</span><span><i class="legend-dot active-dot"></i>Active</span><span><i class="legend-dot locked-dot"></i>Locked</span><span><i class="current-tag">CURRENT</i>Intermediate</span>`;
  panel.append(header, map, legend);
  return panel;
}

function ledgerRow(label, value, type, note = "") {
  return `<li><span class="molecule-key ${type}-key" aria-hidden="true"></span><span>${label}${note ? `<small>${note}</small>` : ""}</span><strong>${value}</strong></li>`;
}

export function createLedgerPanel(state, challenge = null) {
  const panel = element("aside", "ledger-panel");
  panel.setAttribute("aria-label", "Molecular ledgers");
  if (concealAnswerPart(state, challenge, "ledger")) {
    panel.innerHTML = `
      <div class="panel-heading ledger-heading"><div><p class="panel-kicker">MOLECULAR ACCOUNTING</p><h2>Live ledgers</h2></div><span class="ledger-lock">Values sealed</span></div>
      <section class="ledger-section"><h3>Ledger verification in progress</h3><p>Stored molecular values unlock after the first complete answer is submitted.</p></section>
      <p class="credits-separation"><span class="credits-mini">M</span>${ATP_CREDITS_EXPLANATION}</p>`;
    return panel;
  }
  const atp = calculateTcaAtpEquivalents(state.tcaLedger);
  panel.innerHTML = `
    <div class="panel-heading ledger-heading"><div><p class="panel-kicker">MOLECULAR ACCOUNTING</p><h2>Live ledgers</h2></div><span class="ledger-lock">Verified updates only</span></div>
    <section class="ledger-section">
      <h3><span class="ledger-index">B</span> Bridge reaction</h3>
      <ul>
        ${ledgerRow("Acetyl-CoA", state.bridgeLedger.acetylCoA, "acetyl", "activated 2C")}
        ${ledgerRow("NADH", state.bridgeLedger.nadh, "nadh", "reduced cofactor")}
        ${ledgerRow("CO2", state.bridgeLedger.co2, "co2", "carbon released")}
        ${ledgerRow("Direct ATP", state.bridgeLedger.directAtp, "atp", "not produced by PDC")}
      </ul>
    </section>
    <section class="ledger-section">
      <h3><span class="ledger-index">T</span> One TCA turn</h3>
      <ul>
        ${ledgerRow("NADH", state.tcaLedger.nadh, "nadh")}
        ${ledgerRow("FADH2-equivalent", state.tcaLedger.fadh2Equivalent, "fadh")}
        ${ledgerRow("GTP", state.tcaLedger.gtp, "gtp")}
        ${ledgerRow("CO2", state.tcaLedger.co2, "co2")}
        ${ledgerRow("OAA regenerated", state.tcaLedger.oxaloacetateRegenerated ? "Yes" : "No", "oaa")}
      </ul>
    </section>
    <section class="atp-equivalent-card">
      <div><span class="atpeq-symbol">≈</span><span><small>One-turn yield</small><strong>${Number.isInteger(atp.total) ? atp.total : atp.total.toFixed(1)} ATP eq</strong></span></div>
      <ul class="atp-breakdown">
        <li>${state.tcaLedger.nadh} NADH × 2.5 = ${atp.nadhAtp}</li>
        <li>${state.tcaLedger.fadh2Equivalent} FADH2-eq × 1.5 = ${atp.fadh2Atp}</li>
        <li>${state.tcaLedger.gtp} GTP ≈ ${atp.gtpAtp} ATP</li>
      </ul>
      <p>Excludes the bridge-reaction NADH.</p>
    </section>
    <p class="credits-separation"><span class="credits-mini">M</span>${ATP_CREDITS_EXPLANATION}</p>`;
  return panel;
}

function createBridgeVisual(state, challenge) {
  const transported = state.completedBridgeSteps.includes("bridge-transport");
  const panel = element("section", "bridge-visual-panel");
  panel.setAttribute("aria-label", "Bridge reaction compartment map");
  panel.innerHTML = `
    <div class="panel-heading"><div><p class="panel-kicker">COMPARTMENT MAP</p><h2>Pyruvate entry</h2></div><span class="pathway-progress-label">${state.completedBridgeSteps.length}/4 complete</span></div>
    <div class="bridge-compartments">
      <div class="cytosol-zone"><span class="zone-label">CYTOSOL</span>${transported ? '<div class="transport-complete-label">Pyruvate transported</div>' : '<div class="molecule-card pyruvate-card"><strong>Pyruvate</strong><span>3 carbons</span></div>'}</div>
      <div class="inner-membrane"><span class="membrane-label">INNER MITOCHONDRIAL MEMBRANE</span><div class="carrier-channel ${challenge.id === "bridge-transport" ? "is-active" : ""}"><span>MPC</span><small>pyruvate carrier</small></div></div>
      <div class="matrix-zone"><span class="zone-label">MATRIX</span>${transported ? '<div class="molecule-card matrix-pyruvate-card"><strong>Pyruvate</strong><span>3C · delivered</span></div>' : ""}<div class="pdc-complex ${state.regulatoryFlags.pdcActive ? "is-active" : ""}"><span class="pdc-core">PDC</span><div><strong>${state.regulatoryFlags.pdcActive ? "ACTIVE" : "PHOSPHORYLATED · INACTIVE"}</strong><small>E1 · E2 · E3</small></div></div></div>
    </div>
    <div class="condition-console">
      <span><i class="condition-dot demand-dot"></i>ATP demand <strong>HIGH</strong></span>
      <span><i class="condition-dot oxygen-dot"></i>Oxygen <strong>AVAILABLE</strong></span>
      <span><i class="condition-dot redox-dot"></i>NADH/NAD+ <strong>NORMAL</strong></span>
    </div>`;
  return panel;
}

function createReactionVisual(challenge) {
  const visual = element("div", `reaction-visual reaction-${challenge.id}`);
  if (challenge.id === "level-2") {
    visual.innerHTML = `<div class="structure-card"><span>CITRATE · 6C</span><strong>C(OH)</strong><small>tertiary alcohol</small></div><span class="reaction-visual-arrow">⇌<small>cis-aconitate</small></span><div class="structure-card active-structure"><span>ISOCITRATE · 6C</span><strong>CH-OH</strong><small>secondary alcohol</small></div>`;
  } else if (challenge.id === "level-6") {
    visual.innerHTML = `<div class="membrane-mini"><span>Matrix</span><div class="complex-ii-mini"><strong>II</strong><small>SDH</small></div><i class="electron-line"></i><div class="coq-mini">Q</div><span>Inner membrane · no H+ pump</span></div>`;
  } else if (challenge.id === "level-7") {
    visual.innerHTML = `<div class="bond-diagram"><span>-OOC</span><strong>CH=CH</strong><span>COO-</span></div><span class="water-drop">H2O</span><div class="bond-diagram product-bond"><span>-OOC</span><strong>CH2-CH(OH)</strong><span>COO-</span></div>`;
  } else if (challenge.id === "event-oxygen") {
    visual.innerHTML = `<div class="etc-track"><span class="etc-node">NADH</span><i></i><span class="etc-node">I</span><i></i><span class="etc-node">Q</span><i></i><span class="etc-node">III</span><i></i><span class="etc-node">IV</span><i></i><span class="etc-node oxygen-node">O2</span></div>`;
  } else if (challenge.id === "event-anaplerosis") {
    visual.innerHTML = `<div class="carbon-equation"><span><strong>Pyruvate</strong><small>3C</small></span><b>+</b><span><strong>HCO3-</strong><small>1C</small></span><b>+</b><span><strong>ATP</strong><small>energy</small></span><b>→</b><span class="highlight-product"><strong>Oxaloacetate</strong><small>4C</small></span></div>`;
  } else {
    visual.innerHTML = `<div class="equation-line"><span>${challenge.routeDisplay ?? challenge.equation}</span></div>`;
  }
  return visual;
}

function challengePanel(state, challenge, interaction, kind) {
  const panel = element("section", `challenge-panel ${challenge.phaseKind === "event" ? "event-challenge" : ""}`);
  panel.setAttribute("aria-labelledby", "challenge-title");
  const intro = element("header", "challenge-intro");
  const answersUnlocked = answerDetailsUnlocked(state, challenge);
  const displayedTitle = !answersUnlocked && challenge.preAttemptTitle ? challenge.preAttemptTitle : challenge.title;
  const displayedInstruction =
    !answersUnlocked && challenge.preAttemptInstruction ? challenge.preAttemptInstruction : challenge.instruction;
  const enzymeBadge =
    challenge.enzyme && !concealAnswerPart(state, challenge, "enzyme")
      ? `<span class="enzyme-badge">${challenge.enzyme}</span>`
      : "";
  const equation =
    challenge.equation && !concealAnswerPart(state, challenge, "equation")
      ? `<p class="reaction-equation">${challenge.equation}</p>`
      : "";
  intro.innerHTML = `
    <p class="eyebrow">${challenge.eyebrow ?? `Final Gate · Section ${challenge.number} of 4`}</p>
    <div class="challenge-title-row"><h1 id="challenge-title">${displayedTitle}</h1>${enzymeBadge}</div>
    ${challenge.scenario ? `<p class="scenario-copy"><span aria-hidden="true">!</span>${challenge.scenario}</p>` : ""}
    ${equation}
    <p class="mission-instruction"><span aria-hidden="true">→</span>${displayedInstruction}</p>`;
  panel.append(intro);

  if (kind !== "final" && !concealAnswerPart(state, challenge, "visual")) {
    panel.append(createReactionVisual(challenge));
  }
  if (challenge.contextChips?.length) {
    const chips = element("div", "context-chip-row");
    chips.innerHTML = `<span>${challenge.contextLabel ?? "Required cofactor system"}</span>${challenge.contextChips.map((chip) => `<b>${chip}</b>`).join("")}`;
    panel.append(chips);
  }
  if (state.guidedMode && state.guidedChallengeId === challenge.id) {
    const guide = element("div", "guided-callout");
    guide.innerHTML = `<span class="guided-icon" aria-hidden="true">◎</span><div><strong>Guided Mode active</strong><p>${challenge.guidedCue}</p></div>`;
    panel.append(guide);
  }
  if (state.hintsPurchased.includes(challenge.id)) {
    const hint = element("div", "hint-callout");
    hint.innerHTML = `<span class="hint-icon" aria-hidden="true">?</span><div><strong>Purchased hint</strong><p>${challenge.hint}</p></div>`;
    panel.append(hint);
  }
  panel.append(interaction.root);
  return panel;
}

function emptyFeedback(kind) {
  const panel = element("section", "feedback-panel feedback-idle");
  panel.id = "feedback-panel";
  panel.setAttribute("aria-label", "Challenge feedback");
  panel.innerHTML = `<div class="feedback-status"><span class="feedback-icon">${kind === "bridge" ? "i" : "↳"}</span><div><p class="panel-kicker">MISSION CONTROL</p><h2>Awaiting your submission</h2><p>Complete the scientific arrangement, then submit.</p></div></div>`;
  return panel;
}

export function renderGameScreen(state, challenge, interaction, handlers, { kind = "mission" } = {}) {
  document.body.className = `game-mode ${kind}-mode`;
  const shell = element("div", "game-shell");
  shell.append(createStatusBar(state, challenge, handlers, kind));
  const workspace = element("div", `game-workspace ${kind === "bridge" ? "bridge-workspace" : ""}`);
  workspace.append(
    challengePanel(state, challenge, interaction, kind),
    kind === "bridge" ? createBridgeVisual(state, challenge) : createPathway(state, challenge),
    createLedgerPanel(state, challenge)
  );
  shell.append(workspace, emptyFeedback(kind));
  main().replaceChildren(shell);
  window.scrollTo({ top: 0, behavior: "auto" });
  main().focus({ preventScroll: true });
}

export function refreshStateDisplays(state, challenge, kind, { lockShop = false } = {}) {
  const credits = document.querySelector(".credits-chip");
  if (credits) {
    credits.setAttribute("aria-label", `${state.atpCredits} M-Bucks`);
    const value = credits.querySelector("strong");
    if (value) value.textContent = state.atpCredits;
  }
  const lives = document.querySelector(".lives-chip");
  if (lives) {
    lives.setAttribute("aria-label", `${state.lives} of 3 lives`);
    const value = lives.querySelector("strong");
    if (value) value.textContent = `${state.lives}/3`;
  }
  const ledger = document.querySelector(".ledger-panel");
  if (ledger) ledger.replaceWith(createLedgerPanel(state, challenge));
  const visual = document.querySelector(kind === "bridge" ? ".bridge-visual-panel" : ".pathway-panel");
  if (visual) {
    visual.replaceWith(kind === "bridge" ? createBridgeVisual(state, challenge) : createPathway(state, challenge));
  }
  if (lockShop) {
    document.querySelectorAll(".shop-button").forEach((button) => {
      button.disabled = true;
    });
  }
}

function feedbackOutcome(state, data) {
  const chunks = [];
  if (data.reward) chunks.push(`<span class="outcome-chip reward-chip">+${data.reward} M-Bucks</span>`);
  if (data.penalty?.scientificCreditLoss) chunks.push(`<span class="outcome-chip penalty-chip">-${data.penalty.scientificCreditLoss} M-Bucks</span>`);
  if (data.penalty?.lifeLoss) chunks.push(`<span class="outcome-chip life-penalty-chip">-${data.penalty.lifeLoss} life</span>`);
  if (data.penalty?.rebooted) chunks.push(`<span class="outcome-chip reboot-chip">System reboot -${data.penalty.rebootCost} M-Bucks · lives restored</span>`);
  chunks.push(`<span class="outcome-total">Now: ${state.atpCredits} M-Bucks · ${state.lives}/3 lives</span>`);
  return chunks.join("");
}

export function showFeedback(state, data, handlers = {}) {
  const existing = document.querySelector("#feedback-panel");
  if (!existing) return;
  const panel = element("section", `feedback-panel feedback-${data.status}`);
  panel.id = "feedback-panel";
  panel.setAttribute("aria-label", "Challenge feedback");

  if (data.status === "notice") {
    panel.innerHTML = `<div class="feedback-status"><span class="feedback-icon">i</span><div><p class="panel-kicker">NO PENALTY</p><h2>${data.heading ?? "One more step"}</h2><p>${data.message}</p></div></div>`;
    existing.replaceWith(panel);
    announce(data.message);
    return;
  }

  const success = data.status === "success";
  const content = data.content ?? {};
  const icon = success ? "✓" : "!";
  const kicker = success ? "REACTION VERIFIED" : "SCIENTIFIC CHECK";
  const heading = data.heading ?? (success ? "Correct" : "Recalibrate and retry");
  const summary = data.message ?? content.summary ?? "Review the biochemical relationship before trying again.";
  const facts = content.facts?.length
    ? `<ul class="feedback-facts">${content.facts.map((fact) => `<li>${fact}</li>`).join("")}</ul>`
    : "";
  const reaction = content.reaction ? `<div class="feedback-reaction"><span>Reaction</span><strong>${content.reaction}</strong></div>` : "";
  const ledger = content.ledger ? `<div class="feedback-ledger"><span aria-hidden="true">▦</span><strong>Ledger</strong><p>${content.ledger}</p></div>` : "";
  const clue = !success && data.clue ? `<p class="feedback-clue"><strong>Reasoning cue:</strong> ${data.clue}</p>` : "";

  panel.innerHTML = `
    <div class="feedback-status"><span class="feedback-icon">${icon}</span><div><p class="panel-kicker">${kicker}</p><h2>${heading}</h2><p>${summary}</p></div></div>
    <div class="feedback-detail">${reaction}${facts}${ledger}${clue}</div>
    <div class="feedback-footer"><div class="feedback-outcome">${feedbackOutcome(state, data)}</div><div class="feedback-actions"></div></div>`;

  const actions = panel.querySelector(".feedback-actions");
  const action = element("button", success ? "primary-button" : "secondary-button", success ? data.continueLabel ?? "Continue" : "Retry challenge");
  action.type = "button";
  let used = false;
  action.addEventListener("click", () => {
    if (used) return;
    used = true;
    action.disabled = true;
    if (success) handlers.onContinue?.();
    else handlers.onRetry?.();
  });
  actions.append(action);
  existing.replaceWith(panel);
  const resourceAnnouncement = data.penalty
    ? ` ${data.penalty.scientificCreditLoss} Mito Bucks lost for the scientific error${data.penalty.rebooted ? `, plus ${data.penalty.rebootCost} Mito Bucks for the reboot` : ""}; ${state.atpCredits} Mito Bucks and ${state.lives} of 3 lives remain.`
    : `${data.reward ? ` Awarded ${data.reward} Mito Bucks;` : ""} ${state.atpCredits} Mito Bucks and ${state.lives} of 3 lives remain.`;
  announce(`${heading}. ${summary}${resourceAnnouncement}`);
  action.focus();
}

function statCard(icon, value, label, className = "") {
  return `<article class="result-stat ${className}"><span class="result-stat-icon" aria-hidden="true">${icon}</span><strong>${value}</strong><span>${label}</span></article>`;
}

function resultLedger(state) {
  const atp = calculateTcaAtpEquivalents(state.tcaLedger);
  return `<div class="results-ledger-grid">
    <article><p class="panel-kicker">BRIDGE REACTION</p><h3>Per pyruvate</h3><ul><li>Acetyl-CoA <strong>${state.bridgeLedger.acetylCoA}</strong></li><li>NADH <strong>${state.bridgeLedger.nadh}</strong></li><li>CO2 <strong>${state.bridgeLedger.co2}</strong></li><li>Direct ATP <strong>${state.bridgeLedger.directAtp}</strong></li></ul></article>
    <article><p class="panel-kicker">ONE TCA TURN</p><h3>Per acetyl-CoA</h3><ul><li>NADH <strong>${state.tcaLedger.nadh}</strong></li><li>FADH2-equivalent <strong>${state.tcaLedger.fadh2Equivalent}</strong></li><li>GTP <strong>${state.tcaLedger.gtp}</strong></li><li>CO2 <strong>${state.tcaLedger.co2}</strong></li><li>OAA regenerated <strong>${state.tcaLedger.oxaloacetateRegenerated ? "Yes" : "No"}</strong></li></ul></article>
    <article class="yield-card"><p class="panel-kicker">APPROXIMATE YIELD</p><h3>${atp.total} ATP equivalents</h3><p>${state.tcaLedger.nadh} NADH × 2.5 = ${atp.nadhAtp}</p><p>${state.tcaLedger.fadh2Equivalent} FADH2-eq × 1.5 = ${atp.fadh2Atp}</p><p>${state.tcaLedger.gtp} GTP ≈ ${atp.gtpAtp} ATP</p><small>One TCA turn only; bridge NADH excluded.</small></article>
  </div>`;
}

export function renderResults(state, handlers) {
  document.body.className = "results-mode";
  const root = element("section", "results-screen");
  const rank = rankForCredits(state.atpCredits);
  root.innerHTML = `
    <header class="results-hero">
      <div class="restored-orbit" aria-hidden="true"><span class="orbit-core">✓</span><i></i><i></i><i></i></div>
      <p class="eyebrow">MISSION COMPLETE · CARBON CIRCUIT STABLE</p>
      <h1>Mitochondrial Function Restored</h1>
      <p class="rank-badge">${rank}</p>
      <p class="results-lead">You converted pyruvate into acetyl-CoA, completed all eight TCA reactions, restored four metabolic control failures and verified the cycle's molecular output.</p>
    </header>
    <div class="result-stats">
      ${statCard("C", state.atpCredits, "Final M-Bucks", "credits-result")}
      ${statCard("♥", `${state.lives}/3`, "Lives remaining", "lives-result")}
      ${statCard("✓", `${state.completedBridgeSteps.length}/4`, "Bridge steps")}
      ${statCard("↻", `${state.completedLevels.length}/8`, "TCA levels")}
      ${statCard("!", `${state.completedEvents.length}/4`, "Events stabilised")}
      ${statCard("?", state.hintsPurchased.length, "Hints used")}
      ${statCard("×", state.incorrectSubmissions, "Incorrect submissions")}
    </div>
    ${resultLedger(state)}
    <div class="results-summary"><span class="summary-icon" aria-hidden="true">M</span><p>Pyruvate entered the mitochondrial matrix and the pyruvate dehydrogenase complex produced acetyl-CoA, NADH and CO2. Acetyl-CoA then condensed with oxaloacetate. One complete TCA-cycle turn generated three NADH, one FADH2-equivalent, one GTP and two CO2 while regenerating oxaloacetate. The cycle responds to energy demand, cellular redox state, cofactor availability, oxygen-dependent NAD+ regeneration and the withdrawal or replenishment of biosynthetic intermediates.</p></div>
    <div class="results-actions"></div>`;
  const actions = root.querySelector(".results-actions");
  const replay = element("button", "primary-button", "Replay Mission");
  replay.type = "button";
  replay.addEventListener("click", handlers.onReplay);
  const review = element("button", "secondary-button", "Review Cycle");
  review.type = "button";
  review.addEventListener("click", handlers.onReview);
  const reset = element("button", "text-button danger-text", "Reset Game");
  reset.type = "button";
  reset.addEventListener("click", handlers.onReset);
  actions.append(replay, review, reset);
  main().replaceChildren(root);
  announce(`Mitochondrial function restored. Final rank: ${rank}.`);
  replay.focus();
}

export function renderReview(state, handlers) {
  document.body.className = "review-mode";
  const root = element("section", "review-screen");
  const header = element("header", "review-header");
  header.innerHTML = `<div><p class="eyebrow">READ-ONLY REVIEW MODE</p><h1>Completed Carbon Circuit</h1><p>Reviewing this pathway cannot change Mito Bucks, lives, rewards or molecular ledgers.</p></div>`;
  const back = element("button", "secondary-button", "Back to Results");
  back.type = "button";
  back.addEventListener("click", handlers.onBack);
  header.append(back);

  const layout = element("div", "review-layout");
  layout.append(createPathway(state, null, { review: true }));
  const facts = element("section", "review-facts");
  facts.innerHTML = `<div class="panel-heading"><div><p class="panel-kicker">REACTION LOG</p><h2>What each step accomplished</h2></div></div><div class="review-fact-list">${REVIEW_FACTS.map((fact, index) => `<article><span>${String(index + 1).padStart(2, "0")}</span><div><h3>${fact.title}</h3><p>${fact.text}</p></div></article>`).join("")}</div>`;
  layout.append(facts, createLedgerPanel(state));
  root.append(header, layout);
  main().replaceChildren(root);
  back.focus();
}
