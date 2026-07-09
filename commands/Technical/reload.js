// commands/reload.js

const { SlashCommandBuilder } = require("@discordjs/builders");
const { REST, Routes, PermissionFlagsBits } = require("discord.js");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

const { clientId, betaClientId } = require("../../config.json");
const token = process.env.TOKEN;
const { restart } = require("../../restart");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("reload")
    .setDescription("[MODERATOR ONLY] Reloads the bot.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
  async execute(interaction) {
    await interaction.deferReply();
    // Check permissions
    if (
      !interaction.member.permissions.has(PermissionFlagsBits.ModerateMembers)
    ) {
      return await interaction.editReply({
        content:
          "You need the **Manage Members** permission to use this command.",
      });
    }

    // Reload commands logic
    const commands = [];
    const foldersPath = path.join(__dirname, "..");
    const commandFolders = fs.readdirSync(foldersPath);

    for (const folder of commandFolders) {
      const commandsPath = path.join(foldersPath, folder);
      const commandFiles = fs
        .readdirSync(commandsPath)
        .filter((file) => file.endsWith(".js"));

      for (const file of commandFiles) {
        const filePath = path.join(commandsPath, file);
        const command = require(filePath);
        if ("data" in command && "execute" in command) {
          command.data.setDMPermission(false);
          commands.push(command.data.toJSON());
        } else {
          console.log(
            `[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`,
          );
        }
      }
    }

    const rest = new REST().setToken(token);

    await interaction.editReply("Commencing restart.");

    try {
      await interaction.channel.send(
        `Started refreshing ${commands.length} application (/) commands.`,
      );

      const data = await rest.put(Routes.applicationCommands(clientId), {
        body: commands,
      });

      await interaction.channel.send(
        `Successfully reloaded ${data.length} application (/) commands.`,
      );
      await interaction.channel.send("Restarting...");
      restart();
    } catch (error) {
      const data = await rest.put(Routes.applicationCommands(betaClientId), {
        body: commands,
      });

      await interaction.channel.send(
        `Successfully reloaded ${data.length} application (/) commands.`,
      );
      await interaction.channel.send("Restarting...");
      restart();
    }
  },
};
