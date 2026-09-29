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
  getCardAllowedEditions,
} = require("../Games/tradingCards.js");

const setsConfig = require("../../tradingCards/data/config/sets.json");
const packsConfig = require("../../tradingCards/data/config/packs.json");
const eventEditionsConfig = require("../../tradingCards/data/config/event_editions.json");

// Discord cannot restrict a command to a specific user, so every entry point is
// gated on this id at runtime. Keep it in sync with the bot owner.
const ADMIN_USER_ID = "1037466389163814932";

const RECAP_RARITY_ORDER = ["legendary", "epic", "rare", "uncommon", "common"];
// Timey Wimey is deliberately absent: it can roll on any card, is never counted
// towards set completion, and is excluded from recaps for the same reason.
const RECAP_EDITIONS = [
  "rainbow",
  "unpleasant",
  ...Object.keys(eventEditionsConfig).filter((e) => e !== "timey_wimey"),
  "gold",
  "foil",
  "basic",
];
const RECAP_EDITION_LABELS = {
  rainbow: "Rainbow",
  unpleasant: "Unpleasant",
  gold: "Gold",
  foil: "Foil",
  basic: "Basic",
};

function seasonChoices() {
  const fs = require("fs");
  const path = require("path");
  const { loadSeason } = require("../../battlePass/services/battlePassService");
  const dir = path.join(__dirname, "../../battlePass/data/seasons");
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".json") && f !== "404.json")
    .map((f) => f.replace(".json", ""))
    .sort()
    .map((id) => {
      const season = loadSeason(id);
      return {
        name: `${season?.name || `Season ${id}`} (${id})`.slice(0, 100),
        value: id,
      };
    });
}

// One fetch per URL per process. A mass recap asks for the same art repeatedly
// and the card CDN rate limits hard enough to 403 the whole origin.
const recapImageCache = new Map();

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Download with a short retry. The CDN answers 403/5xx when it decides a client
 * is hammering it, which a 60 user recap run easily looks like.
 */
async function fetchRecapImage(url, attempts = 3) {
  if (recapImageCache.has(url)) return recapImageCache.get(url);

  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      const buffer = await fetchImageBuffer(url);
      recapImageCache.set(url, buffer);
      return buffer;
    } catch (err) {
      lastError = err;
      if (attempt < attempts) await sleep(attempt * 1000);
    }
  }
  throw lastError;
}

/**
 * Lifetime collection totals for one set, scoped to a single user.
 * Timey Wimey copies are excluded everywhere so the numbers add up and match
 * how set completion is counted elsewhere in the game.
 */
function buildRecapStats(user, setId) {
  const set = resolveSet(setId);
  const cardIds = new Set(Object.keys(set.cards || {}));
  const byEdition = Object.fromEntries(RECAP_EDITIONS.map((e) => [e, 0]));
  const byRarity = Object.fromEntries(RECAP_RARITY_ORDER.map((r) => [r, 0]));
  const perCard = new Map();

  let totalCards = 0;

  for (const [cardId, editions] of Object.entries(user.collection || {})) {
    if (!cardIds.has(cardId)) continue;
    let cardTotal = 0;
    for (const [edition, count] of Object.entries(editions || {})) {
      if (edition === "timey_wimey") continue;
      const amount = (count || 0) > 0 ? count : 0;
      if (!amount) continue;
      if (edition in byEdition) byEdition[edition] += amount;
      cardTotal += amount;
    }
    if (!cardTotal) continue;
    totalCards += cardTotal;
    perCard.set(cardId, cardTotal);

    const rarity = set.cards[cardId].rarity;
    if (rarity in byRarity) byRarity[rarity] += cardTotal;
  }

  let topCardId = null;
  let topCount = 0;
  for (const [cardId, count] of perCard) {
    if (count > topCount || (count === topCount && cardId < topCardId)) {
      topCardId = cardId;
      topCount = count;
    }
  }

  return {
    setId,
    setName: setsConfig[setId]?.name || getSetName(setId, set),
    emoji: setsConfig[setId]?.emoji || "",
    totalCards,
    packsOpened: (user.packs_opened || {})[setId] || 0,
    byEdition,
    byRarity,
    topCard: topCardId
      ? { ...set.cards[topCardId], count: topCount, id: topCardId }
      : null,
  };
}

/**
 * Card art is a mix of png, jpg and webp, and the URL extension is not always
 * trustworthy (some are uppercase .JPG). Discord picks the content type from
 * the attachment name, so the name has to match the bytes we actually send.
 */
function detectImageExtension(buffer, url = "") {
  const b = buffer;
  if (b.length > 8 && b[0] === 0x89 && b[1] === 0x50) return "png";
  if (b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) {
    return "jpg";
  }
  if (
    b.length > 12 &&
    b.toString("ascii", 0, 4) === "RIFF" &&
    b.toString("ascii", 8, 12) === "WEBP"
  ) {
    return "webp";
  }
  if (
    b.length > 12 &&
    b.toString("ascii", 0, 4) === "RIFF" &&
    b.toString("ascii", 8, 12) === "AVI "
  ) {
    return "avi";
  }
  if (b.length > 4 && b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46) {
    return "gif";
  }
  if (b.length > 12 && b.toString("ascii", 4, 8) === "ftyp") return "avif";

  // Fall back to the URL, lowercased, and finally to png.
  const ext = (url.split("?")[0].split(".").pop() || "").toLowerCase();
  return ["png", "jpg", "jpeg", "webp", "gif", "avif"].includes(ext)
    ? ext
    : "png";
}

function fetchImageBuffer(url) {
  const https = require("https");
  return new Promise((resolve, reject) => {
    const request = https.get(
      url,
      { headers: { "User-Agent": "Mozilla/5.0" }, timeout: 10_000 },
      (res) => {
        if (
          res.statusCode >= 300 &&
          res.statusCode < 400 &&
          res.headers.location
        ) {
          res.resume();
          fetchImageBuffer(res.headers.location).then(resolve, reject);
          return;
        }
        if (res.statusCode !== 200) {
          res.resume();
          reject(new Error(`HTTP ${res.statusCode}`));
          return;
        }
        const chunks = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () => resolve(Buffer.concat(chunks)));
        res.on("error", reject);
      },
    );
    request.on("error", reject);
    request.on("timeout", () => {
      request.destroy();
      reject(new Error("timed out"));
    });
  });
}

function buildRecapEmbed({ season, seasonId, stats, xp, level, displayName }) {
  const { EmbedBuilder } = require("discord.js");
  const embed = new EmbedBuilder()
    .setColor(0x2b2d31)
    .setTitle(`${stats.emoji} ${season.name || `Season ${seasonId}`} Recap`)
    .setDescription(`Your **${stats.setName}** recap is here!`)
    .addFields(
      {
        name: "Season Progress",
        value: `**${xp.toLocaleString()}** XP\nLevel **${
          level > 100 ? `100+${level - 100}` : level
        }**`,
        inline: true,
      },
      {
        name: "Cards Obtained",
        value: `**${stats.totalCards.toLocaleString()}**\nPacks opened: **${stats.packsOpened.toLocaleString()}**`,
        inline: true,
      },
      {
        name: "Most Obtained Card",
        value: stats.topCard
          ? `**${stats.topCard.name}**\n**${stats.topCard.count}** copies`
          : "_No cards owned yet_",
        inline: true,
      },
      {
        name: "Editions",
        value:
          RECAP_EDITIONS.filter((e) => stats.byEdition[e] > 0)
            .map(
              (e) =>
                `**${stats.byEdition[e].toLocaleString()}** ${
                  RECAP_EDITION_LABELS[e] || titleCase(e)
                }`,
            )
            .join("\n") || "_None_",
        inline: true,
      },
      {
        name: "Rarities",
        value:
          RECAP_RARITY_ORDER.filter((r) => stats.byRarity[r] > 0)
            .map(
              (r) =>
                `**${stats.byRarity[r].toLocaleString()}** ${titleCase(r)}`,
            )
            .join("\n") || "_None_",
        inline: true,
      },
    )
    .setFooter({
      text: `Remember to run /battlepass to join the next season!`,
    });

  return embed;
}

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
            .setName("grid")
            .setDescription(
              "Render every card in a set (and its cover) to a grid image",
            )
            .addStringOption((o) =>
              o
                .setName("set")
                .setDescription("Which set")
                .setRequired(true)
                .addChoices(
                  ...Object.keys(setsConfig)
                    .sort()
                    .map((id) => ({ name: getSetName(id), value: id })),
                ),
            )
            .addIntegerOption((o) =>
              o
                .setName("columns")
                .setDescription("How many cards per row (default 10)")
                .setRequired(false)
                .setMinValue(1)
                .setMaxValue(20),
            ),
        )
        .addSubcommand((sub) =>
          sub
            .setName("circulation")
            .setDescription("Show total cards of each edition in circulation")
            .addStringOption((o) =>
              o
                .setName("card")
                .setDescription("Card ID to look up (optional)")
                .setRequired(false),
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
    .addSubcommand((sub) =>
      sub
        .setName("leaderboard")
        .setDescription("Show the level leaderboard for the current season")
        .addIntegerOption((o) =>
          o
            .setName("count")
            .setDescription("How many ranks to show (default 10, max 500)")
            .setRequired(false)
            .setMinValue(1)
            .setMaxValue(500),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName("recap")
        .setDescription("DM users a season recap")
        .addStringOption((o) =>
          o
            .setName("season")
            .setDescription("Season to recap (default: latest)")
            .setRequired(false)
            .addChoices(...seasonChoices()),
        )
        .addUserOption((o) =>
          o
            .setName("user")
            .setDescription("Only this user (default: everyone)")
            .setRequired(false),
        )
        .addIntegerOption((o) =>
          o
            .setName("delay")
            .setDescription("Seconds between each DM (default 3)")
            .setRequired(false)
            .setMinValue(1)
            .setMaxValue(30),
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
        )
        .addSubcommand((sub) =>
          sub
            .setName("cardbulkreplace")
            .setDescription("Replace all card user data files from a zip")
            .addAttachmentOption((o) =>
              o
                .setName("upload")
                .setDescription("Zip file containing JSON user data files")
                .setRequired(true),
            ),
        )
        .addSubcommand((sub) =>
          sub
            .setName("battlebulkreplace")
            .setDescription(
              "Replace all battle pass user data files from a zip",
            )
            .addAttachmentOption((o) =>
              o
                .setName("upload")
                .setDescription("Zip file containing JSON user data files")
                .setRequired(true),
            ),
        ),
    ),

  async autocomplete() {},

  async execute(interaction) {
    // Single gate for every subcommand: give, take, source file writes, recap
    // DMs and all of it. Checked before any option is read or file touched.
    if (interaction.user?.id !== ADMIN_USER_ID) {
      await interaction
        .reply({
          content: "You cannot use this command.",
          flags: 64,
        })
        .catch(() => {});
      return;
    }

    const group = interaction.options.getSubcommandGroup();
    const subcommand = interaction.options.getSubcommand();

    if (subcommand === "doublexp") {
      const state = interaction.options.getString("state");
      const fs = require("fs");
      const path = require("path");
      const doubleXpPath = path.join(
        __dirname,
        "../../battlePass/data/doubleXp.json",
      );
      fs.writeFileSync(
        doubleXpPath,
        JSON.stringify({ enabled: state === "enable" }, null, 2),
        "utf8",
      );
      await interaction.reply({
        content: `Global double XP has been **${state === "enable" ? "enabled" : "disabled"}**.`,
        flags: 64,
      });
      return;
    }

    if (subcommand === "leaderboard") {
      await interaction.deferReply();
      const fs = require("fs");
      const path = require("path");
      const {
        getCurrentSeason,
        getLatestSeasonId,
        getLevelFromXp,
      } = require("../../battlePass/services/battlePassService");

      const season = getCurrentSeason();
      const seasonId = getLatestSeasonId();
      if (!season || !seasonId) {
        await interaction.editReply({
          content: "There is no active Battle Pass season right now.",
        });
        return;
      }

      const usersPath = path.join(__dirname, "../../battlePass/data/users");
      const entries = [];
      if (fs.existsSync(usersPath)) {
        for (const file of fs
          .readdirSync(usersPath)
          .filter((f) => f.endsWith(".json"))) {
          try {
            const data = JSON.parse(
              fs.readFileSync(path.join(usersPath, file), "utf8"),
            );
            const seasonData = data.seasons?.[seasonId];
            if (!seasonData || !seasonData.xp) continue;
            entries.push({
              userId: data.user_id || file.replace(".json", ""),
              xp: seasonData.xp,
              level: getLevelFromXp(seasonData.xp, season),
            });
          } catch {}
        }
      }

      entries.sort((a, b) => b.level - a.level || b.xp - a.xp);

      const limit = Math.min(
        interaction.options.getInteger("count") || 10,
        500,
      );
      const ranked = entries.slice(0, limit);
      if (!ranked.length) {
        await interaction.editReply({
          content: `Nobody has entered **${season.name}** yet!`,
        });
        return;
      }

      const names = new Map();
      for (const entry of ranked) {
        const member = interaction.guild.members.cache.get(entry.userId);
        if (member) {
          names.set(entry.userId, member.displayName);
        } else {
          const user = await interaction.client.users
            .fetch(entry.userId)
            .catch(() => null);
          names.set(entry.userId, user?.username || "Unknown");
        }
      }

      const PER_PAGE = 10;
      const totalPages = Math.max(1, Math.ceil(ranked.length / PER_PAGE));
      let page = 0;

      const buildLeaderboard = () => {
        const slice = ranked.slice(page * PER_PAGE, (page + 1) * PER_PAGE);
        const lines = slice.map((entry, i) => {
          const rank = page * PER_PAGE + i + 1;
          const medal =
            rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : "▫️";
          // Same level format as /battlepass: bonus levels show as 100+n.
          const level =
            entry.level > 100 ? `100+${entry.level - 100}` : `${entry.level}`;
          return `${medal} **${rank}.** ${names.get(entry.userId)}\nLevel **${level}** · ${entry.xp.toLocaleString()} XP`;
        });

        const embed = new EmbedBuilder()
          .setColor(0x2b2d31)
          .setTitle(`🎖️ ${season.name} — Level Leaderboard`)
          .setDescription(lines.join("\n\n"))
          .setFooter({
            text: `Page ${page + 1}/${totalPages} · ${entries.length} participant${entries.length === 1 ? "" : "s"} · showing top ${ranked.length}`,
          });

        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId("bplb-left")
            .setLabel("←")
            .setStyle(ButtonStyle.Primary)
            .setDisabled(page <= 0),
          new ButtonBuilder()
            .setCustomId("bplb-right")
            .setLabel("→")
            .setStyle(ButtonStyle.Primary)
            .setDisabled(page >= totalPages - 1),
        );

        return { embeds: [embed], components: [row] };
      };

      const response = await interaction.editReply(buildLeaderboard());
      const collector = response.createMessageComponentCollector({
        componentType: ComponentType.Button,
        time: 5 * 60 * 1000,
      });

      collector.on("collect", async (btn) => {
        if (btn.user.id !== interaction.user.id) {
          await btn
            .reply({
              content:
                "Only the person who ran this command can use these buttons.",
              flags: 64,
            })
            .catch(() => {});
          return;
        }
        try {
          page = Math.max(
            0,
            Math.min(
              totalPages - 1,
              page + (btn.customId === "bplb-right" ? 1 : -1),
            ),
          );
          await btn.update(buildLeaderboard());
        } catch {}
      });

      collector.on("end", async () => {
        try {
          const msg = await interaction.fetchReply();
          await msg.edit({ components: [] });
        } catch {}
      });
      return;
    }

    if (subcommand === "recap") {
      const fs = require("fs");
      const path = require("path");
      const {
        loadSeason,
        getLatestSeasonId,
        loadUser: loadBpUser,
        getLevelFromXp,
      } = require("../../battlePass/services/battlePassService");

      const targetUser = interaction.options.getUser("user");
      const requestedSeason =
        interaction.options.getString("season") || getLatestSeasonId();
      const season = requestedSeason ? loadSeason(requestedSeason) : null;

      if (!season) {
        await interaction.reply({
          content: "That season could not be found.",
          flags: 64,
        });
        return;
      }

      const setId = season.reward_set;
      if (!setId || !setsConfig[setId]) {
        await interaction.reply({
          content: `**${season.name || requestedSeason}** has no card set attached, so there is nothing to recap.`,
          flags: 64,
        });
        return;
      }

      const delaySeconds = interaction.options.getInteger("delay") || 3;
      await interaction.deferReply();

      // Union of both user directories: a recap needs both a season entry and
      // a card collection, and either side can be missing.
      const cardUsersPath = path.join(
        __dirname,
        "../../tradingCards/data/users",
      );
      const bpUsersPath = path.join(__dirname, "../../battlePass/data/users");
      const ids = new Set();
      for (const dir of [cardUsersPath, bpUsersPath]) {
        if (!fs.existsSync(dir)) continue;
        for (const file of fs
          .readdirSync(dir)
          .filter((f) => f.endsWith(".json"))) {
          ids.add(file.replace(".json", ""));
        }
      }
      const userIds = targetUser ? [targetUser.id] : [...ids];

      // A mass recap DMs every user on file, so confirm before sending. A
      // single-user recap is deliberate and only needs the one click.
      if (!targetUser) {
        const confirmId = `recap-confirm-${interaction.id}`;
        const cancelId = `recap-cancel-${interaction.id}`;
        const preview = await interaction.editReply({
          content:
            `Send the **${season.name || requestedSeason}** recap to **${userIds.length}** users?\n` +
            `Set: **${setsConfig[setId].name}**. ${delaySeconds}s between DMs`,
          components: [
            new ActionRowBuilder().addComponents(
              new ButtonBuilder()
                .setCustomId(confirmId)
                .setLabel(`Send ${userIds.length} recaps`)
                .setStyle(ButtonStyle.Danger),
              new ButtonBuilder()
                .setCustomId(cancelId)
                .setLabel("Cancel")
                .setStyle(ButtonStyle.Secondary),
            ),
          ],
        });
        try {
          const choice = await preview.awaitMessageComponent({
            filter: (i) => i.user.id === interaction.user.id,
            time: 60000,
          });
          if (choice.customId === cancelId) {
            await choice.update({
              content: "Recap cancelled — no DMs were sent.",
              components: [],
            });
            return;
          }
          await choice.deferUpdate();
        } catch {
          await interaction
            .editReply({
              content: "Recap timed out — no DMs were sent.",
              components: [],
            })
            .catch(() => {});
          return;
        }
      }

      const results = { sent: 0, skipped: 0, failed: [], fallbackSent: 0 };
      const total = userIds.length;

      for (let i = 0; i < userIds.length; i++) {
        const userId = userIds[i];
        const progress = `[${i + 1}/${total}]`;

        // Never let one bad record abort a 60 user run.
        let fallbackPayload = null;
        try {
          const bpUser = loadBpUser(userId);
          const seasonData = bpUser?.seasons?.[requestedSeason];
          if (!seasonData || !seasonData.xp) {
            results.skipped++;
            continue;
          }

          const user = loadUser(userId);
          const stats = buildRecapStats(user, setId);
          const level = getLevelFromXp(seasonData.xp, season);
          const displayName = targetUser
            ? targetUser.username
            : bpUser.username ||
              (await interaction.client.users
                .fetch(userId)
                .then((u) => u.username)
                .catch(() => userId));

          const embed = buildRecapEmbed({
            season,
            seasonId: requestedSeason,
            stats,
            xp: seasonData.xp,
            level,
            displayName,
          });

          const files = [];
          let attached = false;
          if (stats.topCard?.art_url) {
            try {
              const buffer = await fetchRecapImage(stats.topCard.art_url);
              const ext = detectImageExtension(buffer, stats.topCard.art_url);
              files.push(
                new AttachmentBuilder(buffer, {
                  name: `recap-${stats.topCard.id}.${ext}`,
                }),
              );
              attached = true;
            } catch (err) {
              // Never let a blocked CDN cost the user their recap, and never
              // hide the failure either.
              console.warn(
                `Recap image failed for ${userId} (${stats.topCard.id}): ${err.message}`,
              );
            }
          }
          if (!attached && stats.topCard?.art_url) {
            // Discord fetches this through its own image proxy, so a 403 on the
            // bot's IP cannot hide the card.
            embed.setImage(stats.topCard.art_url);
          }

          const dmUser = await interaction.client.users.fetch(userId);
          fallbackPayload = { embeds: [embed], files };
          await dmUser.send({ embeds: [embed], files });
          results.sent++;
        } catch (err) {
          // 50007 = DMs closed, 10013 = cannot DM this user, anything else is
          // a data or network problem worth reporting.
          const reason =
            err?.code === 50007 ? "DMs closed" : err?.message || "error";
          results.failed.push({ userId, reason });

          // A one-off recap has nowhere else to go, so post it in the channel
          // rather than losing it entirely when the DM bounces.
          if (targetUser && fallbackPayload) {
            try {
              await interaction.followUp({
                content: `Couldn't DM <@${userId}> (${reason}) — posting the recap here instead.`,
                ...fallbackPayload,
                flags: 64,
              });
              results.fallbackSent++;
            } catch {}
          }
        }

        if (i < userIds.length - 1) await sleep(delaySeconds * 1000);

        if (i % 5 === 0 || i === userIds.length - 1) {
          await interaction
            .editReply({
              content: `Sending recaps... ${progress}\nSent **${results.sent}** · skipped **${results.skipped}** · failed **${results.failed.length}**`,
            })
            .catch(() => {});
        }
      }

      const lines = [
        `Recap run finished for **${season.name || requestedSeason}** (set ${setId} — ${setsConfig[setId].name}).`,
        `Sent: **${results.sent}** · no season data: **${results.skipped}** · failed: **${results.failed.length}**`,
      ];
      if (results.fallbackSent) {
        lines.push(
          `Posted **${results.fallbackSent}** recap${
            results.fallbackSent === 1 ? "" : "s"
          } in this channel because the DM failed.`,
        );
      }
      if (results.failed.length) {
        lines.push(
          `Could not DM: ${results.failed
            .slice(0, 20)
            .map((f) => `<@${f.userId}> (${f.reason})`)
            .join(", ")}${results.failed.length > 20 ? " …" : ""}`,
        );
      }
      await interaction
        .editReply({ content: lines.join("\n") })
        .catch(() => {});
      return;
    }

    if (subcommand === "circulation") {
      await interaction.deferReply({ flags: 64 });
      const fs = require("fs");
      const path = require("path");
      const usersPath = path.join(__dirname, "../../tradingCards/data/users");
      const editionsConfig = require("../../tradingCards/data/config/editions.json");
      const eventEditionsConfig = require("../../tradingCards/data/config/event_editions.json");
      const allEditionKeys = Object.keys({
        ...editionsConfig,
        ...eventEditionsConfig,
      });
      const cardId = interaction.options.getString("card");

      // Resolve the card before scanning users: the completion star depends on
      // which editions that card is actually allowed to have.
      let cardName = cardId;
      let cardObj = null;
      if (cardId) {
        const setDir = path.join(__dirname, "../../tradingCards/data/sets");
        for (const sf of fs
          .readdirSync(setDir)
          .filter((f) => f.endsWith(".json"))) {
          try {
            const setData = JSON.parse(
              fs.readFileSync(path.join(setDir, sf), "utf8"),
            );
            if (setData.cards?.[cardId]) {
              cardName = setData.cards[cardId].name;
              cardObj = setData.cards[cardId];
              break;
            }
          } catch {}
        }
      }

      const counts = {};
      for (const ed of allEditionKeys) counts[ed] = 0;
      let totalCards = 0;
      let totalUsers = 0;
      const byCopies = [];
      const byRainbow = [];
      const byStar = [];
      // Same rule as the star badge drawn on the card image.
      const starEditions = cardObj
        ? getCardAllowedEditions(cardObj).filter(
            (ed) => ed !== "timey_wimey",
          )
        : [];

      if (fs.existsSync(usersPath)) {
        const files = fs
          .readdirSync(usersPath)
          .filter((f) => f.endsWith(".json"));
        for (const file of files) {
          try {
            const data = JSON.parse(
              fs.readFileSync(path.join(usersPath, file), "utf8"),
            );
            const userId = file.replace(/\.json$/, "");
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

            if (cardId) {
              const owned = data.collection?.[cardId] || {};
              let copies = 0;
              for (const count of Object.values(owned)) {
                if (typeof count === "number" && count > 0) copies += count;
              }
              if (copies > 0) {
                byCopies.push({ userId, copies });
                if ((owned.rainbow || 0) > 0) {
                  byRainbow.push({ userId, copies: owned.rainbow });
                }
                if (
                  starEditions.length &&
                  starEditions.every((ed) => (owned[ed] || 0) > 0)
                ) {
                  byStar.push({ userId, copies });
                }
              }
            }
          } catch {}
        }
      }

      // Highest first, with a stable id tie-break so equal counts keep the
      // same order between runs.
      const rank = (a, b) =>
        b.copies - a.copies || a.userId.localeCompare(b.userId);
      byCopies.sort(rank);
      byRainbow.sort(rank);
      byStar.sort(rank);

      const topLine = (entries, suffix) =>
        entries.length
          ? entries
              .slice(0, 3)
              .map((e) => `<@${e.userId}> (${e.copies}${suffix})`)
              .join("\n")
          : "_Nobody yet_";

      let embed;
      if (cardId) {
        embed = new EmbedBuilder()
          .setColor(0x2b2d31)
          .setTitle(`📊 Card Circulation — ${cardId}`)
          .setDescription(
            `**${cardName}**\n**Total copies:** ${totalCards.toLocaleString()}\n**Owners:** ${totalUsers}`,
          )
          .addFields(
            ...allEditionKeys
              .filter((ed) => counts[ed] > 0)
              .map((ed) => ({
                name:
                  editionsConfig[ed]?.display_name ||
                  eventEditionsConfig[ed]?.display_name ||
                  ed,
                value: `**${counts[ed].toLocaleString()}** copies`,
                inline: true,
              })),
            {
              name: "🏆 Most copies",
              value: topLine(byCopies, ""),
              inline: true,
            },
            {
              name: "🌈 Top rainbow owners",
              value: topLine(byRainbow, "🌈"),
              inline: true,
            },
            {
              name: "⭐ Completion stars",
              value: topLine(byStar, ""),
              inline: true,
            },
          );
      } else {
        embed = new EmbedBuilder()
          .setColor(0x2b2d31)
          .setTitle("📊 Card Circulation")
          .setDescription(
            `**Total cards in circulation:** ${totalCards.toLocaleString()}\n**Users with cards:** ${totalUsers}`,
          )
          .addFields(
            ...allEditionKeys.map((ed) => ({
              name:
                editionsConfig[ed]?.display_name ||
                eventEditionsConfig[ed]?.display_name ||
                ed,
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
            (i.customId === setIdPicker ||
              i.customId === legacyGiveId ||
              i.customId === cancelId),
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
          targetPackType =
            Object.keys(packsConfig).find((pt) => packsConfig[pt]?.legacy) ||
            "legacy_pack";
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

    if (subcommand === "grid") {
      const { createCanvas, loadImage } = require("@napi-rs/canvas");
      const https = require("https");
      const setId = interaction.options.getString("set");
      const requestedColumns = interaction.options.getInteger("columns") || 10;

      await interaction.deferReply({ flags: 64 });

      const set = resolveSet(setId);
      const setName = getSetName(setId, set);
      const cardIds = Object.keys(set.cards).sort();

      const PAD = 16;
      const GAP = 8;
      const CELL = 140;
      const LABEL = 26;
      const HEADER = 56;
      const COVER_W = 220;
      const COVER_H = 260;
      const MAX_HEIGHT = 6000;

      const measure = (cols) => {
        const rowCount = Math.ceil(cardIds.length / cols);
        return {
          width: PAD * 2 + cols * CELL + (cols - 1) * GAP,
          height:
            HEADER + COVER_H + rowCount * (CELL + LABEL + GAP) - GAP + PAD,
        };
      };

      // Widen the grid rather than producing an image too tall for Discord.
      let columns = requestedColumns;
      while (columns < cardIds.length && measure(columns).height > MAX_HEIGHT) {
        columns++;
      }
      const { width, height } = measure(columns);

      const canvas = createCanvas(width, height);
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = "#2b2d31";
      ctx.fillRect(0, 0, width, height);

      const drawCover = (img) => {
        // Covers are portrait, so the box has to be fitted on both axes.
        const scale = Math.min(COVER_W / img.width, COVER_H / img.height);
        const w = img.width * scale;
        const h = img.height * scale;
        ctx.drawImage(img, (width - w) / 2, HEADER + (COVER_H - h) / 2, w, h);
      };

      const fetchImage = async (url) => {
        try {
          const buf = await new Promise((resolve, reject) => {
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
          return await loadImage(buf);
        } catch {
          return null;
        }
      };

      const coverUrl = setsConfig[setId]?.pack_cover_url;
      if (coverUrl) {
        const cover = await fetchImage(coverUrl);
        if (cover) drawCover(cover);
      }

      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 30px 'Segoe UI', sans-serif";
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      ctx.fillText(
        `${setName} - ${cardIds.length} cards`.trim(),
        PAD,
        HEADER / 2,
      );

      let failed = 0;
      const BATCH = 8;
      for (let start = 0; start < cardIds.length; start += BATCH) {
        const batch = cardIds.slice(start, start + BATCH);
        const loaded = await Promise.all(
          batch.map((cardId) => fetchImage(set.cards[cardId]?.art_url)),
        );

        loaded.forEach((img, i) => {
          const index = start + i;
          const cardId = batch[i];
          const x = PAD + (index % columns) * (CELL + GAP);
          const y =
            HEADER +
            COVER_H +
            Math.floor(index / columns) * (CELL + LABEL + GAP);

          if (img) {
            const scale = Math.min(CELL / img.width, CELL / img.height);
            const w = img.width * scale;
            const h = img.height * scale;
            ctx.drawImage(img, x + (CELL - w) / 2, y + (CELL - h) / 2, w, h);
          } else {
            failed++;
            ctx.fillStyle = "#1a1a2e";
            ctx.fillRect(x, y, CELL, CELL);
            ctx.fillStyle = "#808080";
            ctx.font = "14px 'Segoe UI', sans-serif";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText("no art", x + CELL / 2, y + CELL / 2);
          }

          const cardNumber = getCardIndex(set, cardId);
          const label = `${cardNumber} · ${set.cards[cardId]?.name || cardId}`;
          ctx.fillStyle = "#b9bbbe";
          ctx.font = "16px 'Segoe UI', sans-serif";
          ctx.textAlign = "center";
          ctx.fillText(label.slice(0, 30), x + CELL / 2, y + CELL + LABEL / 2);
        });

        await new Promise((r) => setImmediate(r));
      }

      const attachment = new AttachmentBuilder(canvas.toBuffer("image/png"), {
        name: `set-${setId}-grid.png`,
      });

      await interaction.editReply({
        content:
          `🖼️ **${setName}** — ${cardIds.length} cards in a ${columns}-column grid.` +
          (columns !== requestedColumns
            ? `\n-# Bumped to ${columns} columns to keep the image within Discord's size limit.`
            : "") +
          (failed
            ? `\n⚠️ ${failed} card${failed === 1 ? "" : "s"} could not be loaded.`
            : ""),
        files: [attachment],
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

      if (
        subcommand === "cardbulkreplace" ||
        subcommand === "battlebulkreplace"
      ) {
        const upload = interaction.options.getAttachment("upload");
        const targetDir =
          subcommand === "cardbulkreplace"
            ? "tradingCards/data/users"
            : "battlePass/data/users";
        const typeLabel =
          subcommand === "cardbulkreplace" ? "Card" : "Battle pass";

        await interaction.deferReply({ flags: 64 });

        try {
          const res = await fetch(upload.url);
          const buffer = Buffer.from(await res.arrayBuffer());
          const AdmZip = require("adm-zip");
          const zip = new AdmZip(buffer);
          const entries = zip.getEntries();

          const jsonFiles = entries.filter(
            (e) => e.entryName.endsWith(".json") && !e.entryName.includes("/"),
          );

          if (jsonFiles.length === 0) {
            await interaction.editReply({
              content:
                "No JSON files found in the zip. Expected a flat structure with `.json` files at the root.",
            });
            return;
          }

          const confirmRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId("confirm_bulk_replace")
              .setLabel(`Replace ${jsonFiles.length} files`)
              .setStyle(ButtonStyle.Danger),
            new ButtonBuilder()
              .setCustomId("cancel_bulk_replace")
              .setLabel("Cancel")
              .setStyle(ButtonStyle.Secondary),
          );

          await interaction.editReply({
            content: `This will **delete all existing files** in \`${targetDir}/\` and replace them with **${jsonFiles.length} files** from the zip.\n\nAre you sure?`,
            components: [confirmRow],
          });

          const confirmation = await interaction.channel.awaitMessageComponent({
            filter: (i) => i.user.id === interaction.user.id,
            time: 30000,
          });

          if (confirmation.customId === "cancel_bulk_replace") {
            await confirmation.update({
              content: "Cancelled.",
              components: [],
            });
            return;
          }

          await confirmation.update({
            content: `Replacing ${jsonFiles.length} files...`,
            components: [],
          });

          const fs = require("fs");
          const path = require("path");
          const targetPath = path.resolve(targetDir);
          const existingFiles = fs.readdirSync(targetPath);
          for (const file of existingFiles) {
            fs.unlinkSync(path.join(targetPath, file));
          }

          let written = 0;
          for (const entry of jsonFiles) {
            const content = entry.getData().toString("utf8");
            const filePath = path.join(targetPath, entry.name);
            fs.writeFileSync(filePath, content, "utf8");
            written++;
          }

          await interaction.editReply({
            content: `${typeLabel} bulk replace complete. Deleted **${existingFiles.length}** old files, wrote **${written}** new files.`,
            components: [],
          });
        } catch (err) {
          await interaction.editReply({
            content: `Failed: ${err.message}`,
            components: [],
          });
        }
        return;
      }
    }
  },
};
