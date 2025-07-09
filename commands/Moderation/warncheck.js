const { SlashCommandBuilder } = require("discord.js");
const fs = require("fs");

const MOD_ROLE_ID = "1018290989246468116"; // Mod role ID

module.exports = {
    data: new SlashCommandBuilder()
        .setName("warncheck")
        .setDescription("Check how many warnings a user has.")
        .addUserOption(option =>
            option.setName("user")
                .setDescription("[MOD ONLY] The user to check warnings for")
                .setRequired(false)
        ),

    async execute(interaction) {
        await interaction.deferReply()
        const targetUser = interaction.options.getUser("user") || interaction.user;
        const targetUserID = targetUser.id;
        const requestorID = interaction.user.id;

        const isSelf = targetUserID === requestorID;
        const hasModRole = interaction.member.roles.cache.has(MOD_ROLE_ID);

        // Permission check
        if (!isSelf && !hasModRole) {
            return interaction.editReply({
                content: "❌ You can only check your own warnings.",
            });
        }

        // Load warns from file
        const filePath = "./warns.txt";
        let warns = 0;

        try {
            const fileContents = fs.readFileSync(filePath, "utf-8");
            const line = fileContents
                .split("\n")
                .find(line => line.startsWith(targetUserID + ","));

            if (line) {
                warns = Number(line.split(",")[1]);
            }
        } catch (err) {
            console.error("Error reading warns.txt:", err);
            return interaction.editReply({
                content: "❌ Failed to read the warning file.",
            });
        }

        await interaction.editReply({
            content: `⚠️ <@${targetUserID}> has **${warns} warning${warns !== 1 ? "s" : ""}**.`,
            allowedMentions: { users: [] }
        });
    }
};
