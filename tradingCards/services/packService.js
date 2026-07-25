const fs = require("fs");
const path = require("path");
const setsConfig = require("../data/config/sets.json");

const RARITY_ORDER = ["common", "uncommon", "rare", "epic", "legendary"];
const editionTable = require("../data/config/editions.json");
const eventEditionTable = require("../data/config/event_editions.json");
const EDITION_ORDER = Object.keys({ ...editionTable, ...eventEditionTable });

function getRarityRank(rarity) {
  return RARITY_ORDER.indexOf(rarity);
}

function weightedPick(tierTable) {
  const entries = Object.entries(tierTable);
  if (!entries.length) return null;

  const total = entries.reduce((sum, [_, v]) => sum + v.weight, 0);

  let roll = Math.random() * total;

  for (const [key, value] of entries) {
    roll -= value.weight;
    if (roll <= 0) return key;
  }
}

function getCardsByRarity(set, rarity) {
  return Object.entries(set.cards)
    .filter(([_, card]) => card.rarity === rarity)
    .map(([id, card]) => ({ id, ...card }));
}

function rollEdition(editionTable) {
  return weightedPick(editionTable);
}

function loadSet(setId) {
  return require(path.join(__dirname, "../data/sets", `${setId}.json`));
}

function openPack(
  set,
  packsConfig,
  editionTable,
  eventEditionTable = {},
  cardsPerPack = 5,
  packConfig = {},
) {
  const results = [];

  if (packConfig.fixed_cards?.length) {
    for (const cardId of packConfig.fixed_cards) {
      const card = set.cards[cardId];
      if (card) {
        results.push({
          id: cardId,
          ...card,
          pulled_tier: card.rarity,
          edition: packConfig.forced_edition || "basic",
        });
      }
    }
    return results;
  }

  // Legacy packs: draw from all sets except the current/latest
  let allCards = [];
  if (packConfig.legacy) {
    const setIds = Object.keys(setsConfig);
    const currentSet = setIds[setIds.length - 1];
    for (const sid of setIds) {
      if (sid === currentSet) continue;
      try {
        const s = loadSet(sid);
        for (const [cid, card] of Object.entries(s.cards)) {
          allCards.push({ id: cid, card, setId: sid });
        }
      } catch {}
    }
  } else {
    allCards = Object.entries(set.cards).map(([id, card]) => ({ id, card, setId: null }));
  }

  if (!allCards.length) return results;

  const guaranteedMin = packConfig.guaranteed_min_rarity || null;
  const guaranteedMinEdition = packConfig.guaranteed_min_edition || null;

  const isGodPack =
    packConfig.god_pack_chance != null &&
    Math.random() < packConfig.god_pack_chance;

  if (isGodPack) results._godPack = true;

  for (let i = 0; i < cardsPerPack; i++) {
    const isLast = i === cardsPerPack - 1;

    let tierTable = packConfig.tiers;
    if (isGodPack || (isLast && guaranteedMin)) {
      const minRank = isGodPack ? getRarityRank("rare") : getRarityRank(guaranteedMin);
      const filtered = Object.fromEntries(
        Object.entries(tierTable).filter(
          ([rarity]) => getRarityRank(rarity) >= minRank,
        ),
      );
      if (Object.keys(filtered).length > 0) tierTable = filtered;
    }
    let tier = weightedPick(tierTable);

    let pool = allCards.filter((entry) => entry.card.rarity === tier);
    if (!pool.length) pool = allCards;
    if (!pool.length) continue;

    const picked = pool[Math.floor(Math.random() * pool.length)];
    const cardId = picked.id;
    const card = picked.card;

    // If forced edition, skip edition rolling
    if (packConfig.forced_edition) {
      results.push({
        id: cardId,
        ...card,
        pulled_tier: tier,
        edition: packConfig.forced_edition,
      });
      continue;
    }

    const allEditions = { ...editionTable, ...eventEditionTable };
    let effectiveEditions =
      card.editions?.length || card.event_editions?.length
        ? Object.fromEntries(
            Object.entries(allEditions).filter(
              ([edition]) =>
                (card.editions || []).includes(edition) ||
                (card.event_editions || []).includes(edition),
            ),
          )
        : allEditions;

    if (isGodPack) {
      const minIdx = EDITION_ORDER.indexOf("gold");
      if (minIdx > 0) {
        effectiveEditions = Object.fromEntries(
          Object.entries(effectiveEditions).filter(
            ([ed]) => EDITION_ORDER.indexOf(ed) >= minIdx,
          ),
        );
      }
    } else if (isLast && guaranteedMinEdition) {
      const minIdx = EDITION_ORDER.indexOf(guaranteedMinEdition);
      if (minIdx > 0) {
        effectiveEditions = Object.fromEntries(
          Object.entries(effectiveEditions).filter(
            ([ed]) => EDITION_ORDER.indexOf(ed) >= minIdx,
          ),
        );
      }
    }

    const edition = rollEdition(effectiveEditions);

    results.push({
      id: cardId,
      ...card,
      pulled_tier: tier,
      edition,
    });
  }

  return results;
}

function autoOpenPack(userId, setId, packType, amount = 1) {
  const fs = require("fs");
  const p = require("path");
  const setsConfig = require(p.join(__dirname, "../data/config/sets.json"));
  const packsConfig = require(p.join(__dirname, "../data/config/packs.json"));
  const editionTable = require(p.join(__dirname, "../data/config/editions.json"));
  const eventEditionTable = require(p.join(__dirname, "../data/config/event_editions.json"));

  const { loadUser, saveUser, addCards, removePack } = require("./userService");

  const set = loadSet(setId);
  const pack = packsConfig[packType];
  if (!set || !pack) return null;

  const totalRemoved = [];
  for (let i = 0; i < amount; i++) {
    const removed = removePack(userId, setId, packType, 1);
    if (!removed) break;
    const cards = openPack(set, packsConfig, editionTable, eventEditionTable, pack.cards_per_pack || 5, pack);
    if (cards.length) {
      addCards(userId, cards);
      totalRemoved.push(cards);
    }
  }

  return totalRemoved.length ? totalRemoved : null;
}

module.exports = {
  weightedPick,
  getCardsByRarity,
  rollEdition,
  openPack,
  autoOpenPack,
};
