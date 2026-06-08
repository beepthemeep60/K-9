const { SlashCommandBuilder } = require("discord.js");
const fs = require("node:fs");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("punch")
    .setDescription("How many seconds in eternity?"),
  async execute(interaction) {
    await interaction.deferReply({ flags: 64 });
    // read the contents of the 'punch.txt' file
    const fileContents = fs.readFileSync("punch.txt", "utf-8");
    const member = interaction.member;
    const role = interaction.guild.roles.cache.find(
      (role) => role.name === "Four and a half billion years",
    );
    var userID = interaction.user.id;
    // find the line in the file that contains the userID and score
    const line = fileContents
      .split("\n")
      .find((l) => l.startsWith(userID + ","));

    if (line) {
      // if the userID exists, increment the score by 1
      const [, score] = line.split(",");
      const newScore = parseInt(score, 10) + 1;
      const newLine = `${userID},${newScore}`;
      const updatedContents = fileContents.replace(line, newLine);
      fs.writeFileSync("punch.txt", updatedContents, "utf-8");
      const gifUrls = {
        1: `https://cdn.discordapp.com/attachments/1233865829091643474/1233866026597355630/1.gif?ex=662ea6c8&is=662d5548&hm=baabec4c452d8ce49c37ecc1a46b0c09b682f97a225d9afd68dbddd649707dd2&`,
        250: `https://cdn.discordapp.com/attachments/1233865829091643474/1233866027033428152/250.gif?ex=662ea6c8&is=662d5548&hm=8a60980a5c0c9c84d83f1eee074a124a677efd6a21581256a2627796f9fd3ea6&`,
        500: `https://cdn.discordapp.com/attachments/1233865829091643474/1233866027494936639/500.gif?ex=662ea6c9&is=662d5549&hm=1d692ef613d616cfb831e42cee25294a5bd084ee2099183c5deeb4991177f725&`,
        750: `https://cdn.discordapp.com/attachments/1233865829091643474/1233866027960369213/750.gif?ex=662ea6c9&is=662d5549&hm=7fea3decbec49ccacbb2ad448576648cf535afbfb3f14b391331768c8377676b&`,
        1000: `https://cdn.discordapp.com/attachments/1233865829091643474/1233866028455428136/1000.gif?ex=662ea6c9&is=662d5549&hm=4e77242dc99f4abc2f3434dcfc86b9bcd8a443213e6ac41f02e28c26f3d20d53&`,
        1500: `https://cdn.discordapp.com/attachments/1233865829091643474/1233866028879057058/1500.gif?ex=662ea6c9&is=662d5549&hm=7077c1e0124f5aea5b8420ad4ad5ee7aa14af02668006e05d5a5f29303fa907f&`,
        2000: `https://cdn.discordapp.com/attachments/1233865829091643474/1233866029436768376/2000.gif?ex=662ea6c9&is=662d5549&hm=80eff3e3e69280f0332765141085b5839cb70fdba97d2349e3e12d8e123d2ef8&`,
        2500: `https://cdn.discordapp.com/attachments/1233865829091643474/1233866029797605426/2500.gif?ex=662ea6c9&is=662d5549&hm=9669bb6015af78b3e21dedbc74d99f143a2212c14f9943116d01d724aa1b1f7f&`,
      };

      if (newScore >= 250 && newScore <= 499) {
        await interaction.editReply({
          content: `<@${userID}> has punched the wall ${newScore} times. How many seconds in eternity? And the shepherd's boy\n${gifUrls[250]}`,
        });
      } else if (newScore >= 500 && newScore <= 749) {
        await interaction.editReply({
          content: `<@${userID}> has punched the wall ${newScore} times. And the shepherd's boy says\n${gifUrls[500]}`,
        });
      } else if (newScore >= 750 && newScore <= 999) {
        await interaction.editReply({
          content: `<@${userID}> has punched the wall ${newScore} times. And the shepherd's boy says, there's this mountain of pure diamond. It takes an hour to climb it, and an hour to go around it!\n${gifUrls[750]}`,
        });
      } else if (newScore >= 1000 && newScore <= 1499) {
        await interaction.editReply({
          content: `<@${userID}> has punched the wall ${newScore} times. Every hundred years, a little bird comes and sharpens its beak on the diamond mountain.\n${gifUrls[1000]}`,
        });
      } else if (newScore >= 1500 && newScore <= 1999) {
        await interaction.editReply({
          content: `<@${userID}> has punched the wall ${newScore} times. And when the entire mountain is chiselled away, the first second of eternity will have passed!\n${gifUrls[1500]}`,
        });
      } else if (newScore >= 2000 && newScore <= 2499) {
        await interaction.editReply({
          content: `<@${userID}> has punched the wall ${newScore} times. You must think that's a hell of a long time,\n${gifUrls[2000]}`,
        });
      } else if (newScore >= 2500 && newScore <= 2999) {
        await interaction.editReply({
          content: `<@${userID}> has punched the wall ${newScore} times. Personally, I think that's a hell of a\n${gifUrls[2500]}`,
        });
      } else if (newScore === 3000) {
        await interaction.editReply({
          content: `<@${userID}> has broken the wall!\n Personally, I think that's a hell of a bird.\nhttps://cdn.discordapp.com/attachments/1233865829091643474/1233866510796062781/End.mp4?ex=662ea73c&is=662d55bc&hm=87e94fc73c55cdfc63f843fdc71250643f2c07ecef14579aca2b94271cdb7796&`,
        });
        // Check if the role exists and its ID matches the desired role ID
        if (role && role.id === "1104044177215471677") {
          if (!member.roles.cache.has(role.id)) {
            member.roles.add(role).then(async () => {
              const logChannel = interaction.client.channels.cache.get(
                "1018262052822843502",
              );
              if (logChannel) {
                const logMsg = await logChannel.send(
                  `<@${userID}> has received the **Four and a half billion years** role!`,
                );
                await logMsg.pin().catch(() => {});
              }
              await interaction.followUp({
                content: `Your role reward has been logged in <#1018262052822843502>!`,
                flags: 64,
              });
            });
          } else {
            await interaction.followUp({
              content: `You already have the role.`,
              flags: 64,
            });
          }
        } else {
          await interaction.followUp({
            content: `Sorry, there is no reward for breaking the wall in this server.\nYou can claim your role reward in https://discord.gg/TARDIS!`,
            flags: 64,
          });
        }
      } else if (newScore > 3000) {
        await interaction.editReply(
          `You have already broken the wall <@${userID}>, there's nothing to punch...but you punch anyway. You have now punched the wall(?) ${newScore} times.`,
        );
      } else if (newScore >= 1 && newScore <= 249) {
        await interaction.editReply({
          content: `<@${userID}> has punched the wall ${newScore} times. There's this emperor and he asks this shepherd's boy, how many seconds in eternity?\n${gifUrls[1]}`,
        });
      }
    } else {
      // if the userID doesn't exist, add a new line with score 1
      const newLine = `${userID},1\n`;
      const updatedContents = `${fileContents}${newLine}`;
      fs.writeFileSync("punch.txt", updatedContents, "utf-8");
      await interaction.editReply({
        content: `<@${userID}> has punched the wall for the first time. This might take me a little while, so do you want me to tell you a story?\nhttps://cdn.discordapp.com/attachments/1233865829091643474/1233866494492934338/Start.gif?ex=662ea738&is=662d55b8&hm=c2671cdf4973954310263529c0a2654f63f55aff065a81a6f0c0d94fa38156c3&`,
      });
    }
  },
};
