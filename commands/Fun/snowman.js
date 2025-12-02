const {
  SlashCommandBuilder,
  ActionRowBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");
const fs = require("node:fs");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("snowman")
    .setDescription("Build a snowman!"),
  async execute(interaction) {
    //check if snowman exists
    const fileContents = fs.readFileSync("./snowmen.txt", "utf-8");
    var userID = interaction.user.id;
    const line = fileContents
      .split("\n")
      .find((l) => l.startsWith(userID + ","));

    if (!line) {
      // if there is no user ID, get the user to name a snowman
      // Create the modal
      const modal = new ModalBuilder()
        .setCustomId("snowmanBuilder")
        .setTitle("Snowman Builder");
      // Create the text input components
      const snowmanInput = new TextInputBuilder()
        .setCustomId("snowmanInput")
        .setLabel("What do you want to name your snowman?")
        .setStyle(TextInputStyle.Short)
        // set the maximum number of characters to allow
        .setMaxLength(20)
        // set the minimum number of characters required for submission
        .setMinLength(1)
        // set a placeholder string to prompt the user
        .setPlaceholder("Frosty")
        // require a value in this input field
        .setRequired(true);

      const firstActionRow = new ActionRowBuilder().addComponents(snowmanInput);
      modal.addComponents(firstActionRow);

      // Show the modal to the user
      await interaction.showModal(modal);
      const submitted = await interaction
        .awaitModalSubmit({
          // Timeout after a minute of not receiving any valid Modals
          time: 60000,
          // Make sure we only accept Modals from the User who sent the original Interaction we're responding to
          filter: (i) => i.user.id === interaction.user.id,
        })
        .catch((error) => {
          // Catch any Errors that are thrown (e.g. if the awaitModalSubmit times out after 60000 ms)
          console.error(error);
          return null;
        });
      if (submitted) {
        const snowmanName = submitted.fields.fields.first().value;
        if (snowmanName) {
          if (snowmanName.includes("@")) {
            await submitted.reply({
              content: `You cannot have an @ in the name of your snowman!`,
            });
          } else {
            await submitted.reply({
              content: `You started building a snowman! You called it "${snowmanName}"! :D`,
            });
            const grinning = new ButtonBuilder()
              .setCustomId("grinning")
              .setLabel("😀")
              .setStyle(ButtonStyle.Secondary);
            const nerd = new ButtonBuilder()
              .setCustomId("nerd")
              .setLabel("🤓")
              .setStyle(ButtonStyle.Secondary);
            const sunglasses = new ButtonBuilder()
              .setCustomId("sunglasses")
              .setLabel("😎")
              .setStyle(ButtonStyle.Secondary);
            const pleading_face = new ButtonBuilder()
              .setCustomId("pleading_face")
              .setLabel("🥺")
              .setStyle(ButtonStyle.Secondary);
            const cry = new ButtonBuilder()
              .setCustomId("cry")
              .setLabel("😢")
              .setStyle(ButtonStyle.Secondary);
            const row = new ActionRowBuilder().addComponents(
              grinning,
              nerd,
              sunglasses,
              pleading_face,
              cry
            );
            // Sending a message with buttons
            const response = await interaction.channel.send({
              content: "Pick a head for your snowman!",
              components: [row],
            });
            const collectorFilter = (i) => i.user.id === interaction.user.id;

            const confirmation = await response.awaitMessageComponent({
              filter: collectorFilter,
              time: 60000,
            });
            if (confirmation.customId === "grinning") {
              await confirmation.update({
                content: `You picked the 😀 head!`,
                components: [],
              });
            } else if (confirmation.customId === "nerd") {
              await confirmation.update({
                content: `You picked the 🤓 head!`,
                components: [],
              });
            } else if (confirmation.customId === "sunglasses") {
              await confirmation.update({
                content: `You picked the 😎 head!`,
                components: [],
              });
            } else if (confirmation.customId === "pleading_face") {
              await confirmation.update({
                content: `You picked the 🥺 head!`,
                components: [],
              });
            } else if (confirmation.customId === "cry") {
              await confirmation.update({
                content: `You picked the 😢 head!`,
                components: [],
              });
            }
            let currentDate = new Date();
            const newLine = `${userID},${snowmanName},${confirmation.customId},1,${currentDate}\n`;
            const updatedContents = `${fileContents}${newLine}`;
            fs.writeFileSync("./snowmen.txt", updatedContents, "utf-8");
          }
        } else {
          console.error("Snowman name is undefined");
        }
      }
    } else {
      let [user, snowman, emoji, height, date] = line.split(",");
      //calculate how many emojis tall the snowman is
      const emojis = parseInt(height, 10);
      const emojiLines = Array.from({ length: emojis }, () => `:white_circle:`);
      //calculate date
      const storedDateString = date;
      // Convert the stored date string to a Date object
      const storedDateObject = new Date(storedDateString);
      // Get the current date
      const currentDate = new Date();
      // Check if the day is the same
      if (currentDate.getMonth() + 1 == "12") {
        if (currentDate.getDate() === storedDateObject.getDate()) {
          // The days are the same
          await interaction.reply(
            `You can only grow your snowman once per day!\n${snowman} is currently ${
              height / 10
            }m tall!⛄\n:${emoji}:\n${emojiLines.join("\n")}`
          );
        } else {
          // The days are different
          if (currentDate.getDate() == "25") {
            var newHeight = parseInt(height, 10) + 10;
          } else {
            var newHeight = parseInt(height, 10) + 1;
          }
          const randomNumber = Math.floor(Math.random() * 99) + 1;
          console.log(randomNumber);
          if (randomNumber === 69) {
            interaction.channel.send(
              `[RARE EVENT]\n<@${user}>'s snowman, ${snowman}, has come to life :D\n${snowman} grew by 5 extra snow!`
            );
            interaction.channel.send(
              "https://cdn.discordapp.com/attachments/1271501941725204520/1271502001708077086/FyAHw-.gif?ex=66b79204&is=66b64084&hm=c07e491ab9b8f13cab7dae069cfff73985e7bc4a1989f47a5b5c05cd15c6742a&"
            );
            newHeight = newHeight + 5;
          } else if (randomNumber === 66) {
            interaction.channel.send(
              `[RARE EVENT]\n<@${user}>'s snowman, ${snowman}, was possessed by the Great Intelligence!\n${snowman} was defeated, causing 5 snow to melt away :(`
            );
            interaction.channel.send("https://cdn.discordapp.com/attachments/1271501941725204520/1271502123451945111/vnD2Xj.gif?ex=66b79221&is=66b640a1&hm=16d83c7610524d30e8d59f0fee9ac8047da45754f1afc0fb8c8dd77c279f0041&");
            newHeight = newHeight - 5;
          } else if (randomNumber === 67) {
            interaction.channel.send(
              `[RARE EVENT]\n${snowman}, stole some of <@${user}>'s life force!\n${snowman} grew by 10 extra snow but <@${user}> was muted for 10 minutes!`
            );
            interaction.channel.send("https://cdn.discordapp.com/attachments/1271501941725204520/1445389078542684170/snowman.gif?ex=69302afa&is=692ed97a&hm=e72913271ace58836261239eab95a353ce00fc9f2eb4cec2c16f707884f76771&");
            newHeight = newHeight + 10;
            const member = await interaction.guild.members.fetch(user);
            member.timeout(10 * 60 * 1000, "Snowman stole life force");
          } else if (randomNumber === 42) {
            interaction.channel.send(
              `[RARE EVENT]\nThe last person to use this command threw a snowball at ${snowman}!\n${snowman} lost 10 snow!`
              );
              interaction.channel.send("https://cdn.discordapp.com/attachments/1271501941725204520/1445393015391916153/freezing-snowman.gif?ex=69302ea4&is=692edd24&hm=658643074245ade9bcb02a5584f5c57faf20da133f1732bf3223846e43b6f892&");
              newHeight = newHeight - 10;
          } else if (randomNumber === 1) {
            interaction.channel.send(
              `[RARE EVENT]\n<@${user}>'s snowman, ${snowman}, has vanity issues and wants a new head!\n${snowman}'s head has been changed to a random unique head!`
              );
              const heads = ["alien", "clown", "jack_o_lantern", "cat", "full_moon_with_face"];
            const randomHead = heads[Math.floor(Math.random() * heads.length)];
            interaction.channel.send("https://cdn.discordapp.com/attachments/1271501941725204520/1445395069963337889/snow-snowman.gif?ex=6930308e&is=692edf0e&hm=43cfd88274a5ced793de694c0bdf231c7e365b5d648d41ecd3f7a8f99f0c0528&");
            emoji = randomHead;
          }
          const newLine = `${user},${snowman},${emoji},${newHeight},${currentDate}`;
          const updatedContents = fileContents.replace(line, newLine);
          fs.writeFileSync("./snowmen.txt", updatedContents, "utf-8");
          const newEmojis = parseInt(newHeight, 10);
          const newEmojiLines = Array.from(
            { length: newEmojis },
            () => `:white_circle:`
          );
          await interaction.reply(
            `You added snow to your snowman!\n${snowman} is now ${
              newHeight / 10
            }m tall!⛄\n:${emoji}:\n${newEmojiLines.join("\n")}`
          );
        }
      } else {
        await interaction.reply(
          `December has ended, and ${snowman} has melted :(\nYour snowman was ${
            height / 10
          }m tall.`
        );
      }
    }
  },
};
