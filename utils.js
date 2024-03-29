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

function checkMeld(selectedCards) {
  let sameRank = false;
  let consecutive = false;
  let hasSameSuit = false;

  // Check if all cards have the same rank
  const firstCardRank = selectedCards[0].rank;
  sameRank = selectedCards.every((card) => card.rank === firstCardRank);

  // Check if all cards have the same suit and are consecutive
  const suits = new Set(selectedCards.map((card) => card.suit));
  if (suits.size === 1) {
    hasSameSuit = true;
    const rankValues = {
      2: 2,
      3: 3,
      4: 4,
      5: 5,
      6: 6,
      7: 7,
      8: 8,
      9: 9,
      10: 10,
      J: 11,
      Q: 12,
      K: 13,
      A: 1,
    };

    const sortedCards = selectedCards.slice().sort((a, b) => {
      return rankValues[a.rank] - rankValues[b.rank];
    });

    for (let i = 0; i < sortedCards.length - 1; i++) {
      const currentRankValue = rankValues[sortedCards[i].rank];
      const nextRankValue = rankValues[sortedCards[i + 1].rank];
      if (nextRankValue - currentRankValue !== 1) {
        consecutive = false;
        break;
      } else {
        consecutive = true;
      }
    }
  }

  const res = sameRank || (hasSameSuit && consecutive);
  return res;
}

function isSubset(subset, superset) {
  return subset.every((subsetItem) => {
    return superset.some((supersetItem) => isEqual(subsetItem, supersetItem));
  });
}

function isEqual(obj1, obj2) {
  const keys1 = Object.keys(obj1);
  const keys2 = Object.keys(obj2);

  if (keys1.length !== keys2.length) {
    return false;
  }

  for (let key of keys1) {
    if (obj1[key] !== obj2[key]) {
      return false;
    }
  }

  return true;
}

const arraysEqual = (a1, a2) =>
  a1.length === a2.length && a1.every((o, idx) => objectsEqual(o, a2[idx]));

const objectsEqual = (o1, o2) =>
  Object.keys(o1).length === Object.keys(o2).length &&
  Object.keys(o1).every((p) => o1[p] === o2[p]);

export { createDeck, shuffle, sendGameState, checkMeld, isSubset, arraysEqual };
