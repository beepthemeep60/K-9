const fs = require("fs");
const path = require("path");

const USERS_PATH = path.join(__dirname, "../data/users");

/**
 * Load a user file.
 * Creates a blank user object if one doesn't exist.
 */
function loadUser(userId) {
  const file = path.join(USERS_PATH, `${userId}.json`);

  if (!fs.existsSync(file)) {
    return {
      user_id: userId,
      packs: {},
      collection: {},
    };
  }

  return JSON.parse(fs.readFileSync(file, "utf8"));
}

/**
 * Save a user file.
 */
function saveUser(user) {
  const file = path.join(USERS_PATH, `${user.user_id}.json`);

  fs.mkdirSync(USERS_PATH, { recursive: true });
  fs.writeFileSync(file, JSON.stringify(user, null, 2), "utf8");
}

/**
 * Add packs to a user's inventory.
 */
function addPack(userId, setId, packType = "standard_pack", amount = 1) {
  const user = loadUser(userId);

  if (!user.packs[setId]) {
    user.packs[setId] = {};
  }

  if (!user.packs[setId][packType]) {
    user.packs[setId][packType] = 0;
  }

  user.packs[setId][packType] += amount;

  saveUser(user);

  return user;
}

/**
 * Remove packs from a user's inventory.
 * Returns true if successful.
 */
function removePack(userId, setId, packType = "standard_pack", amount = 1) {
  const user = loadUser(userId);

  if (
    !user.packs?.[setId]?.[packType] ||
    user.packs[setId][packType] < amount
  ) {
    return false;
  }

  user.packs[setId][packType] -= amount;

  if (user.packs[setId][packType] === 0) {
    delete user.packs[setId][packType];
  }

  if (Object.keys(user.packs[setId]).length === 0) {
    delete user.packs[setId];
  }

  saveUser(user);

  return true;
}

/**
 * Get number of packs owned.
 */
function getPackCount(userId, setId, packType = "standard_pack") {
  const user = loadUser(userId);

  return user.packs?.[setId]?.[packType] || 0;
}

/**
 * Add cards to a user's collection.
 * Expects an array returned from openPack().
 */
function addCards(userId, cards) {
  const user = loadUser(userId);

  for (const card of cards) {
    const cardId = card.id;
    const edition = card.edition;

    if (!user.collection[cardId]) {
      user.collection[cardId] = {};
    }

    if (!user.collection[cardId][edition]) {
      user.collection[cardId][edition] = 0;
    }

    user.collection[cardId][edition]++;
  }

  saveUser(user);

  return user;
}

/**
 * Get all copies of a card.
 */
function getCard(userId, cardId) {
  const user = loadUser(userId);

  return user.collection[cardId] || {};
}

/**
 * Get total number of copies of a card
 * across all editions.
 */
function getTotalCardCount(userId, cardId) {
  const card = getCard(userId, cardId);

  return Object.values(card).reduce((sum, count) => sum + count, 0);
}

/**
 * Remove a specific card edition.
 * Useful for trading, crafting, etc.
 */
function removeCard(userId, cardId, edition, amount = 1) {
  const user = loadUser(userId);

  if (
    !user.collection?.[cardId]?.[edition] ||
    user.collection[cardId][edition] < amount
  ) {
    return false;
  }

  user.collection[cardId][edition] -= amount;

  if (user.collection[cardId][edition] === 0) {
    delete user.collection[cardId][edition];
  }

  if (Object.keys(user.collection[cardId]).length === 0) {
    delete user.collection[cardId];
  }

  saveUser(user);

  return true;
}

module.exports = {
  loadUser,
  saveUser,

  addPack,
  removePack,
  getPackCount,

  addCards,
  getCard,
  getTotalCardCount,
  removeCard,
};
