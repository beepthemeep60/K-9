const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("unmute")
    .setDescription(
      "[MODERATOR ONLY] Unmute a member! Or don't... I'm not your dad..",
    )
    .addUserOption((option) =>
      option
        .setName("user")
        .setDescription("The member to unmute")
        .setRequired(true),
    ),
  async execute(interaction) {
    await interaction.deferReply();
    const users = interaction.options.getUser("user");
    const ID = users.id;
    const unmuteUser = interaction.client.users.cache.get(ID);

    if (!interaction.member.permissions.has("ModerateMembers"))
      return await interaction.editReply({
        content: "You don't have mute perms. You can't unmute others.",
      });
    if (interaction.member.id === ID)
      return await interaction.editReply({
        content:
          "You cannot unmute yourself... If you typed this you aren't even muted anyway?? What are you doing",
      });

    const embed = new EmbedBuilder()
      .setColor("#c46506")
      .setDescription(
        `<:Affirmative:1019680728759419011> ${unmuteUser} has been unmuted.\n\nID: ${
          interaction.options.getUser("user").id
        }`,
      );

    let unmuteSuccessful = false;
    const target = interaction.options.getMember("user");

    try {
      await target.timeout(null);
      unmuteSuccessful = true;
    } catch (error) {
      console.log(error);
      interaction.editReply({
        content:
          "I cannot unmute this member!\nIf this is unexpected, please unmute the member with a different bot and then report this issue on the [support page](https://k-9.vercel.app/Support.html)",
      });
    }

    if (unmuteSuccessful) {
      await interaction.editReply({ embeds: [embed] });
    }
  },
};
