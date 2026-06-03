const { SlashCommandBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("upgrade")
    .setDescription("You will become like us.")
    .addUserOption((option) =>
      option
        .setName("user")
        .setDescription("The user to upgrade")
        .setRequired(true)
    ),
  async execute(interaction) {
    await interaction.deferReply();
    // Get the mentioned user and role
    const member = interaction.options.getMember("user");
    const role = interaction.guild.roles.cache.find(
      (role) => role.name === "Cybermen"
    );

    // Prevent the command from being used on the bot or the user who sent the command
    if (member.id === interaction.user.id) {
      await interaction.editReply(
        "UPGRADE MACHINE CANNOT BE OPERATED WITH ONLY ONE PARTICIPANT"
      );
      return;
    }

    if (member.id === interaction.client.user.id) {
      await interaction.editReply("I am already a robot.");
      return;
    }

    // Check if the role exists and its ID matches the desired role ID
    if (role && role.id === "1124478121853321328") {
      // Check if the member does not have the role
      if (!member.roles.cache.has(role.id)) {
        // Give the mentioned role to the mentioned user
        member.roles
          .add(role)
          .then(() => {
            interaction.editReply(
              `Upgrade complete. ${member.user.username} is now a cyberman.`
            );

            // Remove the role after 1 hour
            setTimeout(() => {
              member.roles
                .remove(role)
                .then(() => {
                  console.log(
                    `Successfully removed ${role.name} role from ${member.user.username} after 1 hour.`
                  );
                })
                .catch((error) => {
                  console.error(error);
                  console.log(
                    `There was an error while removing the role from ${member.user.username} after 1 hour.`
                  );
                });
            }, 3600000); // 1 hour in milliseconds
          })
          .catch((error) => {
            console.error(error);
            interaction.editReply("There was an error while upgrading.");
          });
      } else {
        await interaction.editReply(
          `${member.user.username} is already a Cyberman`
        );
      }
    } else {
      await interaction.editReply(
        `Sorry, upgrading is not available right now. Please report this issue on the [support page](https://k-9.vercel.app/Support.html)`
      );
    }
  },
};
