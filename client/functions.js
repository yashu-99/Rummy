import { checkMeld } from "../utils.js";
import { checkTurn } from "./app.js";
let selectedCards = [];
let isMeldOn = false;
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
      checkTurn("sendDiscardEvent", [null]);
    });
  } else {
    const discardPile = gameState.discardPile[gameState.discardPile.length - 1]; //Discard pile ka last patta
    const discardCardButton = document.createElement("button");
    discardCardButton.id = discardPile.id;
    discardCardButton.classList.add("discardCard");
    discardCardButton.textContent = `${discardPile.rank} of ${discardPile.suit}`;
    mainGameContainer.appendChild(discardCardButton);
    discardCardButton.addEventListener("click", () => {
      checkTurn("sendDiscardEvent", [discardPile]);
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
      checkTurn("sendDeckEvent", [null]);
    });
  } else {
    const deckPile = gameState.deck[0]; // Deck ka pehle patta
    const deckCardButton = document.createElement("button");
    deckCardButton.id = deckPile.id;
    deckCardButton.classList.add("deckCard");
    deckCardButton.textContent = `Deck`;
    mainGameContainer.appendChild(deckCardButton);
    deckCardButton.addEventListener("click", () => {
      checkTurn("sendDeckEvent", [deckPile]);
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
      if (!isMeldOn) checkTurn("sendPlayCardEvent", [card]);
      else {
        if (!selectedCards.includes(card)) {
          selectedCards.push(card);
          cardButton.classList.add("green-bg");
        } else {
          selectedCards = selectedCards.filter((c) => c.id !== card.id);
          cardButton.classList.remove("green-bg");
        }
      }
    });
  });
  // Rendering the meld piles
  const meld = gameState.meld;
  const meldButton = document.createElement("button");
  meldButton.textContent = "Meld / Layoff";
  meldButton.id = "meldBtn";
  // Meld btn logic
  meldButton.addEventListener("click", () => {
    selectedCards = [];
    isMeldOn = !isMeldOn;
  });
  meldDeckContainer.appendChild(meldButton);
  const submitMeldButton = document.createElement("button");
  submitMeldButton.textContent = "Add Meld";
  meldDeckContainer.appendChild(submitMeldButton);
  // Add Meld btn logic
  submitMeldButton.addEventListener("click", () => {
    if (isMeldOn) {
      if (selectedCards.length > 2) {
        if (checkMeld(selectedCards)) {
          checkTurn("addNewMeldEvent", [selectedCards]);
          selectedCards = [];
          isMeldOn = false;
        } else {
          console.log("Select a valid meld! abc");
        }
      } else {
        console.log("Meld must atleast be of length 3");
      }
    } else {
      console.log("Melding is turned off!!!");
    }
  });

  const lineBreak2 = document.createElement("br");
  meldDeckContainer.appendChild(lineBreak2);
  meld.forEach((m) => {
    const meldDiv = document.createElement("div");
    m.forEach((card) => {
      const cardButton = document.createElement("button");
      cardButton.id = card.id;
      cardButton.textContent = `${card.rank} of ${card.suit}`;
      cardButton.disabled = true;
      meldDiv.appendChild(cardButton);
    });
    const layoffButton = document.createElement("button");
    layoffButton.textContent = "Add +";
    meldDiv.appendChild(layoffButton);
    meldDeckContainer.appendChild(meldDiv);
    const lineBreak = document.createElement("br");
    meldDeckContainer.appendChild(lineBreak);
    // LayOff Button Logic
    layoffButton.addEventListener("click", () => {
      if (isMeldOn) {
        if (selectedCards.length > 0) {
          const newMeld = [...m, ...selectedCards];
          if (checkMeld(newMeld)) {
            checkTurn("addToMeld", [m, newMeld, selectedCards]);
            isMeldOn = false;
          } else {
            console.log("Cannot Add to the selected meld!!");
          }
        } else {
          console.log("Select Some cards first!");
        }
      } else {
        console.log("Melding is turned off!");
      }
    });
  });
}
