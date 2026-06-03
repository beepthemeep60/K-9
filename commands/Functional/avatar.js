const { SlashCommandBuilder } = require("discord.js");
const { Collection } = require("discord.js");

const cooldowns = new Collection();

module.exports = {
  data: new SlashCommandBuilder()
    .setName("avatar")
    .setDescription("Get the avatar of a user")
    .addUserOption((option) =>
      option
        .setName("target")
        .setDescription("The user to get the avatar of (defaults to yourself)")
        .setRequired(false),
    ),
  async execute(interaction) {
    await interaction.deferReply();
    //cooldown
    const now = Date.now();
    const cooldownAmount = 5 * 500;

    if (cooldowns.has(interaction.user.id)) {
      const expirationTime =
        cooldowns.get(interaction.user.id) + cooldownAmount;

      if (now < expirationTime) {
        const timeLeft = (expirationTime - now) / 500;
        return interaction.editReply(
          `Please wait ${timeLeft.toFixed(
            1,
          )} more second(s) before using the \`${
            interaction.commandName
          }\` command again.`,
          { ephemeral: true },
        );
      }
    }

    cooldowns.set(interaction.user.id, now);
    setTimeout(() => cooldowns.delete(interaction.user.id), cooldownAmount);
    // cooldown section ends here

    // Fetch the target user from options, default to the bot client if null
    const targetUser =
      interaction.options.getUser("target") || interaction.user;

    // Get the high-resolution avatar URL
    const avatarUrl = targetUser.displayAvatarURL({
      dynamic: true,
      size: 1024,
    });

    await interaction.editReply({
      content: `${targetUser.username}'s avatar:\n${avatarUrl}`,
    });
  },
};
