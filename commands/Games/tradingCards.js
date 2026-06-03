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
  PermissionFlagsBits,
} = require("discord.js");
const { createCanvas, loadImage } = require("@napi-rs/canvas");
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
  addPack,
  removePack,
  getPackCount,
  addCards,
} = require("../../tradingCards/services/userService");

const DATA_PATH = path.join(__dirname, "../../tradingCards/data");
const setsConfig = require(path.join(DATA_PATH, "config/sets.json"));
const packsConfig = require(path.join(DATA_PATH, "config/packs.json"));
const tierTable = require(path.join(DATA_PATH, "config/card_tiers.json"));
const editionTable = require(path.join(DATA_PATH, "config/editions.json"));

const DEFAULT_SET = Object.keys(setsConfig)[0] || "00";
const DEFAULT_PACK = Object.keys(packsConfig)[0] || "standard_pack";
const CARD_IMAGE_SIZE = 768;

function getSetName(setId, set) {
  return set?.set_name || setsConfig[setId]?.name || setId;
}

function getEditionName(edition) {
  return editionTable[edition]?.display_name || edition;
}

function getEmbedColor(edition) {
  return Number.parseInt(
    (editionTable[edition]?.color || "#ffffff").replace("#", ""),
    16,
  );
}

function getPackName(packType) {
  return packType.replaceAll("_", " ");
}

function formatPercent(value) {
  if (!Number.isFinite(value)) return "0%";
  return `${Math.round(value)}%`;
}

function buildCardLine(card, set) {
  const index = getCardIndex(set, card.id);
  const edition = getEditionName(card.edition);
  return `#${index}/${getSetTotal(set)} ${card.name} (${card.rarity}, ${edition})`;
}

function titleCase(value) {
  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function getCompletionStats(user, set) {
  const owned = Object.keys(set.cards).filter((cardId) => user.collection[cardId])
    .length;
  const total = getSetTotal(set);

  return {
    owned,
    total,
    percent: formatPercent((owned / total) * 100),
  };
}

function coverImage(ctx, image, width, height) {
  const imageRatio = image.width / image.height;
  const canvasRatio = width / height;
  let drawWidth = width;
  let drawHeight = height;
  let x = 0;
  let y = 0;

  if (imageRatio > canvasRatio) {
    drawHeight = height;
    drawWidth = height * imageRatio;
    x = (width - drawWidth) / 2;
  } else {
    drawWidth = width;
    drawHeight = width / imageRatio;
    y = (height - drawHeight) / 2;
  }

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

async function renderCardImage(card, pullIndex) {
  if (!card.art_url) return null;

  const inputImage = await loadImage(card.art_url);
  const canvas = createCanvas(CARD_IMAGE_SIZE, CARD_IMAGE_SIZE);
  const ctx = canvas.getContext("2d");

  coverImage(ctx, inputImage, canvas.width, canvas.height);
  applyEditionEffect(ctx, card.edition, canvas.width, canvas.height);

  const attachmentName = `card-${card.id}-${pullIndex}.png`;
  return new AttachmentBuilder(canvas.toBuffer("image/png"), {
    name: attachmentName,
  });
}

function renderEditionIcon(card, pullIndex) {
  const size = 160;
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext("2d");
  const edition = card.edition;

  ctx.clearRect(0, 0, size, size);

  if (edition === "rainbow") {
    const gradient = ctx.createLinearGradient(0, 0, size, size);
    gradient.addColorStop(0, "#FF0000");
    gradient.addColorStop(0.17, "#FF7F00");
    gradient.addColorStop(0.33, "#FFFF00");
    gradient.addColorStop(0.5, "#00FF00");
    gradient.addColorStop(0.67, "#00a2ff");
    gradient.addColorStop(0.83, "#4B0082");
    gradient.addColorStop(1, "#9400D3");
    ctx.fillStyle = gradient;
  } else {
    ctx.fillStyle = editionTable[edition]?.color || "#ffffff";
  }

  if (edition === "base") {
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, 54, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#111111";
    ctx.font = "bold 68px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("1", size / 2, size / 2 + 2);
  } else {
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, 46, 0, Math.PI * 2);
    ctx.fill();

    for (let i = 0; i < 16; i++) {
      const angle = (Math.PI * 2 * i) / 16;
      const inner = 58;
      const outer = 76;
      ctx.beginPath();
      ctx.moveTo(
        size / 2 + Math.cos(angle - 0.1) * inner,
        size / 2 + Math.sin(angle - 0.1) * inner,
      );
      ctx.lineTo(
        size / 2 + Math.cos(angle) * outer,
        size / 2 + Math.sin(angle) * outer,
      );
      ctx.lineTo(
        size / 2 + Math.cos(angle + 0.1) * inner,
        size / 2 + Math.sin(angle + 0.1) * inner,
      );
      ctx.closePath();
      ctx.fill();
    }
  }

  const attachmentName = `edition-${card.id}-${pullIndex}.png`;
  return new AttachmentBuilder(canvas.toBuffer("image/png"), {
    name: attachmentName,
  });
}

async function buildCardMessage(card, set, setId, user, pullIndex) {
  const files = [];
  const image = await renderCardImage(card, pullIndex).catch(() => null);
  const icon = renderEditionIcon(card, pullIndex);
  const stats = getCompletionStats(user, set);
  const index = getCardIndex(set, card.id);
  const setName = getSetName(setId, set);

  files.push(icon);

  const embed = new EmbedBuilder()
    .setColor(getEmbedColor(card.edition))
    .setAuthor({ name: `${setName} - ${titleCase(card.rarity)}` })
    .setTitle(card.name)
    .setDescription(card.description || "No description.")
    .addFields({
      name: "Rarity:",
      value: getEditionName(card.edition),
      inline: false,
    })
    .setThumbnail(`attachment://${icon.name}`)
    .setFooter({
      text: `${index}/${stats.total} - Set is ${stats.percent} complete!`,
    });

  if (image) {
    files.push(image);
    embed.setImage(`attachment://${image.name}`);
  } else if (card.art_url) {
    embed.setImage(card.art_url);
  }

  return { embeds: [embed], files, attachments: [] };
}

function buildNavigationRow(currentIndex, total, ids, hasViewedLast = false) {
  const isLastCard = currentIndex === total - 1;
  const isFirstCard = currentIndex === 0;
  const arrowStyle = hasViewedLast ? ButtonStyle.Secondary : ButtonStyle.Success;

  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(ids.left)
      .setLabel("←")
      .setStyle(isFirstCard || isLastCard ? ButtonStyle.Secondary : arrowStyle)
      .setDisabled(isFirstCard),
    new ButtonBuilder()
      .setCustomId(ids.finished)
      .setLabel("Finished")
      .setStyle(hasViewedLast || isLastCard ? ButtonStyle.Success : ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(ids.right)
      .setLabel("→")
      .setStyle(isLastCard ? ButtonStyle.Secondary : arrowStyle)
      .setDisabled(isLastCard),
  );
}

function buildSummaryMessage(cards, set, setId, user, packType) {
  const pulled = new Map();
  const stats = getCompletionStats(user, set);

  for (const card of cards) {
    const key = `${card.id}:${card.edition}`;
    const current = pulled.get(key) || { card, count: 0 };
    current.count++;
    pulled.set(key, current);
  }

  const lines = [...pulled.values()].map(({ card, count }) => {
    const index = getCardIndex(set, card.id);
    const edition = getEditionName(card.edition);
    return `${count}x #${index}/${getSetTotal(set)} ${card.name} (${edition})`;
  });

  const embed = new EmbedBuilder()
    .setTitle(`${titleCase(getPackName(packType))} summary`)
    .setDescription(lines.join("\n"))
    .setFooter({
      text: `${getSetName(setId, set)} - ${stats.owned}/${stats.total} cards - ${stats.percent} complete`,
    });

  return { embeds: [embed], components: [], files: [], attachments: [] };
}

function buildRaritySelect(card, selectedEdition, customId, availableEditions) {
  const editions = availableEditions?.length
    ? availableEditions
    : card.editions || Object.keys(editionTable);
  const options = editions.map((edition) =>
    new StringSelectMenuOptionBuilder()
      .setLabel(getEditionName(edition))
      .setValue(edition)
      .setDefault(edition === selectedEdition),
  );

  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId(customId)
      .setPlaceholder("Change rarity")
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
      name: `${set.name || setId} (${setId})`,
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

function getCardChoices(query, setId = DEFAULT_SET) {
  const set = resolveSet(setId);

  return filterChoices(
    Object.entries(set.cards).map(([cardId, card]) => ({
      name: `${card.name} (#${getCardIndex(set, cardId)} - ${getSetName(setId, set)})`,
      value: cardId,
    })),
    query,
  );
}

function getOwnedEditions(user, cardId, card) {
  const allowedEditions = new Set(card.editions || Object.keys(editionTable));

  return Object.entries(user.collection?.[cardId] || {})
    .filter(([edition, count]) => allowedEditions.has(edition) && count > 0)
    .map(([edition]) => edition);
}

function resolveSet(setId) {
  if (!setsConfig[setId]) {
    throw new Error(`Unknown set "${setId}".`);
  }

  return loadSet(setId);
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("cards")
    .setDescription("Open packs and manage trading cards.")
    .addSubcommand((subcommand) =>
      subcommand
        .setName("open")
        .setDescription("Open one of your packs.")
        .addStringOption((option) =>
          option
            .setName("set")
            .setDescription("Set")
            .setRequired(false)
            .setAutocomplete(true),
        )
        .addStringOption((option) =>
          option
            .setName("pack")
            .setDescription("Pack type")
            .setRequired(false)
            .setAutocomplete(true),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("packs")
        .setDescription("Check pack inventory.")
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
        .setDescription("Check card collection progress.")
        .addUserOption((option) =>
          option
            .setName("user")
            .setDescription("User to check")
            .setRequired(false),
        )
        .addStringOption((option) =>
          option
            .setName("set")
            .setDescription("Set")
            .setRequired(false)
            .setAutocomplete(true),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("card")
        .setDescription("Check copies of a card.")
        .addStringOption((option) =>
          option
            .setName("set")
            .setDescription("Set")
            .setRequired(true)
            .setAutocomplete(true),
        )
        .addStringOption((option) =>
          option
            .setName("card_id")
            .setDescription("Card")
            .setRequired(true)
            .setAutocomplete(true),
        )
        .addUserOption((option) =>
          option
            .setName("user")
            .setDescription("User to check")
            .setRequired(false),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("inspect")
        .setDescription("Inspect a card and preview its rarities.")
        .addStringOption((option) =>
          option
            .setName("set")
            .setDescription("Set")
            .setRequired(true)
            .setAutocomplete(true),
        )
        .addStringOption((option) =>
          option
            .setName("card_id")
            .setDescription("Card")
            .setRequired(true)
            .setAutocomplete(true),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("give")
        .setDescription("Give packs to a user.")
        .addUserOption((option) =>
          option
            .setName("user")
            .setDescription("User receiving packs")
            .setRequired(true),
        )
        .addIntegerOption((option) =>
          option
            .setName("amount")
            .setDescription("Number of packs")
            .setMinValue(1)
            .setMaxValue(100)
            .setRequired(true),
        )
        .addStringOption((option) =>
          option
            .setName("set")
            .setDescription("Set")
            .setRequired(false)
            .setAutocomplete(true),
        )
        .addStringOption((option) =>
          option
            .setName("pack")
            .setDescription("Pack type")
            .setRequired(false)
            .setAutocomplete(true),
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
      choices = selectedSet ? getCardChoices(query, selectedSet) : [];
    }

    await interaction.respond(choices);
  },

  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();
    const setId = interaction.options.getString("set") || DEFAULT_SET;
    const packType = interaction.options.getString("pack") || DEFAULT_PACK;

    try {
      if (subcommand === "open") {
        const set = resolveSet(setId);
        const pack = packsConfig[packType];

        if (!pack) {
          await interaction.reply({
            content: `Unknown pack type "${packType}".`,
            ephemeral: true,
          });
          return;
        }

        if (getPackCount(interaction.user.id, setId, packType) < 1) {
          await interaction.reply({
            content: `You do not have any ${getPackName(packType)} packs for ${getSetName(setId, set)}.`,
            ephemeral: true,
          });
          return;
        }

        await interaction.deferReply();

        const removed = removePack(interaction.user.id, setId, packType, 1);
        if (!removed) {
          await interaction.editReply({
            content: "That pack could not be opened.",
          });
          return;
        }

        const cards = openPack(
          set,
          tierTable,
          editionTable,
          pack.cards_per_pack || 5,
        );

        if (!cards.length) {
          addPack(interaction.user.id, setId, packType, 1);
          await interaction.editReply({
            content: "This pack did not contain any configured cards, so it was returned to you.",
          });
          return;
        }

        const user = addCards(interaction.user.id, cards);

        const ids = {
          left: `cards-left-${interaction.id}`,
          right: `cards-right-${interaction.id}`,
          finished: `cards-finished-${interaction.id}`,
        };
        let currentIndex = 0;
        let hasViewedLast = cards.length === 1;
        const firstCard = await buildCardMessage(
          cards[currentIndex],
          set,
          setId,
          user,
          currentIndex + 1,
        );
        const firstMessage = {
          ...firstCard,
          components: [buildNavigationRow(currentIndex, cards.length, ids, hasViewedLast)],
        };
        const response = await interaction.editReply(firstMessage);
        const collector = response.createMessageComponentCollector({
          componentType: ComponentType.Button,
          time: 5 * 60 * 1000,
        });

        collector.on("collect", async (buttonInteraction) => {
          try {
            if (buttonInteraction.user.id !== interaction.user.id) {
              await buttonInteraction.reply({
                content: "Only the person who opened this pack can use these buttons.",
                ephemeral: true,
              });
              return;
            }

            if (buttonInteraction.customId === ids.left) {
              currentIndex = Math.max(0, currentIndex - 1);
            } else if (buttonInteraction.customId === ids.right) {
              currentIndex = Math.min(cards.length - 1, currentIndex + 1);
            } else if (buttonInteraction.customId === ids.finished) {
              await buttonInteraction.update(
                buildSummaryMessage(cards, set, setId, user, packType),
              );
              collector.stop("finished");
              return;
            }

            if (currentIndex === cards.length - 1) {
              hasViewedLast = true;
            }

            const cardMessage = await buildCardMessage(
              cards[currentIndex],
              set,
              setId,
              user,
              currentIndex + 1,
            );
            await buttonInteraction.update({
              ...cardMessage,
              components: [buildNavigationRow(currentIndex, cards.length, ids, hasViewedLast)],
            });
          } catch (error) {
            console.error("Failed to update card viewer:", error);

            if (!buttonInteraction.replied && !buttonInteraction.deferred) {
              await buttonInteraction.reply({
                content: "That card view could not be updated.",
                ephemeral: true,
              }).catch(() => {});
            }
          }
        });

        collector.on("end", async (_, reason) => {
          if (reason === "finished") return;

          const cardMessage = await buildCardMessage(
            cards[currentIndex],
            set,
            setId,
            user,
            currentIndex + 1,
          );
          await interaction.editReply({
            ...cardMessage,
            components: [],
          }).catch(() => {});
        });

        return;
      }

      if (subcommand === "packs") {
        const target = interaction.options.getUser("user") || interaction.user;
        const user = loadUser(target.id);
        const lines = [];

        for (const [ownedSetId, packs] of Object.entries(user.packs || {})) {
          for (const [ownedPackType, count] of Object.entries(packs)) {
            lines.push(
              `${setsConfig[ownedSetId]?.name || ownedSetId} - ${getPackName(ownedPackType)}: ${count}`,
            );
          }
        }

        await interaction.reply({
          content: lines.length
            ? `${target.username}'s packs:\n${lines.join("\n")}`
            : `${target.username} has no packs yet.`,
          ephemeral: true,
        });
        return;
      }

      if (subcommand === "collection") {
        const set = resolveSet(setId);
        const target = interaction.options.getUser("user") || interaction.user;
        const user = loadUser(target.id);
        const ownedCardIds = Object.keys(set.cards).filter(
          (cardId) => user.collection[cardId],
        );
        const totalCopies = Object.values(user.collection || {}).reduce(
          (sum, editions) =>
            sum + Object.values(editions).reduce((editionSum, count) => editionSum + count, 0),
          0,
        );
        const preview = ownedCardIds.slice(0, 10).map((cardId) => {
          const card = set.cards[cardId];
          const copies = Object.values(user.collection[cardId]).reduce(
            (sum, count) => sum + count,
            0,
          );
          return `#${getCardIndex(set, cardId)} ${card.name}: ${copies}`;
        });

        await interaction.reply({
          content: [
            `${target.username}'s ${getSetName(setId, set)} collection`,
            `${ownedCardIds.length}/${getSetTotal(set)} cards (${formatPercent(getCompletion(user, set))})`,
            `${totalCopies} total copies`,
            preview.length ? preview.join("\n") : "No cards from this set yet.",
          ].join("\n"),
          ephemeral: true,
        });
        return;
      }

      if (subcommand === "inspect") {
        const set = resolveSet(setId);
        const cardId = interaction.options.getString("card_id");
        const card = set.cards[cardId];

        if (!card) {
          await interaction.reply({
            content: `That card does not exist in ${getSetName(setId, set)}.`,
            ephemeral: true,
          });
          return;
        }

        await interaction.deferReply();

        const user = loadUser(interaction.user.id);
        const ownedEditions = getOwnedEditions(user, cardId, card);

        if (!ownedEditions.length) {
          await interaction.editReply({
            content: `You do not own any copies of ${card.name}.`,
          });
          return;
        }

        const selectId = `cards-rarity-${interaction.id}`;
        let selectedEdition = ownedEditions[0];
        const inspectCard = {
          id: cardId,
          ...card,
          edition: selectedEdition,
        };
        const firstMessage = await buildCardMessage(
          inspectCard,
          set,
          setId,
          user,
          `inspect-${selectedEdition}`,
        );
        const response = await interaction.editReply({
          ...firstMessage,
          components: [buildRaritySelect(card, selectedEdition, selectId, ownedEditions)],
        });
        const collector = response.createMessageComponentCollector({
          componentType: ComponentType.StringSelect,
          time: 5 * 60 * 1000,
        });

        collector.on("collect", async (selectInteraction) => {
          try {
            if (selectInteraction.user.id !== interaction.user.id) {
              await selectInteraction.reply({
                content: "Only the person inspecting this card can use this menu.",
                ephemeral: true,
              });
              return;
            }

            selectedEdition = selectInteraction.values[0];
            const updatedCard = {
              id: cardId,
              ...card,
              edition: selectedEdition,
            };
            const cardMessage = await buildCardMessage(
              updatedCard,
              set,
              setId,
              user,
              `inspect-${selectedEdition}`,
            );

            await selectInteraction.update({
              ...cardMessage,
              components: [
                buildRaritySelect(card, selectedEdition, selectId, ownedEditions),
              ],
            });
          } catch (error) {
            console.error("Failed to update card inspection:", error);

            if (!selectInteraction.replied && !selectInteraction.deferred) {
              await selectInteraction.reply({
                content: "That rarity preview could not be updated.",
                ephemeral: true,
              }).catch(() => {});
            }
          }
        });

        collector.on("end", async () => {
          const finalCard = {
            id: cardId,
            ...card,
            edition: selectedEdition,
          };
          const cardMessage = await buildCardMessage(
            finalCard,
            set,
            setId,
            user,
            `inspect-${selectedEdition}`,
          );

          await interaction.editReply({
            ...cardMessage,
            components: [],
          }).catch(() => {});
        });

        return;
      }

      if (subcommand === "card") {
        const set = resolveSet(setId);
        const cardId = interaction.options.getString("card_id");
        const target = interaction.options.getUser("user") || interaction.user;
        const user = loadUser(target.id);
        const card = set.cards[cardId];

        if (!card) {
          await interaction.reply({
            content: `Card "${cardId}" does not exist in ${getSetName(setId, set)}.`,
            ephemeral: true,
          });
          return;
        }

        const editions = user.collection[cardId] || {};
        const lines = Object.entries(editions).map(
          ([edition, count]) => `${getEditionName(edition)}: ${count}`,
        );

        await interaction.reply({
          content: [
            `${target.username}'s copies of #${getCardIndex(set, cardId)} ${card.name}`,
            lines.length ? lines.join("\n") : "No copies yet.",
          ].join("\n"),
          ephemeral: true,
        });
        return;
      }

      if (subcommand === "give") {
        if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
          await interaction.reply({
            content: "You need Manage Server permission to give packs.",
            ephemeral: true,
          });
          return;
        }

        resolveSet(setId);

        if (!packsConfig[packType]) {
          await interaction.reply({
            content: `Unknown pack type "${packType}".`,
            ephemeral: true,
          });
          return;
        }

        const target = interaction.options.getUser("user");
        const amount = interaction.options.getInteger("amount");
        addPack(target.id, setId, packType, amount);

        await interaction.reply({
          content: `Gave ${amount} ${getPackName(packType)} pack${amount === 1 ? "" : "s"} to ${target.username}.`,
          ephemeral: true,
        });
      }
    } catch (error) {
      if (interaction.deferred || interaction.replied) {
        await interaction.followUp({
          content: error.message,
          ephemeral: true,
        });
      } else {
        await interaction.reply({
          content: error.message,
          ephemeral: true,
        });
      }
    }
  },
};
