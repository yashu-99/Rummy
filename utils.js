// Helper function to create a card object
let cardId = 1;
function createCard(suit, rank) {
  const card = { id: cardId, suit, rank };
  cardId++;
  return card;
}

// Function to create a standard deck of cards
function createDeck() {
  const suits = ["hearts", "diamonds", "clubs", "spades"];
  const ranks = [
    "A",
    "2",
    "3",
    "4",
    "5",
    "6",
    "7",
    "8",
    "9",
    "10",
    "J",
    "Q",
    "K",
  ];
  const deck = [];

  for (const suit of suits) {
    for (const rank of ranks) {
      deck.push(createCard(suit, rank));
    }
  }

  return deck;
}

// Fisher-Yates shuffle algorithm
function shuffle(array) {
  let currentIndex = array.length;
  let temporaryValue, randomIndex;

  // While there remain elements to shuffle...
  while (currentIndex !== 0) {
    // Pick a remaining element...
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex -= 1;

    // And swap it with the current element.
    temporaryValue = array[currentIndex];
    array[currentIndex] = array[randomIndex];
    array[randomIndex] = temporaryValue;
  }

  return array;
}

function sendGameState(players, io, gameState) {
  players.forEach((player) => {
    const currentGameState = {
      players: gameState.players,
      deck: gameState.deck,
      discardPile: gameState.discardPile,
      playerHand: gameState.playerHands[player],
      meld: gameState.meld,
    };
    io.to(player).emit("gameStateUpdate", currentGameState);
  });
}

export { createDeck, shuffle, sendGameState };
