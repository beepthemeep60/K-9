const { SlashCommandBuilder } = require("discord.js");
const { Collection } = require("discord.js");

const cooldowns = new Collection();

module.exports = {
  data: new SlashCommandBuilder()
    .setName("avatar")
    .setDescription("Replies with the bot's original avatar!"),
  async execute(interaction) {
    await interaction.deferReply();
    //cooldown
    const now = Date.now();
    const cooldownAmount = 5 * 1000;

    if (cooldowns.has(interaction.user.id)) {
      const expirationTime =
        cooldowns.get(interaction.user.id) + cooldownAmount;

      if (now < expirationTime) {
        const timeLeft = (expirationTime - now) / 1000;
        return interaction.editReply(
          `Please wait ${timeLeft.toFixed(
            1
          )} more second(s) before using the \`${
            interaction.commandName
          }\` command again.`,
          { ephemeral: true }
        );
      }
    }

    cooldowns.set(interaction.user.id, now);
    setTimeout(() => cooldowns.delete(interaction.user.id), cooldownAmount);
    // cooldown section ends here
    await interaction.editReply({ files: ["./assets/dog.png"] });
  },
};
