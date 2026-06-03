const { SlashCommandBuilder } = require("discord.js");
const fs = require("node:fs");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("patchnotes")
    .setDescription("Show the latest patch notes!"),
  async execute(interaction) {
    await interaction.deferReply();
    fs.readFile("patch notes.txt", (err, data) => {
      if (err) throw err;

      const notes = data.toString();
      interaction.editReply("```" + notes + "```");
    });
  },
};
