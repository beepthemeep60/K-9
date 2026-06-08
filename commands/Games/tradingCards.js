const {
  SlashCommandBuilder,
  EmbedBuilder,
  AttachmentBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  PermissionFlagsBits,
} = require("discord.js");
const { createCanvas, loadImage } = require("@napi-rs/canvas");
const https = require("https");
const path = require("path");

const {
  loadSet,
  getSetTotal,
  getCardIndex,
  getCompletion,
} = require("../../tradingCards/services/cardService");
const { openPack } = require("../../tradingCards/services/packService");
const {
  loadUser,
  saveUser,
  addPack,
  removePack,
  getPackCount,
  addCards,
  getCard,
  getTotalCardCount,
  removeCard,
  removeCards,
  setFeaturedCard,
  getFeaturedCard,
} = require("../../tradingCards/services/userService");
const {
  loadUser: loadBpUser,
  saveUser: saveBpUser,
  getCurrentSeason,
} = require("../../battlePass/services/battlePassService");

const DATA_PATH = path.join(__dirname, "../../tradingCards/data");
const setsConfig = require(path.join(DATA_PATH, "config/sets.json"));
const packsConfig = require(path.join(DATA_PATH, "config/packs.json"));
const editionTable = require(path.join(DATA_PATH, "config/editions.json"));
const eventEditionTable = require(
  path.join(DATA_PATH, "config/event_editions.json"),
);
const allEditions = { ...editionTable, ...eventEditionTable };

const EDITION_ORDER = Object.keys(allEditions);

const STAT_NAMES = {
  total_cards: "Total Cards",
  unique_cards: "Unique Cards",
  common_cards: "Common Cards",
  uncommon_cards: "Uncommon Cards",
  rare_cards: "Rare Cards",
  epic_cards: "Epic Cards",
  legendary_cards: "Legendary Cards",
  basic_cards: "Basic Cards",
  foil_cards: "Foil Cards",
  gold_cards: "Gold Cards",
  unpleasant_cards: "Unpleasant Cards",
  rainbow_cards: "Rainbow Cards",
  trades_completed: "Trades Completed",
};
const editionChoices = Object.keys(allEditions).map((e) => ({
  name: allEditions[e].display_name || e,
  value: e,
}));
const EDITION_ABBR = {
  basic: "B",
  foil: "F",
  gold: "G",
  unpleasant: "U",
  rainbow: "R",
};
const RARITY_ORDER = ["legendary", "epic", "rare", "uncommon", "common"];
const CARDS_PER_PAGE = 30;
const CARDS_PER_SET_PAGE = 25;

const RARITY_COLORS = {
  common: 0x808080,
  uncommon: 0x55ff55,
  rare: 0x5599ff,
  epic: 0xaa55ff,
  legendary: 0xee8822,
};

const DEFAULT_SET = Object.keys(setsConfig)[0] || "00";
const DEFAULT_PACK = Object.keys(packsConfig)[0] || "standard_pack";
const CARD_IMAGE_SIZE = 768;

function getSetName(setId, set) {
  return set?.set_name || setsConfig[setId]?.name || setId;
}

function getEditionName(edition) {
  return allEditions[edition]?.display_name || edition;
}

function getPackName(packType) {
  return packType.replaceAll("_", " ");
}

function formatPercent(value) {
  if (!Number.isFinite(value)) return "0%";
  return `${Math.round(value)}%`;
}

function titleCase(value) {
  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function getCompletionStats(user, set) {
  const owned = Object.keys(set.cards).filter(
    (cardId) => user.collection[cardId],
  ).length;
  const total = getSetTotal(set);

  return {
    owned,
    total,
    percent: formatPercent((owned / total) * 100),
  };
}

function coverImage(ctx, image, width, height) {
  const scale = Math.min(width / image.width, height / image.height);
  const drawWidth = image.width * scale;
  const drawHeight = image.height * scale;
  const x = (width - drawWidth) / 2;
  const y = (height - drawHeight) / 2;

  ctx.drawImage(image, x, y, drawWidth, drawHeight);
}

function applyEditionEffect(ctx, edition, width, height) {
  if (edition === "gold") {
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, "#583f0c");
    gradient.addColorStop(0.25, "#fff156");
    gradient.addColorStop(0.5, "#6d4f0d");
    gradient.addColorStop(0.75, "#fff048");
    gradient.addColorStop(1, "#5e3e08");
    ctx.globalCompositeOperation = "overlay";
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
  } else if (edition === "rainbow") {
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, "#FF0000dd");
    gradient.addColorStop(0.17, "#FF7F00dd");
    gradient.addColorStop(0.33, "#FFFF00dd");
    gradient.addColorStop(0.5, "#00FF00dd");
    gradient.addColorStop(0.67, "#00a2ffdd");
    gradient.addColorStop(0.83, "#4B0082dd");
    gradient.addColorStop(1, "#9400D3dd");
    ctx.globalCompositeOperation = "multiply";
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
  } else if (edition === "unpleasant") {
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, "#00ff0d");
    gradient.addColorStop(0.5, "#fd33ff");
    gradient.addColorStop(1, "#9e5203");
    ctx.globalCompositeOperation = "multiply";
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
  }

  ctx.globalCompositeOperation = "source-over";

  if (edition === "foil") {
    const silverGradient = ctx.createLinearGradient(0, 0, width, height);
    silverGradient.addColorStop(0, "#D3D3D3");
    silverGradient.addColorStop(0.25, "#555555");
    silverGradient.addColorStop(0.5, "#A9A9A9");
    silverGradient.addColorStop(0.75, "#505050");
    silverGradient.addColorStop(1, "#808080");
    ctx.lineWidth = 18;
    ctx.strokeStyle = silverGradient;
    ctx.strokeRect(9, 9, width - 18, height - 18);
  }
}

async function renderCardImage(card, pullIndex, user, set) {
  if (!card.art_url) return null;

  const buf = await new Promise((resolve, reject) => {
    https
      .get(
        card.art_url,
        { headers: { "User-Agent": "Mozilla/5.0" } },
        (res) => {
          if (res.statusCode < 200 || res.statusCode >= 300) {
            reject(new Error(`HTTP ${res.statusCode}`));
            return;
          }
          const chunks = [];
          res.on("data", (c) => chunks.push(c));
          res.on("end", () => resolve(Buffer.concat(chunks)));
        },
      )
      .on("error", reject);
  });
  const inputImage = await loadImage(buf);
  const canvas = createCanvas(CARD_IMAGE_SIZE, CARD_IMAGE_SIZE);
  const ctx = canvas.getContext("2d");

  coverImage(ctx, inputImage, canvas.width, canvas.height);
  applyEditionEffect(ctx, card.edition, canvas.width, canvas.height);

  if (user && set) {
    const fullCard = set.cards[card.id];
    if (fullCard && ownsAllEditions(user, card.id, fullCard)) {
      const cx = canvas.width - 40,
        cy = 40,
        r = 30,
        innerR = 12;
      ctx.beginPath();
      for (let i = 0; i < 5; i++) {
        const angle = (i * 4 * Math.PI) / 5 - Math.PI / 2;
        const outerX = cx + r * Math.cos(angle);
        const outerY = cy + r * Math.sin(angle);
        if (i === 0) ctx.moveTo(outerX, outerY);
        else ctx.lineTo(outerX, outerY);
        const innerAngle = angle + (2 * Math.PI) / 10;
        ctx.lineTo(
          cx + innerR * Math.cos(innerAngle),
          cy + innerR * Math.sin(innerAngle),
        );
      }
      ctx.closePath();
      ctx.fillStyle = "#ffd700";
      ctx.fill();
      ctx.strokeStyle = "#000";
      ctx.lineWidth = 3;
      ctx.stroke();
    }
  }

  const attachmentName = `card-${card.id}-${pullIndex}.png`;
  return new AttachmentBuilder(canvas.toBuffer("image/png"), {
    name: attachmentName,
  });
}

function renderEditionIcon(card, pullIndex, setId) {
  const size = 160;
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext("2d");
  const edition = card.edition;

  ctx.clearRect(0, 0, size, size);

  const stampColor = allEditions[edition]?.color || "#ffffff";
  let stampFill = stampColor;

  if (edition === "rainbow") {
    const gradient = ctx.createLinearGradient(0, 0, size, size);
    gradient.addColorStop(0, "#FF0000");
    gradient.addColorStop(0.17, "#FF7F00");
    gradient.addColorStop(0.33, "#FFFF00");
    gradient.addColorStop(0.5, "#00FF00");
    gradient.addColorStop(0.67, "#00a2ff");
    gradient.addColorStop(0.83, "#4B0082");
    gradient.addColorStop(1, "#9400D3");
    stampFill = gradient;
  }

  ctx.fillStyle = stampFill;
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, 54, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#111111";
  ctx.font =
    "bold 64px 'Segoe UI Emoji', 'Apple Color Emoji', 'Noto Color Emoji', sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const stampEmoji = (setId && setsConfig[setId]?.emoji) || "⭐";
  ctx.fillText(stampEmoji, size / 2, size / 2 + 2);

  const attachmentName = `edition-${card.id}-${pullIndex}.png`;
  return new AttachmentBuilder(canvas.toBuffer("image/png"), {
    name: attachmentName,
  });
}

function downloadImage(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, { headers: { "User-Agent": "Mozilla/5.0" } }, (res) => {
        if (res.statusCode < 200 || res.statusCode >= 300) {
          reject(new Error(`HTTP ${res.statusCode}`));
          return;
        }
        const chunks = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () => resolve(Buffer.concat(chunks)));
      })
      .on("error", reject);
  });
}

async function renderPackCoverImage(
  cardImage,
  imageUrl,
  pack,
  packType,
  packIndex,
  godPack,
) {
  const size = CARD_IMAGE_SIZE;
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#1a1a2e";
  ctx.fillRect(0, 0, size, size);

  let img, ix, iy, iw, ih;

  if (cardImage) {
    img = cardImage;
  } else if (imageUrl) {
    try {
      const buf = await downloadImage(imageUrl);
      img = await loadImage(buf);
    } catch {}
  }

  if (img) {
    const scale = Math.min(size / img.width, size / img.height);
    iw = img.width * scale;
    ih = img.height * scale;
    ix = (size - iw) / 2;
    iy = (size - ih) / 2;
    ctx.drawImage(img, ix, iy, iw, ih);
  }

  if (godPack) {
    const grad = ctx.createLinearGradient(0, 0, size, size);
    grad.addColorStop(0, "rgba(255,0,0,0.3)");
    grad.addColorStop(0.17, "rgba(255,136,0,0.3)");
    grad.addColorStop(0.33, "rgba(255,255,0,0.3)");
    grad.addColorStop(0.5, "rgba(0,255,0,0.3)");
    grad.addColorStop(0.67, "rgba(0,136,255,0.3)");
    grad.addColorStop(0.83, "rgba(0,0,255,0.3)");
    grad.addColorStop(1, "rgba(136,0,255,0.3)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);

    ctx.fillStyle = "rgba(0,0,0,0.5)";
    ctx.fillRect(0, 0, size, size);

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 72px 'Segoe UI', sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.shadowColor = "rgba(0,0,0,0.8)";
    ctx.shadowBlur = 12;
    ctx.shadowBlur = 0;
  } else if (packType !== "standard_pack" && pack.cover_overlay && img) {
    const pad = 4;
    if (pack.cover_overlay === "rainbow") {
      const grad = ctx.createLinearGradient(ix, iy, ix + iw, iy);
      grad.addColorStop(0, "#FF0000");
      grad.addColorStop(0.17, "#FF8800");
      grad.addColorStop(0.33, "#FFFF00");
      grad.addColorStop(0.5, "#00FF00");
      grad.addColorStop(0.67, "#0088FF");
      grad.addColorStop(0.83, "#0000FF");
      grad.addColorStop(1, "#8800FF");
      ctx.strokeStyle = grad;
    } else {
      ctx.strokeStyle = pack.cover_overlay;
    }
    ctx.lineWidth = 8;
    ctx.strokeRect(ix + pad, iy + pad, iw - pad * 2, ih - pad * 2);
  }

  const attachmentName = `pack-cover-${packIndex}.png`;
  return new AttachmentBuilder(canvas.toBuffer("image/png"), {
    name: attachmentName,
  });
}

async function buildCardMessage(card, set, setId, user, pullIndex) {
  const files = [];
  const image = await renderCardImage(card, pullIndex, user, set).catch(
    () => null,
  );
  const icon = renderEditionIcon(card, pullIndex, setId);
  const stats = getCompletionStats(user, set);
  const index = getCardIndex(set, card.id);
  const setName = getSetName(setId, set);

  files.push(icon);

  const embed = new EmbedBuilder()
    .setColor(RARITY_COLORS[card.rarity] || 0xffffff)
    .setAuthor({ name: `${setName} - ${card.type || titleCase(card.rarity)}` })
    .setTitle(card.name)
    .setDescription(card.description || "No description.")
    .addFields({
      name: "Edition:",
      value: getEditionName(card.edition),
      inline: false,
    })
    .setThumbnail(`attachment://${icon.name}`)
    .setFooter({
      text: `${index}/${stats.total} - ${titleCase(card.rarity)} - Set is ${stats.percent} complete!`,
    });

  if (image) {
    files.push(image);
    embed.setImage(`attachment://${image.name}`);
  } else if (card.art_url) {
    embed.setImage(card.art_url);
  }

  return { embeds: [embed], files, attachments: [] };
}

function buildNavigationRow(currentIndex, total, ids, opened = true) {
  const isLastCard = currentIndex === total - 1;
  const isFirstCard = currentIndex === 0;

  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(ids.left)
      .setLabel("←")
      .setStyle(
        opened && !isFirstCard ? ButtonStyle.Success : ButtonStyle.Secondary,
      )
      .setDisabled(!opened || isFirstCard),
    new ButtonBuilder()
      .setCustomId(ids.finished)
      .setLabel(opened ? "Finished" : "Open")
      .setStyle(opened ? ButtonStyle.Success : ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId(ids.right)
      .setLabel("→")
      .setStyle(
        opened && !isLastCard ? ButtonStyle.Success : ButtonStyle.Secondary,
      )
      .setDisabled(!opened || isLastCard),
  );
}

function buildSummaryMessage(cards, set, setId, user, packType) {
  const pulled = new Map();

  for (const card of cards) {
    const key = `${card.id}:${card.edition}`;
    const current = pulled.get(key) || { card, count: 0 };
    current.count++;
    pulled.set(key, current);
  }

  const lines = [...pulled.values()].map(({ card, count }) => {
    const edition = getEditionName(card.edition);
    return `${count}x ${card.name} - ${titleCase(card.rarity)} (${edition})`;
  });

  const embed = new EmbedBuilder()
    .setTitle(`${titleCase(getPackName(packType))} summary`)
    .setDescription(lines.join("\n"));

  return { embeds: [embed], components: [], files: [], attachments: [] };
}

function buildRaritySelect(card, selectedEdition, customId, availableEditions) {
  const editions = availableEditions?.length
    ? availableEditions
    : card.editions || Object.keys(allEditions);
  const options = editions.map((edition) =>
    new StringSelectMenuOptionBuilder()
      .setLabel(getEditionName(edition))
      .setValue(edition)
      .setDefault(edition === selectedEdition),
  );

  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId(customId)
      .setPlaceholder("Change edition")
      .addOptions(options.slice(0, 25)),
  );
}

function filterChoices(choices, query) {
  const normalisedQuery = query.toLowerCase();

  return choices
    .filter((choice) => choice.name.toLowerCase().includes(normalisedQuery))
    .slice(0, 25);
}

function getSetChoices(query) {
  return filterChoices(
    Object.entries(setsConfig).map(([setId, set]) => ({
      name: `${set.name || setId} (Season ${parseInt(setId, 10) || setId})`,
      value: setId,
    })),
    query,
  );
}

function getPackChoices(query) {
  return filterChoices(
    Object.keys(packsConfig).map((packType) => ({
      name: titleCase(getPackName(packType)),
      value: packType,
    })),
    query,
  );
}

function getCardChoices(
  query,
  setId = DEFAULT_SET,
  userId = null,
  ownedOnly = false,
) {
  const set = resolveSet(setId);
  const user = ownedOnly && userId ? loadUser(userId) : null;

  return filterChoices(
    Object.entries(set.cards)
      .filter(([cardId]) => !ownedOnly || (user && user.collection?.[cardId]))
      .map(([cardId, card]) => ({
        name: `${card.name} (${getCardIndex(set, cardId)} - ${getSetName(setId, set)})`,
        value: cardId,
      })),
    query,
  );
}

function getOwnedEditions(user, cardId, card) {
  const allowedEditions = new Set([
    ...(card.editions || Object.keys(editionTable)),
    ...(card.event_editions || []),
  ]);

  return Object.entries(user.collection?.[cardId] || {})
    .filter(([edition, count]) => allowedEditions.has(edition) && count > 0)
    .map(([edition]) => edition)
    .sort((a, b) => EDITION_ORDER.indexOf(a) - EDITION_ORDER.indexOf(b));
}

function resolveSet(setId) {
  if (!setsConfig[setId]) {
    throw new Error(`Unknown set "${setId}".`);
  }

  return loadSet(setId);
}

function getCollectionCardList(user, setId) {
  const setIds = setId ? [setId] : Object.keys(setsConfig).sort();
  const cards = [];
  for (const sid of setIds) {
    try {
      const set = resolveSet(sid);
      for (const [cid, card] of Object.entries(set.cards)) {
        if (user.collection[cid]) {
          const total = Object.values(user.collection[cid]).reduce(
            (a, b) => a + b,
            0,
          );
          cards.push({
            cardId: cid,
            card,
            setId: sid,
            set,
            total,
            editions: user.collection[cid],
          });
        }
      }
    } catch {}
  }
  return cards;
}

function sortCollectionCards(cards, sortBy) {
  const sorted = [...cards];
  if (sortBy === "rarest") {
    sorted.sort((a, b) => {
      const rDiff =
        RARITY_ORDER.indexOf(a.card.rarity) -
        RARITY_ORDER.indexOf(b.card.rarity);
      if (rDiff !== 0) return rDiff;
      if (a.setId !== b.setId) return a.setId.localeCompare(b.setId);
      return a.cardId.localeCompare(b.cardId);
    });
  } else if (sortBy === "quantity") {
    sorted.sort((a, b) => {
      if (b.total !== a.total) return b.total - a.total;
      if (a.setId !== b.setId) return a.setId.localeCompare(b.setId);
      return a.cardId.localeCompare(b.cardId);
    });
  } else if (sortBy === "highest_edition") {
    sorted.sort((a, b) => {
      const aEditions = Object.keys(a.editions || {});
      const bEditions = Object.keys(b.editions || {});
      const aMax = Math.max(
        -1,
        ...aEditions.map((e) => EDITION_ORDER.indexOf(e)),
      );
      const bMax = Math.max(
        -1,
        ...bEditions.map((e) => EDITION_ORDER.indexOf(e)),
      );
      if (bMax !== aMax) return bMax - aMax;
      if (a.setId !== b.setId) return a.setId.localeCompare(b.setId);
      return a.cardId.localeCompare(b.cardId);
    });
  } else {
    sorted.sort((a, b) => {
      if (a.setId !== b.setId) return a.setId.localeCompare(b.setId);
      return a.cardId.localeCompare(b.cardId);
    });
  }
  return sorted;
}

function formatEditionBreakdown(editions) {
  return Object.entries(editions)
    .sort(([a], [b]) => EDITION_ORDER.indexOf(a) - EDITION_ORDER.indexOf(b))
    .map(
      ([ed, count]) =>
        `${EDITION_ABBR[ed] || ed.charAt(0).toUpperCase()}${count}`,
    )
    .join(" ");
}

function buildCollectionGrid(pageCards) {
  if (!pageCards.length) return "No cards found.";

  const multiSet = new Set(pageCards.map((c) => c.setId)).size > 1;

  return pageCards
    .map((c) => {
      const idx = multiSet
        ? `${c.setId}-${String(getCardIndex(c.set, c.cardId)).padStart(2, "0")}`
        : `#${String(getCardIndex(c.set, c.cardId)).padStart(2, "0")}`;
      const editions = formatEditionBreakdown(c.editions);
      return `**${idx}** ${c.card.name} - ${titleCase(c.card.rarity)} - ${c.total} ${c.total === 1 ? "copy" : "copies"} (${editions})`;
    })
    .join("\n");
}

function getCardAllowedEditions(card) {
  if (card.editions?.length || card.event_editions?.length) {
    return [
      ...(card.editions || Object.keys(editionTable)),
      ...(card.event_editions || []),
    ];
  }
  return Object.keys(allEditions);
}

function ownsAllEditions(user, cardId, card) {
  const allowed = getCardAllowedEditions(card);
  const owned = user.collection?.[cardId] || {};
  return allowed.every((ed) => (owned[ed] || 0) > 0);
}

function calculateStats(user) {
  const stats = {
    total_cards: 0,
    unique_cards: 0,
    common_cards: 0,
    uncommon_cards: 0,
    rare_cards: 0,
    epic_cards: 0,
    legendary_cards: 0,
    basic_cards: 0,
    foil_cards: 0,
    gold_cards: 0,
    unpleasant_cards: 0,
    rainbow_cards: 0,
    trades_completed: user.trades_completed || 0,
  };

  for (const [cardId, editions] of Object.entries(user.collection || {})) {
    for (const [ed, count] of Object.entries(editions)) {
      stats.total_cards += count;
      if (ed === "basic") stats.basic_cards += count;
      if (ed === "foil") stats.foil_cards += count;
      if (ed === "gold") stats.gold_cards += count;
      if (ed === "unpleasant") stats.unpleasant_cards += count;
      if (ed === "rainbow") stats.rainbow_cards += count;
    }

    for (const sid of Object.keys(setsConfig)) {
      try {
        const set = resolveSet(sid);
        const card = set.cards[cardId];
        if (card) {
          if (card.rarity === "common")
            stats.common_cards += Object.values(editions).reduce(
              (a, b) => a + b,
              0,
            );
          if (card.rarity === "uncommon")
            stats.uncommon_cards += Object.values(editions).reduce(
              (a, b) => a + b,
              0,
            );
          if (card.rarity === "rare")
            stats.rare_cards += Object.values(editions).reduce(
              (a, b) => a + b,
              0,
            );
          if (card.rarity === "epic")
            stats.epic_cards += Object.values(editions).reduce(
              (a, b) => a + b,
              0,
            );
          if (card.rarity === "legendary")
            stats.legendary_cards += Object.values(editions).reduce(
              (a, b) => a + b,
              0,
            );
          break;
        }
      } catch {}
    }
  }
  stats.unique_cards = Object.keys(user.collection || {}).length;
  return stats;
}

function getAllTitles() {
  const all = [];
  for (const set of Object.values(setsConfig)) {
    if (set.titles) all.push(...set.titles);
  }
  return all;
}

function getTitleProgress(stats) {
  const allTitles = getAllTitles();
  const unlocked = allTitles.filter((t) => stats[t.stat] >= t.threshold);
  const currentTitle = unlocked.length
    ? unlocked[unlocked.length - 1].name
    : null;

  const next = allTitles.find((t) => stats[t.stat] < t.threshold);
  let nextTitle = null;
  let progress = 1;

  if (next) {
    nextTitle = next;
    progress = Math.min(stats[next.stat] / next.threshold, 1);
  }

  return { currentTitle, nextTitle, progress };
}

function buildProgressBar(value, total, length = 10) {
  const filled = Math.round((value / total) * length);
  return "█".repeat(filled) + "░".repeat(length - filled);
}

async function buildProfileEmbed(target, user) {
  const stats = calculateStats(user);
  const totalAcrossSets = Object.keys(setsConfig).reduce((sum, sid) => {
    try {
      return sum + getSetTotal(resolveSet(sid));
    } catch {
      return sum;
    }
  }, 0);

  const { currentTitle: highestTitle } = getTitleProgress(stats);
  const showTitle = user.title && user.title !== "none" ? user.title : null;
  const displayTitleObj = showTitle
    ? getAllTitles().find((t) => t.name === showTitle)
    : null;

  const embed = new EmbedBuilder()
    .setColor(parseInt(user.accent_color?.replace("#", ""), 16) || 0x2b2d31)
    .setAuthor({
      name: `${target.username}'s Card Profile`,
      iconURL: target.displayAvatarURL(),
    })
    .addFields({
      name: "Total Cards",
      value: String(stats.total_cards),
      inline: true,
    });

  const fieldsToAdd = [];
  if (user.stat1 && user.stat1 !== "none") {
    const s1name = STAT_NAMES[user.stat1] || user.stat1;
    fieldsToAdd.push({
      name: s1name,
      value: String(stats[user.stat1] || 0),
      inline: true,
    });
  }
  if (user.stat2 && user.stat2 !== "none") {
    const s2name = STAT_NAMES[user.stat2] || user.stat2;
    fieldsToAdd.push({
      name: s2name,
      value: String(stats[user.stat2] || 0),
      inline: true,
    });
  }
  if (fieldsToAdd.length) embed.addFields(fieldsToAdd);

  const bar = buildProgressBar(stats.unique_cards, totalAcrossSets);
  embed.addFields({
    name: "Collection Progress",
    value: `${bar} ${stats.unique_cards}/${totalAcrossSets} (${Math.round((stats.unique_cards / totalAcrossSets) * 100)}%)`,
    inline: false,
  });

  const descParts = [];
  if (user.bio) descParts.push(`**Bio**\n${user.bio}`);
  if (displayTitleObj) {
    descParts.push(
      `**Title**\n${displayTitleObj.name}\n-# ${displayTitleObj.description}`,
    );
  } else if (showTitle) {
    descParts.push(`**${showTitle}**`);
  }
  if (descParts.length) embed.setDescription(descParts.join("\n\n"));

  const files = [];
  const featured = getFeaturedCard(target.id);
  if (featured) {
    try {
      const fSet = resolveSet(featured.set_id);
      const fCard = fSet.cards[featured.card_id];
      const fSetName = setsConfig[featured.set_id]?.name || featured.set_id;
      const owned = user.collection?.[featured.card_id]?.[featured.edition] > 0;
      if (!owned) {
        setFeaturedCard(target.id, null, null, null);
        embed.addFields({
          name: "Featured Card",
          value: "No card featured yet.",
          inline: false,
        });
      } else if (fCard) {
        const fEdition = getEditionName(featured.edition);
        embed.addFields({
          name: "Featured Card",
          value: `**${fCard.name}** (${fEdition})\n${fSetName}`,
          inline: false,
        });
        if (fCard.art_url) {
          const featCardObj = {
            id: featured.card_id,
            edition: featured.edition,
            art_url: fCard.art_url,
          };
          const featImage = await renderCardImage(
            featCardObj,
            "featured",
            user,
            fSet,
          ).catch(() => null);
          if (featImage) {
            files.push(featImage);
            embed.setImage(`attachment://${featImage.name}`);
          } else {
            embed.setImage(fCard.art_url);
          }
        }
      }
    } catch {}
  } else {
    embed.addFields({
      name: "Featured Card",
      value:
        'No card featured yet. Use `/cards inspect` and click "Set as Featured".',
      inline: false,
    });
  }

  return { embed, files };
}

async function showProfileEditor(interaction) {
  const u = loadUser(interaction.user.id);
  const s = calculateStats(u);
  const { currentTitle } = getTitleProgress(s);
  const allTitles = getAllTitles();
  const unlocked = currentTitle
    ? allTitles.filter((t) => s[t.stat] >= t.threshold)
    : [];
  const titleOpts = [
    new StringSelectMenuOptionBuilder()
      .setLabel("None")
      .setValue("none")
      .setDefault(!u.title || u.title === "none"),
    ...unlocked.map((t) =>
      new StringSelectMenuOptionBuilder()
        .setLabel(t.name)
        .setValue(t.name)
        .setDefault(!u.title ? false : t.name === u.title),
    ),
  ];

  const statKeys = Object.keys(STAT_NAMES).filter(
    (k) => k !== "total_cards" && k !== "unique_cards",
  );
  const stat1Opts = [
    new StringSelectMenuOptionBuilder()
      .setLabel("None")
      .setValue("none")
      .setDefault(!u.stat1 || u.stat1 === "none"),
    ...statKeys.map((k) =>
      new StringSelectMenuOptionBuilder()
        .setLabel(STAT_NAMES[k])
        .setValue(k)
        .setDefault(k === u.stat1),
    ),
  ];
  const stat2Opts = [
    new StringSelectMenuOptionBuilder()
      .setLabel("None")
      .setValue("none")
      .setDefault(!u.stat2 || u.stat2 === "none"),
    ...statKeys.map((k) =>
      new StringSelectMenuOptionBuilder()
        .setLabel(STAT_NAMES[k])
        .setValue(k)
        .setDefault(k === u.stat2),
    ),
  ];

  const editRows = [];
  if (titleOpts.length) {
    editRows.push(
      new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId("edit-title")
          .setPlaceholder("Select title")
          .addOptions(titleOpts),
      ),
    );
  }
  editRows.push(
    new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId("edit-stat1")
        .setPlaceholder("Select stat 1")
        .addOptions(stat1Opts),
    ),
    new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId("edit-stat2")
        .setPlaceholder("Select stat 2")
        .addOptions(stat2Opts),
    ),
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("edit-bio-color")
        .setLabel("Bio / Color")
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId("edit-done")
        .setLabel("Done")
        .setStyle(ButtonStyle.Success),
    ),
  );

  const editMsg = await interaction.followUp({
    flags: 64,
    content:
      "**Edit Profile**\nSelect an unlocked title and two stats to feature! Click Bio/Colour for more customisation options!\nCheck your progress to the next title in /cards set!",
    components: editRows,
  });

  const collector = editMsg.createMessageComponentCollector({
    time: 120_000,
    filter: (i) => i.user.id === interaction.user.id,
  });

  collector.on("collect", async (i) => {
    try {
      const uu = loadUser(interaction.user.id);

      async function updateProfileMsg() {
        try {
          const u2 = loadUser(interaction.user.id);
          const profileReply = await interaction.fetchReply();
          const target = interaction.user;
          const { embed, files } = await buildProfileEmbed(target, u2);
          const editRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId("edit-profile-btn")
              .setLabel("Edit Profile")
              .setStyle(ButtonStyle.Secondary),
          );
          await profileReply.edit({
            embeds: [embed],
            files,
            components: [editRow],
          });
        } catch {}
      }

      if (i.customId === "edit-title") {
        uu.title = i.values[0];
        saveUser(uu);
        await i.deferUpdate();
        await updateProfileMsg();
      } else if (i.customId === "edit-stat1") {
        uu.stat1 = i.values[0];
        saveUser(uu);
        await i.deferUpdate();
        await updateProfileMsg();
      } else if (i.customId === "edit-stat2") {
        uu.stat2 = i.values[0];
        saveUser(uu);
        await i.deferUpdate();
        await updateProfileMsg();
      } else if (i.customId === "edit-bio-color") {
        const profileReply = await interaction.fetchReply();
        const modal = new ModalBuilder()
          .setCustomId(`edit-profile-modal-${profileReply.id}`)
          .setTitle("Bio & Color");
        modal.addComponents(
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId("bio")
              .setLabel("Bio")
              .setStyle(TextInputStyle.Paragraph)
              .setRequired(false)
              .setMaxLength(500)
              .setValue(uu.bio || ""),
          ),
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId("accent_color")
              .setLabel("Accent Color (hex)")
              .setStyle(TextInputStyle.Short)
              .setRequired(false)
              .setMaxLength(7)
              .setValue(uu.accent_color || "#2b2d31"),
          ),
        );
        await i.showModal(modal);
      } else if (i.customId === "edit-done") {
        await i.update({ content: "Profile saved!", components: [] });
        collector.stop();
      }
    } catch (e) {
      console.error(e);
    }
  });
}

async function checkAndAwardTitles(user) {
  const stats = calculateStats(user);
  const newlyUnlocked = [];

  for (const [setId, setConfig] of Object.entries(setsConfig)) {
    for (const title of setConfig.titles || []) {
      if (
        stats[title.stat] >= title.threshold &&
        !user.claimed_titles.includes(title.name)
      ) {
        user.claimed_titles.push(title.name);
        newlyUnlocked.push({ ...title, setId });
      }
    }
  }

  if (!newlyUnlocked.length) return [];

  for (const title of newlyUnlocked) {
    if (title.rewards) {
      for (const reward of title.rewards) {
        if (!user.packs[title.setId]) user.packs[title.setId] = {};
        if (!user.packs[title.setId][reward.type])
          user.packs[title.setId][reward.type] = 0;
        user.packs[title.setId][reward.type] += reward.amount;
      }
    }
  }
  saveUser(user);

  return newlyUnlocked.map((title) => {
    let text = `🏆 **Achievement Unlocked!**\n${title.description}`;
    if (title.rewards?.length) {
      const rewardLines = title.rewards.map((r) => {
        const packName = titleCase(getPackName(r.type));
        const pEmoji = packsConfig[r.type]?.emoji || "🎒";
        return `${r.amount}x ${pEmoji} ${packName}`;
      });
      text += `\n**Rewards**\n${rewardLines.join("\n")}`;
    }
    return text;
  });
}

async function openPackAndShow(interaction, { setId, packType, set, pack }) {
  const removed = removePack(interaction.user.id, setId, packType, 1);
  if (!removed) {
    await interaction.editReply({ content: "That pack could not be opened." });
    return;
  }

  const cards = openPack(
    set,
    packsConfig,
    editionTable,
    eventEditionTable,
    pack.cards_per_pack || 5,
    pack,
  );

  if (!cards.length) {
    addPack(interaction.user.id, setId, packType, 1);
    await interaction.editReply({
      content:
        "This pack did not contain any configured cards, so it was returned to you.",
    });
    return;
  }

  // Check for first-time uncommon+ pull (before addCards)
  let showRequestTip = false;
  try {
    const bpUser = loadBpUser(interaction.user.id);
    const isTutorialPack = bpUser && bpUser.tutorial_step === 2;
    if (!isTutorialPack) {
      const preUser = loadUser(interaction.user.id);
      for (const card of cards) {
        if (card.rarity == "uncommon") {
          const owned = preUser.collection[card.id];
          const total = owned
            ? Object.values(owned).reduce((a, b) => a + b, 0)
            : 0;
          if (total === 0) {
            showRequestTip = true;
            break;
          }
        }
      }
    }
  } catch {}

  const user = addCards(interaction.user.id, cards);

  // Tutorial step 3: opened a pack
  try {
    const bpUser = loadBpUser(interaction.user.id);
    if (bpUser && bpUser.tutorial_step === 2) {
      bpUser.tutorial_step = 3;
      saveBpUser(bpUser);
      interaction
        .followUp({
          content:
            "Great! Now rip it open and see what cards you've found! Then use `/cards inspect` to view your new cards and select one to feature on your profile!\nIf you want to skip straight to the pack summary, you can press 'Finished' at any time!\n\n-# (3/5) Complete this tutorial to earn 1x ⭐Premium Pack!",
          flags: 64,
        })
        .catch(() => {});
    }
  } catch {}

  const achievementMsgs = await checkAndAwardTitles(user).catch(() => []);

  if (showRequestTip) {
    interaction
      .followUp({
        content:
          "👀 **You got an uncommon card!**\n\nDid you know **you** can become a card in the next set? Use `/cards request` to submit your profile for one of our 20 uncommon cards or submit a Wikipedia article for one of the 64 uncommon ones in the next set!",
        flags: 64,
      })
      .catch(() => {});
  }

  const isGodPack = cards._godPack;

  const ids = {
    left: `cards-left-${interaction.id}`,
    right: `cards-right-${interaction.id}`,
    finished: `cards-finished-${interaction.id}`,
  };
  let currentIndex = 0;
  let opened = false;
  let currentContent = null;

  const firstEmbed = new EmbedBuilder()
    .setColor(isGodPack ? 0xff0000 : 0x2b2d31)
    .setTitle(`${getSetName(setId, set)}`)
    .setDescription(
      isGodPack
        ? "🌟 **GOD PACK!** 🌟\nEvery card is Rare+Gold or better!"
        : `Click **Open** to reveal your cards!`,
    );

  let coverImg;
  const setCfg = setsConfig[setId];
  if (setCfg?.pack_cover_url) {
    coverImg = await renderPackCoverImage(
      null,
      setCfg.pack_cover_url,
      pack,
      packType,
      interaction.id,
      isGodPack,
    ).catch(() => null);
  }
  if (coverImg) {
    firstEmbed.setImage(`attachment://${coverImg.name}`);
  }

  const desc = pack.description ? `\n${pack.description}` : "";
  const firstMessage = {
    content: `${pack.emoji || "🎒"} **${titleCase(getPackName(packType))}**${desc}${isGodPack ? " 🌟✨" : ""}`,
    embeds: [firstEmbed],
    components: [buildNavigationRow(0, cards.length, ids, false)],
  };
  if (coverImg) firstMessage.files = [coverImg];

  currentContent = firstMessage;
  const response = await interaction.editReply(firstMessage);
  const collector = response.createMessageComponentCollector({
    componentType: ComponentType.Button,
    time: 5 * 60 * 1000,
  });

  collector.on("collect", async (buttonInteraction) => {
    try {
      if (buttonInteraction.user.id !== interaction.user.id) {
        await buttonInteraction.reply({
          content:
            "Only the person who opened this pack can use these buttons.",
          flags: 64,
        });
        return;
      }

      await buttonInteraction.deferUpdate();

      if (buttonInteraction.customId === ids.finished && !opened) {
        opened = true;

        if (cards.length > 10) {
          await interaction.editReply(
            buildSummaryMessage(cards, set, setId, user, packType),
          );
          collector.stop("finished");
          return;
        }

        const cardMessage = await buildCardMessage(
          cards[0],
          set,
          setId,
          user,
          1,
        );
        await interaction.editReply({
          content: `**Card 1/${cards.length}**`,
          ...cardMessage,
          components: [buildNavigationRow(0, cards.length, ids, true)],
        });
        return;
      }

      if (!opened) return;

      if (buttonInteraction.customId === ids.left) {
        currentIndex = Math.max(0, currentIndex - 1);
      } else if (buttonInteraction.customId === ids.right) {
        currentIndex = Math.min(cards.length - 1, currentIndex + 1);
      } else if (buttonInteraction.customId === ids.finished) {
        await interaction.editReply(
          buildSummaryMessage(cards, set, setId, user, packType),
        );
        collector.stop("finished");
        return;
      }

      const cardMessage = await buildCardMessage(
        cards[currentIndex],
        set,
        setId,
        user,
        currentIndex + 1,
      );
      await interaction.editReply({
        content: `**Card ${currentIndex + 1}/${cards.length}**`,
        ...cardMessage,
        components: [buildNavigationRow(currentIndex, cards.length, ids, true)],
      });
    } catch (error) {
      console.error("Failed to update card viewer:", error);

      if (!buttonInteraction.replied && !buttonInteraction.deferred) {
        await buttonInteraction
          .reply({
            content: "That card view could not be updated.",
            flags: 64,
          })
          .catch(() => {});
      }
    }
  });

  collector.on("end", async (_, reason) => {
    if (achievementMsgs?.length) {
      await interaction
        .followUp({
          content: `${achievementMsgs.join("\n\n")}\n\n-# Run \`/cards profile\` to change your title!\n-# Run \`/cards inventory\` to inspect your owned packs!`,
          flags: 64,
        })
        .catch(() => {});
    }
    if (reason === "finished") return;
    try {
      const msg = await interaction.fetchReply();
      await msg.edit({ components: [] });
    } catch {}
  });
}

async function showCollection(interaction, target, user) {
  const ids = {
    left: `col-left-${interaction.id}`,
    right: `col-right-${interaction.id}`,
    sortChrono: `col-chrono-${interaction.id}`,
    sortRarest: `col-rarest-${interaction.id}`,
    sortQuantity: `col-quant-${interaction.id}`,
    sortHighest: `col-highest-${interaction.id}`,
  };
  let state = { page: 0, sortBy: "chronological" };

  function buildMessage() {
    const cards = sortCollectionCards(
      getCollectionCardList(user, null),
      state.sortBy,
    );
    const totalPages = Math.max(1, Math.ceil(cards.length / CARDS_PER_PAGE));
    state.page = Math.min(state.page, totalPages - 1);
    const pageCards = cards.slice(
      state.page * CARDS_PER_PAGE,
      (state.page + 1) * CARDS_PER_PAGE,
    );
    const totalUnique = Object.keys(user.collection || {}).length;
    const totalAll = Object.keys(setsConfig).reduce((sum, sid) => {
      try {
        return sum + getSetTotal(resolveSet(sid));
      } catch {
        return sum;
      }
    }, 0);

    const sortLabels = {
      chronological: "Chronological",
      rarest: "Rarest first",
      quantity: "Most copies",
      highest_edition: "Highest edition",
    };
    const sortLabel = sortLabels[state.sortBy] || state.sortBy;

    const embed = new EmbedBuilder()
      .setColor(0x2b2d31)
      .setAuthor({
        name: `${target.username}'s Card Collection`,
        iconURL: target.displayAvatarURL(),
      })
      .setDescription(buildCollectionGrid(pageCards))
      .setFooter({
        text: `Page ${state.page + 1}/${totalPages} · ${cards.length} owned · ${totalUnique}/${totalAll} unique · ${sortLabel}`,
      });

    const pageRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(ids.left)
        .setLabel("←")
        .setStyle(ButtonStyle.Primary)
        .setDisabled(state.page === 0),
      new ButtonBuilder()
        .setCustomId(ids.right)
        .setLabel("→")
        .setStyle(ButtonStyle.Primary)
        .setDisabled(state.page >= totalPages - 1),
    );

    const sortRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(ids.sortChrono)
        .setLabel("Chronological")
        .setStyle(
          state.sortBy === "chronological"
            ? ButtonStyle.Success
            : ButtonStyle.Secondary,
        )
        .setDisabled(state.sortBy === "chronological"),
      new ButtonBuilder()
        .setCustomId(ids.sortRarest)
        .setLabel("Rarest first")
        .setStyle(
          state.sortBy === "rarest"
            ? ButtonStyle.Success
            : ButtonStyle.Secondary,
        )
        .setDisabled(state.sortBy === "rarest"),
      new ButtonBuilder()
        .setCustomId(ids.sortQuantity)
        .setLabel("Most copies")
        .setStyle(
          state.sortBy === "quantity"
            ? ButtonStyle.Success
            : ButtonStyle.Secondary,
        )
        .setDisabled(state.sortBy === "quantity"),
      new ButtonBuilder()
        .setCustomId(ids.sortHighest)
        .setLabel("Highest edition")
        .setStyle(
          state.sortBy === "highest_edition"
            ? ButtonStyle.Success
            : ButtonStyle.Secondary,
        )
        .setDisabled(state.sortBy === "highest_edition"),
    );

    return {
      embeds: [embed],
      components: [pageRow, sortRow],
      files: [],
      attachments: [],
    };
  }

  const response = await interaction.editReply(buildMessage());
  const collector = response.createMessageComponentCollector({
    time: 5 * 60 * 1000,
  });

  collector.on("collect", async (i) => {
    try {
      if (i.user.id !== interaction.user.id) {
        await i.reply({
          content: "This is not your command! Hands off!",
          flags: 64,
        });
        return;
      }
      if (i.customId === ids.left) {
        state.page = Math.max(0, state.page - 1);
      } else if (i.customId === ids.right) {
        state.page++;
      } else if (i.customId === ids.sortChrono) {
        state.sortBy = "chronological";
        state.page = 0;
      } else if (i.customId === ids.sortRarest) {
        state.sortBy = "rarest";
        state.page = 0;
      } else if (i.customId === ids.sortQuantity) {
        state.sortBy = "quantity";
        state.page = 0;
      } else if (i.customId === ids.sortHighest) {
        state.sortBy = "highest_edition";
        state.page = 0;
      }
      await i.update(buildMessage());
    } catch (err) {
      console.error("Collection update failed:", err);
      if (!i.replied && !i.deferred)
        await i
          .reply({ content: "Failed to update.", flags: 64 })
          .catch(() => {});
    }
  });

  collector.on("end", async () => {
    const msg = buildMessage();
    await interaction.editReply({ ...msg, components: [] }).catch(() => {});
  });
}

async function inspectCard(interaction) {
  await interaction.deferReply();
  const user = loadUser(interaction.user.id);

  const ownedSetIds = Object.keys(setsConfig)
    .filter((sid) => {
      try {
        const set = resolveSet(sid);
        return Object.keys(set.cards).some((cid) => user.collection[cid]);
      } catch {
        return false;
      }
    })
    .sort((a, b) => b.localeCompare(a));

  if (!ownedSetIds.length) {
    await interaction.editReply({ content: "You don't own any cards yet." });
    return;
  }

  const selIds = {
    select: `inspect-set-${interaction.id}`,
  };

  function buildSetSelectionView() {
    const setListDesc = ownedSetIds
      .map((sid) => {
        const name = setsConfig[sid]?.name || sid;
        const emoji = setsConfig[sid]?.emoji || "";
        return `${emoji} **${name}**`;
      })
      .join("\n");

    return {
      embeds: [
        new EmbedBuilder()
          .setColor(0x2b2d31)
          .setTitle("🔍 Inspect a Card")
          .setDescription(`Select a set:\n\n${setListDesc}`),
      ],
      components: [
        new ActionRowBuilder().addComponents(
          new StringSelectMenuBuilder()
            .setCustomId(selIds.select)
            .setPlaceholder("Choose a set")
            .addOptions(
              ownedSetIds.map((sid) => ({
                label: setsConfig[sid]?.name || sid,
                value: sid,
                emoji: setsConfig[sid]?.emoji,
              })),
            ),
        ),
      ],
    };
  }

  try {
    let inspectMsg = await interaction.editReply(buildSetSelectionView());

    while (true) {
      // Step 1: Wait for set selection
      const setSel = await inspectMsg
        .awaitMessageComponent({
          filter: (i) =>
            i.user.id === interaction.user.id && i.customId === selIds.select,
          time: 60000,
        })
        .catch(() => null);
      if (!setSel) {
        await interaction.editReply({ components: [] }).catch(() => {});
        return;
      }

      const selectedSetId = setSel.values[0];
      await setSel.deferUpdate();

      const set = resolveSet(selectedSetId);
      const ownedCardIds = Object.keys(set.cards).filter(
        (cid) => user.collection[cid],
      );
      if (!ownedCardIds.length) {
        await interaction.editReply({
          content: `You don't own any cards in ${getSetName(selectedSetId, set)}.`,
        });
        return;
      }

      const CARDS_PER_LIST_PAGE = 20;
      const cardListIds = {
        select: `pick-card-${interaction.id}`,
        prev: `cl-prev-${interaction.id}`,
        next: `cl-next-${interaction.id}`,
        back: `cl-back-${interaction.id}`,
      };
      const inspectIds = {
        rarity: `insp-r-${interaction.id}`,
        back: `insp-b-${interaction.id}`,
        prev: `insp-p-${interaction.id}`,
        next: `insp-n-${interaction.id}`,
        feat: `insp-f-${interaction.id}`,
      };

      function ownedEditionsForCard(cid) {
        const card = set.cards[cid];
        return card ? getOwnedEditions(user, cid, card) : [];
      }

      function buildCardListView(page) {
        const totalListPages = Math.ceil(
          ownedCardIds.length / CARDS_PER_LIST_PAGE,
        );
        const start = page * CARDS_PER_LIST_PAGE;
        const pageCards = ownedCardIds.slice(
          start,
          start + CARDS_PER_LIST_PAGE,
        );
        const lines = pageCards.map((cid) => {
          const c = set.cards[cid];
          const owned = user.collection[cid];
          const ownedStr = owned
            ? Object.keys(owned).map(getEditionName).join(", ")
            : "";
          return `\`${getCardIndex(set, cid)}.\` **${c.name}** - ${ownedStr || "Unowned"}`;
        });
        const desc =
          totalListPages > 1
            ? `${lines.join("\n")}\n\n*Page ${page + 1}/${totalListPages}*`
            : lines.join("\n");
        return {
          embeds: [
            new EmbedBuilder()
              .setColor(0x2b2d31)
              .setTitle(`🔍 ${getSetName(selectedSetId, set)}`)
              .setDescription(desc)
              .setImage(null),
          ],
          components: [
            new ActionRowBuilder().addComponents(
              new StringSelectMenuBuilder()
                .setCustomId(cardListIds.select)
                .setPlaceholder("Select a card to inspect")
                .addOptions(
                  pageCards.map((cid) =>
                    new StringSelectMenuOptionBuilder()
                      .setLabel(set.cards[cid].name)
                      .setValue(cid),
                  ),
                ),
            ),
            new ActionRowBuilder().addComponents(
              new ButtonBuilder()
                .setCustomId(cardListIds.back)
                .setLabel("Back")
                .setStyle(ButtonStyle.Secondary),
              ...(totalListPages > 1
                ? [
                    new ButtonBuilder()
                      .setCustomId(cardListIds.prev)
                      .setLabel("←")
                      .setStyle(ButtonStyle.Secondary)
                      .setDisabled(page <= 0),
                    new ButtonBuilder()
                      .setCustomId(cardListIds.next)
                      .setLabel("→")
                      .setStyle(ButtonStyle.Secondary)
                      .setDisabled(page >= totalListPages - 1),
                  ]
                : []),
            ),
          ],
        };
      }

      async function buildCardViewPage(cid, edition) {
        const ed = edition || ownedEditionsForCard(cid)[0] || null;
        const card = set.cards[cid];
        const inspectObj = { id: cid, ...card, edition: ed };
        const ownedEd = ownedEditionsForCard(cid);
        const idx = ownedCardIds.indexOf(cid);
        return {
          ...(await buildCardMessage(
            inspectObj,
            set,
            selectedSetId,
            user,
            `insp-${cid}-${ed}`,
          )),
          components: [
            buildRaritySelect(card, ed, inspectIds.rarity, ownedEd),
            new ActionRowBuilder().addComponents(
              new ButtonBuilder()
                .setCustomId(inspectIds.back)
                .setLabel("Back")
                .setStyle(ButtonStyle.Secondary),
              new ButtonBuilder()
                .setCustomId(inspectIds.prev)
                .setLabel("←")
                .setStyle(ButtonStyle.Primary)
                .setDisabled(idx <= 0),
              new ButtonBuilder()
                .setCustomId(inspectIds.next)
                .setLabel("→")
                .setStyle(ButtonStyle.Primary)
                .setDisabled(idx >= ownedCardIds.length - 1),
              new ButtonBuilder()
                .setCustomId(inspectIds.feat)
                .setLabel("Set as Featured")
                .setStyle(ButtonStyle.Secondary),
            ),
          ],
        };
      }

      let currentCardIdx = 0;
      let listPage = 0;
      let selectedEdition = ownedEditionsForCard(ownedCardIds[0])[0] || null;

      // Step 2: Show card list
      inspectMsg = await interaction.editReply(buildCardListView(listPage));

      let goBackToSets = false;
      while (!goBackToSets) {
        const sel = await inspectMsg
          .awaitMessageComponent({
            filter: (i) =>
              i.user.id === interaction.user.id &&
              (Object.values(cardListIds).includes(i.customId) ||
                Object.values(inspectIds).includes(i.customId)),
            time: 5 * 60 * 1000,
          })
          .catch(() => null);
        if (!sel) {
          await interaction.editReply({ components: [] }).catch(() => {});
          return;
        }

        // Card list buttons
        if (sel.customId === cardListIds.back) {
          inspectMsg = await interaction.editReply({
            ...buildSetSelectionView(),
            files: [],
          });
          goBackToSets = true;
          break;
        }
        if (sel.customId === cardListIds.prev) {
          listPage--;
          await sel.update(buildCardListView(listPage));
          continue;
        }
        if (sel.customId === cardListIds.next) {
          listPage++;
          await sel.update(buildCardListView(listPage));
          continue;
        }
        if (sel.customId === cardListIds.select) {
          currentCardIdx = ownedCardIds.indexOf(sel.values[0]);
          selectedEdition =
            ownedEditionsForCard(ownedCardIds[currentCardIdx])[0] || null;
          await sel.deferUpdate();
          const cardView = await buildCardViewPage(
            ownedCardIds[currentCardIdx],
            selectedEdition,
          );
          inspectMsg = await interaction.editReply(cardView);

          // Step 3: Card inspection loop
          while (true) {
            const inspSel = await inspectMsg
              .awaitMessageComponent({
                filter: (i) =>
                  i.user.id === interaction.user.id &&
                  Object.values(inspectIds).includes(i.customId),
                time: 5 * 60 * 1000,
              })
              .catch(() => null);
            if (!inspSel) {
              await interaction
                .editReply({ components: [], files: [] })
                .catch(() => {});
              return;
            }
            if (inspSel.customId === inspectIds.back) {
              listPage = 0;
              await inspSel.update({
                ...buildCardListView(listPage),
                files: [],
              });
              break;
            }
            if (inspSel.customId === inspectIds.prev) {
              currentCardIdx--;
              selectedEdition =
                ownedEditionsForCard(ownedCardIds[currentCardIdx])[0] || null;
              await inspSel.deferUpdate();
              const cardView = await buildCardViewPage(
                ownedCardIds[currentCardIdx],
                selectedEdition,
              );
              inspectMsg = await interaction.editReply(cardView);
              continue;
            }
            if (inspSel.customId === inspectIds.next) {
              currentCardIdx++;
              selectedEdition =
                ownedEditionsForCard(ownedCardIds[currentCardIdx])[0] || null;
              await inspSel.deferUpdate();
              const cardView = await buildCardViewPage(
                ownedCardIds[currentCardIdx],
                selectedEdition,
              );
              inspectMsg = await interaction.editReply(cardView);
              continue;
            }
            if (inspSel.customId === inspectIds.rarity) {
              selectedEdition = inspSel.values[0];
              await inspSel.deferUpdate();
              const cardView = await buildCardViewPage(
                ownedCardIds[currentCardIdx],
                selectedEdition,
              );
              inspectMsg = await interaction.editReply(cardView);
              continue;
            }
            if (inspSel.customId === inspectIds.feat) {
              setFeaturedCard(
                interaction.user.id,
                selectedSetId,
                ownedCardIds[currentCardIdx],
                selectedEdition,
              );
              await inspSel.update({
                content: "Featured card updated!",
                embeds: [],
                components: [],
                files: [],
                flags: 64,
              });
              return;
            }
          }
        }
      }
    }
  } catch (err) {
    console.error("Inspect error:", err);
    await interaction
      .editReply({
        content: "Inspect cancelled due to an error or timeout",
        components: [],
        files: [],
      })
      .catch(() => {});
  }
}

async function showSet(interaction, setId, target, user) {
  const set = resolveSet(setId);
  const allCards = Object.entries(set.cards);
  const totalPages = Math.ceil(allCards.length / CARDS_PER_SET_PAGE);

  const ids = {
    left: `set-left-${interaction.id}`,
    right: `set-right-${interaction.id}`,
    achievements: `ach-${interaction.id}`,
  };
  let page = 0;
  let showingAchievements = false;

  function buildAchievementsEmbed() {
    const setTitles = setsConfig[setId]?.titles || [];
    const showStats = calculateStats(user);
    const lines = setTitles.map((t) => {
      const unlocked = showStats[t.stat] >= t.threshold;
      const bar = buildProgressBar(
        Math.min(showStats[t.stat], t.threshold),
        t.threshold,
      );
      const pct = Math.round(
        Math.min(showStats[t.stat] / t.threshold, 1) * 100,
      );
      const rewardStr = t.rewards?.length
        ? t.rewards
            .map((r) => {
              const pEmoji = packsConfig[r.type]?.emoji || "🎒";
              const pName = titleCase(getPackName(r.type));
              return `${r.amount}x ${pEmoji} ${pName}`;
            })
            .join(" + ")
        : "";
      const rewardLine = rewardStr ? `▸ Rewards: ${rewardStr}` : "";
      return `${unlocked ? "✅" : "⬜"} **${t.name}**\n${t.description || ""}\n${bar} ${showStats[t.stat]}/${t.threshold} (${pct}%)\n${rewardLine}`.trim();
    });

    return {
      embeds: [
        new EmbedBuilder()
          .setTitle(`${getSetName(setId, set)} - Achievements`)
          .setDescription(lines.join("\n\n")),
      ],
    };
  }

  function buildPage(pageIndex) {
    const stats = getCompletionStats(user, set);
    const start = pageIndex * CARDS_PER_SET_PAGE;
    const chunk = allCards.slice(start, start + CARDS_PER_SET_PAGE);

    const lines = chunk.map(([cardId, card]) => {
      const owned = user.collection?.[cardId];
      const ownedEditions = owned
        ? Object.keys(owned).map(getEditionName).join(", ")
        : "";
      const allOwned = ownsAllEditions(user, cardId, card);
      const status = owned
        ? allOwned
          ? `⭐ ${ownedEditions}`
          : `✅ ${ownedEditions}`
        : "❌ Unowned";
      return `\`${getCardIndex(set, cardId)}.\` **${card.name}** - ${titleCase(card.rarity)}\n${status}`;
    });

    const embed = new EmbedBuilder()
      .setTitle(`${getSetName(setId, set)} - Full Set`)
      .setDescription(lines.join("\n"))
      .setFooter({
        text: `${stats.owned}/${stats.total} owned - Page ${pageIndex + 1}/${totalPages}`,
      });

    const navRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(ids.left)
        .setLabel("←")
        .setStyle(ButtonStyle.Primary)
        .setDisabled(pageIndex === 0),
      new ButtonBuilder()
        .setCustomId(ids.right)
        .setLabel("→")
        .setStyle(ButtonStyle.Primary)
        .setDisabled(pageIndex >= totalPages - 1),
    );

    const achRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(ids.achievements)
        .setLabel("Achievements")
        .setStyle(ButtonStyle.Secondary),
    );

    return {
      embeds: [embed],
      components: totalPages > 1 ? [navRow, achRow] : [achRow],
    };
  }

  const msg = await interaction.editReply(buildPage(0));
  const collector = msg.createMessageComponentCollector({
    componentType: ComponentType.Button,
    time: 5 * 60 * 1000,
  });

  handleSetCollector(
    interaction,
    msg,
    collector,
    ids,
    buildPage,
    buildAchievementsEmbed,
    page,
    totalPages,
  );
}

function handleSetCollector(
  interaction,
  msg,
  collector,
  ids,
  buildPage,
  buildAchievementsEmbed,
  page,
  totalPages,
) {
  collector.on("collect", async (i) => {
    try {
      if (i.customId === ids.left) {
        page = Math.max(0, page - 1);
        await i.update(buildPage(page));
      } else if (i.customId === ids.right) {
        page = Math.min(totalPages - 1, page + 1);
        await i.update(buildPage(page));
      } else if (i.customId === ids.achievements) {
        await i.reply({ ...buildAchievementsEmbed(), flags: 64 });
      }
    } catch (err) {
      console.error("Set update failed:", err);
      if (!i.replied && !i.deferred)
        await i
          .reply({ content: "Failed to update.", flags: 64 })
          .catch(() => {});
    }
  });

  collector.on("end", async () => {
    await interaction
      .editReply({ ...buildPage(page), components: [] })
      .catch(() => {});
  });
}

// === TRADING SYSTEM ===

const activeTrades = new Map();

function getTradeId(a, b) {
  return [a, b].sort().join(":");
}

const CARD_SET_LOOKUP = {};
(function buildCardSetLookup() {
  for (const sid of Object.keys(setsConfig)) {
    try {
      const set = resolveSet(sid);
      for (const cid of Object.keys(set.cards)) {
        CARD_SET_LOOKUP[cid] = sid;
      }
    } catch {}
  }
})();

function getRemainingOfferableCardsGrouped(user, offeredCards) {
  const offeredCounts = {};
  for (const { cardId, edition } of offeredCards) {
    const key = `${cardId}:${edition}`;
    offeredCounts[key] = (offeredCounts[key] || 0) + 1;
  }

  const cardMap = new Map();
  for (const [cardId, editions] of Object.entries(user.collection || {})) {
    const availableEditions = [];
    for (const [edition, count] of Object.entries(editions)) {
      const key = `${cardId}:${edition}`;
      const remaining = count - (offeredCounts[key] || 0);
      if (remaining > 0) availableEditions.push(edition);
    }
    if (!availableEditions.length) continue;

    const setId = CARD_SET_LOOKUP[cardId];
    if (!setId) continue;

    const set = resolveSet(setId);
    const card = set.cards[cardId];
    if (card) {
      cardMap.set(cardId, { cardId, card, setId, editions: availableEditions });
    }
  }
  return [...cardMap.values()];
}

function getOfferedCardCounts(offeredCards) {
  const counts = {};
  for (const { cardId, edition } of offeredCards) {
    const key = `${cardId}:${edition}`;
    counts[key] = (counts[key] || 0) + 1;
  }
  return counts;
}

function buildTradeEmbed(trade, initiatorName, targetName) {
  const formatOffer = (cards) => {
    if (!cards.length) return "No cards added yet.";
    const counts = getOfferedCardCounts(cards);
    return Object.entries(counts)
      .map(([key, count]) => {
        const [cardId, edition] = key.split(":");
        const setId = CARD_SET_LOOKUP[cardId];
        if (!setId) return `- ${cardId} (${getEditionName(edition)})`;
        const set = resolveSet(setId);
        const card = set.cards[cardId];
        const name = card ? card.name : cardId;
        const idx = card ? getCardIndex(set, cardId) : "?";
        return `- **${name}** #${idx} ${getEditionName(edition)}${count > 1 ? ` x${count}` : ""}`;
      })
      .join("\n");
  };

  const iStatus = trade.initiatorReady ? "✅ Ready" : "⏳ Pending";
  const tStatus = trade.targetReady ? "✅ Ready" : "⏳ Pending";

  return new EmbedBuilder()
    .setColor(0x2b2d31)
    .setTitle("🔄 Card Trade")
    .setDescription(
      `Trade between **${initiatorName || trade.initiatorId}** and **${targetName || trade.targetId}**`,
    )
    .addFields(
      {
        name: `${initiatorName || trade.initiatorId}'s Offer - ${iStatus}`,
        value: formatOffer(trade.initiatorCards),
        inline: true,
      },
      {
        name: `${targetName || trade.targetId}'s Offer - ${tStatus}`,
        value: formatOffer(trade.targetCards),
        inline: true,
      },
    );
}

const TRADE_BUTTONS = {
  add: "trade-add",
  remove: "trade-remove",
  ready: "trade-ready",
  cancel: "trade-cancel",
};

function buildTradeComponents(tradeId) {
  const safeId = tradeId.replace(/[^a-z0-9]/gi, "_");
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`${TRADE_BUTTONS.add}-${safeId}`)
        .setLabel("➕ Add Cards")
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId(`${TRADE_BUTTONS.remove}-${safeId}`)
        .setLabel("❌ Remove Card")
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(`${TRADE_BUTTONS.ready}-${safeId}`)
        .setLabel("✅ Ready")
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId(`${TRADE_BUTTONS.cancel}-${safeId}`)
        .setLabel("🚫 Cancel")
        .setStyle(ButtonStyle.Danger),
    ),
  ];
}

function buildCardPickerMessage(userId, tradeId, page) {
  const user = loadUser(userId);
  const trade = activeTrades.get(tradeId);
  if (!trade) return null;

  const isInitiator = userId === trade.initiatorId;
  const offered = isInitiator ? trade.initiatorCards : trade.targetCards;
  const available = getRemainingOfferableCardsGrouped(user, offered);

  if (!available.length) {
    return {
      content: "You have no cards available to trade.",
      embeds: [],
      components: [],
      ephemeral: true,
    };
  }

  const perPage = 20;
  const totalPages = Math.ceil(available.length / perPage);
  const start = page * perPage;
  const pageItems = available.slice(start, start + perPage);

  const safeId = tradeId.replace(/[^a-z0-9]/gi, "_");

  const options = pageItems.map((item) => {
    const editionInfo =
      item.editions.length > 1
        ? `${item.editions.length} editions`
        : getEditionName(item.editions[0]);
    return new StringSelectMenuOptionBuilder()
      .setLabel(`${item.card.name} (${editionInfo})`)
      .setDescription(
        `#${getCardIndex(resolveSet(item.setId), item.cardId)} - ${titleCase(item.card.rarity)}`,
      )
      .setValue(item.cardId);
  });

  const selectId = `trade-select-${safeId}`;
  const prevId = `trade-prev-${safeId}`;
  const nextId = `trade-next-${safeId}`;
  const doneId = `trade-done-${safeId}`;

  return {
    content:
      totalPages > 1
        ? `**Select a card to add** - Page ${page + 1}/${totalPages}`
        : "**Select a card to add:**",
    embeds: [],
    components: [
      new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId(selectId)
          .setPlaceholder("Choose a card...")
          .addOptions(options),
      ),
      new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(prevId)
          .setLabel("← Previous")
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(page <= 0),
        new ButtonBuilder()
          .setCustomId(nextId)
          .setLabel("Next →")
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(page >= totalPages - 1),
        new ButtonBuilder()
          .setCustomId(doneId)
          .setLabel("Done")
          .setStyle(ButtonStyle.Success),
      ),
    ],
    ephemeral: true,
  };
}

function buildEditionPickerMessage(userId, tradeId, cardId, editions) {
  const setId = CARD_SET_LOOKUP[cardId];
  let cardName = cardId;
  if (setId) {
    const set = resolveSet(setId);
    const card = set.cards[cardId];
    if (card) cardName = card.name;
  }

  const safeId = tradeId.replace(/[^a-z0-9]/gi, "_");

  const options = editions.map((ed) =>
    new StringSelectMenuOptionBuilder()
      .setLabel(getEditionName(ed))
      .setValue(`${cardId}:${ed}`),
  );

  const selectId = `trade-ed-select-${safeId}`;
  const backId = `trade-ed-back-${safeId}`;

  return {
    content: `**${cardName}** - Pick an edition:`,
    embeds: [],
    components: [
      new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId(selectId)
          .setPlaceholder("Choose an edition...")
          .addOptions(options),
      ),
      new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(backId)
          .setLabel("← Back")
          .setStyle(ButtonStyle.Secondary),
      ),
    ],
    ephemeral: true,
  };
}

function buildRemovePickerMessage(userId, tradeId) {
  const trade = activeTrades.get(tradeId);
  if (!trade) return null;

  const isInitiator = userId === trade.initiatorId;
  const offered = isInitiator ? trade.initiatorCards : trade.targetCards;

  if (!offered.length) {
    return {
      content: "You haven't added any cards to your offer yet.",
      embeds: [],
      components: [],
      flags: 64,
    };
  }

  const counts = getOfferedCardCounts(offered);
  const options = Object.entries(counts).map(([key, count]) => {
    const [cardId, edition] = key.split(":");
    const setId = CARD_SET_LOOKUP[cardId];
    let label = cardId;
    if (setId) {
      const set = resolveSet(setId);
      const card = set.cards[cardId];
      label = card ? card.name : cardId;
    }
    return new StringSelectMenuOptionBuilder()
      .setLabel(
        `${label} (${getEditionName(edition)})${count > 1 ? ` x${count}` : ""}`,
      )
      .setValue(key);
  });

  const selectId = `trade-rem-select-${tradeId.replace(/[^a-z0-9]/gi, "_")}`;
  const doneId = `trade-rem-done-${tradeId.replace(/[^a-z0-9]/gi, "_")}`;

  return {
    content: "**Select a card to remove from your offer:**",
    embeds: [],
    components: [
      new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId(selectId)
          .setPlaceholder("Choose a card to remove...")
          .addOptions(options),
      ),
      new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(doneId)
          .setLabel("Done")
          .setStyle(ButtonStyle.Success),
      ),
    ],
    flags: 64,
  };
}

async function updateTradeMessage(interaction, trade, tradeId) {
  try {
    const iUser = await interaction.client.users
      .fetch(trade.initiatorId)
      .catch(() => null);
    const tUser = await interaction.client.users
      .fetch(trade.targetId)
      .catch(() => null);
    await interaction.editReply({
      embeds: [buildTradeEmbed(trade, iUser?.displayName, tUser?.displayName)],
      components: buildTradeComponents(tradeId),
    });
  } catch {}
}

function endTrade(tradeId, reason = "cancelled") {
  const trade = activeTrades.get(tradeId);
  if (!trade) return;
  if (trade._timeout) clearTimeout(trade._timeout);
  activeTrades.delete(tradeId);
}

async function handleTrade(interaction) {
  const target = interaction.options.getUser("user");

  if (target.id === interaction.user.id) {
    await interaction.reply({
      content: "You can't trade with yourself.",
      flags: 64,
    });
    return;
  }
  if (target.bot) {
    await interaction.reply({
      content: "You can't trade with a bot.",
      flags: 64,
    });
    return;
  }

  const tradeId = getTradeId(interaction.user.id, target.id);

  if (activeTrades.has(tradeId)) {
    await interaction.reply({
      content: "A trade is already in progress between you two.",
      flags: 64,
    });
    return;
  }

  const initiatorUser = loadUser(interaction.user.id);
  if (Object.keys(initiatorUser.collection || {}).length === 0) {
    await interaction.reply({
      content: "You don't have any cards to trade.",
      flags: 64,
    });
    return;
  }

  const targetUser = loadUser(target.id);
  if (Object.keys(targetUser.collection || {}).length === 0) {
    await interaction.reply({
      content: "That user doesn't have any cards to trade.",
      flags: 64,
    });
    return;
  }

  await interaction.deferReply();

  const trade = {
    initiatorId: interaction.user.id,
    targetId: target.id,
    initiatorCards: [],
    targetCards: [],
    initiatorReady: false,
    targetReady: false,
    tradeId,
    lastTargetInteraction: null,
  };

  activeTrades.set(tradeId, trade);

  trade._timeout = setTimeout(
    () => {
      const t = activeTrades.get(tradeId);
      if (t) {
        endTrade(tradeId, "timeout");
        try {
          interaction
            .editReply({
              content: "Trade timed out and has been cancelled.",
              embeds: [],
              components: [],
            })
            .catch(() => {});
        } catch {}
      }
    },
    10 * 60 * 1000,
  );

  const msg = await interaction.editReply({
    content: `🔄 Trade started between ${interaction.user} and ${target}!`,
    embeds: [
      buildTradeEmbed(trade, interaction.user.displayName, target.displayName),
    ],
    components: buildTradeComponents(tradeId),
  });

  const safeId = tradeId.replace(/[^a-z0-9]/gi, "_");
  const collector = msg.createMessageComponentCollector({
    time: 10 * 60 * 1000,
  });

  collector.on("collect", async (i) => {
    try {
      const currentTrade = activeTrades.get(tradeId);
      if (!currentTrade) {
        await i.reply({
          content: "This trade is no longer active.",
          flags: 64,
        });
        return;
      }

      if (
        i.user.id !== currentTrade.initiatorId &&
        i.user.id !== currentTrade.targetId
      ) {
        await i.reply({ content: "You're not part of this trade.", flags: 64 });
        return;
      }

      const isInitiator = i.user.id === currentTrade.initiatorId;
      if (!isInitiator) currentTrade.lastTargetInteraction = i;

      if (i.customId === `${TRADE_BUTTONS.add}-${safeId}`) {
        await i.deferUpdate();

        let pickPage = 0;
        const pickerMsg = await i.followUp(
          buildCardPickerMessage(i.user.id, tradeId, pickPage),
        );

        const pickerFilter = (ci) =>
          ci.user.id === i.user.id &&
          (ci.customId.startsWith("trade-select-") ||
            ci.customId.startsWith("trade-prev-") ||
            ci.customId.startsWith("trade-next-") ||
            ci.customId.startsWith("trade-done-") ||
            ci.customId.startsWith("trade-ed-select-") ||
            ci.customId.startsWith("trade-ed-back-"));

        let picking = true;
        while (picking) {
          const ci = await pickerMsg
            .awaitMessageComponent({ filter: pickerFilter, time: 120000 })
            .catch(() => null);
          if (!ci) break;

          if (ci.customId.startsWith("trade-prev-")) {
            pickPage--;
            await ci.update(
              buildCardPickerMessage(i.user.id, tradeId, pickPage),
            );
            continue;
          }
          if (ci.customId.startsWith("trade-next-")) {
            pickPage++;
            await ci.update(
              buildCardPickerMessage(i.user.id, tradeId, pickPage),
            );
            continue;
          }
          if (ci.customId.startsWith("trade-done-")) {
            await ci.update({
              content: "Selection complete!",
              embeds: [],
              components: [],
            });
            picking = false;
            break;
          }
          if (ci.customId.startsWith("trade-select-")) {
            const selectedCardId = ci.values[0];

            // Find card and its available editions
            const userData = loadUser(i.user.id);
            const t = activeTrades.get(tradeId);
            if (!t) {
              await ci.reply({ content: "Trade no longer active.", flags: 64 });
              picking = false;
              break;
            }
            const offered = isInitiator ? t.initiatorCards : t.targetCards;
            const grouped = getRemainingOfferableCardsGrouped(
              userData,
              offered,
            );
            const match = grouped.find((g) => g.cardId === selectedCardId);
            if (!match) {
              await ci.reply({
                content: "That card is no longer available.",
                flags: 64,
              });
              continue;
            }

            if (match.editions.length === 1) {
              // Single edition - add directly
              if (isInitiator) {
                t.initiatorCards.push({
                  cardId: selectedCardId,
                  edition: match.editions[0],
                });
              } else {
                t.targetCards.push({
                  cardId: selectedCardId,
                  edition: match.editions[0],
                });
              }
              if (t.initiatorReady || t.targetReady) {
                t.initiatorReady = false;
                t.targetReady = false;
              }
              await ci.deferUpdate();
              await updateTradeMessage(interaction, t, tradeId);
              await ci.editReply(
                buildCardPickerMessage(i.user.id, tradeId, pickPage),
              );
            } else {
              // Multiple editions - show edition picker
              await ci.deferUpdate();
              const edMsg = await ci.followUp(
                buildEditionPickerMessage(
                  i.user.id,
                  tradeId,
                  selectedCardId,
                  match.editions,
                ),
              );
              const edPick = await edMsg
                .awaitMessageComponent({
                  filter: (ci2) =>
                    ci2.user.id === i.user.id &&
                    (ci2.customId.startsWith("trade-ed-select-") ||
                      ci2.customId.startsWith("trade-ed-back-")),
                  time: 120000,
                })
                .catch(() => null);
              if (!edPick) continue;
              if (edPick.customId.startsWith("trade-ed-back-")) {
                await edPick.update({
                  content: "Cancelled.",
                  embeds: [],
                  components: [],
                });
                continue;
              }
              if (edPick.customId.startsWith("trade-ed-select-")) {
                const val = edPick.values[0];
                const [, edition] = val.split(":");
                const t2 = activeTrades.get(tradeId);
                if (!t2) {
                  await edPick.reply({
                    content: "Trade no longer active.",
                    flags: 64,
                  });
                  picking = false;
                  break;
                }
                if (isInitiator) {
                  t2.initiatorCards.push({ cardId: selectedCardId, edition });
                } else {
                  t2.targetCards.push({ cardId: selectedCardId, edition });
                }
                if (t2.initiatorReady || t2.targetReady) {
                  t2.initiatorReady = false;
                  t2.targetReady = false;
                }
                await edPick.deferUpdate();
                await updateTradeMessage(interaction, t2, tradeId);
                await edPick.editReply({
                  content: `Added **${match.card.name}** (${getEditionName(edition)})!`,
                  embeds: [],
                  components: [],
                });
                await ci.editReply(
                  buildCardPickerMessage(i.user.id, tradeId, pickPage),
                );
              }
            }
          }
        }
        return;
      }

      if (i.customId === `${TRADE_BUTTONS.remove}-${safeId}`) {
        await i.deferUpdate();
        const remMsg = await i.followUp(
          buildRemovePickerMessage(i.user.id, tradeId),
        );

        const remFilter = (ci) =>
          ci.user.id === i.user.id &&
          (ci.customId.startsWith("trade-rem-select-") ||
            ci.customId.startsWith("trade-rem-done-"));

        let removing = true;
        while (removing) {
          const ci = await remMsg
            .awaitMessageComponent({ filter: remFilter, time: 120000 })
            .catch(() => null);
          if (!ci) break;

          if (ci.customId.startsWith("trade-rem-done-")) {
            await ci.update({ content: "Done.", embeds: [], components: [] });
            removing = false;
            break;
          }
          if (ci.customId.startsWith("trade-rem-select-")) {
            const value = ci.values[0];
            const [cardId, edition] = value.split(":");
            const t = activeTrades.get(tradeId);
            if (!t) {
              await ci.reply({ content: "Trade no longer active.", flags: 64 });
              removing = false;
              break;
            }
            const offer = isInitiator ? t.initiatorCards : t.targetCards;
            const idx = offer.findIndex(
              (c) => c.cardId === cardId && c.edition === edition,
            );
            if (idx !== -1) {
              offer.splice(idx, 1);
            }
            if (t.initiatorReady || t.targetReady) {
              t.initiatorReady = false;
              t.targetReady = false;
            }
            await ci.deferUpdate();
            await updateTradeMessage(interaction, t, tradeId);
            await ci.editReply(buildRemovePickerMessage(i.user.id, tradeId));
          }
        }
        return;
      }

      if (i.customId === `${TRADE_BUTTONS.ready}-${safeId}`) {
        if (isInitiator) {
          currentTrade.initiatorReady = !currentTrade.initiatorReady;
        } else {
          currentTrade.targetReady = !currentTrade.targetReady;
        }

        // Check if both ready
        if (currentTrade.initiatorReady && currentTrade.targetReady) {
          // Execute trade
          const initiatorCards = currentTrade.initiatorCards.map((c) => ({
            ...c,
            amount: 1,
          }));
          const targetCards = currentTrade.targetCards.map((c) => ({
            ...c,
            amount: 1,
          }));

          // Perform atomic transfers
          const removedFromInitiator = removeCards(
            currentTrade.initiatorId,
            initiatorCards,
          );
          const removedFromTarget = removeCards(
            currentTrade.targetId,
            targetCards,
          );

          if (!removedFromInitiator || !removedFromTarget) {
            // Revert if something went wrong
            if (removedFromInitiator) {
              addCards(
                currentTrade.initiatorId,
                currentTrade.targetCards.map((c) => ({
                  id: c.cardId,
                  edition: c.edition,
                })),
              );
            }
            if (removedFromTarget) {
              addCards(
                currentTrade.targetId,
                currentTrade.initiatorCards.map((c) => ({
                  id: c.cardId,
                  edition: c.edition,
                })),
              );
            }
            await i.update({
              content:
                "Trade failed – someone no longer has the cards they offered.",
              embeds: [],
              components: [],
            });
            endTrade(tradeId, "failed");
            return;
          }

          // Give cards to the other party (map cardId → id for addCards)
          addCards(
            currentTrade.targetId,
            currentTrade.initiatorCards.map((c) => ({
              id: c.cardId,
              edition: c.edition,
            })),
          );
          addCards(
            currentTrade.initiatorId,
            currentTrade.targetCards.map((c) => ({
              id: c.cardId,
              edition: c.edition,
            })),
          );

          // Track trade completion for achievements
          const initiatorAfter = loadUser(currentTrade.initiatorId);
          const targetAfter = loadUser(currentTrade.targetId);
          initiatorAfter.trades_completed =
            (initiatorAfter.trades_completed || 0) + 1;
          targetAfter.trades_completed =
            (targetAfter.trades_completed || 0) + 1;
          saveUser(initiatorAfter);
          saveUser(targetAfter);
          const iAch = await checkAndAwardTitles(initiatorAfter).catch(
            () => [],
          );
          const tAch = await checkAndAwardTitles(targetAfter).catch(() => []);

          const iUser = await interaction.client.users
            .fetch(currentTrade.initiatorId)
            .catch(() => null);
          const tUser = await interaction.client.users
            .fetch(currentTrade.targetId)
            .catch(() => null);
          const summary = buildTradeEmbed(
            currentTrade,
            iUser?.displayName,
            tUser?.displayName,
          );
          await interaction.editReply({
            content: "✅ **Trade completed!**",
            embeds: [summary],
            components: [],
          });

          if (iAch?.length) {
            interaction
              .followUp({ content: iAch.join("\n\n"), flags: 64 })
              .catch(() => {});
          }
          if (tAch?.length && currentTrade.lastTargetInteraction) {
            currentTrade.lastTargetInteraction
              .followUp({ content: tAch.join("\n\n"), flags: 64 })
              .catch(() => {});
          }

          endTrade(tradeId, "completed");
          return;
        }

        await i.deferUpdate();
        await updateTradeMessage(interaction, currentTrade, tradeId);
        return;
      }

      if (i.customId === `${TRADE_BUTTONS.cancel}-${safeId}`) {
        await i.update({
          content: `Trade cancelled by ${i.user}.`,
          embeds: [],
          components: [],
        });
        endTrade(tradeId, "cancelled");
        return;
      }
    } catch (err) {
      console.error("Trade error:", err);
      if (!i.replied && !i.deferred) {
        await i
          .reply({ content: "An error occurred during the trade.", flags: 64 })
          .catch(() => {});
      }
    }
  });

  collector.on("end", async () => {
    if (activeTrades.has(tradeId)) {
      endTrade(tradeId, "timeout");
      try {
        await interaction
          .editReply({
            content: "Trade has ended.",
            embeds: [],
            components: [],
          })
          .catch(() => {});
      } catch {}
    }
  });
}

module.exports = {
  checkAndAwardTitles,
  resolveSet,
  getSetName,
  getEditionName,
  getCardAllowedEditions,
  titleCase,
  getPackName,

  data: new SlashCommandBuilder()
    .setName("cards")
    .setDescription("Open packs and manage trading cards.")
    .addSubcommand((subcommand) =>
      subcommand
        .setName("help")
        .setDescription("Show help for cards commands."),
    )
    .addSubcommand((subcommand) =>
      subcommand.setName("open").setDescription("Open one of your packs."),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("inventory")
        .setDescription("Check your pack inventory.")
        .addUserOption((option) =>
          option
            .setName("user")
            .setDescription("User to check")
            .setRequired(false),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("collection")
        .setDescription("View your card collection!")
        .addUserOption((option) =>
          option
            .setName("user")
            .setDescription("User to view")
            .setRequired(false),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("inspect")
        .setDescription("Inspect an owned card and its editions."),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("set")
        .setDescription(
          "View your progress in a set (and achievement progress).",
        )
        .addStringOption((option) =>
          option
            .setName("set")
            .setDescription("Set")
            .setRequired(true)
            .setAutocomplete(true),
        )
        .addUserOption((option) =>
          option
            .setName("user")
            .setDescription("User to view")
            .setRequired(false),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("profile")
        .setDescription("View someone's card profile (or edit your own).")
        .addUserOption((option) =>
          option
            .setName("user")
            .setDescription("User to check")
            .setRequired(false),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("stats")
        .setDescription("View all your card stats.")
        .addUserOption((option) =>
          option
            .setName("user")
            .setDescription("User to check")
            .setRequired(false),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("trade")
        .setDescription("Trade cards with another user.")
        .addUserOption((option) =>
          option
            .setName("user")
            .setDescription("User to trade with")
            .setRequired(true),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("request")
        .setDescription("Request a card to be added!")
        .addStringOption((option) =>
          option
            .setName("type")
            .setDescription("Type of request")
            .setRequired(true)
            .addChoices(
              { name: "Yourself", value: "self" },
              { name: "Wikipedia article", value: "wiki" },
              { name: "Other", value: "other" },
            ),
        ),
    ),

  async autocomplete(interaction) {
    const focused = interaction.options.getFocused(true);
    const query = String(focused.value || "");
    let choices = [];

    if (focused.name === "set") {
      choices = getSetChoices(query);
    } else if (focused.name === "pack") {
      choices = getPackChoices(query);
    } else if (focused.name === "card_id") {
      const selectedSet = interaction.options.getString("set");
      if (selectedSet) {
        choices = getCardChoices(query, selectedSet);
      }
    }

    await interaction.respond(choices);
  },

  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();
    const setId = interaction.options.getString("set") || DEFAULT_SET;
    const packType = interaction.options.getString("pack") || DEFAULT_PACK;

    try {
      if (subcommand === "help") {
        const embed = new EmbedBuilder()
          .setColor(0x2b2d31)
          .setTitle("🃏 Cards Commands")
          .setDescription(
            "`/cards inventory` - Check pack inventory, you can view details on packs here!\n" +
              "`/cards open` - Open one of your owned packs\n" +
              "`/cards set` - View your progress towards completing a set (and achievements)\n" +
              "`/cards collection` - View your total card collection\n" +
              "`/cards inspect` - Inspect one of your owned cards\n" +
              "`/cards profile` - View and customise your card profile!\n" +
              "`/cards trade` - Trade cards with another user\n" +
              "`/cards request` - Request a card to be added in the next set!\n",
          );
        await interaction.reply({ embeds: [embed], flags: 64 });
        return;
      }

      if (subcommand === "open") {
        await interaction.deferReply();
        const userData = loadUser(interaction.user.id);

        const ownedSetIds = Object.keys(userData.packs || {})
          .filter((sid) => Object.keys(userData.packs[sid] || {}).length > 0)
          .sort((a, b) => b.localeCompare(a));

        if (!ownedSetIds.length) {
          const emptyEmbed = new EmbedBuilder()
            .setColor(0x2b2d31)
            .setTitle("📦 Open a Pack")
            .setDescription("You don't have any packs at the moment.\n");
          await interaction.editReply({ embeds: [emptyEmbed], components: [] });
          return;
        }

        const setOptions = ownedSetIds.map((sid) => ({
          label: setsConfig[sid]?.name || sid,
          value: sid,
          emoji: setsConfig[sid]?.emoji || "📦",
        }));

        const setEmbed = new EmbedBuilder()
          .setColor(0x2b2d31)
          .setTitle("📦 Open a Pack")
          .setDescription("Select a set to open packs from:");

        const setIdPicker = `pickset-${interaction.id}`;
        const quickOpenId = `quickopen-${interaction.id}`;
        const cancelId = `cancel-${interaction.id}`;
        const components = [
          new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
              .setCustomId(setIdPicker)
              .setPlaceholder("Choose a set")
              .addOptions(setOptions),
          ),
        ];

        const latestSet = ownedSetIds[0];
        const hasStandardPack =
          userData.packs[latestSet]?.["standard_pack"] > 0;
        if (hasStandardPack) {
          const setName = setsConfig[latestSet]?.name || latestSet;
          components.push(
            new ActionRowBuilder().addComponents(
              new ButtonBuilder()
                .setCustomId(quickOpenId)
                .setLabel(
                  `${packsConfig["standard_pack"]?.emoji || "🎒"} Quick Open: Standard Pack (${setName})`,
                )
                .setStyle(ButtonStyle.Success),
            ),
          );
        }

        components.push(
          new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId(cancelId)
              .setLabel("Cancel")
              .setStyle(ButtonStyle.Danger),
          ),
        );

        const setMsg = await interaction.editReply({
          embeds: [setEmbed],
          components,
        });
        let targetSetId;
        let targetPackType = null;
        try {
          const setSelection = await setMsg.awaitMessageComponent({
            filter: (i) =>
              i.user.id === interaction.user.id &&
              (i.customId === setIdPicker ||
                i.customId === quickOpenId ||
                i.customId === cancelId),
            time: 60000,
          });
          if (setSelection.customId === cancelId) {
            await setSelection.update({
              content: "can't decide on a set huh?",
              embeds: [],
              components: [],
            });
            return;
          }
          if (setSelection.customId === quickOpenId) {
            targetSetId = latestSet;
            targetPackType = "standard_pack";
            await setSelection.deferUpdate();
          } else {
            targetSetId = setSelection.values[0];
            await setSelection.deferUpdate();
          }
        } catch {
          await interaction.editReply({
            content: "Pack opening cancelled due to an error or timeout",
            components: [],
          });
          return;
        }

        if (!targetPackType) {
          const freshUser = loadUser(interaction.user.id);
          const ownedTypes = Object.keys(freshUser.packs[targetSetId] || {});
          if (!ownedTypes.length) {
            await interaction.editReply({
              content: "You don't have any packs for that set.",
            });
            return;
          }

          const setObj = resolveSet(targetSetId);
          const stats = getCompletionStats(freshUser, setObj);

          const packOptions = ownedTypes
            .filter((pt) => {
              const restriction = packsConfig[pt]?.set_restriction;
              return !restriction || restriction.includes(targetSetId);
            })
            .map((pt) => ({
              label: `${titleCase(getPackName(pt))} (${freshUser.packs[targetSetId][pt]} left)`,
              value: pt,
              emoji: packsConfig[pt]?.emoji || "🃏",
            }));

          const packEmbed = new EmbedBuilder()
            .setColor(0x2b2d31)
            .setTitle(`📦 ${getSetName(targetSetId, setObj)}`)
            .setDescription(
              `Select a pack type to open:\n\n${stats.owned}/${stats.total} cards collected - ${stats.percent} complete`,
            );

          const cancelPackId = `cancel-pack-${interaction.id}`;
          const packIdPicker = `pickpack-${interaction.id}`;
          const packRow = new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
              .setCustomId(packIdPicker)
              .setPlaceholder("Choose a pack type")
              .addOptions(packOptions),
          );
          const cancelPackRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId(cancelPackId)
              .setLabel("Cancel")
              .setStyle(ButtonStyle.Danger),
          );

          const packMsg = await interaction.editReply({
            embeds: [packEmbed],
            components: [packRow, cancelPackRow],
          });
          try {
            const packSelection = await packMsg.awaitMessageComponent({
              filter: (i) =>
                i.user.id === interaction.user.id &&
                (i.customId === packIdPicker || i.customId === cancelPackId),
              time: 60000,
            });
            if (packSelection.customId === cancelPackId) {
              await packSelection.update({
                content: "hey wtf i wanted to see what was inside that :(",
                embeds: [],
                components: [],
              });
              return;
            }
            targetPackType = packSelection.values[0];
            await packSelection.deferUpdate();
          } catch {
            await interaction.editReply({
              content: "Pack opening cancelled due to an error",
              components: [],
            });
            return;
          }
        }

        const targetSet = resolveSet(targetSetId);
        const targetPack = packsConfig[targetPackType];
        if (!targetPack) {
          await interaction.editReply({
            content: `Unknown pack type "${targetPackType}".`,
          });
          return;
        }
        await openPackAndShow(interaction, {
          setId: targetSetId,
          packType: targetPackType,
          set: targetSet,
          pack: targetPack,
        });
        return;
      }

      if (subcommand === "inventory") {
        const target = interaction.options.getUser("user") || interaction.user;
        const user = loadUser(target.id);
        const lines = [];

        for (const [ownedSetId, packs] of Object.entries(user.packs || {})) {
          for (const [ownedPackType, count] of Object.entries(packs)) {
            const pc = packsConfig[ownedPackType];
            const setName = setsConfig[ownedSetId]?.name || ownedSetId;
            const desc = pc?.description || "";
            lines.push(
              `${count}x: ${pc?.emoji || ""} ${titleCase(getPackName(ownedPackType))} - ${setName}${desc ? ` - ${desc}` : ""}`,
            );
          }
        }

        await interaction.reply({
          content: lines.length
            ? `${target.username}'s packs:\n${lines.join("\n")}`
            : `${target.username} has no packs at the moment.\nGet more packs through\`/battlepass\`!`,
          flags: 64,
        });

        // Tutorial step 2: check inventory
        if (target.id === interaction.user.id) {
          try {
            const bpUser = loadBpUser(interaction.user.id);
            if (bpUser && bpUser.tutorial_step === 1) {
              bpUser.tutorial_step = 2;
              saveBpUser(bpUser);
              await interaction.followUp({
                content:
                  "Great! Different pack types have different drops, you can always view pack descriptions here! Now let's open a pack with `/cards open`!\n\n-# (2/5) Complete this tutorial to earn 1x ⭐Premium Pack!",
                flags: 64,
              });
            }
          } catch {}
        }
        return;
      }

      if (subcommand === "collection") {
        await interaction.deferReply();
        const target = interaction.options.getUser("user") || interaction.user;
        const user = loadUser(target.id);
        await showCollection(interaction, target, user);
        return;
      }

      if (subcommand === "inspect") {
        await inspectCard(interaction);
        // Tutorial step 4: inspected a card
        try {
          const bpUser = loadBpUser(interaction.user.id);
          if (bpUser && bpUser.tutorial_step === 3) {
            bpUser.tutorial_step = 4;
            saveBpUser(bpUser);
            interaction
              .followUp({
                content:
                  "Your card is now featured on your profile! Let's finish up this tutorial by running `/cards profile`!\n\n-# (4/5) Complete this tutorial to earn 1x ⭐Premium Pack!",
                flags: 64,
              })
              .catch(() => {});
          }
        } catch {}
        return;
      }

      if (subcommand === "set") {
        await interaction.deferReply();
        const target = interaction.options.getUser("user") || interaction.user;
        const user = loadUser(target.id);
        await showSet(interaction, setId, target, user);
        return;
      }

      if (subcommand === "profile") {
        const target = interaction.options.getUser("user") || interaction.user;
        const user = loadUser(target.id);
        await interaction.deferReply();
        const { embed, files } = await buildProfileEmbed(target, user);

        await interaction.editReply({ embeds: [embed], files });
        const profileMsg = await interaction.fetchReply();

        try {
          const bpUser = loadBpUser(interaction.user.id);
          if (bpUser && bpUser.tutorial_step === 4) {
            bpUser.tutorial_step = 5;
            saveBpUser(bpUser);
            const latestSetId = Object.keys(setsConfig).pop();
            if (latestSetId) {
              try {
                addPack(interaction.user.id, latestSetId, "premium_pack", 1);
              } catch {}
            }
            interaction
              .followUp({
                content: `**Tutorial Complete!** 🎉 You've earned **1x Premium Pack**!\n\nKeep chatting to earn more packs - you get one per level! I'll react to your message with the ✉️ emoji whenever you recieve a new pack. Look out for any 💌 reactions - they mean you've earned a milestone reward!\n\n-# You can always use \`/cards help\` to see all available commands!`,
                flags: 64,
              })
              .catch(() => {});
          }
        } catch {}
        if (target.id === interaction.user.id) {
          const editRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId("edit-profile-btn")
              .setLabel("Edit Profile")
              .setStyle(ButtonStyle.Secondary),
          );
          await interaction.editReply({ components: [editRow] });

          const editCollector = profileMsg.createMessageComponentCollector({
            filter: (i) =>
              i.customId === "edit-profile-btn" &&
              i.user.id === interaction.user.id,
            time: 120_000,
          });

          editCollector.on("collect", async (btnInt) => {
            try {
              await btnInt.deferUpdate();
              await showProfileEditor(interaction);
            } catch (e) {
              console.error("Edit profile error:", e);
            }
          });

          editCollector.on("end", async () => {
            try {
              await interaction.editReply({ components: [] });
            } catch {}
          });
        }
        return;
      }

      if (subcommand === "trade") {
        await handleTrade(interaction);
        return;
      }

      if (subcommand === "request") {
        const type = interaction.options.getString("type");
        const username = interaction.user.username;
        const userId = interaction.user.id;

        if (type === "self") {
          await interaction.deferReply({ flags: 64 });
          const channel = interaction.client.channels.cache.get(
            "1513291690352443423",
          );
          const avatarUrl = interaction.user.displayAvatarURL({
            size: 512,
            extension: "png",
          });
          let attachment = null;
          try {
            const buf = await new Promise((resolve, reject) => {
              https
                .get(avatarUrl, (res) => {
                  const chunks = [];
                  res.on("data", (c) => chunks.push(c));
                  res.on("end", () => resolve(Buffer.concat(chunks)));
                  res.on("error", reject);
                })
                .on("error", reject);
            });
            attachment = new AttachmentBuilder(buf, { name: "avatar.png" });
          } catch {}
          if (channel) {
            await channel.send({
              content: `**Card Request - Self**\n**User:** ${username}\n**ID:** ${userId}`,
              ...(attachment ? { files: [attachment] } : {}),
            });
          }
          await interaction.editReply({
            content: "Your profile has been sent for review!",
          });
        } else {
          const modal = new ModalBuilder()
            .setCustomId(
              type === "wiki" ? "request_wiki_modal" : "request_other_modal",
            )
            .setTitle(
              type === "wiki"
                ? "Wikipedia Article Link"
                : "Card Request Description",
            );

          const input = new TextInputBuilder()
            .setCustomId("request_input")
            .setLabel(
              type === "wiki"
                ? "Paste the Wikipedia article URL"
                : "Describe what card you want",
            )
            .setStyle(TextInputStyle.Paragraph)
            .setPlaceholder(
              type === "wiki"
                ? "https://en.wikipedia.org/wiki/..."
                : "Enter your card idea...",
            )
            .setRequired(true);

          modal.addComponents(new ActionRowBuilder().addComponents(input));

          await interaction.showModal(modal);

          try {
            const submitted = await interaction.awaitModalSubmit({
              filter: (m) =>
                m.customId === "request_wiki_modal" ||
                m.customId === "request_other_modal",
              time: 120000,
            });

            const value = submitted.fields.getTextInputValue("request_input");
            const chId =
              type === "wiki" ? "1513291883311534211" : "1513295251681316924";
            const channel = interaction.client.channels.cache.get(chId);
            if (channel) {
              await channel.send({
                content:
                  type === "wiki"
                    ? `**Card Request - Wikipedia**\n**Requested by:** ${username}\n**Link:** ${value}`
                    : `**Card Request - Other**\n**User:** ${username}\n**Description:** ${value}`,
              });
            }
            await submitted.reply({
              content: "Your request has been sent for review!",
              flags: 64,
            });
          } catch {
            if (!interaction.replied && !interaction.deferred) {
              await interaction.followUp({
                content: "Request timed out.",
                flags: 64,
              });
            }
          }
        }
        return;
      }

      if (subcommand === "stats") {
        const target = interaction.options.getUser("user") || interaction.user;
        const user = loadUser(target.id);
        const stats = calculateStats(user);

        const lines = Object.entries(STAT_NAMES).map(
          ([key, label]) => `**${label}:** ${stats[key] || 0}`,
        );

        const embed = new EmbedBuilder()
          .setColor(0x2b2d31)
          .setAuthor({
            name: `${target.username}'s Card Stats`,
            iconURL: target.displayAvatarURL(),
          })
          .setDescription(lines.join("\n"));

        await interaction.reply({ embeds: [embed] });
        return;
      }
    } catch (error) {
      try {
        if (interaction.deferred || interaction.replied) {
          await interaction.followUp({ content: error.message, flags: 64 });
        } else {
          await interaction.reply({ content: error.message, flags: 64 });
        }
      } catch {}
    }
  },

  async interactionCreate(interaction) {
    if (
      interaction.isModalSubmit() &&
      interaction.customId.startsWith("edit-profile-modal-")
    ) {
      const msgId = interaction.customId.slice("edit-profile-modal-".length);
      const user = loadUser(interaction.user.id);
      const bio = interaction.fields.getTextInputValue("bio");
      const accent_color =
        interaction.fields.getTextInputValue("accent_color") || "#2b2d31";
      if (bio !== undefined) user.bio = bio;
      user.accent_color = /^#[0-9a-f]{6}$/i.test(accent_color)
        ? accent_color
        : "#2b2d31";
      saveUser(user);
      await interaction.reply({
        content: "Bio & color updated!",
        flags: 64,
      });
      try {
        const target = interaction.user;
        const { embed, files } = await buildProfileEmbed(target, user);
        const profileChannel = interaction.channel;
        if (profileChannel) {
          const profileMsg = await profileChannel.messages
            .fetch(msgId)
            .catch(() => null);
          if (profileMsg) {
            await profileMsg.edit({ embeds: [embed], files });
          }
        }
      } catch (e) {
        console.error("Profile edit error:", e);
      }
    }
  },
};
