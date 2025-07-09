const { SlashCommandBuilder } = require("discord.js");
const fs = require("fs");

const MOD_ROLE_ID = "1018290989246468116"; // Mod role ID

module.exports = {
    data: new SlashCommandBuilder()
        .setName("removewarn")
        .setDescription("Remove one warning from a user.")
        .addUserOption(option =>
            option.setName("user")
                .setDescription("The user to remove a warning from")
                .setRequired(true)
        ),

    async execute(interaction) {
        await interaction.deferReply()
        // Permission check
        if (!interaction.member.roles.cache.has(MOD_ROLE_ID)) {
            return interaction.editReply({
                content: "❌ You don't have permission to use this command.",
                ephemeral: true
            });
        }

        const targetUser = interaction.options.getUser("user");
        const userID = targetUser.id;
        const filePath = "./warns.txt";

        let fileContents;
        try {
            fileContents = fs.readFileSync(filePath, "utf-8");
        } catch (err) {
            console.error("Error reading warns.txt:", err);
            return interaction.editReply({
                content: "❌ Failed to read the warning file.",
                ephemeral: true
            });
        }

        const lines = fileContents
            .split("\n")
            .filter(line => line.trim() !== "");

        let updated = false;

        const updatedLines = lines.map(line => {
            const [id, count] = line.split(",");
            if (id === userID) {
                let warns = Number(count);
                if (warns > 0) {
                    warns -= 1;
                    updated = true;
                }
                if (warns > 0) {
                    return `${id},${warns}`;
                } else {
                    return null; // remove the line if warns = 0
                }
            }
            return line;
        }).filter(Boolean); // remove nulls

        if (!updated) {
            return interaction.editReply({
                content: `ℹ️ <@${userID}> has no warnings to remove.`,
                allowedMentions: { users: [] }
            });
        }

        try {
            fs.writeFileSync(filePath, updatedLines.join("\n") + "\n", "utf-8");
        } catch (err) {
            console.error("Error writing to warns.txt:", err);
            return interaction.editReply({
                content: "❌ Failed to update the warning file.",
                ephemeral: true
            });
        }

        await interaction.editReply({
            content: `✅ Removed 1 warning from <@${userID}>.`,
            allowedMentions: { users: [] }
        });
        
    }
};
