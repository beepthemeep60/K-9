const RARITY_ORDER = ["common", "uncommon", "rare", "epic", "legendary"];
const EDITION_ORDER = ["basic", "foil", "gold", "unpleasant", "rainbow"];

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
          edition: "basic",
        });
      }
    }
    return results;
  }

  const cards = Object.entries(set.cards);
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

    let pool = cards.filter(([_, card]) => card.rarity === tier);
    if (!pool.length) pool = cards;
    if (!pool.length) continue;

    const [cardId, card] = pool[Math.floor(Math.random() * pool.length)];

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

module.exports = {
  weightedPick,
  getCardsByRarity,
  rollEdition,
  openPack,
};
