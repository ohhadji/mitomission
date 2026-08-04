import { GameEngine } from "./game-engine.js";
import { loadState } from "./game-state.js";

const engine = new GameEngine(loadState());
engine.render();

window.addEventListener("error", (event) => {
  console.error("MITOMISSION runtime error:", event.error ?? event.message);
});
