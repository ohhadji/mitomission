const text = (tag, className, content) => {
  const element = document.createElement(tag);
  if (className) element.className = className;
  element.textContent = content;
  return element;
};

function visibleOptions(options, { hintPurchased, guidedMode, showOptionDetails }) {
  if (!Array.isArray(options)) return [];
  const correct = options.filter((item) => item.correct);
  const distractors = options.filter((item) => !item.correct);
  const visible = guidedMode
    ? [...correct, ...distractors.slice(0, 1)]
    : hintPurchased && distractors.length > 1
      ? [...correct, ...distractors.slice(1)]
      : [...options];
  return showOptionDetails ? visible : visible.map(({ detail, ...entry }) => entry);
}

function setSelected(buttons, selectedId) {
  buttons.forEach((button) => {
    const selected = button.dataset.optionId === selectedId;
    button.classList.toggle("is-selected", selected);
    button.setAttribute("aria-pressed", String(selected));
  });
}

function createToken(option, onClick, className = "token-button") {
  const button = document.createElement("button");
  button.type = "button";
  button.className = className;
  button.dataset.optionId = option.id;
  button.setAttribute("aria-pressed", "false");
  button.draggable = true;

  const label = text("span", "token-label", option.label);
  button.append(label);
  if (option.detail) button.append(text("span", "token-detail", option.detail));
  button.addEventListener("click", () => onClick(option.id, button));
  button.addEventListener("dragstart", (event) => {
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", option.id);
    button.classList.add("is-dragging");
  });
  button.addEventListener("dragend", () => button.classList.remove("is-dragging"));
  return button;
}

function configureDropTarget(target, onDrop) {
  target.addEventListener("dragover", (event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    target.classList.add("is-dragover");
  });
  target.addEventListener("dragleave", () => target.classList.remove("is-dragover"));
  target.addEventListener("drop", (event) => {
    event.preventDefault();
    target.classList.remove("is-dragover");
    const id = event.dataTransfer.getData("text/plain");
    if (id) onDrop(id);
  });
}

function addSubmit(root, label, getAnswer, isComplete, callbacks) {
  const submit = document.createElement("button");
  submit.type = "button";
  submit.className = "primary-button submit-answer";
  submit.textContent = label;
  root.append(submit);

  let locked = false;
  const lock = () => {
    locked = true;
    root.classList.add("is-locked");
    root.querySelectorAll("button, select, input").forEach((control) => {
      control.disabled = true;
    });
  };

  submit.addEventListener("click", () => {
    if (locked) return;
    if (!isComplete()) {
      callbacks.onIncomplete("Complete every required part before submitting. Incomplete work is not penalised.");
      return;
    }
    lock();
    callbacks.onSubmit(getAnswer());
  });

  return { lock };
}

function renderChoice(challenge, context) {
  const root = text("div", "interaction interaction-choice", "");
  const group = text("div", "choice-grid", "");
  group.setAttribute("role", "group");
  group.setAttribute("aria-label", challenge.instruction);
  let selected = null;
  const buttons = [];

  visibleOptions(challenge.options, context).forEach((entry) => {
    const button = createToken(entry, (id) => {
      selected = id;
      setSelected(buttons, selected);
    }, challenge.cardStyle ? "token-button option-card" : "token-button choice-button");
    buttons.push(button);
    group.append(button);
  });
  root.append(group);
  return {
    root,
    ...addSubmit(root, "Submit answer", () => selected, () => selected !== null, context)
  };
}

function renderExactSet(challenge, context) {
  const root = text("div", "interaction interaction-set", "");
  const group = text("div", "token-grid", "");
  group.setAttribute("role", "group");
  group.setAttribute("aria-label", `${challenge.instruction} Select ${challenge.requiredCount}.`);
  const selected = new Set();

  visibleOptions(challenge.options, context).forEach((entry) => {
    const button = createToken(entry, (id, token) => {
      if (selected.has(id)) selected.delete(id);
      else selected.add(id);
      token.classList.toggle("is-selected", selected.has(id));
      token.setAttribute("aria-pressed", String(selected.has(id)));
      counter.textContent = `${selected.size} selected · ${challenge.requiredCount} required`;
    });
    group.append(button);
  });
  const counter = text("p", "selection-counter", `0 selected · ${challenge.requiredCount} required`);
  root.append(group, counter);
  return {
    root,
    ...addSubmit(
      root,
      "Submit product set",
      () => [...selected],
      () => selected.size >= challenge.requiredCount,
      context
    )
  };
}

function renderPlacement(challenge, context) {
  const root = text("div", "interaction interaction-placement", "");
  const tokens = text("div", challenge.cardStyle ? "placement-options card-options" : "placement-options", "");
  let selected = null;
  let placed = null;
  const buttons = [];

  const target = document.createElement("button");
  target.type = "button";
  target.className = "drop-zone";
  target.innerHTML = `<span class="drop-zone-label">${challenge.targetLabel}</span><span class="drop-zone-value">Select a token, then choose this target</span>`;

  const place = (id) => {
    const found = challenge.options.find((entry) => entry.id === id);
    if (!found) return;
    placed = id;
    selected = id;
    target.querySelector(".drop-zone-value").textContent = found.label;
    target.classList.add("has-value");
    setSelected(buttons, selected);
  };

  visibleOptions(challenge.options, context).forEach((entry) => {
    const button = createToken(entry, (id) => {
      selected = id;
      setSelected(buttons, selected);
      target.focus();
    }, challenge.cardStyle ? "token-button option-card" : "token-button");
    buttons.push(button);
    tokens.append(button);
  });
  target.addEventListener("click", () => {
    if (selected) place(selected);
    else context.onIncomplete("Select a molecule or enzyme first; no penalty applied.");
  });
  configureDropTarget(target, place);
  root.append(tokens, target);
  return {
    root,
    ...addSubmit(root, "Lock placement", () => placed, () => placed !== null, context)
  };
}

function renderPlacementSequence(challenge, context) {
  const root = text("div", "interaction interaction-sequence-placement", "");
  const progress = [];
  let selected = null;
  const token = createToken(challenge.token, () => {
    selected = challenge.token.id;
    token.classList.add("is-selected");
    token.setAttribute("aria-pressed", "true");
  });
  const route = text("div", "transport-route", "");

  const attemptTarget = (targetId) => {
    if (!selected) {
      context.onIncomplete("Select pyruvate first; no penalty applied.");
      return;
    }
    const expected = challenge.correct[progress.length];
    if (targetId !== expected) {
      context.onNonPenalizedError(challenge.incorrect);
      return;
    }
    progress.push(targetId);
    selected = null;
    token.classList.remove("is-selected");
    token.setAttribute("aria-pressed", "false");
    const target = route.querySelector(`[data-target-id="${targetId}"]`);
    target.classList.add("is-complete");
    target.querySelector(".drop-zone-value").textContent = `Pyruvate passed · ${progress.length}/${challenge.correct.length}`;
    if (context.guidedMode) {
      route.querySelectorAll(".transport-target").forEach((entry) => entry.classList.remove("is-guided-target"));
      const nextTarget = route.querySelector(`[data-target-id="${challenge.correct[progress.length]}"]`);
      nextTarget?.classList.add("is-guided-target");
    }
    if (progress.length < challenge.correct.length) token.focus();
  };

  challenge.targets.forEach((entry, index) => {
    const target = document.createElement("button");
    target.type = "button";
    target.className = "drop-zone transport-target";
    target.dataset.targetId = entry.id;
    target.innerHTML = `<span class="step-number">${index + 1}</span><span class="drop-zone-label">${entry.label}</span><span class="drop-zone-value">${entry.caption}</span>`;
    target.addEventListener("click", () => attemptTarget(entry.id));
    configureDropTarget(target, (id) => {
      if (id === challenge.token.id) {
        selected = id;
        attemptTarget(entry.id);
      }
    });
    route.append(target);
  });
  if (context.guidedMode) {
    route.querySelector(`[data-target-id="${challenge.correct[0]}"]`)?.classList.add("is-guided-target");
  }

  const cue = text("p", "click-place-cue", "Drag pyruvate to each target in order. Alternatively, click pyruvate, then a target, and repeat.");
  root.append(token, cue, route);
  return {
    root,
    ...addSubmit(
      root,
      "Confirm transport",
      () => [...progress],
      () => progress.length === challenge.correct.length,
      context
    )
  };
}

function renderDockSet(challenge, context) {
  const root = text("div", "interaction interaction-dock-set", "");
  const tokens = text("div", "placement-options", "");
  const placed = new Set();
  let selected = null;
  const buttons = [];
  const target = document.createElement("button");
  target.type = "button";
  target.className = "drop-zone reaction-dock";
  target.innerHTML = `<span class="drop-zone-label">${challenge.targetLabel}</span><span class="drop-zone-value">Empty · load ${challenge.requiredCount} inputs</span>`;

  const renderDock = () => {
    const labels = [...placed].map((id) => challenge.options.find((entry) => entry.id === id)?.label).filter(Boolean);
    target.querySelector(".drop-zone-value").textContent = labels.length ? labels.join(" + ") : `Empty · load ${challenge.requiredCount} inputs`;
    target.classList.toggle("has-value", labels.length > 0);
    buttons.forEach((button) => {
      const inDock = placed.has(button.dataset.optionId);
      button.classList.toggle("is-placed", inDock);
      button.setAttribute("aria-pressed", String(inDock || button.dataset.optionId === selected));
    });
    count.textContent = `${placed.size} in dock · ${challenge.requiredCount} required`;
  };

  const place = (id) => {
    if (!challenge.options.some((entry) => entry.id === id)) return;
    if (placed.has(id)) placed.delete(id);
    else placed.add(id);
    selected = null;
    renderDock();
  };

  visibleOptions(challenge.options, context).forEach((entry) => {
    const button = createToken(entry, (id) => {
      selected = id;
      setSelected(buttons, selected);
      target.focus();
    });
    buttons.push(button);
    tokens.append(button);
  });
  target.addEventListener("click", () => {
    if (selected) place(selected);
    else context.onIncomplete("Select an input token first. You can also drag a token into the dock.");
  });
  configureDropTarget(target, place);
  const count = text("p", "selection-counter", `0 in dock · ${challenge.requiredCount} required`);
  root.append(tokens, target, count);
  return {
    root,
    ...addSubmit(root, "Run reaction", () => [...placed], () => placed.size >= challenge.requiredCount, context)
  };
}

function renderSorting(challenge, context) {
  const root = text("div", "interaction interaction-sorting", "");
  const tokenTray = text("div", "sorting-token-tray", "");
  const categoryGrid = text("div", "sorting-categories", "");
  const assignments = {};
  let selected = null;
  const buttons = [];

  const renderAssignments = () => {
    categoryGrid.querySelectorAll(".sorting-category").forEach((category) => {
      const bucket = category.querySelector(".category-contents");
      bucket.replaceChildren();
      Object.entries(assignments)
        .filter(([, categoryId]) => categoryId === category.dataset.categoryId)
        .forEach(([optionId]) => {
          const entry = challenge.options.find((item) => item.id === optionId);
          const chip = document.createElement("button");
          chip.type = "button";
          chip.className = "placed-chip";
          chip.textContent = `${entry.label} ×`;
          chip.setAttribute("aria-label", `Remove ${entry.label} from ${category.dataset.categoryId}`);
          chip.addEventListener("click", (event) => {
            event.stopPropagation();
            delete assignments[optionId];
            renderAssignments();
          });
          bucket.append(chip);
        });
    });
    buttons.forEach((button) => {
      const assigned = Boolean(assignments[button.dataset.optionId]);
      button.classList.toggle("is-placed", assigned);
      button.setAttribute("aria-pressed", String(assigned || button.dataset.optionId === selected));
    });
    counter.textContent = `${Object.keys(assignments).length} of ${challenge.options.length} signals sorted`;
  };

  const assign = (optionId, categoryId) => {
    if (!challenge.options.some((entry) => entry.id === optionId)) return;
    assignments[optionId] = categoryId;
    selected = null;
    renderAssignments();
  };

  challenge.options.forEach((entry) => {
    const button = createToken(entry, (id) => {
      selected = id;
      setSelected(buttons, selected);
    });
    buttons.push(button);
    tokenTray.append(button);
  });

  challenge.categories.forEach((entry) => {
    const category = document.createElement("section");
    category.className = "sorting-category";
    category.dataset.categoryId = entry.id;
    const target = document.createElement("button");
    target.type = "button";
    target.className = "sorting-category-target";
    target.setAttribute("aria-label", `Place the selected signal in ${entry.label}`);
    target.innerHTML = `<span class="category-title"><span aria-hidden="true">${entry.icon}</span> ${entry.label}</span>`;
    const bucket = document.createElement("div");
    bucket.className = "category-contents";
    bucket.setAttribute("aria-label", `${entry.label} assignments`);
    const activateCategory = () => {
      if (selected) assign(selected, entry.id);
      else context.onIncomplete("Select a signal first, then choose its category.");
    };
    target.addEventListener("click", activateCategory);
    configureDropTarget(target, (id) => assign(id, entry.id));
    category.append(target, bucket);
    categoryGrid.append(category);
  });

  const counter = text("p", "selection-counter", `0 of ${challenge.options.length} signals sorted`);
  counter.setAttribute("aria-live", "polite");
  root.append(tokenTray, categoryGrid, counter);
  return {
    root,
    ...addSubmit(
      root,
      "Submit regulation map",
      () => ({ ...assignments }),
      () => Object.keys(assignments).length === challenge.options.length,
      context
    )
  };
}

function renderMultiPart(challenge, context) {
  const root = text("div", "interaction interaction-multipart", "");
  const selections = {};

  challenge.parts.forEach((part) => {
    const fieldset = document.createElement("fieldset");
    fieldset.className = "multipart-panel";
    fieldset.append(text("legend", "multipart-title", part.label));
    const group = text("div", "segmented-options", "");
    const buttons = [];
    visibleOptions(part.options, context).forEach((entry) => {
      const button = createToken(entry, (id) => {
        selections[part.id] = id;
        setSelected(buttons, id);
      }, "token-button compact-token");
      buttons.push(button);
      group.append(button);
    });
    fieldset.append(group);
    root.append(fieldset);
  });

  return {
    root,
    ...addSubmit(
      root,
      "Submit complete circuit",
      () => ({ ...selections }),
      () => Object.keys(selections).length === challenge.parts.length,
      context
    )
  };
}

function renderMultiPlacement(challenge, context) {
  const root = text("div", "interaction interaction-multi-placement", "");
  const placements = {};

  challenge.docks.forEach((dock) => {
    const panel = text("section", "placement-panel", "");
    panel.append(text("h3", "placement-panel-title", dock.label));
    const optionsRoot = text("div", "placement-options", "");
    let selected = null;
    const buttons = [];
    const target = document.createElement("button");
    target.type = "button";
    target.className = "drop-zone compact-drop-zone";
    target.innerHTML = `<span class="drop-zone-label">${dock.label}</span><span class="drop-zone-value">Empty</span>`;

    const place = (id) => {
      const entry = dock.options.find((item) => item.id === id);
      if (!entry) return;
      placements[dock.id] = id;
      target.querySelector(".drop-zone-value").textContent = entry.label;
      target.classList.add("has-value");
      selected = id;
      setSelected(buttons, id);
    };

    visibleOptions(dock.options, context).forEach((entry) => {
      const button = createToken(entry, (id) => {
        selected = id;
        setSelected(buttons, id);
        target.focus();
      }, "token-button compact-token");
      buttons.push(button);
      optionsRoot.append(button);
    });
    target.addEventListener("click", () => {
      if (selected) place(selected);
      else context.onIncomplete(`Select a token for ${dock.label} first.`);
    });
    configureDropTarget(target, place);
    panel.append(optionsRoot, target);
    root.append(panel);
  });

  return {
    root,
    ...addSubmit(
      root,
      "Submit hydration setup",
      () => ({ ...placements }),
      () => Object.keys(placements).length === challenge.docks.length,
      context
    )
  };
}

function renderWiring(challenge, context) {
  const root = text("div", "interaction interaction-wiring", "");
  const board = text("div", "wiring-board", "");
  const sourcesRoot = text("section", "wiring-column", "");
  const targetsRoot = text("section", "wiring-column", "");
  sourcesRoot.append(text("h3", "wiring-heading", "Molecule or cofactor"));
  targetsRoot.append(text("h3", "wiring-heading", "Connection target"));
  const connections = {};
  let selectedSource = null;
  const sourceButtons = [];

  const renderConnections = () => {
    sourceButtons.forEach((button) => {
      const source = challenge.sources.find((entry) => entry.id === button.dataset.optionId);
      const target = challenge.targets.find((entry) => entry.id === connections[source.id]);
      const connection = button.querySelector(".source-connection");
      connection.textContent = target ? `→ ${target.label}` : "Select, then choose a target";
      const selected = selectedSource === source.id;
      button.classList.toggle("is-selected", selected);
      button.classList.toggle("is-connected", Boolean(target));
      button.setAttribute("aria-pressed", String(selected));
    });
    counter.textContent = `${Object.keys(connections).length} of ${challenge.sources.length} connections made`;
  };

  const connect = (sourceId, targetId) => {
    if (!challenge.sources.some((source) => source.id === sourceId)) return;
    connections[sourceId] = targetId;
    selectedSource = null;
    renderConnections();
  };

  challenge.sources.forEach((source) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "wire-source";
    button.dataset.optionId = source.id;
    button.draggable = true;
    button.innerHTML = `<span class="wire-node-dot" aria-hidden="true"></span><span class="wire-source-label">${source.label}</span><span class="source-connection">Select, then choose a target</span>`;
    button.addEventListener("click", () => {
      selectedSource = source.id;
      renderConnections();
    });
    button.addEventListener("dragstart", (event) => {
      event.dataTransfer.setData("text/plain", source.id);
      selectedSource = source.id;
    });
    sourceButtons.push(button);
    sourcesRoot.append(button);
  });

  visibleOptions(
    challenge.targets.map((target) => ({
      ...target,
      correct: challenge.sources.some((source) => source.correct === target.id)
    })),
    context
  ).forEach((target) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "wire-target";
    button.dataset.targetId = target.id;
    button.innerHTML = `<span class="wire-node-dot" aria-hidden="true"></span><span>${target.label}</span>`;
    button.addEventListener("click", () => {
      if (selectedSource) connect(selectedSource, target.id);
      else context.onIncomplete("Select a source node before choosing its target.");
    });
    configureDropTarget(button, (sourceId) => connect(sourceId, target.id));
    targetsRoot.append(button);
  });

  const counter = text("p", "selection-counter", `0 of ${challenge.sources.length} connections made`);
  board.append(sourcesRoot, targetsRoot);
  root.append(board, counter);
  return {
    root,
    ...addSubmit(
      root,
      "Restore electron flow",
      () => ({ ...connections }),
      () => Object.keys(connections).length === challenge.sources.length,
      context
    )
  };
}

export function createInteraction(challenge, callbacks) {
  const answersUnlocked = callbacks.answerDetailsUnlocked === true;
  const context = {
    hintPurchased: callbacks.hintPurchased === true,
    guidedMode: callbacks.guidedMode === true,
    showOptionDetails:
      answersUnlocked || !challenge.concealBeforeAttempt?.includes("optionDetails"),
    onSubmit: callbacks.onSubmit,
    onIncomplete: callbacks.onIncomplete,
    onNonPenalizedError: callbacks.onNonPenalizedError ?? callbacks.onIncomplete
  };

  const renderers = {
    choice: renderChoice,
    exactSet: renderExactSet,
    placement: renderPlacement,
    placementSequence: renderPlacementSequence,
    dockSet: renderDockSet,
    sorting: renderSorting,
    multiPart: renderMultiPart,
    multiPlacement: renderMultiPlacement,
    wiring: renderWiring
  };
  const renderer = renderers[challenge.type];
  if (!renderer) throw new Error(`Unsupported interaction type: ${challenge.type}`);
  const interaction = renderer(challenge, context);
  interaction.root.querySelectorAll(".selection-counter").forEach((counter) => counter.setAttribute("aria-live", "polite"));

  if (context.guidedMode) {
    interaction.root.classList.add("guided-interaction");
    const correctIds = new Set();
    if (typeof challenge.correct === "string") correctIds.add(challenge.correct);
    if (Array.isArray(challenge.correct)) challenge.correct.forEach((id) => correctIds.add(id));
    if (challenge.correct && !Array.isArray(challenge.correct) && typeof challenge.correct === "object") {
      Object.keys(challenge.correct).forEach((id) => correctIds.add(id));
    }
    challenge.parts?.forEach((part) => correctIds.add(part.correct));
    challenge.docks?.forEach((dock) => correctIds.add(dock.correct));
    challenge.sources?.forEach((source) => correctIds.add(source.id));

    interaction.root.querySelectorAll("[data-option-id]").forEach((control) => {
      if (correctIds.has(control.dataset.optionId)) control.classList.add("is-guided-target");
    });
    if (["placement", "dockSet", "multiPlacement", "sorting"].includes(challenge.type)) {
      interaction.root.querySelectorAll(".drop-zone, .sorting-category-target").forEach((target) => target.classList.add("is-guided-target"));
    }
    if (challenge.type === "wiring") {
      const correctTargets = new Set(challenge.sources.map((source) => source.correct));
      interaction.root.querySelectorAll("[data-target-id]").forEach((target) => {
        if (correctTargets.has(target.dataset.targetId)) target.classList.add("is-guided-target");
      });
    }
  }

  return interaction;
}
