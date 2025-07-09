const { SlashCommandBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("truthnuke")
    .setDescription("True!"),
  async execute(interaction) {
    await interaction.deferReply();
    const messages = await interaction.channel.messages.fetch({ limit: 10 });
    const emoji = "<:True:1253870607398080535>";
    // Add a reaction to each message
    messages.forEach((msg) => {
      msg.react(emoji);
    });
    await interaction.editReply(emoji);
  },
};
