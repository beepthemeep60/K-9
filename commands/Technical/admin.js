const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
} = require("discord.js");
const {
  loadUser,
  saveUser,
  addPack,
  removePack,
} = require("../../tradingCards/services/userService.js");
const { getCardIndex } = require("../../tradingCards/services/cardService.js");
const {
  resolveSet,
  getSetName,
  titleCase,
  getPackName,
} = require("../Games/tradingCards.js");

const setsConfig = require("../../tradingCards/data/config/sets.json");
const packsConfig = require("../../tradingCards/data/config/packs.json");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("admin")
    .setDescription("Admin commands")
    .setDefaultMemberPermissions(0)
    .addSubcommandGroup((group) =>
      group
        .setName("cards")
        .setDescription("Card-related admin commands")
        .addSubcommand((sub) =>
          sub
            .setName("give")
            .setDescription("Give packs to a user")
            .addUserOption((o) =>
              o.setName("user").setDescription("Target user").setRequired(true),
            )
            .addIntegerOption((o) =>
              o
                .setName("count")
                .setDescription("How many packs")
                .setRequired(true)
                .setMinValue(1),
            ),
        )
        .addSubcommand((sub) =>
          sub
            .setName("take")
            .setDescription("Take packs from a user")
            .addUserOption((o) =>
              o.setName("user").setDescription("Target user").setRequired(true),
            )
            .addIntegerOption((o) =>
              o
                .setName("count")
                .setDescription("How many packs")
                .setRequired(true)
                .setMinValue(1),
            ),
        )
        .addSubcommand((sub) =>
          sub
            .setName("add")
            .setDescription("Add a specific card to a user")
            .addUserOption((o) =>
              o.setName("user").setDescription("Target user").setRequired(true),
            )
            .addIntegerOption((o) =>
              o
                .setName("count")
                .setDescription("How many copies")
                .setRequired(true)
                .setMinValue(1),
            ),
        )
        .addSubcommand((sub) =>
          sub
            .setName("remove")
            .setDescription("Remove copies of a card from a user")
            .addUserOption((o) =>
              o.setName("user").setDescription("Target user").setRequired(true),
            )
            .addIntegerOption((o) =>
              o
                .setName("count")
                .setDescription("How many copies")
                .setRequired(true)
                .setMinValue(1),
            ),
        )
        .addSubcommand((sub) =>
          sub
            .setName("addall")
            .setDescription("Give every card to a user")
            .addUserOption((o) =>
              o.setName("user").setDescription("Target user").setRequired(true),
            ),
        )
        .addSubcommand((sub) =>
          sub
            .setName("removeall")
            .setDescription("Remove all cards from a user")
            .addUserOption((o) =>
              o.setName("user").setDescription("Target user").setRequired(true),
            ),
        )
        .addSubcommand((sub) =>
          sub
            .setName("circulation")
            .setDescription("Show total cards of each edition in circulation")
            .addStringOption((o) =>
              o.setName("card").setDescription("Card ID to look up (optional)").setRequired(false),
            ),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName("doublexp")
        .setDescription("Toggle global double XP boost")
        .addStringOption((o) =>
          o
            .setName("state")
            .setDescription("Enable or disable")
            .setRequired(true)
            .addChoices(
              { name: "Enable", value: "enable" },
              { name: "Disable", value: "disable" },
            ),
        ),
    )
    .addSubcommandGroup((group) =>
      group
        .setName("source")
        .setDescription("Source file management")
        .addSubcommand((sub) =>
          sub
            .setName("pull")
            .setDescription("Retrieve a source file")
            .addStringOption((o) =>
              o
                .setName("file")
                .setDescription("Which file")
                .setRequired(true)
                .addChoices(
                  { name: "punch.txt", value: "punch.txt" },
                  { name: "warns.txt", value: "warns.txt" },
                  { name: "episodes.txt", value: "episodes.txt" },
                  { name: "pets.txt", value: "pets.txt" },
                  { name: "patch notes.txt", value: "patch notes.txt" },
                  { name: "snowmen.txt", value: "snowmen.txt" },
                  { name: "roulette.txt", value: "roulette.txt" },
                ),
            ),
        )
        .addSubcommand((sub) =>
          sub
            .setName("replace")
            .setDescription("Replace a source file")
            .addStringOption((o) =>
              o
                .setName("file")
                .setDescription("Which file")
                .setRequired(true)
                .addChoices(
                  { name: "punch.txt", value: "punch.txt" },
                  { name: "warns.txt", value: "warns.txt" },
                  { name: "episodes.txt", value: "episodes.txt" },
                  { name: "pets.txt", value: "pets.txt" },
                  { name: "patch notes.txt", value: "patch notes.txt" },
                  { name: "snowmen.txt", value: "snowmen.txt" },
                  { name: "roulette.txt", value: "roulette.txt" },
                ),
            )
            .addAttachmentOption((o) =>
              o
                .setName("upload")
                .setDescription("File to upload")
                .setRequired(true),
            ),
        )
        .addSubcommand((sub) =>
          sub
            .setName("cardpull")
            .setDescription("Pull a user's card data file")
            .addStringOption((o) =>
              o
                .setName("user_id")
                .setDescription("Discord user ID")
                .setRequired(true),
            ),
        )
        .addSubcommand((sub) =>
          sub
            .setName("cardreplace")
            .setDescription("Replace a user's card data file")
            .addStringOption((o) =>
              o
                .setName("user_id")
                .setDescription("Discord user ID")
                .setRequired(true),
            )
            .addAttachmentOption((o) =>
              o
                .setName("upload")
                .setDescription("File to upload")
                .setRequired(true),
            ),
        )
        .addSubcommand((sub) =>
          sub
            .setName("battlepull")
            .setDescription("Pull a user's battle pass data file")
            .addStringOption((o) =>
              o
                .setName("user_id")
                .setDescription("Discord user ID")
                .setRequired(true),
            ),
        )
        .addSubcommand((sub) =>
          sub
            .setName("battlereplace")
            .setDescription("Replace a user's battle pass data file")
            .addStringOption((o) =>
              o
                .setName("user_id")
                .setDescription("Discord user ID")
                .setRequired(true),
            )
            .addAttachmentOption((o) =>
              o
                .setName("upload")
                .setDescription("File to upload")
                .setRequired(true),
            ),
        ),
    ),

  async autocomplete() {},

  async execute(interaction) {
    const group = interaction.options.getSubcommandGroup();
    const subcommand = interaction.options.getSubcommand();

    if (subcommand === "doublexp") {
      const state = interaction.options.getString("state");
      const fs = require("fs");
      const path = require("path");
      const doubleXpPath = path.join(__dirname, "../../battlePass/data/doubleXp.json");
      fs.writeFileSync(doubleXpPath, JSON.stringify({ enabled: state === "enable" }, null, 2), "utf8");
      await interaction.reply({
        content: `Global double XP has been **${state === "enable" ? "enabled" : "disabled"}**.`,
        flags: 64,
      });
      return;
    }

    if (subcommand === "circulation") {
      await interaction.deferReply({ flags: 64 });
      const fs = require("fs");
      const path = require("path");
      const usersPath = path.join(__dirname, "../../tradingCards/data/users");
      const editionsConfig = require("../../tradingCards/data/config/editions.json");
      const eventEditionsConfig = require("../../tradingCards/data/config/event_editions.json");
      const allEditionKeys = Object.keys({ ...editionsConfig, ...eventEditionsConfig });
      const cardId = interaction.options.getString("card");

      const counts = {};
      for (const ed of allEditionKeys) counts[ed] = 0;
      let totalCards = 0;
      let totalUsers = 0;

      if (fs.existsSync(usersPath)) {
        const files = fs.readdirSync(usersPath).filter(f => f.endsWith(".json"));
        for (const file of files) {
          try {
            const data = JSON.parse(fs.readFileSync(path.join(usersPath, file), "utf8"));
            const collections = cardId
              ? { [cardId]: data.collection?.[cardId] || {} }
              : data.collection || {};
            let hasCards = false;
            for (const editions of Object.values(collections)) {
              for (const [ed, count] of Object.entries(editions)) {
                if (counts[ed] !== undefined) counts[ed] += count;
                totalCards += count;
                hasCards = true;
              }
            }
            if (hasCards) totalUsers++;
          } catch {}
        }
      }

      let embed;
      if (cardId) {
        const setFiles = fs.readdirSync(path.join(__dirname, "../../tradingCards/data/sets")).filter(f => f.endsWith(".json"));
        let cardName = cardId;
        for (const sf of setFiles) {
          try {
            const setData = JSON.parse(fs.readFileSync(path.join(__dirname, "../../tradingCards/data/sets", sf), "utf8"));
            if (setData.cards?.[cardId]) { cardName = setData.cards[cardId].name; break; }
          } catch {}
        }
        embed = new EmbedBuilder()
          .setColor(0x2b2d31)
          .setTitle(`📊 Card Circulation — ${cardId}`)
          .setDescription(`**${cardName}**\n**Total copies:** ${totalCards.toLocaleString()}\n**Owners:** ${totalUsers}`)
          .addFields(
            ...allEditionKeys.filter(ed => counts[ed] > 0).map(ed => ({
              name: (editionsConfig[ed]?.display_name || eventEditionsConfig[ed]?.display_name || ed),
              value: `**${counts[ed].toLocaleString()}** copies`,
              inline: true,
            })),
          );
      } else {
        embed = new EmbedBuilder()
          .setColor(0x2b2d31)
          .setTitle("📊 Card Circulation")
          .setDescription(`**Total cards in circulation:** ${totalCards.toLocaleString()}\n**Users with cards:** ${totalUsers}`)
          .addFields(
            ...allEditionKeys.map(ed => ({
              name: (editionsConfig[ed]?.display_name || eventEditionsConfig[ed]?.display_name || ed),
              value: `**${counts[ed].toLocaleString()}** cards`,
              inline: true,
            })),
          );
      }

      await interaction.editReply({ embeds: [embed] });
      return;
    }

    if (group !== "cards" && group !== "source") return;

    async function dmUser(user, content) {
      try {
        await user.send(content);
      } catch {
        // DMs may be closed
      }
    }

    if (subcommand === "give") {
      const target = interaction.options.getUser("user");
      const count = interaction.options.getInteger("count");

      await interaction.deferReply({ flags: 64 });

      const setIds = Object.keys(setsConfig).sort();
      const setOptions = setIds.map((id) => ({
        label: getSetName(id),
        value: id,
      }));

      const setIdPicker = `give-set-${interaction.id}`;
      const cancelId = `give-cancel-${interaction.id}`;
      const legacyGiveId = `give-legacy-${interaction.id}`;

      const setEmbed = new EmbedBuilder()
        .setColor(0x2b2d31)
        .setTitle("📦 Select a set")
        .setDescription(
          `Giving **${count}** pack(s) to <@${target.id}>\nChoose a set, or give a legacy pack.`,
        );

      const setRow = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId(setIdPicker)
          .setPlaceholder("Choose a set")
          .addOptions(setOptions),
      );
      const legacyRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(legacyGiveId)
          .setLabel("⏳ Give Legacy Pack")
          .setStyle(ButtonStyle.Primary),
      );
      const cancelRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(cancelId)
          .setLabel("Cancel")
          .setStyle(ButtonStyle.Danger),
      );

      const setMsg = await interaction.editReply({
        embeds: [setEmbed],
        components: [setRow, legacyRow, cancelRow],
      });

      let targetSetId;
      let targetPackType;
      try {
        const selection = await setMsg.awaitMessageComponent({
          filter: (i) =>
            i.user.id === interaction.user.id &&
            (i.customId === setIdPicker || i.customId === legacyGiveId || i.customId === cancelId),
          time: 60000,
        });
        if (selection.customId === cancelId) {
          await selection.update({
            content: "Cancelled.",
            embeds: [],
            components: [],
          });
          return;
        }
        if (selection.customId === legacyGiveId) {
          targetSetId = setIds[0];
          targetPackType = Object.keys(packsConfig).find((pt) => packsConfig[pt]?.legacy) || "legacy_pack";
          await selection.deferUpdate();
        } else {
          targetSetId = selection.values[0];
          await selection.deferUpdate();
        }
      } catch {
        await interaction.editReply({
          content: "Timed out.",
          components: [],
        });
        return;
      }

      if (targetPackType) {
        // Legacy pack — skip pack type selection
        await interaction.editReply({
          content: `Giving **${count}** ${titleCase(getPackName(targetPackType))} pack(s) to <@${target.id}>...`,
          components: [],
        });
        let given = 0;
        for (let i = 0; i < count; i++) {
          if (addPack(target.id, targetSetId, targetPackType, 1)) {
            given++;
          }
        }
        await dmUser(
          target,
          `You received **${given}** ${titleCase(getPackName(targetPackType))} from an admin.`,
        );
        await interaction.editReply({
          content: `Gave **${given}** ${titleCase(getPackName(targetPackType))} pack(s) to <@${target.id}>.`,
          components: [],
        });
        return;
      }

      const packOptions = Object.entries(packsConfig)
        .filter(([, pack]) => {
          if (pack.legacy) return false;
          const restriction = pack.set_restriction;
          return !restriction || restriction.includes(targetSetId);
        })
        .map(([id, pack]) => ({
          label: `${titleCase(getPackName(id))}`,
          value: id,
          emoji: pack.emoji || "🃏",
        }));

      if (!packOptions.length) {
        await interaction.editReply({
          content: "No pack types available for that set.",
          components: [],
        });
        return;
      }

      const packIdPicker = `give-pack-${interaction.id}`;
      const cancelPackId = `give-cancel-pack-${interaction.id}`;

      const packEmbed = new EmbedBuilder()
        .setColor(0x2b2d31)
        .setTitle(`📦 ${getSetName(targetSetId)}`)
        .setDescription("Choose a pack type to give.");

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

      targetPackType = null;
      try {
        const selection = await packMsg.awaitMessageComponent({
          filter: (i) =>
            i.user.id === interaction.user.id &&
            (i.customId === packIdPicker || i.customId === cancelPackId),
          time: 60000,
        });
        if (selection.customId === cancelPackId) {
          await selection.update({
            content: "Cancelled.",
            embeds: [],
            components: [],
          });
          return;
        }
        targetPackType = selection.values[0];
        await selection.deferUpdate();
      } catch {
        await interaction.editReply({
          content: "Timed out.",
          components: [],
        });
        return;
      }

      await interaction.editReply({
        content: `Giving **${count}** ${titleCase(getPackName(targetPackType))} pack(s) to <@${target.id}>...`,
        components: [],
      });

      let given = 0;
      for (let i = 0; i < count; i++) {
        if (addPack(target.id, targetSetId, targetPackType, 1)) {
          given++;
        }
      }

      await dmUser(
        target,
        `You received **${given}** ${titleCase(getPackName(targetPackType))} (${getSetName(targetSetId)}) from an admin.`,
      );

      await interaction.editReply({
        content: `Gave **${given}** ${titleCase(getPackName(targetPackType))} pack(s) (${getSetName(targetSetId)}) to <@${target.id}>.`,
        components: [],
      });
      return;
    }

    if (subcommand === "take") {
      const target = interaction.options.getUser("user");
      const count = interaction.options.getInteger("count");

      await interaction.deferReply({ flags: 64 });

      const userData = loadUser(target.id);
      const ownedSets = Object.keys(userData.packs || {});
      if (!ownedSets.length) {
        await interaction.editReply({
          content: `<@${target.id}> doesn't have any packs.`,
        });
        return;
      }

      const setOptions = ownedSets
        .filter((id) => setsConfig[id])
        .map((id) => ({
          label: getSetName(id),
          value: id,
        }));

      const setIdPicker = `take-set-${interaction.id}`;
      const cancelId = `take-cancel-${interaction.id}`;

      const setEmbed = new EmbedBuilder()
        .setColor(0x2b2d31)
        .setTitle("📦 Select a set")
        .setDescription(
          `Taking **${count}** pack(s) from <@${target.id}>\nChoose a set to continue.`,
        );

      const setRow = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId(setIdPicker)
          .setPlaceholder("Choose a set")
          .addOptions(setOptions),
      );
      const cancelRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(cancelId)
          .setLabel("Cancel")
          .setStyle(ButtonStyle.Danger),
      );

      const setMsg = await interaction.editReply({
        embeds: [setEmbed],
        components: [setRow, cancelRow],
      });

      let targetSetId;
      try {
        const selection = await setMsg.awaitMessageComponent({
          filter: (i) =>
            i.user.id === interaction.user.id &&
            (i.customId === setIdPicker || i.customId === cancelId),
          time: 60000,
        });
        if (selection.customId === cancelId) {
          await selection.update({
            content: "Cancelled.",
            embeds: [],
            components: [],
          });
          return;
        }
        targetSetId = selection.values[0];
        await selection.deferUpdate();
      } catch {
        await interaction.editReply({
          content: "Timed out.",
          components: [],
        });
        return;
      }

      const freshUser = loadUser(target.id);
      const ownedTypes = Object.keys(freshUser.packs[targetSetId] || {});
      if (!ownedTypes.length) {
        await interaction.editReply({
          content: `<@${target.id}> doesn't have any packs for that set.`,
          components: [],
        });
        return;
      }

      const packOptions = ownedTypes.map((pt) => ({
        label: `${titleCase(getPackName(pt))} (${freshUser.packs[targetSetId][pt]} left)`,
        value: pt,
        emoji: packsConfig[pt]?.emoji || "🃏",
      }));

      const packIdPicker = `take-pack-${interaction.id}`;
      const cancelPackId = `take-cancel-pack-${interaction.id}`;

      const packEmbed = new EmbedBuilder()
        .setColor(0x2b2d31)
        .setTitle(`📦 ${getSetName(targetSetId)}`)
        .setDescription("Choose a pack type to take.");

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

      let targetPackType;
      try {
        const selection = await packMsg.awaitMessageComponent({
          filter: (i) =>
            i.user.id === interaction.user.id &&
            (i.customId === packIdPicker || i.customId === cancelPackId),
          time: 60000,
        });
        if (selection.customId === cancelPackId) {
          await selection.update({
            content: "Cancelled.",
            embeds: [],
            components: [],
          });
          return;
        }
        targetPackType = selection.values[0];
        await selection.deferUpdate();
      } catch {
        await interaction.editReply({
          content: "Timed out.",
          components: [],
        });
        return;
      }

      let removed = 0;
      for (let i = 0; i < count; i++) {
        if (removePack(target.id, targetSetId, targetPackType, 1)) {
          removed++;
        } else {
          break;
        }
      }

      await dmUser(
        target,
        `**${removed}** ${titleCase(getPackName(targetPackType))} (${getSetName(targetSetId)}) were taken from you by an admin.`,
      );

      await interaction.editReply({
        content: `Took **${removed}** ${titleCase(getPackName(targetPackType))} pack(s) (${getSetName(targetSetId)}) from <@${target.id}>.`,
        components: [],
      });
      return;
    }

    async function pickSet(interaction, title, target, count, prefix) {
      const setIds = Object.keys(setsConfig).sort();
      const setOptions = setIds.map((id) => ({
        label: getSetName(id),
        value: id,
      }));

      const setIdPicker = `${prefix}-set-${interaction.id}`;
      const cancelId = `${prefix}-cancel-${interaction.id}`;

      const setEmbed = new EmbedBuilder()
        .setColor(0x2b2d31)
        .setTitle("📦 Select a set")
        .setDescription(`${title}\nChoose a set to continue.`);

      const setRow = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId(setIdPicker)
          .setPlaceholder("Choose a set")
          .addOptions(setOptions),
      );
      const cancelRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(cancelId)
          .setLabel("Cancel")
          .setStyle(ButtonStyle.Danger),
      );

      const msg = await interaction.editReply({
        embeds: [setEmbed],
        components: [setRow, cancelRow],
      });

      try {
        const sel = await msg.awaitMessageComponent({
          filter: (i) =>
            i.user.id === interaction.user.id &&
            (i.customId === setIdPicker || i.customId === cancelId),
          time: 60000,
        });
        if (sel.customId === cancelId) {
          await sel.update({
            content: "Cancelled.",
            embeds: [],
            components: [],
          });
          return null;
        }
        await sel.deferUpdate();
        return sel.values[0];
      } catch {
        await interaction.editReply({ content: "Timed out.", components: [] });
        return null;
      }
    }

    async function pickCard(
      interaction,
      setData,
      setId,
      prefix,
      filterCardIds,
    ) {
      const cardIds = filterCardIds || Object.keys(setData.cards);
      const PER_PAGE = 20;
      let page = 0;
      const totalPages = Math.ceil(cardIds.length / PER_PAGE);

      const cardSelect = `${prefix}-card-sel-${interaction.id}`;
      const cardBack = `${prefix}-card-back-${interaction.id}`;
      const cardPrev = `${prefix}-card-prev-${interaction.id}`;
      const cardNext = `${prefix}-card-next-${interaction.id}`;
      const cardCancel = `${prefix}-card-cancel-${interaction.id}`;

      function build(page) {
        const start = page * PER_PAGE;
        const pageCards = cardIds.slice(start, start + PER_PAGE);
        const lines = pageCards.map((cid) => {
          const c = setData.cards[cid];
          return `\`${getCardIndex(setData, cid)}.\` **${c.name}**`;
        });
        const desc =
          totalPages > 1
            ? `${lines.join("\n")}\n\n*Page ${page + 1}/${totalPages}*`
            : lines.join("\n");

        return {
          embeds: [
            new EmbedBuilder()
              .setColor(0x2b2d31)
              .setTitle(`📦 ${getSetName(setId)}`)
              .setDescription(desc),
          ],
          components: [
            new ActionRowBuilder().addComponents(
              new StringSelectMenuBuilder()
                .setCustomId(cardSelect)
                .setPlaceholder("Select a card")
                .addOptions(
                  pageCards.map((cid) =>
                    new StringSelectMenuOptionBuilder()
                      .setLabel(setData.cards[cid].name)
                      .setValue(cid),
                  ),
                ),
            ),
            new ActionRowBuilder().addComponents(
              new ButtonBuilder()
                .setCustomId(cardBack)
                .setLabel("Back")
                .setStyle(ButtonStyle.Secondary),
              new ButtonBuilder()
                .setCustomId(cardPrev)
                .setLabel("←")
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(page <= 0),
              new ButtonBuilder()
                .setCustomId(cardNext)
                .setLabel("→")
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(page >= totalPages - 1),
              new ButtonBuilder()
                .setCustomId(cardCancel)
                .setLabel("Cancel")
                .setStyle(ButtonStyle.Danger),
            ),
          ],
        };
      }

      let msg = await interaction.editReply(build(page));

      while (true) {
        try {
          const sel = await msg.awaitMessageComponent({
            filter: (i) =>
              i.user.id === interaction.user.id &&
              [cardSelect, cardBack, cardPrev, cardNext, cardCancel].includes(
                i.customId,
              ),
            time: 60000,
          });

          if (sel.customId === cardCancel) {
            await sel.update({
              content: "Cancelled.",
              embeds: [],
              components: [],
            });
            return null;
          }

          if (sel.customId === cardBack) {
            await sel.deferUpdate();
            return "BACK";
          }

          if (sel.customId === cardPrev) {
            page = Math.max(0, page - 1);
            msg = await sel.update(build(page));
            continue;
          }

          if (sel.customId === cardNext) {
            page = Math.min(totalPages - 1, page + 1);
            msg = await sel.update(build(page));
            continue;
          }

          if (sel.customId === cardSelect) {
            await sel.deferUpdate();
            return sel.values[0];
          }
        } catch {
          await interaction.editReply({
            content: "Timed out.",
            components: [],
          });
          return null;
        }
      }
    }

    async function pickEdition(interaction, availableEditions, prefix, label) {
      if (availableEditions.length === 1) return availableEditions[0];

      const editionSelect = `${prefix}-ed-sel-${interaction.id}`;
      const editionCancel = `${prefix}-ed-cancel-${interaction.id}`;

      const edEmbed = new EmbedBuilder()
        .setColor(0x2b2d31)
        .setTitle(label || "Select an edition")
        .setDescription("Choose an edition.");

      const edRow = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId(editionSelect)
          .setPlaceholder("Choose an edition")
          .addOptions(
            availableEditions.map((ed) =>
              new StringSelectMenuOptionBuilder().setLabel(ed).setValue(ed),
            ),
          ),
      );
      const cancelRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(editionCancel)
          .setLabel("Cancel")
          .setStyle(ButtonStyle.Danger),
      );

      const msg = await interaction.editReply({
        embeds: [edEmbed],
        components:
          availableEditions.length > 0 ? [edRow, cancelRow] : [cancelRow],
      });

      try {
        const sel = await msg.awaitMessageComponent({
          filter: (i) =>
            i.user.id === interaction.user.id &&
            (i.customId === editionSelect || i.customId === editionCancel),
          time: 60000,
        });
        if (sel.customId === editionCancel) {
          await sel.update({
            content: "Cancelled.",
            embeds: [],
            components: [],
          });
          return null;
        }
        await sel.deferUpdate();
        return sel.values[0];
      } catch {
        await interaction.editReply({ content: "Timed out.", components: [] });
        return null;
      }
    }

    if (subcommand === "add") {
      const target = interaction.options.getUser("user");
      const count = interaction.options.getInteger("count");

      await interaction.deferReply({ flags: 64 });

      let targetSetId;
      while (true) {
        targetSetId = await pickSet(
          interaction,
          `Adding **${count}** card(s) to <@${target.id}>`,
          target,
          count,
          "add",
        );
        if (targetSetId === null) return;

        const setData = resolveSet(targetSetId);
        const picked = await pickCard(interaction, setData, targetSetId, "add");
        if (picked === null) return;
        if (picked === "BACK") continue;

        const edition = await pickEdition(
          interaction,
          Object.keys(require("../../tradingCards/data/config/editions.json")),
          "add",
          `Select edition for **${picked}**`,
        );
        if (edition === null) return;

        const user = loadUser(target.id);
        if (!user.collection[picked]) user.collection[picked] = {};
        if (!user.collection[picked][edition])
          user.collection[picked][edition] = 0;
        user.collection[picked][edition] += count;
        saveUser(user);

        await dmUser(
          target,
          `You received **${count}** **${setData.cards[picked].name}** (${edition}) from an admin.`,
        );

        await interaction.editReply({
          content: `Added **${count}** copy(ies) of **${picked}** (${edition}) to <@${target.id}>.`,
          components: [],
        });
        return;
      }
    }

    if (subcommand === "remove") {
      const target = interaction.options.getUser("user");
      const count = interaction.options.getInteger("count");

      await interaction.deferReply({ flags: 64 });

      let targetSetId;
      while (true) {
        const userData = loadUser(target.id);
        const ownedSetIds = Object.keys(userData.collection || {});
        if (!ownedSetIds.length) {
          await interaction.editReply({
            content: `<@${target.id}> has no cards.`,
          });
          return;
        }

        const ownedSetLookup = {};
        for (const cid of ownedSetIds) {
          for (const sid of Object.keys(setsConfig)) {
            const setData = resolveSet(sid);
            if (setData.cards[cid]) {
              if (!ownedSetLookup[sid]) ownedSetLookup[sid] = true;
              break;
            }
          }
        }
        const ownedSetIdsOrdered = Object.keys(setsConfig).filter(
          (id) => ownedSetLookup[id],
        );

        if (!ownedSetIdsOrdered.length) {
          await interaction.editReply({
            content: `<@${target.id}> has no cards in any known set.`,
          });
          return;
        }

        const setIdPicker = `rem-set-${interaction.id}`;
        const cancelId = `rem-cancel-${interaction.id}`;

        const setEmbed = new EmbedBuilder()
          .setColor(0x2b2d31)
          .setTitle("📦 Select a set")
          .setDescription(
            `Removing **${count}** card(s) from <@${target.id}>\nChoose a set.`,
          );

        const setRow = new ActionRowBuilder().addComponents(
          new StringSelectMenuBuilder()
            .setCustomId(setIdPicker)
            .setPlaceholder("Choose a set")
            .addOptions(
              ownedSetIdsOrdered.map((id) => ({
                label: getSetName(id),
                value: id,
              })),
            ),
        );
        const cancelRow = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId(cancelId)
            .setLabel("Cancel")
            .setStyle(ButtonStyle.Danger),
        );

        const setMsg = await interaction.editReply({
          embeds: [setEmbed],
          components: [setRow, cancelRow],
        });

        try {
          const sel = await setMsg.awaitMessageComponent({
            filter: (i) =>
              i.user.id === interaction.user.id &&
              (i.customId === setIdPicker || i.customId === cancelId),
            time: 60000,
          });
          if (sel.customId === cancelId) {
            await sel.update({
              content: "Cancelled.",
              embeds: [],
              components: [],
            });
            return;
          }
          targetSetId = sel.values[0];
          await sel.deferUpdate();
        } catch {
          await interaction.editReply({
            content: "Timed out.",
            components: [],
          });
          return;
        }

        const setData = resolveSet(targetSetId);
        const freshUser = loadUser(target.id);
        const ownedCardIds = Object.keys(setData.cards).filter(
          (cid) => freshUser.collection[cid],
        );
        if (!ownedCardIds.length) {
          await interaction.editReply({
            content: `<@${target.id}> doesn't own any cards in that set.`,
            components: [],
          });
          return;
        }
        const picked = await pickCard(
          interaction,
          setData,
          targetSetId,
          "rem",
          ownedCardIds,
        );
        if (picked === null) return;
        if (picked === "BACK") continue;

        const ownedEditions = Object.keys(freshUser.collection[picked] || {});
        if (!ownedEditions.length) {
          await interaction.editReply({
            content: `<@${target.id}> doesn't own **${picked}** anymore.`,
          });
          return;
        }

        const edition = await pickEdition(
          interaction,
          ownedEditions,
          "rem",
          `Select edition to remove for **${picked}**`,
        );
        if (edition === null) return;

        const user = loadUser(target.id);
        const owned = user.collection[picked]?.[edition] || 0;
        const toRemove = Math.min(count, owned);
        user.collection[picked][edition] -= toRemove;
        if (user.collection[picked][edition] <= 0) {
          delete user.collection[picked][edition];
        }
        if (Object.keys(user.collection[picked]).length === 0) {
          delete user.collection[picked];
        }
        saveUser(user);

        await dmUser(
          target,
          `**${toRemove}** **${setData.cards[picked].name}** (${edition}) were removed from you by an admin.`,
        );

        await interaction.editReply({
          content: `Removed **${toRemove}** copy(ies) of **${picked}** (${edition}) from <@${target.id}>.`,
          components: [],
        });
        return;
      }
    }

    if (subcommand === "addall") {
      const target = interaction.options.getUser("user");

      const setIds = Object.keys(setsConfig).sort();
      const editionsConfig = require("../../tradingCards/data/config/editions.json");
      const editionKeys = Object.keys(editionsConfig);
      const user = loadUser(target.id);
      let addedCount = 0;

      for (const setId of setIds) {
        const setData = resolveSet(setId);
        if (!setData) continue;
        for (const cardId of Object.keys(setData.cards)) {
          if (!user.collection[cardId]) {
            user.collection[cardId] = {};
          }
          for (const ed of editionKeys) {
            if (!user.collection[cardId][ed]) {
              user.collection[cardId][ed] = 0;
            }
            user.collection[cardId][ed]++;
          }
          addedCount++;
        }
      }

      saveUser(user);

      await dmUser(
        target,
        `You received every card in the game in every edition from an admin.`,
      );

      await interaction.reply({
        content: `Added every card in the game in every edition to <@${target.id}>.`,
        flags: 64,
      });
      return;
    }

    if (subcommand === "removeall") {
      const target = interaction.options.getUser("user");

      const user = loadUser(target.id);
      user.collection = {};
      saveUser(user);

      await dmUser(target, `All your cards have been removed by an admin.`);

      await interaction.reply({
        content: `Removed all cards from <@${target.id}>.`,
        flags: 64,
      });
      return;
    }

    if (group === "source") {
      const file = interaction.options.getString("file");

      if (subcommand === "pull") {
        await interaction.deferReply();
        try {
          await interaction.editReply({ files: [file] });
        } catch {
          await interaction.editReply({
            content: `File **${file}** not found.`,
          });
        }
        return;
      }

      if (subcommand === "replace") {
        const upload = interaction.options.getAttachment("upload");
        await interaction.deferReply({ flags: 64 });
        try {
          const res = await fetch(upload.url);
          const content = await res.text();
          require("fs").writeFileSync(file, content, "utf8");
          await interaction.editReply({ content: `Replaced **${file}**.` });
        } catch (err) {
          await interaction.editReply({
            content: `Failed to replace **${file}**: ${err.message}`,
          });
        }
        return;
      }

      if (subcommand === "cardpull") {
        const userId = interaction.options.getString("user_id");
        const filePath = `tradingCards/data/users/${userId}.json`;
        await interaction.deferReply({ flags: 64 });
        try {
          await interaction.editReply({ files: [filePath] });
        } catch {
          await interaction.editReply({
            content: `User data file for **${userId}** not found.`,
          });
        }
        return;
      }

      if (subcommand === "cardreplace") {
        const userId = interaction.options.getString("user_id");
        const upload = interaction.options.getAttachment("upload");
        const filePath = `tradingCards/data/users/${userId}.json`;
        await interaction.deferReply({ flags: 64 });
        try {
          const res = await fetch(upload.url);
          const content = await res.text();
          require("fs").writeFileSync(filePath, content, "utf8");
          await interaction.editReply({
            content: `Replaced user data for **${userId}**.`,
          });
        } catch (err) {
          await interaction.editReply({ content: `Failed: ${err.message}` });
        }
        return;
      }
      if (subcommand === "battlepull") {
        const userId = interaction.options.getString("user_id");
        const filePath = `battlePass/data/users/${userId}.json`;
        await interaction.deferReply({ flags: 64 });
        try {
          await interaction.editReply({ files: [filePath] });
        } catch {
          await interaction.editReply({
            content: `User data file for **${userId}** not found.`,
          });
        }
        return;
      }

      if (subcommand === "battlereplace") {
        const userId = interaction.options.getString("user_id");
        const upload = interaction.options.getAttachment("upload");
        const filePath = `battlePass/data/users/${userId}.json`;
        await interaction.deferReply({ flags: 64 });
        try {
          const res = await fetch(upload.url);
          const content = await res.text();
          require("fs").writeFileSync(filePath, content, "utf8");
          await interaction.editReply({
            content: `Replaced user data for **${userId}**.`,
          });
        } catch (err) {
          await interaction.editReply({ content: `Failed: ${err.message}` });
        }
        return;
      }
    }
  },
};
