# MitoMission: Carbon Circuit

MitoMission is a complete offline browser game for second-year medical biochemistry students. The player transports pyruvate into the mitochondrial matrix, completes the pyruvate dehydrogenase bridge reaction, guides one acetyl-CoA through all eight TCA-cycle reactions, manages four clinical/physiological events, and verifies the pathway in a four-part Final Gate.

The expected correct-path play time is approximately 8-12 minutes.

## Run the game

From this `mitomission` folder, start any basic local web server:

```bash
python3 -m http.server 8000
```

Then open `http://localhost:8000` in a current desktop browser.

The game has no external assets, CDNs, network calls, backend, build step, database or login. After the local files have loaded, the game remains playable without internet access.

## Controls

- Pointer: click tokens and targets, or drag eligible tokens to a target.
- Keyboard: use `Tab` to move focus and `Enter` or `Space` to activate controls.
- Click-to-place: every draggable interaction supports selecting the item and then selecting its target.
- Submit: scientific penalties occur only after an intentional, complete submission. Incomplete work, cancelled drags and off-target drops are not penalised.
- Continue / Retry: feedback remains visible until the player chooses what happens next.

The game is fully understandable without sound; no audio is required or included.

## Save and reset

Progress is saved in browser `localStorage` after rewards, penalties, purchases and transitions. A refresh resumes the stored challenge without duplicating rewards or molecular-ledger entries.

- Use **Reset Saved Game** on the title screen to remove saved progress.
- Use **Reset Game** in the in-game status bar or on the results screen to return to a clean title screen.
- **Replay Mission** starts a fresh scored attempt immediately.
- **Review Cycle** is read-only and cannot change Mito Bucks, lives or ledgers.

## Testing

The logic tests use Node's built-in test runner and do not install a framework:

```bash
npm test
```

Or run the equivalent command directly:

```bash
node --test tests/game-logic.test.js
```

The 20-test suite checks initial state, exact reward and penalty rules, zero-life reboot/Guided Mode, shop costs and limits, duplicate-reward and duplicate-ledger safeguards, fixed mission and Final Gate order, hardened save validation, reset behaviour, rank boundaries, exact final ledgers and the perfect score of 50 Mito Bucks.

## Project structure

```text
mitomission/
├── index.html
├── styles.css
├── package.json
├── js/
│   ├── game-data.js       # Bridge, level, event and Final Gate configurations
│   ├── game-state.js      # Central state, persistence, scoring, penalties and ledgers
│   ├── interactions.js    # Reusable choice, set, placement, sorting and wiring systems
│   ├── final-gate.js      # Final Gate renderers and validation
│   ├── shop.js            # Hint and extra-life controls
│   ├── ui.js              # Screens, pathway, ledger, feedback, results and review UI
│   ├── game-engine.js     # Progression and challenge orchestration
│   └── main.js            # Browser entry point
└── tests/
    └── game-logic.test.js
```

## Data-driven architecture

All four bridge operations, eight TCA levels, four metabolic events and four Final Gate sections are configuration objects. The engine routes those objects through shared renderers and one validation/progression loop. Rewards and penalties are applied only by the central state service, while ledger mutations use a separate ID-guarded ledger service. This prevents individual screens from duplicating score or molecular output.

## Browser requirements

Use a current version of Chrome, Edge, Firefox or Safari on a laptop or desktop. The layout adapts down to narrow screens, but a laptop-sized display provides the clearest pathway map for classroom presentation.
