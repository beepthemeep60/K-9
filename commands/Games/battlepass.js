const {
  SlashCommandBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
} = require("discord.js");

const {
  getCurrentSeason,
  getLatestSeasonId,
  loadUser,
  createUser,
  getSeasonData,
  saveUser,
  getLevelFromXp,
  getTotalXpForLevel,
} = require("../../battlePass/services/battlePassService");

const {
  loadUser: loadCardUser,
  addPack,
} = require("../../tradingCards/services/userService");
const fs = require("fs");

function getMultipliers(member, dailyStreak) {
  const hasBooster = member?.roles.cache.has("1018200127598497893") || false;
  let punchScore = 0;
  try {
    const punchData = fs.readFileSync("./punch.txt", "utf-8");
    const line = punchData
      .split("\n")
      .find((l) => l.startsWith(member?.id + ","));
    if (line) punchScore = parseInt(line.split(",")[1], 10);
  } catch {}

  let rouletteScore = 0;
  try {
    const rouletteData = fs.readFileSync("./roulette.txt", "utf-8");
    const line = rouletteData
      .split("\n")
      .find((l) => l.startsWith(member?.id + ","));
    if (line) rouletteScore = parseInt(line.split(",")[1], 10);
  } catch {}

  const boosterPct = 50;
  const punchPct = 25;
  const roulettePct = (rouletteScore * 2.5).toFixed(1);
  const dailyPct = ((dailyStreak || 0) * 2.5).toFixed(1);

  const lines = [];

  // Check for global double XP (displayed at the top)
  try {
    const doubleXpPath = require("path").join(
      __dirname,
      "../../battlePass/data/doubleXp.json",
    );
    if (require("fs").existsSync(doubleXpPath)) {
      const doubleXpData = JSON.parse(
        require("fs").readFileSync(doubleXpPath, "utf8"),
      );
      if (doubleXpData.enabled) {
        lines.push("🌟 **GLOBAL DOUBLE XP ACTIVE!** 🌟");
      }
    }
  } catch {}

  const dayOfWeek = new Date().getDay();
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    lines.push("📅 It's the weekend! +50%");
  }

  lines.push(`${hasBooster ? "✅" : "❌"} Server booster: +${boosterPct}%`);

  // Event winner role - 4x boost
  let hasEventWinnerRole = false;
  try {
    const ewRolePath = require("path").join(
      __dirname,
      "../../battlePass/data/eventWinnerRoles.json",
    );
    if (require("fs").existsSync(ewRolePath)) {
      const ewRoles = JSON.parse(
        require("fs").readFileSync(ewRolePath, "utf8"),
      );
      if (Array.isArray(ewRoles) && ewRoles.length > 0) {
        hasEventWinnerRole = ewRoles.some((roleId) =>
          member?.roles?.cache?.has(roleId),
        );
      }
    }
  } catch {}
  if (hasEventWinnerRole) lines.push("✅ Event Winner: +300%");

  lines.push(
    `${punchScore >= 3000 ? "✅" : "❌"} \`/punch\` completed: +${punchPct}%`,
  );
  lines.push(
    `${rouletteScore > 0 ? "✅" : "❌"} \`/roulette\` streak: +${roulettePct}%`,
  );
  lines.push(
    `✅ Daily login: ${(dailyStreak || 0) >= 0 ? "+" : ""}${dailyPct}% (${dailyStreak || 0} day${dailyStreak !== 1 ? "s" : ""})`,
  );

  return lines.join("\n");
}

function buildLevelEmbed(seasonData, season, member) {
  const level = getLevelFromXp(seasonData.xp, season);
  const currentLevelXp = level === 0 ? 0 : getTotalXpForLevel(level, season);
  const nextLevelXp =
    level >= 100
      ? getTotalXpForLevel(100, season)
      : getTotalXpForLevel(level + 1, season);
  const xpInLevel = seasonData.xp - currentLevelXp;
  const xpNeeded = nextLevelXp - currentLevelXp;
  const progress =
    xpNeeded > 0
      ? Math.min(Math.round((xpInLevel / xpNeeded) * 100), 100)
      : 100;
  const bar =
    "█".repeat(Math.floor(progress / 10)) +
    "░".repeat(10 - Math.floor(progress / 10));

  // Find next alternate reward milestone
  let nextMilestone = null;
  if (season.alternate_rewards && level < 100) {
    const milestoneLevels = Object.keys(season.alternate_rewards)
      .filter((k) => !k.startsWith("_"))
      .map(Number)
      .filter((lvl) => lvl > level)
      .sort((a, b) => a - b);
    if (milestoneLevels.length > 0) {
      const nextLvl = milestoneLevels[0];
      const reward = season.alternate_rewards[String(nextLvl)];
      const rewardEmoji = reward.emoji || "✉️";
      const amount = reward.amount || 1;
      let rewardLabel;
      if (reward.type === "pack") {
        const name =
          amount > 1
            ? `${amount}x ${reward.pack_type.replace(/_/g, " ")}`
            : reward.pack_type.replace(/_/g, " ");
        rewardLabel = `${rewardEmoji} ${name}`;
      } else if (reward.type === "role") {
        rewardLabel = `${rewardEmoji} Season Completion Role${amount > 1 ? ` x${amount}` : ""}`;
      } else {
        rewardLabel = `${rewardEmoji} Reward`;
      }
      nextMilestone = `**Level ${nextLvl}:** ${rewardLabel}`;
    }
  }

  const multipliers = getMultipliers(member, seasonData.daily_streak);

  const dailyXpCap = (season.xp_per_level || 100) * 3;
  const xpToday = seasonData.xp_today || 0;
  const capped = xpToday >= dailyXpCap;
  const dailyLine = capped
    ? `\n⚠️Daily XP limit of ${dailyXpCap.toLocaleString()} reached.\nAll XP gain reduced by 90% until tomorrow.`
    : ``;

  const embed = new EmbedBuilder()
    .setColor(0x2b2d31)
    .setTitle(`🎖️ ${season.name}`)
    .setDescription(level >= 100 ? "🎉 **Max Level!**" : `Level **${level}**`)
    .addFields(
      {
        name: "XP",
        value: `${seasonData.xp.toLocaleString()} / ${nextLevelXp.toLocaleString()}\n${dailyLine}`,
        inline: false,
      },
      {
        name: "Progress",
        value: `${bar} ${progress}%`,
        inline: false,
      },
      {
        name: "Multipliers",
        value: multipliers,
        inline: false,
      },
      ...(nextMilestone
        ? [{ name: "Next Milestone", value: nextMilestone, inline: false }]
        : []),
    );

  return { embed, level };
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("battlepass")
    .setDescription("View your Battle Pass progress and level up rewards!"),

  async execute(interaction) {
    const season = getCurrentSeason();
    if (!season) {
      await interaction.reply({
        content: "There is no active Battle Pass season right now.",
        flags: 64,
      });
      return;
    }

    const seasonId = getLatestSeasonId();
    let userData = loadUser(interaction.user.id);
    const member = await interaction.guild.members
      .fetch(interaction.user.id)
      .catch(() => null);

    const isInThisSeason = userData && userData.seasons?.[seasonId];

    if (!isInThisSeason) {
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("bp_enter")
          .setLabel("Enter Battle Pass")
          .setStyle(ButtonStyle.Success)
          .setEmoji("🎖️"),
      );

      await interaction.reply({
        content: `**${season.name}** is active! Click below to enter and start earning XP.`,
        components: [row],
        flags: 64,
      });

      const response = await interaction.fetchReply();

      const enterCollector = response.createMessageComponentCollector({
        filter: (i) => i.user.id === interaction.user.id,
        time: 120000,
      });

      enterCollector.on("collect", async (i) => {
        if (i.customId === "bp_enter") {
          if (!userData) {
            userData = createUser(interaction.user.id);
          }
          getSeasonData(userData, seasonId);

          const seasonSetId = getLatestSeasonId();
          if (seasonSetId) {
            try {
              addPack(interaction.user.id, seasonSetId, "standard_pack", 1);
            } catch {}
          }

          if (member && season.participation_role_id) {
            const cardUser = loadCardUser(interaction.user.id);
            if (!cardUser?.settings?.disable_participation_role) {
              try {
                await member.roles.add(season.participation_role_id);
              } catch {}
            }
          }

          saveUser(userData);

          await i.update({
            content: `You've entered **${season.name}**! You'll level up as you chat!\n\nRun this command again any time to see your current level and active multipliers!`,
            components: [],
          });

          if (userData.tutorial_step === 0) {
            userData.tutorial_step = 1;
            saveUser(userData);
            await i.followUp({
              content:
                "**Welcome to the Battle Pass!** 🎉\n\nAs this is your first time participating, I'll run you through opening your first pack of cards!\n\nFirst, let's use `/cards inventory` to check what packs you own!\n\n-# (1/5) Complete this tutorial to earn 1x ⭐Premium Pack!",
              flags: 64,
            });
          }
        }
      });

      enterCollector.on("end", async (collected) => {
        if (collected.size === 0) {
          try {
            await interaction.editReply({ components: [] });
          } catch {}
        }
      });
      return;
    }

    const seasonData = getSeasonData(userData, seasonId);

    // Sync daily streak as if they messaged
    const today = new Date().toISOString().split("T")[0];
    if (seasonData.last_message_date !== today) {
      seasonData.xp_today = 0;
      if (seasonData.last_message_date) {
        const last = new Date(seasonData.last_message_date);
        const diff = Math.floor((Date.now() - last.getTime()) / 86400000);
        const missed = diff - 1;
        seasonData.daily_streak =
          Math.max(0, (seasonData.daily_streak || 0) - missed) + 1;
      } else {
        seasonData.daily_streak = (seasonData.daily_streak || 0) + 1;
      }
      seasonData.last_message_date = today;
      userData.seasons[seasonId] = seasonData;
      saveUser(userData);
    }

    const { embed } = buildLevelEmbed(seasonData, season, member);

    let punchScore = 0;
    try {
      const punchData = fs.readFileSync("./punch.txt", "utf-8");
      const line = punchData
        .split("\n")
        .find((l) => l.startsWith(interaction.user.id + ","));
      if (line) punchScore = parseInt(line.split(",")[1], 10);
    } catch {}

    const helpRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("bp_help_boosts")
        .setLabel("How do I unlock more boosts?")
        .setStyle(ButtonStyle.Secondary),
    );
    const msg = await interaction.reply({
      embeds: [embed],
      components: [helpRow],
      flags: 64,
    });

    const helpCollector = msg.createMessageComponentCollector({
      filter: (i) => i.user.id === interaction.user.id,
      time: 120000,
    });

    helpCollector.on("collect", async (i) => {
      if (i.customId === "bp_help_boosts") {
        await i.reply({
          content:
            `**How to unlock more boosts:**\n\n` +
            `**🎖️ Server booster** - Boost the server for a +50% xp boost!\n\n` +
            `**🥊 /punch completed** - Use the /punch command 3000 times to unlock a permanent +25% xp boost!\n\n` +
            `**🎰 /roulette streak** - Play the roulette minigame against other players! Each point is a +2.5% xp boost!\n\n` +
            `**📅 Daily login** - Send at least 1 message in the server to add +2.5% to this each day! You will lose 2.5% for every day you miss.\n\n` +
            `-# Note: You can only earn XP once per minute. XP gain is capped at 3 levels per day, after which it will be reduced to 10% of what it was.\n\n`,
          flags: 64,
        });
      }
    });
    helpCollector.on("end", async () => {
      try {
        await msg.edit({ components: [] });
      } catch {}
    });
  },
};
