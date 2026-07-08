const {
  SlashCommandBuilder,
  EmbedBuilder,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
  ComponentType,
  PermissionFlagsBits,
} = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("muteself")
    .setDescription("Mute yourself if you need to lock in or smth.")
    .addNumberOption((option) =>
      option
        .setName("duration")
        .setDescription("Number of minutes to mute for (Default: 1 hour)")
        .setMinValue(1)
        .setMaxValue(40000),
    ),
  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });
    const muteUser = interaction.user;
    let duration = interaction.options.getNumber("duration");
    let milliseconds;

    if (duration !== null) {
      milliseconds = duration * 60000;
    } else {
      milliseconds = 60 * 60 * 1000; // default value: 1 hour
    }

    let minutes = milliseconds / 60 / 1000;

    // Create the disclaimer confirmation button
    const confirmButton = new ButtonBuilder()
      .setCustomId(`lock_in_confirm_${interaction.user.id}`)
      .setLabel("Confirm")
      .setStyle(ButtonStyle.Danger);

    const row = new ActionRowBuilder().addComponents(confirmButton);

    // Send the ephemeral message with the button
    await interaction.editReply({
      content: `DISCLAIMER: THIS CANNOT BE UNDONE.\nIf you mute yourself for way too long, it's your own fault. This includes if you're trying to mute yourself for a month as a joke. Don't - it will work and you won't be unmuted.\n\nAre you sure you want to mute yourself for ${minutes} minutes?`,
      components: [row],
    });

    // Set up the button collector
    const message = await interaction.fetchReply();
    const collector = message.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: 60000,
    });

    collector.on("collect", async (buttonInteraction) => {
      if (buttonInteraction.user.id !== interaction.user.id) return;
      await buttonInteraction.deferUpdate();
      try {
        await interaction.guild.members.cache
          .get(muteUser.id)
          ?.timeout(milliseconds);
        await interaction.editReply({
          content: `You have been muted for ${minutes} minutes.`,
          components: [],
        });
      } catch (error) {
        console.log(error);
        await interaction.editReply({
          content:
            "I cannot mute you.\nIf this is unexpected, please report this issue on the [support page](https://k-9.vercel.app/Support.html)",
          components: [],
        });
      }
    });
  },
};
