import { SCORE_RULES } from "./game-data.js";

function shopButton(label, cost, className) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = `shop-button ${className}`;
  button.innerHTML = `<span class="shop-button-icon" aria-hidden="true">${className === "hint-control" ? "?" : "+"}</span><span><strong>${label}</strong><small>${cost} M-Bucks</small></span>`;
  return button;
}

export function createShopControls(state, challenge, handlers, { allowHint = true } = {}) {
  const wrapper = document.createElement("div");
  wrapper.className = "shop-controls";
  wrapper.setAttribute("aria-label", "Mito Bucks shop");

  const hint = shopButton("Hint", SCORE_RULES.hintCost, "hint-control");
  const hintPurchased = challenge ? state.hintsPurchased.includes(challenge.id) : false;
  hint.disabled =
    !allowHint ||
    !challenge ||
    hintPurchased ||
    state.atpCredits < SCORE_RULES.hintCost;
  hint.title = hintPurchased
    ? "Hint already purchased for this challenge"
    : state.atpCredits < SCORE_RULES.hintCost
      ? "Not enough M-Bucks"
      : "Reveal a targeted biochemical cue and remove one distractor";
  hint.addEventListener("click", () => {
    if (!hint.disabled) handlers.onHint();
  });

  const life = shopButton("Extra life", SCORE_RULES.extraLifeCost, "life-control");
  life.disabled = state.lives >= SCORE_RULES.startingLives || state.atpCredits < SCORE_RULES.extraLifeCost;
  life.title =
    state.lives >= SCORE_RULES.startingLives
      ? "Lives are already full"
      : state.atpCredits < SCORE_RULES.extraLifeCost
        ? "Not enough M-Bucks"
        : "Restore one life, up to three";
  life.addEventListener("click", () => {
    if (!life.disabled) handlers.onLife();
  });

  wrapper.append(hint, life);
  return wrapper;
}
