const {
  SlashCommandBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");
const fs = require("node:fs");

const MOD_ROLE_ID = "1018290989246468116";

module.exports = {
  data: new SlashCommandBuilder()
    .setName("dayswithoutincident")
    .setDescription("Check days since last incident"),
  async execute(interaction) {
    await interaction.deferReply();

    let date;
    try {
      date = JSON.parse(
        fs.readFileSync("./dayswithoutincident.json", "utf-8"),
      ).date;
    } catch {
      date = new Date().toISOString().slice(0, 10);
      fs.writeFileSync(
        "./dayswithoutincident.json",
        JSON.stringify({ date }),
        "utf-8",
      );
    }

    const days = Math.floor(
      (new Date().setHours(0, 0, 0, 0) - new Date(date).setHours(0, 0, 0, 0)) /
        86400000,
    );

    const content = `Days since last incident: ${days}`;

    if (!interaction.member.roles.cache.has(MOD_ROLE_ID)) {
      return interaction.editReply({ content });
    }

    await interaction.editReply({
      content,
      components: [
        new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId("reset_incident")
            .setLabel("RESET")
            .setStyle(ButtonStyle.Danger),
        ),
      ],
    });

    const collector = interaction.channel.createMessageComponentCollector({
      filter: (i) =>
        i.customId === "reset_incident" && i.user.id === interaction.user.id,
      time: 60_000,
    });
    collector.on("collect", async (i) => {
      const today = new Date().toISOString().slice(0, 10);
      fs.writeFileSync(
        "./dayswithoutincident.json",
        JSON.stringify({ date: today }),
        "utf-8",
      );
      await i.update({
        content: "Days since last incident: 0",
        components: [],
      });
      collector.stop();
    });
    collector.on("end", (_, reason) => {
      if (reason === "time")
        interaction.editReply({ components: [] }).catch(() => {});
    });
  },
};
