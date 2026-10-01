const {
  SlashCommandBuilder,
  ChannelType,
  PermissionFlagsBits,
} = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("speak")
    .setDescription("Send a message as K-9")
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addStringOption((option) =>
      option
        .setName("message")
        .setDescription("The message to send")
        .setRequired(true),
    )
    .addChannelOption((option) =>
      option
        .setName("channel")
        .setDescription(
          "The channel to send the message to (Default: current channel)",
        )
        .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
        .setRequired(false),
    ),

  async execute(interaction) {
    // Check permissions
    if (
      !interaction.member.permissions.has(PermissionFlagsBits.ModerateMembers)
    ) {
      return await interaction.editReply({
        content:
          "You need the **Manage Members** permission to use this command.",
      });
    }
    const channel =
      interaction.options.getChannel("channel") ?? interaction.channel;
    const message = interaction.options.getString("message");
    const messageWithSignature = `${message} - sent by ${interaction.user.username}`;

    if (!channel.isTextBased() || typeof channel.send !== "function") {
      return interaction.reply({
        content: "Please select a text channel.",
        ephemeral: true,
      });
    }

    await channel.send({ content: message, allowedMentions: { parse: [] } });
    await interaction.reply({
      content: `Message sent to ${channel}.`,
      ephemeral: true,
    });
    interaction.guild.channels.cache.get("915568009815416845").send({
      content: messageWithSignature,
      allowedMentions: { parse: [] },
    });
  },
};
