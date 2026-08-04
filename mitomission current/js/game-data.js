export const MAX_SCORE = 50;

export const SCORE_RULES = Object.freeze({
  startingCredits: 5,
  startingLives: 3,
  bridgeReward: 5,
  levelReward: 3,
  eventReward: 4,
  penalties: {
    bridge: { credits: 0, lives: 0 },
    level: { credits: 1, lives: 1 },
    event: { credits: 2, lives: 1 },
    final: { credits: 1, lives: 0 }
  },
  rebootCost: 3,
  hintCost: 2,
  extraLifeCost: 5
});

export const ATP_CREDITS_EXPLANATION =
  "Mito Bucks are the game's score currency. M-Bucks are earned by correctly answering questions and completing missions.";

export const PATHWAY_NODES = [
  { id: "citrate", name: "Citrate", carbons: 6, level: 1 },
  { id: "isocitrate", name: "Isocitrate", carbons: 6, level: 2 },
  { id: "alpha-ketoglutarate", name: "Alpha-ketoglutarate", short: "Alpha-KG", carbons: 5, level: 3 },
  { id: "succinyl-coa", name: "Succinyl-CoA", carbons: 4, level: 4 },
  { id: "succinate", name: "Succinate", carbons: 4, level: 5 },
  { id: "fumarate", name: "Fumarate", carbons: 4, level: 6 },
  { id: "malate", name: "L-Malate", short: "Malate", carbons: 4, level: 7 },
  { id: "oxaloacetate", name: "Oxaloacetate", short: "OAA", carbons: 4, level: 8 }
];

const option = (id, label, correct = false, detail = "") => ({
  id,
  label,
  correct,
  detail
});

export const BRIDGE_STEPS = [
  {
    id: "bridge-transport",
    phaseKind: "bridge",
    number: 1,
    eyebrow: "Tutorial: Bridge Reaction · Step 1 of 4",
    title: "Transport Pyruvate",
    equation: "Glycolysis produces pyruvate in the cytosol, but PDC operates in the mitochondrial matrix.",
    routeDisplay: "Cytosol → mitochondrial pyruvate carrier → mitochondrial matrix",
    instruction: "Move pyruvate from the cytosol through the mitochondrial pyruvate carrier to the matrix.",
    type: "placementSequence",
    token: option("pyruvate", "Pyruvate · 3C", true),
    targets: [
      { id: "carrier", label: "Mitochondrial pyruvate carrier", caption: "Inner membrane" },
      { id: "matrix", label: "Mitochondrial matrix", caption: "PDC compartment" }
    ],
    correct: ["carrier", "matrix"],
    hint: "Pyruvate is made in the cytosol, but PDC is in the mitochondrial matrix. Find the membrane gateway first.",
    guidedCue: "Select pyruvate, choose the highlighted carrier, select pyruvate again, then choose the matrix.",
    success: {
      summary: "Pyruvate has crossed the inner mitochondrial membrane and reached the matrix.",
      reaction: "Transport prepares cytosolic pyruvate for mitochondrial oxidation.",
      facts: [
        "Pyruvate contains three carbons.",
        "The mitochondrial pyruvate carrier transports pyruvate across the inner membrane.",
        "The pyruvate dehydrogenase complex is located in the mitochondrial matrix."
      ],
      ledger: "No molecular products yet; the bridge ledger is unchanged."
    },
    incorrect: "The carrier is the gateway across the inner membrane. Move through it before entering the matrix."
  },
  {
    id: "bridge-control",
    phaseKind: "bridge",
    number: 2,
    eyebrow: "Tutorial: Bridge Reaction · Step 2 of 4",
    title: "Activate the PDC Gate",
    equation: "PDC activity is controlled by reversible phosphorylation.",
    routeDisplay: "Phosphorylated PDC (inactive) → dephosphorylated PDC (active)",
    instruction: "Choose the option that activates the phosphorylated pyruvate dehydrogenase complex.",
    type: "choice",
    options: [
      option("kinase", "Activate pyruvate dehydrogenase kinase", false),
      option("direct-atp", "Increase mitochondrial ATP availability", false),
      option("phosphatase", "Activate pyruvate dehydrogenase phosphatase", true),
    ],
    correct: "phosphatase",
    hint: "For PDC, phosphorylation is the OFF signal. Which enzyme reverses phosphorylation?",
    guidedCue: "Look for the enzyme that removes - not adds - phosphate.",
    success: {
      summary: "PDC is active after dephosphorylation by pyruvate dehydrogenase phosphatase.",
      reaction: "PDC-P + H2O → PDC + Pi",
      facts: [
        "Pyruvate dehydrogenase kinase phosphorylates and inhibits PDC.",
        "High ATP, acetyl-CoA and NADH favour inhibition; signals of fuel use favour activation.",
        "This covalent switch coordinates carbohydrate oxidation with energy demand."
      ],
      ledger: "Activation changes flux control, not the molecular ledger."
    },
    incorrectByChoice: {
      kinase: "Pyruvate dehydrogenase kinase adds phosphate and switches PDC off; the complex is already phosphorylated.",
      "direct-atp": "ATP is not installed directly to activate PDC. Activation requires removal of the inhibitory phosphate."
    },
    incorrect: "PDC is active when dephosphorylated. Choose the regulator that removes phosphate."
  },
  {
    id: "bridge-cofactors",
    phaseKind: "bridge",
    number: 3,
    eyebrow: "Tutorial: Bridge Reaction · Step 3 of 4",
    title: "Install the Five-Cofactor System",
    equation: "PDC coordinates five cofactors across three enzyme components to oxidise pyruvate.",
    routeDisplay: "E1: pyruvate decarboxylation → E2: acetyl transfer → E3: cofactor reoxidation",
    instruction: "Select the exact five cofactors used by the pyruvate dehydrogenase complex.",
    concealBeforeAttempt: ["optionDetails"],
    type: "exactSet",
    requiredCount: 5,
    contextLabel: "PDC enzyme components",
    contextChips: [
      "E1 · Pyruvate dehydrogenase",
      "E2 · Dihydrolipoyl transacetylase",
      "E3 · Dihydrolipoyl dehydrogenase"
    ],
    options: [
      option("tpp", "TPP", true, "E1 decarboxylation"),
      option("lipoamide", "Lipoamide", true, "Mobile acetyl/electron carrier"),
      option("coa", "CoA", true, "Accepts the acetyl group"),
      option("biotin", "Biotin", false, "Carboxylation cofactor"),
      option("nadp", "NADP+", false, "Typically supports NADPH pathways"),
      option("atp", "ATP", false, "Not a PDC cofactor"),
      option("nad", "NAD+", true, "Final electron acceptor"),
      option("fad", "FAD", true, "E3 enzyme-bound redox cofactor"),
    ],
    correct: ["tpp", "lipoamide", "coa", "fad", "nad"],
    hint: "Think: one decarboxylation cofactor, a swinging arm, an acetyl acceptor, and two redox cofactors.",
    guidedCue: "E1 needs TPP; E2 uses the swinging lipoamide arm and CoA; E3 restores the system with two redox cofactors.",
    success: {
      summary: "All five cofactors are installed across PDC's E1, E2 and E3 components.",
      reaction: "E1 decarboxylates; E2 transfers the acetyl group; E3 recycles the lipoamide redox system.",
      facts: [
        "E1 uses thiamine pyrophosphate (TPP) for decarboxylation.",
        "E2 uses lipoamide and transfers the acetyl group to CoA.",
        "E3 uses FAD and NAD+; NAD+ leaves reduced as NADH."
      ],
      ledger: "Cofactors are ready; products are recorded only after the reaction succeeds."
    },
    incorrect: "PDC needs TPP, lipoamide, CoA, FAD and NAD+. Separate the oxidative-decarboxylation system from carboxylation and NADPH chemistry."
  },
  {
    id: "bridge-products",
    phaseKind: "bridge",
    number: 4,
    eyebrow: "Tutorial: Bridge Reaction · Step 4 of 4",
    title: "Account for the Bridge Products",
    equation: "PDC catalyses an irreversible oxidative decarboxylation that links glycolysis to the TCA cycle.",
    routeDisplay: "Pyruvate + CoA + NAD⁺ → ?",
    instruction: "Select the exact three products of one PDC reaction.",
    concealBeforeAttempt: ["ledger"],
    type: "exactSet",
    requiredCount: 3,
    options: [
      option("nadh", "NADH", true),
      option("atp", "ATP", false),
      option("lactate", "Lactate · 3C", false),
      option("co2", "CO2 · 1C", true),
      option("oaa", "Oxaloacetate · 4C", false),
      option("acetyl-coa", "Acetyl-CoA · 2C", true),
    ],
    correct: ["acetyl-coa", "nadh", "co2"],
    reward: SCORE_RULES.bridgeReward,
    ledgerDelta: { scope: "bridge", values: { acetylCoA: 1, nadh: 1, co2: 1, directAtp: 0 } },
    nextIntermediate: "acetyl-coa",
    hint: "Account for all three pyruvate carbons and the electrons accepted by NAD+; PDC makes no ATP directly.",
    guidedCue: "One carbon leaves as gas; the remaining two-carbon acetyl unit joins CoA; NAD+ becomes reduced.",
    success: {
      summary: "Bridge Reaction Complete - acetyl-CoA is ready to enter the cycle.",
      reaction: "Pyruvate (3C) + CoA + NAD+ → acetyl-CoA (2C) + CO2 + NADH + H+",
      facts: [
        "One carbon leaves the three-carbon pyruvate as CO2.",
        "The remaining two-carbon acetyl group forms a high-energy thioester with CoA.",
        "NAD+ is reduced to NADH; PDC does not directly produce ATP."
      ],
      ledger: "Bridge ledger: acetyl-CoA 1 · NADH 1 · CO2 1 · direct ATP 0."
    },
    incorrect: "Track carbon and redox separately: one carbon is removed, the two-carbon unit is activated with CoA, and NAD+ captures electrons."
  }
];

export const TCA_LEVELS = [
  {
    id: "level-1",
    phaseKind: "level",
    level: 1,
    eyebrow: "TCA cycle · Level 1 of 8",
    title: "Open the Carbon Gate",
    enzyme: "Citrate synthase",
    equation: "Oxaloacetate (4C) + Acetyl-CoA (2C) + H2O → Citrate (6C) + CoA-SH",
    instruction: "Install the enzyme that condenses the two-carbon acetyl unit with oxaloacetate.",
    concealBeforeAttempt: ["enzyme", "equation", "visual", "activePathway"],
    type: "placement",
    targetLabel: "Enzyme position",
    options: [
      option("citrate-synthase", "Citrate synthase", true),
      option("aconitase", "Aconitase", false),
      option("malate-dh", "Malate dehydrogenase", false)
    ],
    correct: "citrate-synthase",
    reward: SCORE_RULES.levelReward,
    nextIntermediate: "citrate",
    hint: "The enzyme is named for the six-carbon product it synthesises.",
    guidedCue: "Combine 4C oxaloacetate and 2C acetyl-CoA at the highlighted enzyme dock.",
    success: {
      summary: "The carbon gate is open: a 2C acetyl group and 4C oxaloacetate form 6C citrate.",
      reaction: "Oxaloacetate + acetyl-CoA + H2O → citrate + CoA-SH",
      facts: [
        "CoA is released and no TCA ledger product is generated.",
        "Citrate synthase is strongly favourable, effectively irreversible and an important control point.",
        "Oxaloacetate availability determines whether acetyl-CoA can enter the cycle."
      ],
      ledger: "TCA ledger unchanged."
    },
    incorrectByChoice: {
      aconitase: "Aconitase rearranges citrate only after citrate has formed.",
      "malate-dh": "Malate dehydrogenase regenerates oxaloacetate at the end of the cycle."
    },
    incorrect: "The first reaction needs the synthase that produces citrate from oxaloacetate and acetyl-CoA."
  },
  {
    id: "level-2",
    phaseKind: "level",
    level: 2,
    eyebrow: "TCA cycle · Level 2 of 8",
    title: "Rearrange the Molecule",
    enzyme: "Aconitase",
    equation: "Citrate (6C) ⇌ cis-Aconitate ⇌ Isocitrate (6C)",
    instruction: "Match aconitase to the product whose hydroxyl group is positioned for oxidation.",
    concealBeforeAttempt: ["equation", "visual", "optionDetails", "activePathway"],
    type: "placement",
    targetLabel: "Aconitase product",
    options: [
      option("isocitrate", "Isocitrate · 6C", true, "Secondary alcohol - ready for oxidation"),
      option("citrate", "Unchanged citrate · 6C", false, "Tertiary alcohol remains"),
      option("alpha-kg", "Alpha-ketoglutarate · 5C", false, "One carbon too few")
    ],
    correct: "isocitrate",
    reward: SCORE_RULES.levelReward,
    nextIntermediate: "isocitrate",
    hint: "Aconitase is an isomerase: carbon count stays at six while the alcohol changes position.",
    guidedCue: "Choose the six-carbon isomer with a secondary alcohol.",
    success: {
      summary: "Aconitase has repositioned citrate's hydroxyl group without changing its carbon count.",
      reaction: "Citrate ⇌ cis-aconitate ⇌ isocitrate",
      facts: [
        "Aconitase removes and then replaces water through cis-aconitate.",
        "Isocitrate's secondary alcohol can be oxidised in the next reaction.",
        "No NADH, FADH2-equivalent, GTP or CO2 is produced."
      ],
      ledger: "TCA ledger unchanged."
    },
    incorrectByChoice: {
      citrate: "Unchanged citrate has not undergone the required isomerisation; its tertiary alcohol remains difficult to oxidise.",
      "alpha-kg": "Alpha-ketoglutarate is the five-carbon product of the next oxidative-decarboxylation step."
    },
    incorrect: "Aconitase rearranges rather than decarboxylates: look for a six-carbon isomer."
  },
  {
    id: "level-3",
    phaseKind: "level",
    level: 3,
    eyebrow: "TCA cycle · Level 3 of 8",
    title: "Capture the First Electrons",
    enzyme: "Isocitrate dehydrogenase",
    equation: "Isocitrate (6C) + NAD+ → Alpha-ketoglutarate (5C) + NADH + CO2",
    instruction: "Build the exact product set for the first oxidative decarboxylation.",
    concealBeforeAttempt: ["equation", "visual", "activePathway"],
    type: "exactSet",
    requiredCount: 3,
    options: [
      option("alpha-kg", "Alpha-ketoglutarate · 5C", true),
      option("nadh", "NADH", true),
      option("co2", "CO2", true),
      option("succinyl-coa", "Succinyl-CoA · 4C", false),
      option("fadh2", "FADH2", false),
      option("gtp", "GTP", false)
    ],
    correct: ["alpha-kg", "nadh", "co2"],
    reward: SCORE_RULES.levelReward,
    ledgerDelta: { scope: "tca", values: { nadh: 1, co2: 1 } },
    nextIntermediate: "alpha-ketoglutarate",
    hint: "Oxidative decarboxylation reduces an electron carrier and removes one carbon.",
    guidedCue: "Start with 6C; release 1C as CO2, retain a 5C intermediate, and reduce NAD+.",
    success: {
      summary: "The first TCA oxidative decarboxylation has captured electrons as NADH.",
      reaction: "Isocitrate (6C) + NAD+ → alpha-ketoglutarate (5C) + NADH + CO2",
      facts: [
        "Oxidation is followed by decarboxylation.",
        "Isocitrate dehydrogenase is an effectively irreversible regulatory enzyme.",
        "The carbon count falls from six to five."
      ],
      ledger: "TCA ledger +1 NADH and +1 CO2."
    },
    incorrect: "This step uses NAD+, releases one carbon, and retains a five-carbon keto acid."
  },
  {
    id: "level-4",
    phaseKind: "level",
    level: 4,
    eyebrow: "TCA cycle · Level 4 of 8",
    title: "Complete the Second Decarboxylation",
    enzyme: "Alpha-ketoglutarate dehydrogenase",
    equation: "Alpha-ketoglutarate (5C) + CoA + NAD+ → Succinyl-CoA (4C) + NADH + CO2",
    instruction: "Select the exact three products of the second oxidative decarboxylation.",
    concealBeforeAttempt: ["equation", "visual", "activePathway"],
    type: "exactSet",
    requiredCount: 3,
    contextChips: ["TPP", "Lipoamide", "CoA", "FAD", "NAD+"],
    options: [
      option("succinyl-coa", "Succinyl-CoA · 4C", true),
      option("nadh", "NADH", true),
      option("co2", "CO2", true),
      option("succinate", "Succinate · 4C", false),
      option("fadh2", "FADH2", false),
      option("citrate", "Citrate · 6C", false)
    ],
    correct: ["succinyl-coa", "nadh", "co2"],
    reward: SCORE_RULES.levelReward,
    ledgerDelta: { scope: "tca", values: { nadh: 1, co2: 1 } },
    nextIntermediate: "succinyl-coa",
    hint: "This PDC-like complex removes one carbon, reduces NAD+, and attaches the remaining four-carbon group to CoA.",
    guidedCue: "Choose a 4C thioester, the reduced form of NAD+, and the released one-carbon gas.",
    success: {
      summary: "The second carbon has left as CO2 and the remaining four-carbon succinyl group is activated with CoA.",
      reaction: "Alpha-ketoglutarate + CoA + NAD+ → succinyl-CoA + NADH + CO2",
      facts: [
        "The complex uses the same five-cofactor system as PDC.",
        "This reaction is effectively irreversible and is inhibited by NADH and succinyl-CoA.",
        "Calcium promotes activity in tissues responding to higher energy demand."
      ],
      ledger: "TCA ledger +1 NADH (total 2) and +1 CO2 (total 2)."
    },
    incorrect: "Track a second oxidative decarboxylation: 5C becomes an activated 4C thioester while NAD+ is reduced."
  },
  {
    id: "level-5",
    phaseKind: "level",
    level: 5,
    eyebrow: "TCA cycle · Level 5 of 8",
    title: "Collect Direct Energy",
    enzyme: "Succinyl-CoA synthetase",
    equation: "Succinyl-CoA (4C) + GDP + Pi → Succinate (4C) + GTP + CoA-SH",
    instruction: "Load the two required inputs into the reaction dock.",
    concealBeforeAttempt: ["equation", "visual"],
    type: "dockSet",
    requiredCount: 2,
    targetLabel: "Reaction input dock",
    options: [
      option("gdp", "GDP", true),
      option("pi", "Pi", true),
      option("adp", "ADP", false),
      option("nad", "NAD+", false),
      option("oxygen", "Oxygen", false)
    ],
    correct: ["gdp", "pi"],
    reward: SCORE_RULES.levelReward,
    ledgerDelta: { scope: "tca", values: { gtp: 1 } },
    nextIntermediate: "succinate",
    hint: "This course follows the GDP-forming isoenzyme; add the nucleotide diphosphate and free phosphate.",
    guidedCue: "Place GDP and inorganic phosphate (Pi) in the highlighted dock.",
    success: {
      summary: "Energy from the succinyl-CoA thioester has driven direct GTP formation.",
      reaction: "Succinyl-CoA + GDP + Pi → succinate + GTP + CoA-SH",
      facts: [
        "This is substrate-level phosphorylation.",
        "It is the only TCA reaction that directly produces a nucleotide triphosphate.",
        "No carbon is lost; some tissues use an ADP-forming isoenzyme, but this game follows GDP → GTP."
      ],
      ledger: "TCA ledger +1 GTP."
    },
    incorrect: "This step transfers thioester energy into a nucleotide triphosphate. Choose the nucleotide precursor and the group added during phosphorylation."
  },
  {
    id: "level-6",
    phaseKind: "level",
    level: 6,
    eyebrow: "TCA cycle · Level 6 of 8",
    title: "Connect the Cycle to the ETC",
    enzyme: "Succinate dehydrogenase · Complex II",
    equation: "Succinate (4C) → Fumarate (4C); electrons → Coenzyme Q",
    instruction: "Configure all three parts of Complex II, then submit the circuit.",
    concealBeforeAttempt: ["equation", "visual", "ledger", "info"],
    type: "multiPart",
    parts: [
      {
        id: "cofactor",
        label: "1 · Enzyme-bound cofactor",
        options: [option("fad", "FAD", true), option("nad", "NAD+", false), option("nadp", "NADP+", false)],
        correct: "fad"
      },
      {
        id: "acceptor",
        label: "2 · Next electron acceptor",
        options: [option("coq", "Coenzyme Q", true), option("cytc", "Cytochrome c", false), option("oxygen", "Oxygen", false), option("nad", "NAD+", false)],
        correct: "coq"
      },
      {
        id: "pumps",
        label: "3 · Does Complex II directly pump protons?",
        options: [option("yes", "Yes", false), option("no", "No", true)],
        correct: "no"
      }
    ],
    reward: SCORE_RULES.levelReward,
    ledgerDelta: { scope: "tca", values: { fadh2Equivalent: 1 } },
    nextIntermediate: "fumarate",
    hint: "Complex II is a flavoprotein entry point to Q and is bypassed in the proton-pumping count.",
    guidedCue: "Use the enzyme-bound flavin, route electrons to the shared lipid carrier Q, and remember that proton pumping occurs at I, III and IV.",
    success: {
      summary: "Succinate dehydrogenase has oxidised succinate and passed its electrons into the ETC at Complex II.",
      reaction: "Succinate + enzyme-FAD → fumarate + enzyme-FADH2 → electrons to Coenzyme Q",
      facts: [
        "Succinate dehydrogenase is both a TCA enzyme and ETC Complex II.",
        "It is the only TCA enzyme embedded in the inner mitochondrial membrane.",
        "Complex II does not pump protons; enzyme-bound FADH2 does not leave as a free molecule."
      ],
      ledger: "TCA ledger +1 FADH2-equivalent."
    },
    incorrect: "Recheck all three circuit properties: bound flavin, first mobile acceptor, and proton-pumping status."
  },
  {
    id: "level-7",
    phaseKind: "level",
    level: 7,
    eyebrow: "TCA cycle · Level 7 of 8",
    title: "Hydrate the Double Bond",
    preAttemptTitle: "Transform the Double Bond",
    enzyme: "Fumarase",
    equation: "Fumarate (4C) + H2O → L-Malate (4C)",
    instruction: "Install the enzyme and place water across fumarate's double bond.",
    preAttemptInstruction: "Install the correct enzyme and required small molecule at fumarate's double bond.",
    concealBeforeAttempt: ["enzyme", "equation", "visual"],
    type: "multiPlacement",
    docks: [
      {
        id: "enzyme",
        label: "Enzyme position",
        correct: "fumarase",
        options: [
          option("fumarase", "Fumarase", true),
          option("succinyl-synthetase", "Succinyl-CoA synthetase", false),
          option("malate-dh", "Malate dehydrogenase", false)
        ]
      },
      {
        id: "input",
        label: "Across the C=C bond",
        correct: "water",
        options: [option("water", "H2O", true), option("nad", "NAD+", false), option("coa", "CoA", false)]
      }
    ],
    reward: SCORE_RULES.levelReward,
    nextIntermediate: "malate",
    hint: "The middle step of the reset sequence is hydration: oxidation → hydration → oxidation.",
    guidedCue: "Install fumarase, then add H2O across the highlighted double bond.",
    success: {
      summary: "Fumarase has added water stereospecifically across fumarate's double bond to form L-malate.",
      reaction: "Fumarate + H2O → L-malate",
      facts: [
        "No carbon is lost.",
        "No NADH, FADH2-equivalent, GTP or CO2 is produced.",
        "This is the hydration step in oxidation → hydration → oxidation."
      ],
      ledger: "TCA ledger unchanged."
    },
    incorrect: "Recheck both placements: identify the enzyme class named for the substrate, then choose the small molecule added across a double bond."
  },
  {
    id: "level-8",
    phaseKind: "level",
    level: 8,
    eyebrow: "TCA cycle · Level 8 of 8",
    title: "Regenerate the Starting Molecule",
    enzyme: "Malate dehydrogenase",
    equation: "L-Malate (4C) + NAD+ ⇌ Oxaloacetate (4C) + NADH + H+",
    instruction: "Select the two main products that close the carbon circuit.",
    concealBeforeAttempt: ["equation", "visual", "activePathway", "ledger"],
    type: "exactSet",
    requiredCount: 2,
    options: [
      option("oaa", "Oxaloacetate · 4C", true),
      option("nadh", "NADH", true),
      option("acetyl-coa", "Acetyl-CoA · 2C", false),
      option("fadh2", "FADH2", false),
      option("co2", "CO2", false),
      option("gtp", "GTP", false)
    ],
    correct: ["oaa", "nadh"],
    reward: SCORE_RULES.levelReward,
    ledgerDelta: { scope: "tca", values: { nadh: 1, oxaloacetateRegenerated: true } },
    nextIntermediate: "oxaloacetate",
    hint: "Oxidising malate's alcohol restores the four-carbon carbonyl carrier and reduces NAD+.",
    guidedCue: "Keep all four carbons, regenerate the cycle's carrier, and capture electrons in NADH.",
    success: {
      summary: "Oxaloacetate has been regenerated and one complete TCA turn is closed.",
      reaction: "L-malate + NAD+ ⇌ oxaloacetate + NADH + H+",
      facts: [
        "No carbon is lost; oxaloacetate is regenerated rather than permanently consumed.",
        "The reaction is unfavourable under standard conditions but proceeds because oxaloacetate is kept low and consumed by citrate synthase.",
        "Regenerated oxaloacetate can accept another acetyl-CoA."
      ],
      ledger: "TCA ledger +1 NADH (final total 3); oxaloacetate regenerated = yes."
    },
    incorrect: "This oxidation retains four carbons, restores oxaloacetate and reduces NAD+; it is not a decarboxylation."
  }
];

export const METABOLIC_EVENTS = [
  {
    id: "event-demand",
    phaseKind: "event",
    eyebrow: "Metabolic event · 1 of 4",
    title: "Sudden Energy Demand",
    scenario: "The cell begins contracting. ATP is being consumed, ADP rises and mitochondrial calcium increases. Adjust TCA flux.",
    equation: "Isocitrate dehydrogenase is a major control point that responds to energy demand and Ca²⁺ signalling.",
    routeDisplay: "Isocitrate + NAD⁺ → α-ketoglutarate + CO₂ + NADH + H⁺",
    instruction: "Sort all four signals by their effect on TCA-cycle flux.",
    type: "sorting",
    categories: [
      { id: "promote", label: "Promotes TCA flux", icon: "↑" },
      { id: "suppress", label: "Suppresses TCA flux", icon: "↓" }
    ],
    options: [option("adp", "ADP", true), option("ca", "Ca2+", true), option("atp", "ATP", true), option("nadh", "NADH", true)],
    correct: { adp: "promote", ca: "promote", atp: "suppress", nadh: "suppress" },
    reward: SCORE_RULES.eventReward,
    hint: "ADP and Ca²⁺ promote TCA flux, whereas ATP and NADH suppress it.",
    guidedCue: "ADP and Ca2+ rise with work; ATP and NADH indicate that energy or reducing equivalents are already abundant.",
    success: {
      summary: "TCA throughput is now matched to the sudden rise in cellular energy demand.",
      reaction: "ADP and Ca2+ promote flux; ATP and NADH suppress flux.",
      facts: [
        "ADP signals low cellular energy.",
        "Ca2+ activates key mitochondrial dehydrogenases during muscle activity.",
        "ATP and NADH provide high-energy and high-redox feedback that slows further oxidation."
      ],
      ledger: "Regulatory event complete; molecular ledger unchanged."
    },
    incorrect: "One or more signals are in the wrong response group. Ask whether each signal means energy is needed or already abundant."
  },
  {
    id: "event-thiamine",
    phaseKind: "event",
    eyebrow: "Metabolic event · 2 of 4",
    title: "Missing Cofactor",
    scenario: "A patient with chronic alcohol use and poor nutritional intake has thiamine deficiency. Alpha-ketoglutarate dehydrogenase has stalled.",
    equation: "Alpha-ketoglutarate dehydrogenase · [missing cofactor]",
    instruction: "Install the missing cofactor in the stalled complex.",
    type: "placement",
    targetLabel: "Empty cofactor position",
    options: [
      option("tpp", "TPP", true),
      option("biotin", "Biotin", false),
      option("nadph", "NADPH", false),
      option("atp", "ATP", false)
    ],
    correct: "tpp",
    reward: SCORE_RULES.eventReward,
    hint: "The deficient vitamin is B1; its activated cofactor supports alpha-keto acid decarboxylation.",
    guidedCue: "Place thiamine pyrophosphate (TPP) into the highlighted cofactor slot.",
    success: {
      summary: "TPP has restored the alpha-ketoglutarate dehydrogenase cofactor system.",
      reaction: "Thiamine (vitamin B1) → thiamine pyrophosphate (TPP)",
      facts: [
        "PDC and alpha-ketoglutarate dehydrogenase share TPP, lipoamide, CoA, FAD and NAD+.",
        "Thiamine deficiency impairs oxidative metabolism and can cause neurological dysfunction.",
        "Chronic alcohol use may also raise the NADH:NAD+ ratio, but this challenge targets the cofactor deficiency."
      ],
      ledger: "Clinical event complete; molecular ledger unchanged."
    },
    incorrectByChoice: {
      biotin: "Biotin is used by carboxylases such as pyruvate carboxylase, not this alpha-keto acid dehydrogenase complex.",
      nadph: "NADPH mainly supports reductive biosynthesis and antioxidant defence, not this five-cofactor complex.",
      atp: "ATP is not the missing PDC-family cofactor."
    },
    incorrect: "Link thiamine deficiency to its activated cofactor used in oxidative decarboxylation."
  },
  {
    id: "event-oxygen",
    phaseKind: "event",
    eyebrow: "Metabolic event · 3 of 4",
    title: "Oxygen Crisis",
    scenario: "Oxygen availability has fallen. The ETC slows, NADH accumulates and oxidised NAD⁺ becomes limited.",
    equation: "NADH + H⁺ + ½O₂ → NAD⁺ + H₂O",
    instruction: "Match each molecule or cofactor to the site where it enters or is used.",
    concealBeforeAttempt: ["equation", "visual", "info"],
    type: "wiring",
    sources: [
      { id: "nadh", label: "NADH", correct: "complex-i" },
      { id: "oxygen", label: "Oxygen", correct: "complex-iv" },
      { id: "nad", label: "Regenerated NAD+", correct: "malate-dh" }
    ],
    targets: [
      { id: "complex-i", label: "Complex I" },
      { id: "complex-ii", label: "Complex II" },
      { id: "complex-iv", label: "Complex IV" },
      { id: "atp-synthase", label: "ATP synthase" },
      { id: "malate-dh", label: "Malate dehydrogenase" }
    ],
    reward: SCORE_RULES.eventReward,
    hint: "Connect NADH to Complex I, oxygen to Complex IV, and regenerated NAD⁺ to malate dehydrogenase.",
    guidedCue: "Connect NADH → Complex I, oxygen → Complex IV, and regenerated NAD+ → malate dehydrogenase.",
    success: {
      summary: "The respiratory link is restored: ETC electron flow regenerates the NAD+ required by TCA dehydrogenases.",
      reaction: "NADH oxidation begins at Complex I; oxygen is reduced at Complex IV; NAD+ returns to dehydrogenases.",
      facts: [
        "The TCA cycle does not directly consume molecular oxygen.",
        "Without oxygen, the ETC cannot continue accepting electrons, so NADH accumulates and NAD+ becomes limited.",
        "PDC, isocitrate dehydrogenase, alpha-ketoglutarate dehydrogenase and malate dehydrogenase slow; oxidative ATP production falls."
      ],
      ledger: "Respiratory event complete; molecular ledger unchanged."
    },
    incorrect: "The circuit must show where NADH enters, where oxygen accepts electrons, and where regenerated NAD+ is reused."
  },
  {
    id: "event-anaplerosis",
    phaseKind: "event",
    eyebrow: "Metabolic event · 4 of 4",
    title: "Refill the Cycle",
    scenario: "Oxaloacetate has been withdrawn for biosynthesis. Acetyl-CoA is waiting, but citrate synthase cannot continue without enough oxaloacetate.",
    equation: "Pyruvate + HCO3- + ATP → Oxaloacetate + ADP + Pi",
    instruction: "Place the complete reaction kit that replenishes oxaloacetate.",
    concealBeforeAttempt: ["equation", "visual", "optionDetails"],
    type: "placement",
    targetLabel: "Oxaloacetate refill position",
    cardStyle: true,
    options: [
      option("pc-kit", "Pyruvate carboxylase kit", true, "Pyruvate · bicarbonate/CO2 · ATP · biotin"),
      option("acetyl-kit", "Additional acetyl-CoA", false, "Adds fuel, not a missing cycle intermediate"),
      option("ldh-kit", "Lactate dehydrogenase kit", false, "Pyruvate · NADH")
    ],
    correct: "pc-kit",
    reward: SCORE_RULES.eventReward,
    hint: "A three-carbon substrate must gain one carbon in a biotin-dependent, ATP-consuming carboxylation.",
    guidedCue: "Use pyruvate carboxylase with pyruvate, bicarbonate/CO2, ATP and biotin.",
    success: {
      summary: "Oxaloacetate has been replenished by the major anaplerotic reaction.",
      reaction: "Pyruvate + HCO3- + ATP → oxaloacetate + ADP + Pi",
      facts: [
        "Pyruvate carboxylase requires biotin and is activated by acetyl-CoA.",
        "Replenishment is anaplerosis; withdrawal for biosynthesis is cataplerosis.",
        "The TCA cycle is amphibolic because it supports both catabolism and biosynthesis; acetyl-CoA alone cannot replace oxaloacetate."
      ],
      ledger: "Anaplerotic event complete; the one-turn TCA ledger remains unchanged."
    },
    incorrectByChoice: {
      "acetyl-kit": "More acetyl-CoA cannot condense when oxaloacetate is depleted and cannot provide net oxaloacetate in humans.",
      "ldh-kit": "Lactate dehydrogenase interconverts lactate and pyruvate; it does not add carbon to make oxaloacetate."
    },
    incorrect: "Replenishing 4C oxaloacetate from 3C pyruvate requires carboxylation, ATP and biotin."
  }
];

export const MISSION_SEQUENCE = [
  { kind: "level", id: "level-1" },
  { kind: "level", id: "level-2" },
  { kind: "level", id: "level-3" },
  { kind: "event", id: "event-demand" },
  { kind: "event", id: "event-thiamine" },
  { kind: "level", id: "level-4" },
  { kind: "level", id: "level-5" },
  { kind: "level", id: "level-6" },
  { kind: "level", id: "level-7" },
  { kind: "event", id: "event-oxygen" },
  { kind: "level", id: "level-8" },
  { kind: "event", id: "event-anaplerosis" }
];

export const FINAL_GATE_SECTIONS = [
  {
    id: "final-sequence",
    number: 1,
    title: "Intermediate Sequence",
    instruction: "Fill the four blanks to complete one turn of the TCA cycle.",
    concealBeforeAttempt: ["pathway"],
    type: "sequenceSlots",
    slots: [
      { id: "slot-citrate", after: "Oxaloacetate + Acetyl-CoA", correct: "citrate" },
      { id: "slot-alpha-kg", after: "Isocitrate", correct: "alpha-kg" },
      { id: "slot-succinate", after: "Succinyl-CoA", correct: "succinate" },
      { id: "slot-malate", after: "Fumarate", correct: "malate" }
    ],
    options: [
      option("citrate", "Citrate", true),
      option("alpha-kg", "Alpha-ketoglutarate", true),
      option("succinate", "Succinate", true),
      option("malate", "Malate", true),
      option("pyruvate", "Pyruvate", false),
      option("lactate", "Lactate", false),
      option("acetyl-coa", "Acetyl-CoA", false),
      option("g6p", "Glucose-6-phosphate", false)
    ],
    hint: "Follow carbon count: 6C intermediates, then 5C, then the 4C reset sequence.",
    success: "The intermediates are in the correct biochemical order from condensation through oxaloacetate regeneration.",
    incorrect: "At least one blank breaks the fixed reaction order. Trace the active pathway clockwise from citrate."
  },
  {
    id: "final-ledgers",
    number: 2,
    title: "Molecular Ledgers",
    instruction: "Reconstruct the bridge and one-turn TCA product totals.",
    concealBeforeAttempt: ["ledger"],
    type: "ledgerCheck",
    hint: "PDC yields one acetyl-CoA, one NADH and one CO2. In the cycle, count the three dehydrogenase NADH steps, Complex II, substrate-level phosphorylation and two decarboxylations.",
    success: "Both stored molecular ledgers have been independently verified.",
    incorrect: "One or more totals do not match the reactions you completed. Recount products only when they are generated."
  },
  {
    id: "final-regulation",
    number: 3,
    title: "Regulation",
    instruction: "Identify the major regulatory enzymes, assign each signal’s effect on TCA flux, and select the two α-ketoglutarate dehydrogenase inhibitors.",
    type: "regulationCheck",
    regulatedOptions: [
      option("citrate-synthase", "Citrate synthase", true),
      option("isocitrate-dh", "Isocitrate dehydrogenase", true),
      option("alpha-kgdh", "Alpha-ketoglutarate dehydrogenase", true),
      option("aconitase", "Aconitase", false),
      option("fumarase", "Fumarase", false),
      option("malate-dh", "Malate dehydrogenase", false)
    ],
    signals: ["ADP", "Ca2+", "ATP", "NADH"],
    inhibitors: [
      option("nadh", "NADH", true),
      option("succinyl-coa", "Succinyl-CoA", true),
      option("adp", "ADP", false),
      option("coa", "CoA-SH", false)
    ],
    hint: "Regulated reactions are the three effectively irreversible early steps; low-energy signals promote flux; product/high-redox signals inhibit alpha-KGDH.",
    success: "The cycle's major control points and demand signals are correctly mapped.",
    incorrect: "Recheck the irreversible steps, then separate low-energy activators from high-energy/product inhibitors."
  },
  {
    id: "final-integration",
    number: 4,
    title: "Complete the Carbon Circuit",
    instruction: "Select every scientifically correct statement, and no incorrect statements.",
    concealBeforeAttempt: ["pathway", "ledger"],
    type: "exactSet",
    requiredCount: 6,
    options: [
      option("oaa-regenerated", "Oxaloacetate is regenerated during one complete turn.", true),
      option("carbon-label", "The two CO2 molecules released in the first turn are not necessarily the same carbon atoms that entered in acetyl-CoA.", true),
      option("complex-ii", "Succinate dehydrogenase is ETC Complex II and the only TCA enzyme embedded in the inner mitochondrial membrane.", true),
      option("anaplerosis", "Cataplerosis removes TCA intermediates, whereas anaplerosis replenishes them.", true),
      option("no-net-glucose", "Acetyl-CoA does not produce net oxaloacetate and therefore cannot provide net glucose through the TCA cycle in humans.", true),
      option("oxygen-indirect", "Oxygen supports TCA activity indirectly by permitting ETC electron flow and regeneration of NAD+.", true),
      option("oaa-consumed", "Oxaloacetate is permanently consumed during every turn.", false),
      option("ii-pumps", "Succinate dehydrogenase directly pumps protons.", false),
      option("oxygen-direct", "The TCA cycle directly consumes oxygen in one of its eight reactions.", false),
      option("acetyl-carbon", "Both CO2 molecules released in the first turn must come directly from the incoming acetyl-CoA.", false),
      option("more-acetyl", "Adding more acetyl-CoA always compensates for oxaloacetate depletion.", false),
      option("large-direct-atp", "The TCA cycle directly produces large quantities of ATP at every step.", false)
    ],
    correct: ["oaa-regenerated", "carbon-label", "complex-ii", "anaplerosis", "no-net-glucose", "oxygen-indirect"],
    hint: "Check conservation of the 4C carrier, Complex II proton pumping, oxygen's role, anaplerosis and carbon tracing across the first turn.",
    success: "You have connected carbon flow, bioenergetics, respiration and biosynthetic integration.",
    incorrect: "At least one statement confuses direct TCA chemistry with indirect respiratory or biosynthetic effects."
  }
];

export const REVIEW_FACTS = [
  { title: "Bridge reaction", text: "PDC converts pyruvate to acetyl-CoA, NADH and CO2 using TPP, lipoamide, CoA, FAD and NAD+." },
  ...TCA_LEVELS.map((level) => ({
    title: `${level.level}. ${level.enzyme}`,
    text: `${level.equation} ${level.success.facts[0]}`
  })),
  { title: "Event · Energy demand", text: "ADP and Ca2+ promote TCA flux, whereas ATP and NADH provide inhibitory high-energy and high-redox feedback." },
  { title: "Event · Thiamine deficiency", text: "Thiamine supplies TPP to PDC and alpha-ketoglutarate dehydrogenase; deficiency impairs oxidative metabolism." },
  { title: "Event · Oxygen crisis", text: "NADH and the Complex II FADH2-equivalent feed electrons to the ETC; oxygen permits NAD+ regeneration indirectly." },
  { title: "Event · Anaplerosis", text: "Pyruvate carboxylase uses ATP, bicarbonate and biotin to replenish oxaloacetate withdrawn for biosynthesis." },
  { title: "One-turn yield", text: "3 NADH × 2.5 + 1 FADH2-equivalent × 1.5 + 1 GTP × 1 ≈ 10 ATP equivalents per acetyl-CoA." }
];

export function getChallengeBySequenceEntry(entry) {
  if (!entry) return null;
  const collection = entry.kind === "level" ? TCA_LEVELS : METABOLIC_EVENTS;
  return collection.find((challenge) => challenge.id === entry.id) ?? null;
}
