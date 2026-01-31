const fs = require("node:fs");
const path = require("node:path");
const { SlashCommandBuilder } = require("discord.js");
const { Collection } = require("discord.js");

const cooldowns = new Collection();

module.exports = {
  data: new SlashCommandBuilder()
    .setName("episode")
    .setDescription("Get a random episode!")
    .addBooleanOption(option => 
      option.setName("include_spinoffs")
      .setDescription("Include episodes from spinoffs")
      .setRequired(false)),

  async execute(interaction) {
    await interaction.deferReply();

    const includeSpinoffs = interaction.options.getBoolean("include_spinoffs") || false;
    const episodeDir = "episodes";
    let episodeFiles = ["Doctor Who.txt"]; // Default to just Doctor Who

    // If the user opted to include spinoffs, add the other files
    if (includeSpinoffs) {
      episodeFiles = [
        "Doctor Who.txt",
        "Torchwood.txt",
        "Sarah Jane Adventures.txt",
        "Class.txt",
        "The War Between the Land and the Sea.txt",
      ];
    }

    // Read all the files asynchronously
    let episodes = [];
    let fileReadPromises = episodeFiles.map(filename => {
      return new Promise((resolve, reject) => {
        const filePath = path.join(episodeDir, filename);
        fs.readFile(filePath, "utf8", (err, data) => {
          if (err) {
            console.error("Error reading file:", err);
            reject(err);
          } else {
            const episodeArray = data
              .replace(/"/g, "") // Remove quotes
              .split(", ") // Split by comma and space
              .map(episode => ({ episode, source: path.basename(filename, ".txt") })); // Map each episode to include its source file (without .txt)
            resolve(episodeArray);
          }
        });
      });
    });

    try {
      const results = await Promise.all(fileReadPromises);
      episodes = results.flat(); // Combine all episodes into a single array

      // Generate a random index based on the combined array length
      const randomIndex = Math.floor(Math.random() * episodes.length);

      // Pick a random episode and its source
      const { episode, source } = episodes[randomIndex];

      // Format the reply based on whether spinoffs were included
      const reply = includeSpinoffs ? `${source}: ${episode}` : episode;

      interaction.editReply(reply);
    } catch (error) {
      interaction.editReply("There was an error retrieving the episode. Please try again later.");
    }
  },
};
