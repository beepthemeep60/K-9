const path = require("path");

// load set data from JSON file
function loadSet(setId) {
  return require(path.join(__dirname, "../data/sets", `${setId}.json`));
}

// get total number of cards in set
function getSetTotal(set) {
  return Object.keys(set.cards).length;
}

// get card's position in set (e.g. "12/102")
function getCardIndex(set, cardId) {
  return Object.keys(set.cards).indexOf(cardId) + 1;
}

// get completion percentage of set (excludes timey_wimey edition cards)
function getCompletion(user, set) {
  const total = Object.keys(set.cards).length;

  const owned = Object.keys(set.cards).filter((cardId) => {
    if (!user.collection[cardId]) return false;
    // Only count if they own a non-timey_wimey edition
    return Object.keys(user.collection[cardId]).some(
      (ed) => ed !== "timey_wimey" && user.collection[cardId][ed] > 0,
    );
  }).length;

  return (owned / total) * 100;
}

// Check if user owns a card in a non-timey_wimey edition
function ownsCardInSet(user, cardId) {
  if (!user.collection[cardId]) return false;
  return Object.keys(user.collection[cardId]).some(
    (ed) => ed !== "timey_wimey" && user.collection[cardId][ed] > 0,
  );
}

module.exports = {
  loadSet,
  getSetTotal,
  getCardIndex,
  getCompletion,
  ownsCardInSet,
};
