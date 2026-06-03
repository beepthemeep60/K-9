const { SlashCommandBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("iantodle")
    .setDescription("play iantodle"),
  async execute(interaction) {
    await interaction.deferReply();
    await interaction.editReply(`Play Iantodle here!!\nhttps://k-9.vercel.app/iantodle.html`);
  },
};
