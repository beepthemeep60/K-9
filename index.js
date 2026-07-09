//imports
const dotenv = require("dotenv");
const {
  Client,
  Collection,
  Events,
  GatewayIntentBits,
  EmbedBuilder,
  ActivityType,
  BaseSelectMenuBuilder,
  AttachmentBuilder,
} = require("discord.js");
const { Configuration, OpenAIApi } = require("openai");
const readline = require("node:readline/promises");
const { stdin: input, stdout: output } = require("node:process");
const fs = require("node:fs");
const path = require("node:path");
const { createCanvas, loadImage } = require("@napi-rs/canvas");
const { setTemporaryNickname } = require("./nicknameManager");
const logger = require("./logger");

dotenv.config();
//sets prefix and context
const PREFIX = "K-9";

//gets the openai api key
const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});

const openai = new OpenAIApi(configuration);

// create client with necessary intents
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

// sets the last channel
let channel = "915568009815416845";
let lastChannel = channel;
let c;

// Torchwood image cooldown
let lastTriggered = 0; // Tracks the last time any Torchwood response was triggered
const cooldownTime = 10 * 60 * 1000; // 10 minutes in milliseconds

function checkUserIdInPetsFile(userId) {
  const filePath = path.join(__dirname, "pets.txt");
  const fileContents = fs.readFileSync(filePath, "utf-8");
  const lines = fileContents.split("\n");
  const userLine = lines.find((line) => line.startsWith(userId + ","));
  return userLine !== undefined;
}

// allows messages to be sent through the terminal to appear as the bot
async function reader() {
  const rl = readline.createInterface({ input, output });

  c = client.channels.cache.get(channel);
  console.log(`#${c.name}`);

  while (true) {
    const answer = await rl.question("~> ");
    if (answer.indexOf("channel") === 0) {
      lastChannel = channel;
      channel = answer.split(" ")[1];
      c = client.channels.cache.get(channel);

      if (!c) {
        channel = lastChannel;
        c = client.channels.cache.get(channel);
        logger.warn("invalid channel id");
        console.log(`\n#${c.name}`);
      } else {
        console.log(`\n#${c.name}`);
      }
    } else if (answer.trim().length) {
      client.channels.cache.get(channel).send(answer);
    }
  }
}

//checks if the original message has been deleted, and if it has, sends message with a ping instead of a reply
function safeReply(message, reply) {
  openai.createModeration({ input: reply }).then(async (res) => {
    if (res.data.results[0].flagged) {
      safeReply(message, "My response was moderated. [ERROR]");
      try {
        client.channels.cache
          .get("1018511988478967969")
          .send(`Moderated reply: ||${reply}||`);
      } catch (error) {
        client.channels.cache
          .get("915568009815416845")
          .send(`Moderated reply: ||${reply}||`);
      }
    }
    //if nothing is flagged, set the model and send the message to the AI
    else {
      message
        .reply(reply)
        .catch(() => message.channel.send(`<@${message.author.id}> ${reply}`));
    }
    return;
  });
}
// sets the gpt3 model
async function getGptResponse(prompt, model) {
  const gptResponse = await openai.createCompletion({
    model: model,
    prompt: `${prompt}. ###`,
    max_tokens: 60,
    temperature: 0.3,
    top_p: 0.3,
    presence_penalty: 0,
    frequency_penalty: 0.5,
    stop: ["\n", "END"],
  });
  // sets the reply to the AI response
  const reply = `${gptResponse.data.choices[0].text.trim()}`;
  if (reply.length) {
    if (!reply.includes("@everyone" || "@here" || "@&")) {
      return reply;
    } else {
      const newReply =
        "This message could mass ping users, and has been blocked. [ERROR]";
      return newReply;
    }
  } else {
    return "Input unknown. Please try again. [ERROR]\nIf this keeps happening, please report the issue on the [support page](https://k-9.vercel.app/Support.html)";
  }
}
// when the client is ready and logged into the discord bot, log in the console.
client.on("ready", async () => {
  logger.info("Logged in as " + client.user.username);
  logger.info("Bot started at " + new Date().toISOString());
  reader();

  // Set the presence outside the callback function
  client.user.setPresence({
    activities: [
      {
        name: "Try /battlepass!",
        type: ActivityType.Watching,
      },
    ],
  });
  try {
    client.channels.cache
      .get("1018199943774732410")
      .send(`System restarting. All primary drives functioning.`);
  } catch (error) {
    client.channels.cache
      .get("915568009815416845")
      .send(`System restarting. All primary drives functioning.`);
  }

  //remove members from cybermen role
  try {
    const guild = client.guilds.cache.get("1018199943330140170");
    const members = await guild.members.fetch();
    members.forEach((member) => {
      setTimeout(() => {
        member.roles.remove("1124478121853321328").catch(console.log);
      }, 2000);
    });
  } catch (error) {}

  const channelArray = [
    "1018199943774732410", // earth
    "1018300866224205974", // parallel-earth
    "1018260976765771786", // the-satan-pit
    "1018652709672464384", // hedgewicks-world
    "1024072607559065650", // dont-blink
    "1060625912695115837", // vote-saxon
    "1060626581405581393", // bowser-history
    "1018261660416348170", // mega-gay-zone
    "1020752932519542784", // siluria
  ];

  async function sendPredictionMessage() {
    const randomChannelId =
      channelArray[Math.floor(Math.random() * channelArray.length)];

    const channel = client.channels.cache.get(randomChannelId);

    if (!channel) return;

    try {
      const messages = await channel.messages.fetch({ limit: 1 });
      const lastMessage = messages.first();

      if (!lastMessage) return;

      if (Math.random() < 0.02) {
        const secondsSinceEpoch = Math.floor(Date.now() / 1000);
        const randomTime = Math.floor(Math.random() * 2500000);
        const predictedTime = secondsSinceEpoch + randomTime;

        await channel.send(
          `I think <t:${predictedTime}:D> will be an interesting day for <@${lastMessage.author.id}>.`,
        );
        await client.channels.cache
          .get("915568009815416845")
          .send(`Prophecy sent to <#${channel}>`);
      }
    } catch (error) {
      logger.error("Failed to fetch messages:", error);
    }
  }

  setInterval(async () => {
    const now = new Date();
    let day = now.getDay();

    if (
      (now.getHours() === 12 && now.getMinutes() === 0) ||
      (now.getHours() === 0 && now.getMinutes() === 0)
    ) {
      await sendPredictionMessage();
    }
    if (now.getHours() === 18 && now.getMinutes() === 0) {
      try {
        const dumpChannel = await client.channels.fetch("1511503399705776229");

        if (dumpChannel && dumpChannel.isTextBased()) {
          const threadName = now.toLocaleDateString("en-GB");
          const thread = await dumpChannel.threads.create({
            name: threadName,
            autoArchiveDuration: 1440,
            reason: "Daily file dump",
          });

          const { execSync } = require("child_process");
          const { join: pJoin } = require("path");
          const tmpDir = pJoin(__dirname, "tmp_dump");
          if (!require("fs").existsSync(tmpDir))
            require("fs").mkdirSync(tmpDir);

          const tcZip = pJoin(tmpDir, "tradingCards_users.zip");
          const bpZip = pJoin(tmpDir, "battlePass_users.zip");
          const tcDir = pJoin(__dirname, "tradingCards/data/users");
          const bpDir = pJoin(__dirname, "battlePass/data/users");
          const logDir = pJoin(__dirname, "logs");

          try {
            execSync(`zip -j "${tcZip}" "${tcDir}"/*.json`, {
              stdio: "pipe",
              timeout: 30000,
            });
          } catch {
            try {
              execSync(
                `tar -czf "${tcZip}" -C "${pJoin(__dirname, "tradingCards/data")}" users`,
                { stdio: "pipe", timeout: 30000 },
              );
            } catch {}
          }
          try {
            execSync(`zip -j "${bpZip}" "${bpDir}"/*.json`, {
              stdio: "pipe",
              timeout: 30000,
            });
          } catch {
            try {
              execSync(
                `tar -czf "${bpZip}" -C "${pJoin(__dirname, "battlePass/data")}" users`,
                { stdio: "pipe", timeout: 30000 },
              );
            } catch {}
          }
          const files = [
            new AttachmentBuilder(pJoin(__dirname, "punch.txt")),
            new AttachmentBuilder(pJoin(__dirname, "roulette.txt")),
            new AttachmentBuilder(pJoin(__dirname, "pets.txt")),
            new AttachmentBuilder(pJoin(__dirname, "warns.txt")),
          ];

          if (require("fs").existsSync(tcZip))
            files.push(new AttachmentBuilder(tcZip));
          if (require("fs").existsSync(bpZip))
            files.push(new AttachmentBuilder(bpZip));

          await thread.send({
            content: "Daily file dump:",
            files,
          });

          // Send log files as a second message (no zip complexity)
          if (require("fs").existsSync(logDir)) {
            try {
              const logFiles = require("fs")
                .readdirSync(logDir)
                .filter((f) => f.endsWith(".log"));
              if (logFiles.length > 0) {
                const logAttachments = [];
                for (const f of logFiles) {
                  logAttachments.push(
                    new AttachmentBuilder(
                      require("fs").readFileSync(pJoin(logDir, f)),
                      { name: f },
                    ),
                  );
                }
                await thread.send({ files: logAttachments });
              }
            } catch {}
          }

          try {
            require("fs").rmSync(tmpDir, { recursive: true, force: true });
          } catch {}
          if (require("fs").existsSync(logDir)) {
            try {
              const logFiles = require("fs").readdirSync(logDir);
              for (const f of logFiles) {
                require("fs").rmSync(pJoin(logDir, f), { force: true });
              }
            } catch {}
          }
        }
      } catch (error) {
        logger.error("Error creating thread in channel:", error);
      }
    }
  }, 60 * 1000); // check every minute

  // // scheduled restart
  // if (now.getHours() === 18 && now.getMinutes() === 0) {
  //   restart();}

  // // scheduled restart
  // if (now.getHours() === 18 && now.getMinutes() === 0) {
  //   const { restart } = require("./restart");
  //   try {
  //     restart();
  //   } catch (error) {
  //     console.log("There was an issue while trying to restart");}}
});

//crash prevention
process.on("unhandledRejection", async (reason, promise) => {
  logger.error("Unhandled Rejection at:", promise, "reason", reason);
});
process.on("uncaughtException", (err) => {
  logger.error("Uncaught Exception:", err);
});
process.on("uncaughtExceptionMonitor", (err, origin) => {
  logger.error("Uncaught Exception Monitor", err, origin);
});
//when a member joins, send them a DM
client.on("guildMemberAdd", async (member) => {
  const DMEmbed = new EmbedBuilder()
    .setColor("#003b6f")
    .setTitle("Welcome to Bigger on the Inside!")
    .setURL("https://k-9.vercel.app/index.html")
    .setDescription("I'm K-9, here to help :)")
    .setThumbnail("attachment://dog.png")
    .addFields(
      {
        name: "Getting started ",
        value:
          'Head back to the "Channels & Roles" section to get a colour role!\n\nWant to talk to me? Just put `K-9` before your message in the server! ',
      },
      { name: "\u200B", value: "\u200B" },
      {
        name: "Want to know what every channel is for? Click here!",
        value: "<#1018443553862586388>",
        inline: true,
      },
      {
        name: "Introduce yourself!",
        value: "<#1018442634005598269>",
        inline: true,
      },
    )
    .addFields({
      name: "Join the conversation!",
      value: "<#1018199943774732410>",
      inline: true,
    })
    .setImage("attachment://BOTI_logo.png")
    .setFooter({
      text: "Hope you enjoy your stay!!",
    });
  try {
    // Send a direct message to the member
    await member.send({
      embeds: [DMEmbed],
      files: ["./assets/dog.png", "./assets/BOTI_logo.png"],
    });
    if (member.guild.id === "1018199943330140170") {
      client.channels.cache
        .get("1018199943330140172")
        .send(
          `<:Affirmative:1019680728759419011> Welcome to Bigger on the Inside <@${member.id}>!`,
        );
    }
  } catch (error) {
    client.channels.cache
      .get("1018199943330140172")
      .send(`Welcome to Bigger on the Inside <@${member.id}>!`);
  }
});

//checks if the message is from a bot or if the mesage doesn't contain the 'K-9' prefix
client.on("messageCreate", async function (message) {
  if (message.content == "!!restart") {
    await message.reply("Incorrect command. Please try '!restart'");
  }
  if (message.content == "!restart") {
    await message.reply(
      "Lmao got you, this feature has been removed, please ask a mod to run /reload",
    );
  }
  if (message.content.toLowerCase().includes("dw")) {
    await message.react(":dw:1086049130075394068");
  }
  // Random pet events
  if (message.channel.id == "1018199943774732410") {
    const petEvent = Math.random() * 500;
    if (petEvent < 1) {
      // Check for double XP roles
      const doubleXpRoles = [
        "1018290989246468116", // mods
        "1271816605654978623", // gambling
        "1312574581118079077", // curator
        "1104044177215471677", // wall
        "1018200127598497893", // booster
        "1345969083870347295", // puzzle solver
        "1146535148884603060", // testing server test role
        // halloween event:
        "1163825738051498105", // perception filter
        "1163825260194447381", // chameleon circuit
        "1163825574603653200", // slightly better written
      ];
      const userRoles = message.member.roles.cache.map((role) => role.id);
      const hasDoubleXpRole = doubleXpRoles.some((role) =>
        userRoles.includes(role),
      );
      const userId = message.author.id;
      const userExists = checkUserIdInPetsFile(userId);
      if (userExists) {
        const filePath = "./pets.txt";
        const fileStream = fs.createReadStream(filePath, "utf-8");
        const rl = readline.createInterface({
          input: fileStream,
          crlfDelay: Infinity, // Handle both '\n' and '\r\n' line endings
        });
        const updatedLines = [];
        let updatedXp = null; // Initialize updatedXp to null

        rl.on("line", (line) => {
          // Check if the line starts with the userID
          if (line.startsWith(userId + ",")) {
            const [
              user,
              pet,
              petEmoji,
              hunger,
              feedDate,
              playDate,
              xp,
              happiness,
            ] = line.split(",");

            // Get current date
            const currentDate = new Date();

            // React with emoji
            message.react(petEmoji);

            // Declare variables outside the if-else block
            let updatedHunger;
            let updatedHappiness;

            if (hasDoubleXpRole) {
              updatedHunger = 100;
              updatedHappiness = 100;
              updatedXp = Number(xp) + 200;
            } else {
              updatedHunger = 100;
              updatedHappiness = 100;
              updatedXp = Number(xp) + 100;
            }

            // Reconstruct the line with updated values
            const updatedLine = `${user},${pet},${petEmoji},${updatedHunger},${currentDate},${currentDate},${updatedXp},${updatedHappiness}`;
            updatedLines.push(updatedLine);
          } else {
            // If the line doesn't match the userID, keep it unchanged
            updatedLines.push(line);
          }
        });

        // Move `rl.on('close', ...)` OUTSIDE of `rl.on('line', ...)`
        rl.on("close", () => {
          // Join all lines into a single string with newline characters
          const updatedContent = updatedLines.join("\n");
          // Write the updated content back to the file
          fs.writeFileSync(filePath, updatedContent, "utf-8");
          // Only send a message if `updatedXp` was set
          if (updatedXp !== null) {
            if (hasDoubleXpRole) {
              message.channel.send(
                `<@${userId}> Your pet has come to spend time with you while you chat!\n` +
                  `Hunger set to 100%. Happiness set to 100%. +200xp gained.`,
              );
            } else {
              message.channel.send(
                `<@${userId}> Your pet has come to spend time with you while you chat!\n` +
                  `Hunger set to 100%. Happiness set to 100%. +100xp gained.`,
              );
            }
          }
        });
      }
    }
  }
  // DM users pinged by user 1275761767464570894 in the trading channel
  if (
    message.channel.id === "1018307730404024350" &&
    message.author.id === "437808476106784770" &&
    message.mentions.users.size > 0
  ) {
    for (const [_, user] of message.mentions.users) {
      if (user.bot) continue;
      user
        .send(
          "You've gained image perms!\n\n-# Did you know you can run `/battlepass` to level up and gain trading card packs?",
        )
        .catch(() => {});
    }
  }

  // Battle Pass XP tracking
  if (!message.author.bot) {
    try {
      const {
        getCurrentSeason,
        getLatestSeasonId,
        loadUser: loadBpUser,
        getSeasonData,
        saveUser: saveBpUser,
        getLevelFromXp,
        getLevelsToProcess,
      } = require("./battlePass/services/battlePassService");
      const {
        addPack: addBpPack,
      } = require("./tradingCards/services/userService");
      const season = getCurrentSeason();
      const seasonId = getLatestSeasonId();
      if (season && seasonId) {
        let bpUser = loadBpUser(message.author.id);
        if (bpUser && bpUser.seasons?.[seasonId]) {
          const seasonData = getSeasonData(bpUser, seasonId);

          const today = new Date().toISOString().split("T")[0];
          let dailyStreak = seasonData.daily_streak || 0;
          let isNewDay = false;
          if (seasonData.last_message_date !== today) {
            isNewDay = true;
            seasonData.xp_today = 0; // Reset daily XP cap
            if (seasonData.last_message_date) {
              const last = new Date(seasonData.last_message_date);
              const diff = Math.floor((Date.now() - last.getTime()) / 86400000);
              const missed = diff - 1;
              dailyStreak = Math.max(0, dailyStreak - missed) + 1;
            } else {
              dailyStreak += 1;
            }
            seasonData.last_message_date = today;
            seasonData.daily_streak = dailyStreak;

            // First message each day: grant 1 standard pack from current set
            const seasonSetId = season.reward_set || getLatestSeasonId();
            if (seasonSetId) {
              try {
                const {
                  addPack: addDailyPack,
                  loadUser: loadTcUser,
                } = require("./tradingCards/services/userService");
                const {
                  autoOpenPack,
                } = require("./tradingCards/services/packService");
                addDailyPack(
                  message.author.id,
                  seasonSetId,
                  "standard_pack",
                  1,
                );
                const tcUser = loadTcUser(message.author.id);
                if (!tcUser?.settings?.disable_reactions) {
                  await message.react("✉️");
                }
                // Auto-open if setting enabled (standard packs only)
                if (tcUser?.settings?.auto_open_packs) {
                  const results = autoOpenPack(
                    message.author.id,
                    seasonSetId,
                    "standard_pack",
                    1,
                  );
                  if (results) {
                    try {
                      const {
                        buildSummaryMessage,
                      } = require("./commands/Games/tradingCards");
                      const set = require(
                        `./tradingCards/data/sets/${seasonSetId}.json`,
                      );
                      const msg = buildSummaryMessage(
                        results[0],
                        set,
                        seasonSetId,
                        tcUser,
                        "standard_pack",
                      );
                      const autoChannel = await client.channels.fetch(
                        "1513525706129277030",
                      );
                      autoChannel
                        .send({ content: `<@${message.author.id}>`, ...msg })
                        .catch(() => {});
                    } catch {}
                  }
                }
              } catch {}
            }
          }

          const now = Date.now();
          if (
            !seasonData.last_xp_time ||
            now - seasonData.last_xp_time >= 60000
          ) {
            seasonData.last_xp_time = now;

            const member = message.member;
            let mult = 1;
            if (member?.roles.cache.has("1018200127598497893")) mult += 0.5;
            try {
              const punchData = fs.readFileSync("./punch.txt", "utf-8");
              const punchLine = punchData
                .split("\n")
                .find((l) => l.startsWith(message.author.id + ","));
              if (punchLine && parseInt(punchLine.split(",")[1], 10) >= 3000)
                mult += 0.25;
            } catch {}
            try {
              const rouletteData = fs.readFileSync("./roulette.txt", "utf-8");
              const rouletteLine = rouletteData
                .split("\n")
                .find((l) => l.startsWith(message.author.id + ","));
              if (rouletteLine)
                mult += parseInt(rouletteLine.split(",")[1], 10) * 0.025;
            } catch {}
            mult += (dailyStreak || 0) * 0.025;

            // Event winner role - 4x boost
            try {
              const ewRolePath = path.join(
                __dirname,
                "battlePass/data/eventWinnerRoles.json",
              );
              if (fs.existsSync(ewRolePath)) {
                const ewRoles = JSON.parse(fs.readFileSync(ewRolePath, "utf8"));
                if (
                  Array.isArray(ewRoles) &&
                  ewRoles.length > 0 &&
                  ewRoles.some((roleId) => member?.roles?.cache?.has(roleId))
                ) {
                  mult += 3;
                }
              }
            } catch {}

            const dayOfWeek = new Date().getDay();
            if (dayOfWeek === 0 || dayOfWeek === 6) {
              mult += 1;
            }

            // Global double XP boost
            try {
              const globalDoubleXpPath = require("path").join(
                __dirname,
                "battlePass/data/doubleXp.json",
              );
              if (require("fs").existsSync(globalDoubleXpPath)) {
                const doubleXpData = JSON.parse(
                  require("fs").readFileSync(globalDoubleXpPath, "utf8"),
                );
                if (doubleXpData.enabled) {
                  mult *= 2;
                }
              }
            } catch {}

            const xpGained = Math.round(10 * mult);

            // Cap daily XP gain at 3 levels worth
            const xpPerLevel = season.xp_per_level || 100;
            const dailyXpCap = xpPerLevel * 3;
            const xpToday = seasonData.xp_today || 0;
            const remainingCap = Math.max(0, dailyXpCap - xpToday);
            const cappedXp =
              remainingCap > 0
                ? Math.min(xpGained, remainingCap)
                : Math.max(1, Math.round(xpGained * 0.1));

            const oldLevel = seasonData.level;
            seasonData.xp = (seasonData.xp || 0) + cappedXp;
            seasonData.xp_today = (seasonData.xp_today || 0) + cappedXp;

            const newLevel = getLevelFromXp(seasonData.xp, season);
            if (newLevel > oldLevel) {
              const crossedLevels = getLevelsToProcess(
                seasonData.xp,
                oldLevel,
                season,
              );
              for (const lvl of crossedLevels) {
                const isDefaultReward =
                  !season.alternate_rewards?.[String(lvl)];
                const reward = isDefaultReward
                  ? season.default_reward
                  : season.alternate_rewards[String(lvl)];
                const emoji = reward.emoji || "✉️";
                const amount = reward.amount || 1;

                if (reward.type === "pack") {
                  addBpPack(
                    message.author.id,
                    reward.set,
                    reward.pack_type,
                    amount,
                  );

                  // Auto-open only for default rewards with standard packs
                  if (isDefaultReward && reward.pack_type === "standard_pack") {
                    try {
                      const {
                        loadUser: loadTcUser,
                      } = require("./tradingCards/services/userService");
                      const {
                        autoOpenPack,
                      } = require("./tradingCards/services/packService");
                      const tcUser = loadTcUser(message.author.id);
                      if (tcUser?.settings?.auto_open_packs) {
                        const results = autoOpenPack(
                          message.author.id,
                          reward.set,
                          reward.pack_type,
                          amount,
                        );
                        if (results) {
                          try {
                            const {
                              buildSummaryMessage,
                            } = require("./commands/Games/tradingCards");
                            const set = require(
                              `./tradingCards/data/sets/${reward.set}.json`,
                            );
                            const msg = buildSummaryMessage(
                              results[0],
                              set,
                              reward.set,
                              tcUser,
                              reward.pack_type,
                            );
                            const autoChannel = await client.channels.fetch(
                              "1513525706129277030",
                            );
                            autoChannel
                              .send({
                                content: `<@${message.author.id}>`,
                                ...msg,
                              })
                              .catch(() => {});
                          } catch {}
                        }
                      }
                    } catch {}
                  }
                } else if (reward.type === "role" && message.member) {
                  try {
                    await message.member.roles.add(reward.role_id);
                  } catch {}
                }

                try {
                  const tcUser2 =
                    require("./tradingCards/services/userService").loadUser(
                      message.author.id,
                    );
                  if (!tcUser2.settings?.disable_reactions) {
                    await message.react(emoji);
                  }
                } catch {}
              }

              seasonData.level = newLevel;
              if (!seasonData.claimed_levels) seasonData.claimed_levels = [];
              seasonData.claimed_levels.push(...crossedLevels);
            } else if (newLevel < oldLevel) {
              // Correct inflated level (e.g. after xp_per_level change)
              seasonData.level = newLevel;
            }
          }

          saveBpUser(bpUser);
        }
      }
    } catch (e) {
      logger.error("BP XP error:", e);
    }
  }
  if (message.content.toLowerCase().includes("grok")) {
    await message.reply("K-9 better");
  }
  // change nickname following "i'm"
  const lowerContent = message.content.toLowerCase();
  let match = null;

  // check if message starts with "im " or "i'm"
  if (
    lowerContent.startsWith("im ") ||
    lowerContent.startsWith("i'm ") ||
    lowerContent.startsWith("i’m ")
  ) {
    match = lowerContent.match(/^(im|i'm|i’m)\s+(.*)/);
  }
  // check if message starts with a ping (<@ID>) followed by "im " or "i'm"
  else if (lowerContent.match(/^<@!?\d+>\s+/)) {
    match = lowerContent.match(/^<@!?\d+>\s+(im|i'm|i’m)\s+(.*)/);
  }
  // check if message starts with "@dead chat" (plain text or Role Ping <@&ID>) followed by "im " or "i'm"
  else if (
    lowerContent.startsWith("@dead chat") ||
    lowerContent.match(/^<@&\d+>\s+/)
  ) {
    match = lowerContent.match(/^@dead\s+chat\s+(im|i'm|i’m)\s+(.*)/);
  }
  // check if message starts with "K-9" followed by "im " or "i'm"
  else if (
    lowerContent.startsWith("k-9") ||
    lowerContent.match(/^<@&\d+>\s+/)
  ) {
    match = lowerContent.match(/^k-9\s+(im|i'm|i’m)\s+(.*)/);
  }

  // if no match, check if user pinged dead chat role ID
  if (!match) {
    match = lowerContent.match(
      /^<@&1018313736647352380>\s+(im|i'm|i’m)\s+(.*)/,
    );
  }
  // If a valid "im" pattern was found, update the nickname
  if (
    !message.content.toLowerCase().includes("die") &&
    !message.content.toLowerCase().includes("murder") &&
    !message.content.toLowerCase().includes("suicide") &&
    !message.content.toLowerCase().includes("commit") &&
    !message.content.toLowerCase().includes("stab") &&
    !message.content.toLowerCase().includes("shot") &&
    !message.content.toLowerCase().includes("kill") &&
    !message.content.toLowerCase().includes("rape") &&
    !message.content.toLowerCase().includes("passed away") &&
    !message.content.toLowerCase().includes("sick") &&
    message.channel.parentId !== "1018467680568746065" // modmail category
  ) {
    if (match) {
      const nameChance = Math.random() * 50;

      if (nameChance < 1) {
        let newNickname = match[match.length - 1].trim();

        if (newNickname.length > 32) {
          newNickname = newNickname.substring(0, 32);
        }

        const member = message.member;

        if (
          member &&
          message.guild.members.me.permissions.has("ManageNicknames") &&
          member.manageable
        ) {
          try {
            await setTemporaryNickname(
              member,
              newNickname,
              180000, // 3 minutes
            );

            await message.reply(
              `Hi ${newNickname}! I'm K-9! User identification protocols updated.`,
            );
          } catch (error) {
            logger.error("Failed to update nickname:", error);
          }
        }
      }
    }
  }
  // Torchwood images (with 1/50 chance)
  const randomChance = Math.random() * 50;
  if (
    message.content.toLowerCase().includes("jack") ||
    message.content.toLowerCase().includes("ianto") ||
    message.content.toLowerCase().includes("gwen") ||
    message.content.toLowerCase().includes("owen") ||
    message.content.toLowerCase().includes("tosh") ||
    message.content.toLowerCase().includes("rhys")
  ) {
    if (randomChance < 1) {
      // Send the appropriate image
      if (message.content.toLowerCase().includes("jack")) {
        try {
          await message.reply(
            "https://cdn.discordapp.com/attachments/915568009815416845/1315388340559679578/jork.png",
          );
        } catch {
          message.channel.send(
            "https://cdn.discordapp.com/attachments/915568009815416845/1315388340559679578/jork.png",
          );
        }
      } else if (message.content.toLowerCase().includes("ianto")) {
        try {
          await message.reply(
            "https://cdn.discordapp.com/attachments/915568009815416845/1315388341071646813/fanta.png",
          );
        } catch {
          message.channel.send(
            "https://cdn.discordapp.com/attachments/915568009815416845/1315388341071646813/fanta.png",
          );
        }
      } else if (message.content.toLowerCase().includes("gwen")) {
        try {
          await message.reply(
            "https://cdn.discordapp.com/attachments/915568009815416845/1315388341830811678/hen.png",
          );
        } catch {
          message.channel.send(
            "https://cdn.discordapp.com/attachments/915568009815416845/1315388341830811678/hen.png",
          );
        }
      } else if (message.content.toLowerCase().includes("owen")) {
        try {
          await message.reply(
            "https://cdn.discordapp.com/attachments/915568009815416845/1315388342866804736/going.png",
          );
        } catch {
          message.channel.send(
            "https://cdn.discordapp.com/attachments/915568009815416845/1315388342866804736/going.png",
          );
        }
      } else if (message.content.toLowerCase().includes("tosh")) {
        try {
          await message.reply(
            "https://cdn.discordapp.com/attachments/915568009815416845/1315388342451441664/bosh.png",
          );
        } catch {
          message.channel.send(
            "https://cdn.discordapp.com/attachments/915568009815416845/1315388342451441664/bosh.png",
          );
        }
      } else if (message.content.toLowerCase().includes("rhys")) {
        try {
          await message.reply(
            "https://cdn.discordapp.com/attachments/915568009815416845/1392555500851171348/reeses.png",
          );
        } catch {
          message.channel.send(
            "https://cdn.discordapp.com/attachments/915568009815416845/1392555500851171348/reeses.png",
          );
        }
      }
    }
  }

  const randomNumber = Math.random() * 1000;
  // Check if the number is less than 1 (1 in 1000 chance)
  if (randomNumber < 1) {
    await message.react("🫃");
  }
  if (
    message.author.bot ||
    !message.content.toLowerCase().startsWith(PREFIX.toLowerCase())
  ) {
    return;
  }
  //runs the message through the moderation to make sure nothing harmful is being sent
  openai
    .createModeration({ input: message.content.slice(3) })
    .then(async (res) => {
      if (res.data.results[0].flagged) {
        safeReply(
          message,
          "**Your** message has been blocked, please rephrase and try again. [ERROR]",
        );
      }
      //if nothing is flagged, set the model and send the message to the AI
      else {
        const gptResponse = await getGptResponse(
          message.content.substring(3),
          "ft:babbage-002:personal::8euAZ98S",
        );
        safeReply(message, gptResponse);
      }
      return;
    });
});

//set commands
client.commands = new Collection();
//set cooldowns
client.cooldowns = new Collection();
client.COOLDOWN_SECONDS = 5; // replace with desired cooldown time in seconds

const foldersPath = path.join(__dirname, "commands");
const commandFolders = fs.readdirSync(foldersPath);

//checks the commands folder for js files
for (const folder of commandFolders) {
  const commandsPath = path.join(foldersPath, folder);
  const commandFiles = fs
    .readdirSync(commandsPath)
    .filter((file) => file.endsWith(".js"));
  for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);
    // Set a new item in the Collection with the key as the command name and the value as the exported module
    if ("data" in command && "execute" in command) {
      client.commands.set(command.data.name, command);
    } else {
      logger.warn(
        `The command at ${filePath} is missing a required "data" or "execute" property.`,
      );
    }
  }
}
//tries to run the command
client.on(Events.InteractionCreate, async (interaction) => {
  // autocomplete menus
  if (interaction.isAutocomplete()) {
    const command = interaction.client.commands.get(interaction.commandName);
    if (!command || typeof command.autocomplete !== "function") return;

    try {
      return await command.autocomplete(interaction);
    } catch (error) {
      logger.error(error);
      return;
    }
  }

  // slash commands
  if (interaction.isChatInputCommand()) {
    if (!interaction.inGuild()) {
      return interaction.reply({
        content: "Commands can only be used in a server.",
        flags: 64,
      });
    }

    const command = interaction.client.commands.get(interaction.commandName);
    if (!command) return;

    try {
      return await command.execute(interaction);
    } catch (error) {
      logger.error(error);
      if (interaction.replied || interaction.deferred) {
        return interaction.followUp({
          content: "There was an error executing this command.",
          ephemeral: true,
        });
      } else {
        return interaction.reply({
          content: "There was an error executing this command.",
          ephemeral: true,
        });
      }
    }
  }

  // modals
  for (const command of interaction.client.commands.values()) {
    if (typeof command.interactionCreate === "function") {
      try {
        await command.interactionCreate(interaction);
      } catch (err) {
        logger.error(err);
      }
    }
  }
});

// log into the bot using the client token
client.login(process.env.TOKEN);
