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
  emptyDivWithRemoveChild(mainGameContainer);
  emptyDivWithReplaceChildren(mainGameContainer);
  mainGameContainer.innerHTML = "";

  // Making the Discard pile...
  const discardPile = gameState.discardPile[gameState.discardPile.length - 1]; //Discard pile ka last patta
  const discardCardButton = document.createElement("button");
  discardCardButton.id = discardPile.id;
  discardCardButton.classList.add("discardCard");
  discardCardButton.textContent = `${discardPile.rank} of ${discardPile.suit}`;
  mainGameContainer.appendChild(discardCardButton);

  // Making the remaining deck
  const deckPile = gameState.deck[0]; // Deck ka pehle patta
  const deckCardButton = document.createElement("button");
  deckCardButton.id = deckPile.id;
  deckCardButton.classList.add("deckCard");
  deckCardButton.textContent = `Deck`;
  mainGameContainer.appendChild(deckCardButton);
  const lineBreak = document.createElement("br");
  mainGameContainer.appendChild(lineBreak);
  //Rendering the players hand
  const playerHand = gameState.playerHand;
  playerHand.forEach((card) => {
    const cardButton = document.createElement("button");
    cardButton.id = card.id;
    cardButton.textContent = `${card.rank} of ${card.suit}`;
    mainGameContainer.appendChild(cardButton);
  });
}
