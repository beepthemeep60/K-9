const { SlashCommandBuilder } = require("discord.js");
const fs = require("fs");

const MOD_ROLE_ID = "1035684617086320640"; // Mod role ID

module.exports = {
    data: new SlashCommandBuilder()
        .setName("unban")
        .setDescription("Unban a user.")
        .addUserOption(option =>
            option.setName("user")
                .setDescription("The user to unban")
                .setRequired(true)
        ),
    async execute(interaction) {
        const user = interaction.options.getUser("user");
        if (!user) {
            return interaction.reply({
                content: "User not found.",
                ephemeral: true
            });
        }

        // Check if the user has the mod role
        if (!interaction.member.roles.cache.has(MOD_ROLE_ID)) {
            return interaction.reply({
                content: "You do not have permission to use this command.",
                ephemeral: true
            });
        }

        // Unban the user
        try {
            await interaction.guild.members.unban(user.id);
            return interaction.reply({
                content: `Successfully unbanned ${user.tag}.`
            });
        } catch (error) {
            console.error("Error unbanning user:", error);
            return interaction.reply({
                content: "An error occurred while trying to unban the user/User is not banned.",
                ephemeral: true
            });
        }
    }
};