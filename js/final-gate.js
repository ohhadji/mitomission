import { createInteraction } from "./interactions.js";

const make = (tag, className, content = "") => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (content) node.textContent = content;
  return node;
};

const sameSet = (actual = [], expected = []) =>
  actual.length === expected.length && expected.every((item) => actual.includes(item));

function lockAndSubmit(root, button, isComplete, getAnswer, callbacks) {
  let locked = false;
  const lock = () => {
    locked = true;
    root.classList.add("is-locked");
    root.querySelectorAll("button, select, input").forEach((control) => {
      control.disabled = true;
    });
  };
  button.addEventListener("click", () => {
    if (locked) return;
    if (!isComplete()) {
      callbacks.onIncomplete("Complete every required field before submitting. Incomplete work is not penalised.");
      return;
    }
    lock();
    callbacks.onSubmit(getAnswer());
  });
  return { lock };
}

function makeDraggableLabel(entry, onSelect) {
  const button = make("button", "token-button sequence-label");
  button.type = "button";
  button.dataset.optionId = entry.id;
  button.textContent = entry.label;
  button.draggable = true;
  button.setAttribute("aria-pressed", "false");
  button.addEventListener("click", () => onSelect(entry.id));
  button.addEventListener("dragstart", (event) => {
    event.dataTransfer.setData("text/plain", entry.id);
    event.dataTransfer.effectAllowed = "move";
  });
  return button;
}

function renderSequenceSlots(section, callbacks) {
  const root = make("div", "interaction final-sequence-interaction");
  const tray = make("div", "token-grid sequence-token-grid");
  const chain = make("div", "sequence-chain");
  const placements = {};
  let selected = null;
  const optionButtons = [];

  const fixedSteps = [
    { label: "Oxaloacetate + Acetyl-CoA", slot: section.slots[0] },
    { label: "Isocitrate", slot: section.slots[1] },
    { label: "Succinyl-CoA", slot: section.slots[2] },
    { label: "Fumarate", slot: section.slots[3] },
    { label: "Oxaloacetate", slot: null }
  ];

  const render = () => {
    chain.querySelectorAll(".sequence-slot").forEach((slot) => {
      const optionId = placements[slot.dataset.slotId];
      const entry = section.options.find((item) => item.id === optionId);
      slot.querySelector(".sequence-slot-value").textContent = entry?.label ?? "Choose intermediate";
      slot.classList.toggle("has-value", Boolean(entry));
    });
    optionButtons.forEach((button) => {
      const used = Object.values(placements).includes(button.dataset.optionId);
      const isSelected = selected === button.dataset.optionId;
      button.classList.toggle("is-placed", used);
      button.classList.toggle("is-selected", isSelected);
      button.setAttribute("aria-pressed", String(isSelected));
    });
    counter.textContent = `${Object.keys(placements).length} of ${section.slots.length} blanks filled`;
  };

  const place = (slotId, optionId) => {
    if (!section.options.some((entry) => entry.id === optionId)) return;
    Object.keys(placements).forEach((key) => {
      if (placements[key] === optionId) delete placements[key];
    });
    placements[slotId] = optionId;
    selected = null;
    render();
  };

  section.options.forEach((entry) => {
    const button = makeDraggableLabel(entry, (id) => {
      selected = id;
      render();
    });
    optionButtons.push(button);
    tray.append(button);
  });

  fixedSteps.forEach((step, index) => {
    const fixed = make("div", "sequence-fixed", step.label);
    chain.append(fixed);
    if (step.slot) {
      const arrow = make("span", "sequence-arrow", "→");
      arrow.setAttribute("aria-hidden", "true");
      const slot = make("button", "sequence-slot");
      slot.type = "button";
      slot.dataset.slotId = step.slot.id;
      slot.innerHTML = `<span class="sequence-slot-label">Blank ${index + 1}</span><span class="sequence-slot-value">Choose intermediate</span>`;
      slot.addEventListener("click", () => {
        if (selected) place(step.slot.id, selected);
        else callbacks.onIncomplete("Select an intermediate label first, then choose a blank.");
      });
      slot.addEventListener("dragover", (event) => event.preventDefault());
      slot.addEventListener("drop", (event) => {
        event.preventDefault();
        const id = event.dataTransfer.getData("text/plain");
        if (id) place(step.slot.id, id);
      });
      chain.append(arrow, slot, make("span", "sequence-arrow", "→"));
    }
  });

  const counter = make("p", "selection-counter", `0 of ${section.slots.length} blanks filled`);
  counter.setAttribute("aria-live", "polite");
  const submit = make("button", "primary-button submit-answer", "Submit sequence");
  submit.type = "button";
  root.append(tray, chain, counter, submit);
  const locking = lockAndSubmit(root, submit, () => Object.keys(placements).length === section.slots.length, () => ({ ...placements }), callbacks);
  return { root, ...locking };
}

function numberSelect(label, id, max = 4) {
  const wrapper = make("label", "ledger-input");
  wrapper.append(make("span", "ledger-input-label", label));
  const select = document.createElement("select");
  select.id = id;
  select.dataset.fieldId = id;
  select.innerHTML = `<option value="">Choose</option>${Array.from({ length: max + 1 }, (_, value) => `<option value="${value}">${value}</option>`).join("")}`;
  wrapper.append(select);
  return wrapper;
}

function renderLedgerCheck(section, callbacks) {
  const root = make("div", "interaction final-ledger-interaction");
  const grids = make("div", "final-ledger-grids");
  const bridge = make("fieldset", "ledger-entry-card");
  bridge.append(make("legend", "ledger-entry-title", "Bridge reaction · per pyruvate"));
  bridge.append(
    numberSelect("Acetyl-CoA", "bridge-acetyl"),
    numberSelect("NADH", "bridge-nadh"),
    numberSelect("CO2", "bridge-co2"),
    numberSelect("Direct ATP", "bridge-atp")
  );

  const tca = make("fieldset", "ledger-entry-card");
  tca.append(make("legend", "ledger-entry-title", "One TCA turn · per acetyl-CoA"));
  tca.append(
    numberSelect("NADH", "tca-nadh"),
    numberSelect("FADH2-equivalent", "tca-fadh2"),
    numberSelect("GTP", "tca-gtp"),
    numberSelect("CO2", "tca-co2")
  );
  const oaa = make("label", "ledger-input");
  oaa.append(make("span", "ledger-input-label", "Oxaloacetate regenerated"));
  const oaaSelect = document.createElement("select");
  oaaSelect.id = "tca-oaa";
  oaaSelect.dataset.fieldId = "tca-oaa";
  oaaSelect.innerHTML = '<option value="">Choose</option><option value="yes">Yes</option><option value="no">No</option>';
  oaa.append(oaaSelect);
  tca.append(oaa);
  grids.append(bridge, tca);

  const getAnswer = () => ({
    bridge: {
      acetylCoA: Number(root.querySelector("#bridge-acetyl").value),
      nadh: Number(root.querySelector("#bridge-nadh").value),
      co2: Number(root.querySelector("#bridge-co2").value),
      directAtp: Number(root.querySelector("#bridge-atp").value)
    },
    tca: {
      nadh: Number(root.querySelector("#tca-nadh").value),
      fadh2Equivalent: Number(root.querySelector("#tca-fadh2").value),
      gtp: Number(root.querySelector("#tca-gtp").value),
      co2: Number(root.querySelector("#tca-co2").value),
      oxaloacetateRegenerated: root.querySelector("#tca-oaa").value === "yes"
    }
  });
  const isComplete = () => [...root.querySelectorAll("select")].every((select) => select.value !== "");
  const submit = make("button", "primary-button submit-answer", "Verify ledgers");
  submit.type = "button";
  root.append(grids, submit);
  const locking = lockAndSubmit(root, submit, isComplete, getAnswer, callbacks);
  return { root, ...locking };
}

function toggleTokenGroup(entries, required, ariaLabel) {
  const root = make("div", "token-grid compact-token-grid");
  root.setAttribute("role", "group");
  root.setAttribute("aria-label", ariaLabel);
  const selected = new Set();
  entries.forEach((entry) => {
    const button = make("button", "token-button compact-token", entry.label);
    button.type = "button";
    button.setAttribute("aria-pressed", "false");
    button.addEventListener("click", () => {
      if (selected.has(entry.id)) selected.delete(entry.id);
      else selected.add(entry.id);
      button.classList.toggle("is-selected", selected.has(entry.id));
      button.setAttribute("aria-pressed", String(selected.has(entry.id)));
    });
    root.append(button);
  });
  return { root, value: () => [...selected], complete: () => selected.size >= required };
}

function renderRegulation(section, callbacks) {
  const root = make("div", "interaction final-regulation-interaction");

  const controlPanel = make("fieldset", "final-part-panel");
  controlPanel.append(make("legend", "multipart-title", "A · Select the three major regulatory enzymes"));
  const controls = toggleTokenGroup(section.regulatedOptions, 3, "Select three major regulated reactions");
  controlPanel.append(controls.root);

  const signalPanel = make("fieldset", "final-part-panel");
  signalPanel.append(make("legend", "multipart-title", "B · Assign each regulatory signal its effect on TCA flux"));
  const signalAssignments = {};
  const signalGrid = make("div", "signal-select-grid");
  section.signals.forEach((signal) => {
    const label = make("label", "signal-select");
    label.append(make("span", "signal-name", signal));
    const select = document.createElement("select");
    select.dataset.signal = signal;
    select.innerHTML = '<option value="">Choose effect</option><option value="promote">Promotes flux</option><option value="suppress">Suppresses flux</option>';
    select.addEventListener("change", () => {
      signalAssignments[signal] = select.value;
    });
    label.append(select);
    signalGrid.append(label);
  });
  signalPanel.append(signalGrid);

  const inhibitorPanel = make("fieldset", "final-part-panel");
  inhibitorPanel.append(make("legend", "multipart-title", "C · Select the two α-KGDH product/redox inhibitors"));
  const inhibitors = toggleTokenGroup(section.inhibitors, 2, "Select two alpha-ketoglutarate dehydrogenase inhibitors");
  inhibitorPanel.append(inhibitors.root);

  const submit = make("button", "primary-button submit-answer", "Submit regulation map");
  submit.type = "button";
  root.append(controlPanel, signalPanel, inhibitorPanel, submit);
  const locking = lockAndSubmit(
    root,
    submit,
    () => controls.complete() && inhibitors.complete() && Object.values(signalAssignments).filter(Boolean).length === section.signals.length,
    () => ({ regulated: controls.value(), signals: { ...signalAssignments }, inhibitors: inhibitors.value() }),
    callbacks
  );
  return { root, ...locking };
}

export function createFinalGateInteraction(section, state, callbacks) {
  if (section.type === "sequenceSlots") return renderSequenceSlots(section, callbacks);
  if (section.type === "ledgerCheck") return renderLedgerCheck(section, callbacks);
  if (section.type === "regulationCheck") return renderRegulation(section, callbacks);
  if (section.type === "exactSet") {
    return createInteraction(section, {
      ...callbacks,
      hintPurchased: state.hintsPurchased.includes(section.id),
      guidedMode: false
    });
  }
  throw new Error(`Unsupported Final Gate type: ${section.type}`);
}

export function validateFinalAnswer(section, answer, state) {
  if (section.type === "sequenceSlots") {
    const correct = section.slots.every((slot) => answer?.[slot.id] === slot.correct);
    return { correct, message: correct ? section.success : section.incorrect };
  }

  if (section.type === "ledgerCheck") {
    const bridge = answer?.bridge ?? {};
    const tca = answer?.tca ?? {};
    const correct =
      bridge.acetylCoA === state.bridgeLedger.acetylCoA &&
      bridge.nadh === state.bridgeLedger.nadh &&
      bridge.co2 === state.bridgeLedger.co2 &&
      bridge.directAtp === state.bridgeLedger.directAtp &&
      tca.nadh === state.tcaLedger.nadh &&
      tca.fadh2Equivalent === state.tcaLedger.fadh2Equivalent &&
      tca.gtp === state.tcaLedger.gtp &&
      tca.co2 === state.tcaLedger.co2 &&
      tca.oxaloacetateRegenerated === state.tcaLedger.oxaloacetateRegenerated;
    return { correct, message: correct ? section.success : section.incorrect };
  }

  if (section.type === "regulationCheck") {
    const correctSignals = { ADP: "promote", "Ca2+": "promote", ATP: "suppress", NADH: "suppress" };
    const signalsCorrect = Object.entries(correctSignals).every(([signal, category]) => answer?.signals?.[signal] === category);
    const correct =
      sameSet(answer?.regulated, ["citrate-synthase", "isocitrate-dh", "alpha-kgdh"]) &&
      signalsCorrect &&
      sameSet(answer?.inhibitors, ["nadh", "succinyl-coa"]);
    return { correct, message: correct ? section.success : section.incorrect };
  }

  if (section.type === "exactSet") {
    const correct = sameSet(answer, section.correct);
    return { correct, message: correct ? section.success : section.incorrect };
  }

  return { correct: false, message: "This Final Gate section could not be validated." };
}
