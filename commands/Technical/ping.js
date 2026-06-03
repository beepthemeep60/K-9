const { SlashCommandBuilder } = require("discord.js");

function format(seconds) {
  function pad(s) {
    return (s < 10 ? "0" : "") + s;
  }
  var hours = Math.floor(seconds / (60 * 60));
  var minutes = Math.floor((seconds % (60 * 60)) / 60);
  var seconds = Math.floor(seconds % 60);

  return pad(hours) + ":" + pad(minutes) + ":" + pad(seconds);
}

module.exports = {
  data: new SlashCommandBuilder().setName("ping").setDescription("Check the bot's latency"),
  async execute(interaction) {
    await interaction.deferReply();
    var uptime = process.uptime();
    await interaction.editReply(
      `<:Affirmative:1019680728759419011> Latency is ${
        Date.now() - interaction.createdTimestamp
      }ms with ${format(uptime)} since last restart.`
    );
    console.log(
      interaction.channel.permissionsFor(interaction.client.user).toArray()
    );
    console.log(interaction);
  },
};
