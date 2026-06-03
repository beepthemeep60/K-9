const { SlashCommandBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("source")
    .setDescription("Get a file from K-9's source code")
    .addStringOption((option) =>
      option
        .setName("file")
        .setDescription("Select the file you would like")
        .setRequired(true)
        .addChoices(
          // root
          { name: "index.js", value: "index.js" },
          { name: "deploy-commands.js", value: "deploy-commands.js" },
          { name: "restart.js", value: "restart.js" },
          { name: "punch.txt", value: "punch.txt" },
          { name: "warns.txt", value: "warns.txt" },
          { name: "episodes.txt", value: "episodes.txt" },
          { name: "pets.txt", value: "pets.txt" },
          { name: "patch notes.txt", value: "patch notes.txt" },
          { name: "README.md", value: "README.md" },
          { name: "config.json", value: "config.json" },
          { name: "snowmen.txt", value: "snowmen.txt" },
          { name: "roulette.txt", value: "roulette.txt" },
          // commands
          { name: "punch.js", value: "punch.js" },
          { name: "regenerate.js", value: "regenerate.js" },
          { name: "spin.js", value: "spin.js" },
          { name: "upgrade.js", value: "upgrade.js" },
          { name: "vortex.js", value: "vortex.js" },
          { name: "avatar.js", value: "avatar.js" },
          { name: "help.js", value: "help.js" },
          { name: "patchnotes.js", value: "patchnotes.js" },
          { name: "ping.js", value: "ping.js" },
          { name: "reload.js", value: "reload.js" },
          { name: "source.js", value: "source.js" }
        )
    ),
  async execute(interaction) {
    await interaction.deferReply();
    const command = interaction.options.getString("file");
    // root
    if (command === "index.js") {
      await interaction.editReply({ files: ["index.js"] });
    } else if (command === "deploy-commands.js") {
      await interaction.editReply({ files: ["deploy-commands.js"] });
    } else if (command === "restart.js") {
      await interaction.editReply({ files: ["restart.js"] });
    } else if (command === "punch.txt") {
      await interaction.editReply({ files: ["punch.txt"] });
    } else if (command === "warns.txt") {
      await interaction.editReply({ files: ["warns.txt"] });
    } else if (command === "episodes.txt") {
      await interaction.editReply({ files: ["episodes.txt"] });
    } else if (command === "pets.txt") {
      await interaction.editReply({ files: ["pets.txt"] });
    } else if (command === "patch notes.txt") {
      await interaction.editReply({ files: ["patch notes.txt"] });
    } else if (command === "README.md") {
      await interaction.editReply({ files: ["README.md"] });
    } else if (command === "config.json") {
      await interaction.editReply({ files: ["config.json"] });
    } else if (command === "snowmen.txt") {
      await interaction.editReply({ files: ["snowmen.txt"] });
    } else if (command === "roulette.txt") {
      await interaction.editReply({ files: ["././roulette.txt"] });
    }
    // commands
    else if (command === "affirmative.js") {
      await interaction.editReply({ files: ["./commands/Fun/affirmative.js"] });
    } else if (command === "punch.js") {
      await interaction.editReply({ files: ["./commands/Fun/punch.js"] });
    } else if (command === "reaction.js") {
      await interaction.editReply({ files: ["./commands/Fun/reaction.js"] });
    } else if (command === "regenerate.js") {
      await interaction.editReply({ files: ["./commands/Fun/regenerate.js"] });
    } else if (command === "reversepolarity.js") {
      await interaction.editReply({
        files: ["./commands/Fun/reversepolarity.js"],
      });
    } else if (command === "spin.js") {
      await interaction.editReply({ files: ["./commands/Fun/spin.js"] });
    } else if (command === "upgrade.js") {
      await interaction.editReply({ files: ["./commands/Fun/upgrade.js"] });
    } else if (command === "vortex.js") {
      await interaction.editReply({ files: ["./commands/Fun/vortex.js"] });
    } else if (command === "avatar.js") {
      await interaction.editReply({
        files: ["./commands/Functional/avatar.js"],
      });
    } else if (command === "help.js") {
      await interaction.editReply({
        files: ["./commands/Functional/help.js"],
      });
    } else if (command === "patchnotes.js") {
      await interaction.editReply({
        files: ["./commands/Functional/patchnotes.js"],
      });
    } else if (command === "ping.js") {
      await interaction.editReply({
        files: ["./commands/Functional/ping.js"],
      });
    } else if (command === "reload.js") {
      await interaction.editReply({
        files: ["./commands/Functional/reload.js"],
      });
    } else if (command === "source.js") {
      await interaction.editReply({
        files: ["./commands/Functional/source.js"],
      });
    }
  },
};
