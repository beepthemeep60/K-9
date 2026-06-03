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

// get completion percentage of set (e.g. "75% complete")
function getCompletion(user, set) {
  const total = Object.keys(set.cards).length;

  const owned = Object.keys(set.cards).filter((cardId) => {
    return user.collection[cardId];
  }).length;

  return (owned / total) * 100;
}

module.exports = {
  loadSet,
  getSetTotal,
  getCardIndex,
  getCompletion,
};
