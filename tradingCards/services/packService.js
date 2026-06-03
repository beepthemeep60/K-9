// rolls rarity
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

// picks card of rolled rarity from set
function getCardsByRarity(set, rarity) {
  return Object.entries(set.cards)
    .filter(([_, card]) => card.rarity === rarity)
    .map(([id, card]) => ({ id, ...card }));
}

// rolls edition
function rollEdition(editionTable) {
  return weightedPick(editionTable);
}

// main pack opening
function openPack(set, tierTable, editionTable, cardsPerPack = 5) {
  const results = [];

  const cards = Object.entries(set.cards);

  for (let i = 0; i < cardsPerPack; i++) {
    // 1. roll tier (your "rarity")
    const tier = weightedPick(tierTable);

    let pool = cards.filter(([_, card]) => card.rarity === tier);
    if (!pool.length) pool = cards;
    if (!pool.length) continue;

    // 2. pick card
    const [cardId, card] = pool[Math.floor(Math.random() * pool.length)];

    // 3. roll edition
    const allowedEditions = card.editions?.length
      ? Object.fromEntries(
          Object.entries(editionTable).filter(([edition]) =>
            card.editions.includes(edition),
          ),
        )
      : editionTable;
    const edition = rollEdition(allowedEditions);

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
