const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("silence")
    .setDescription("[MODERATOR ONLY] Mute a member. Silence will fall.")
    .addUserOption((option) =>
      option
        .setName("user")
        .setDescription("The member to mute")
        .setRequired(true),
    )
    .addNumberOption((option) =>
      option
        .setName("duration")
        .setDescription("Number of minutes to mute for (Default: 1 hour)")
        .setMinValue(1)
        .setMaxValue(40000),
    )
    .addStringOption((option) =>
      option
        .setName("reason")
        .setDescription(`The reason for muting the member`),
    ),
  async execute(interaction) {
    await interaction.deferReply();
    const users = interaction.options.getUser("user");
    const ID = users.id;
    const muteUser = interaction.client.users.cache.get(ID);
    let duration = interaction.options.getNumber("duration");
    let milliseconds;

    if (duration !== null) {
      milliseconds = duration * 60000;
    } else {
      milliseconds = 60 * 60 * 1000; // default value: 1 hour
    }

    let minutes = milliseconds / 60 / 1000;

    if (!interaction.member.permissions.has("ModerateMembers"))
      return await interaction.editReply({
        content: "You don't have mute perms. You can't mute others.",
      });
    if (interaction.member.id === ID)
      return await interaction.editReply({
        content: "You cannot mute yourself... <:Silence:1019325346434273331>",
      });

    let reason = interaction.options.getString("reason");
    if (!reason) reason = "No reason given.";

    const dmEmbed = new EmbedBuilder()
      .setColor("#c46506")
      .setTitle("Click here for appeal form!")
      .setURL("https://k-9.vercel.app/Appeal.html")
      .setThumbnail("attachment://dog.png")
      .addFields({
        name: `You have been muted in ${interaction.guild.name}`,
        value: `Reason: ${reason}\nDuration: ${minutes} minutes\nYou can appeal your mute by clicking the link above!`,
      })
      .setImage("attachment://BOTI_logo.png")
      .setTimestamp()
      .setFooter({
        text: "Please follow the rules.",
      });

    const embed = new EmbedBuilder()
      .setColor("#c46506")
      .setDescription(
        `<:Affirmative:1019680728759419011> ${muteUser} has been muted.\nReason: ${reason}\nDuration: ${minutes} minutes\n\nID: ${
          interaction.options.getUser("user").id
        }`,
      );

    let muteSuccessful = false;
    const target = interaction.options.getMember("user");

    try {
      await target.timeout(milliseconds);
      muteSuccessful = true;
    } catch (error) {
      console.log(error);
      interaction.editReply({
        content:
          "I cannot mute this member!\nIf this is unexpected, please mute the member with a different bot and then report this issue on the [support page](https://k-9.vercel.app/Support.html)",
      });
    }

    if (muteSuccessful) {
      await muteUser
        .send({
          embeds: [dmEmbed],
          files: ["./assets/dog.png", "./assets/BOTI_logo.png"],
        })
        .catch((err) => {
          try {
            interaction.channel.send("I couldn't DM the muted user.");
          } catch (err) {
            interaction.guild.channels.cache
              .get("915568009815416845")
              .send("I couldn't DM the muted user.");
          }
        });
      await interaction.editReply({ embeds: [embed] });

      try {
        interaction.guild.channels.cache
          .get("1018289802065485826")
          .send({ embeds: [embed] });
      } catch (err) {
        interaction.guild.channels.cache
          .get("915568009815416845")
          .send({ embeds: [embed] });
      }
    }
  },
};
