const {
  SlashCommandBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle
} = require('discord.js');

const ROLE_OPTIONS = [
      // { label: 'Uni One', value: '1467193870428143851' },
      // { label: 'Uni Two', value: '1467194099424821554' },
      // { label: 'Uni Three', value: '1467194125744082996' }
      { label: 'Nothing yet! Click the button below to request your uni!', value: 'none' }
];

const ROLE_IDS = ROLE_OPTIONS.map(r => r.value);
const REQUEST_CHANNEL_ID = '1018511988478967969';

module.exports = {
  data: new SlashCommandBuilder()
    .setName('societies')
    .setDescription('Post the permanent role menu'),

  async execute(interaction) {
    const menu = new StringSelectMenuBuilder()
      .setCustomId('role_menu_select')
      .setPlaceholder('Select your university!')
      .setMinValues(1)
      .setMaxValues(1)
      .addOptions(ROLE_OPTIONS);

    const buttons = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('role_remove')
        .setLabel('Remove Role')
        .setStyle(ButtonStyle.Danger),

      new ButtonBuilder()
        .setCustomId('role_request')
        .setLabel('Not seeing your university? Request it here!')
        .setStyle(ButtonStyle.Secondary)
    );

    await interaction.channel.send({
      content: "<:TARDIS:1018284360379682926>🎓Part of a Doctor Who society at university? Select your uni here to access an exclusive society space!🎓<:TARDIS:1018284360379682926>\n⚠️Disclaimer: This will give you a public role that has your university name and logo. If you do not want that to be public, please do not select a role here!",
      components: [
        new ActionRowBuilder().addComponents(menu),
        buttons
      ]
    });
  },

  async interactionCreate(interaction) {
    if (interaction.replied || interaction.deferred) return;

     // select menu
    if (interaction.isStringSelectMenu() && interaction.customId === 'role_menu_select') {
      try {
        await interaction.member.roles.remove(ROLE_IDS);
        await interaction.member.roles.add(interaction.values[0]);

        return interaction.reply({
          content: '✅ Role updated! Head to <#1467192965024972882> at the bottom of the server list to check out the society area!',
          ephemeral: true
        });
      } catch {
        return interaction.reply({
          content: '❌ An error occurred while trying to update your role.',
          ephemeral: true
        });
      }
    }

    // remove button
    if (interaction.isButton() && interaction.customId === 'role_remove') {
      await interaction.member.roles.remove(ROLE_IDS);

      return interaction.reply({
        content: '🗑️ Your role has been removed.',
        ephemeral: true
      });
    }

    // request button
    if (interaction.isButton() && interaction.customId === 'role_request') {
      const modal = new ModalBuilder()
        .setCustomId('role_request_modal')
        .setTitle("University partnership request");

      const input = new TextInputBuilder()
        .setCustomId('role_request_input')
        .setLabel('What university would you like to be added?')
        .setPlaceholder('We will try our best to get in contact with their Doctor Who society and partner with them!')
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(true);

      modal.addComponents(new ActionRowBuilder().addComponents(input));
      return interaction.showModal(modal);
    }

    // extra request stuff
    if (interaction.isModalSubmit() && interaction.customId === 'role_request_modal') {
      const request = interaction.fields.getTextInputValue('role_request_input');
      const channel = interaction.guild.channels.cache.get(REQUEST_CHANNEL_ID);

      if (channel) {
        channel.send(`**Uni society addition requested by ${interaction.user}:**\n${request}`);
      }

      return interaction.reply({
        content: '📨 Your request has been sent!',
        ephemeral: true
      });
    }
  }
};
