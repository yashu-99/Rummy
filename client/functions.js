import { sendDiscardEvent, sendDeckEvent, sendPlayCardEvent } from "./app.js";

function emptyDivWithRemoveChild(divElement) {
  while (divElement.firstChild) {
    divElement.removeChild(divElement.firstChild);
  }
}
function emptyDivWithReplaceChildren(divElement) {
  divElement.replaceChildren();
}

export function renderGameState(gameState) {
  const mainGameContainer = document.getElementById("mainGameContainer");
  const meldDeckContainer = document.getElementById("meldDeckContainer");
  emptyDivWithRemoveChild(mainGameContainer);
  emptyDivWithReplaceChildren(mainGameContainer);
  mainGameContainer.innerHTML = "";
  emptyDivWithRemoveChild(meldDeckContainer);
  emptyDivWithReplaceChildren(meldDeckContainer);
  meldDeckContainer.innerHTML = "";

  // Making the Discard pile...
  if (!gameState.discardPile.length) {
    const discardCardButton = document.createElement("button");
    discardCardButton.id = "null";
    discardCardButton.classList.add("discardCard");
    discardCardButton.textContent = `Empty Pile`;
    mainGameContainer.appendChild(discardCardButton);
    discardCardButton.addEventListener("click", () => {
      sendDiscardEvent(null);
    });
  } else {
    const discardPile = gameState.discardPile[gameState.discardPile.length - 1]; //Discard pile ka last patta
    const discardCardButton = document.createElement("button");
    discardCardButton.id = discardPile.id;
    discardCardButton.classList.add("discardCard");
    discardCardButton.textContent = `${discardPile.rank} of ${discardPile.suit}`;
    mainGameContainer.appendChild(discardCardButton);
    discardCardButton.addEventListener("click", () => {
      sendDiscardEvent(discardPile);
    });
  }
  // Making the remaining deck
  if (!gameState.deck.length) {
    const deckCardButton = document.createElement("button");
    deckCardButton.id = "null";
    deckCardButton.classList.add("deckCard");
    deckCardButton.textContent = `Empty Pile`;
    mainGameContainer.appendChild(deckCardButton);
    deckCardButton.addEventListener("click", () => {
      sendDeckEvent(null);
    });
  } else {
    const deckPile = gameState.deck[0]; // Deck ka pehle patta
    const deckCardButton = document.createElement("button");
    deckCardButton.id = deckPile.id;
    deckCardButton.classList.add("deckCard");
    deckCardButton.textContent = `Deck`;
    mainGameContainer.appendChild(deckCardButton);
    deckCardButton.addEventListener("click", () => {
      sendDeckEvent(deckPile);
    });
  }
  const lineBreak = document.createElement("br");
  mainGameContainer.appendChild(lineBreak);
  //Rendering the players hand
  const playerHand = gameState.playerHand;
  playerHand.forEach((card) => {
    const cardButton = document.createElement("button");
    cardButton.id = card.id;
    cardButton.textContent = `${card.rank} of ${card.suit}`;
    mainGameContainer.appendChild(cardButton);
    cardButton.addEventListener("click", () => {
      sendPlayCardEvent(card);
    });
  });
  // Rendering the meld piles
  const meld = gameState.meld;
  meld.forEach((m) => {
    const meldDiv = document.createElement("div");
    m.forEach((card) => {
      const cardButton = document.createElement("button");
      cardButton.id = card.id;
      cardButton.textContent = `${card.rank} of ${card.suit}`;
      meldDiv.appendChild(cardButton);
    });
    meldDeckContainer.appendChild(meldDiv);
  });
}
