const {
  SlashCommandBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  MessageActionRow,
  MessageButton,
} = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("wheretostart")
    .setDescription(
      "New to the show but don't know where to begin? Here's some starting points!",
    ),
  async execute(interaction) {
    await interaction.deferReply();

    // Function to handle button clicks
    const buttonHandler = async (interaction) => {
      const buttonId = interaction.customId;
      let message;
      switch (buttonId) {
        case "UnearthlyChild":
          message =
            "Want to watch the entire show from the beginning? Start here! It will take a long time to catch up, and a lot of the early black and white episodes are missing, but if you have the attention span then go for it!";
          break;
        case "SpearheadFromSpace":
          message =
            "Don't want to watch the black and white stuff with missing episodes? Start here!\n> The TARDIS takes the newly regenerated Doctor to Earth to begin his exile. Brigadier Lethbridge-Stewart leads a UNIT investigation into a mysterious meteorite shower. ";
          break;
        case "Robot":
          message =
            "Want stories set in space and on other planets? This is the first episode of the most popular Doctor of the classic era!\n> UNIT are called in when top secret plans and valuable equipment is stolen from high security establishments. The newly regenerated Doctor suggests that the thief may not be human.";
          break;
        case "TVMovie":
          message =
            "Want to skip the classic era but don't to skip straight onto the revival era? Watch this movie!\n> After being shot beside the TARDIS, the Seventh Doctor becomes the Eighth. And on the streets of San Francisco – alongside new ally Grace Holloway - he battles the Master. ";
          break;
        case "Rose":
          message =
            "This is always the recommended place to begin. After the show's cancellation in 1989, it was revived in 2005 with a new Doctor and designed for a new era and audience. A lot more fast paced than the classic era of the show, and fully created with new viewers in mind!\n> Rose Tyler meets a mysterious stranger called the Doctor, and realises Earth is in danger.";
          break;
        case "EleventhHour":
          message =
            "The Eleventh Hour is the first episode during Steven Moffat's tenure as showrunner, and starts fresh from the prior four seasons, creating an ideal jumping-on point!.\n> The new Doctor has 20 minutes to save the world, and only Amy Pond - the girl who waited - can help him. ";
          break;
        case "Pilot":
          message =
            "The Pilot is a fresh start for new viewers as the previous few seasons of the show heavily relied on each other. This series is often a fan favourite too!\n> Two worlds collide when the Doctor meets Bill, and a chance encounter with a girl with a star in her eye leads to a terrifying chase across time and space. Bill's mind is opened to a universe that is bigger and more exciting than she could possibly have imagined. But who is the Doctor, and what is his secret mission on Earth?";
          break;
        case "WomanWhoFellToEarth":
          message =
            "The Woman Who Fell to Earth is the first episode during Chris Chibnall's tenure as showrunner. This whole series has no returning characters, back to the basics and welcoming for new fans!\n> 'We don't get aliens in Sheffield.' In a South Yorkshire city, Ryan Sinclair, Yasmin Khan and Graham O'Brien are about to have their lives changed for ever, as a mysterious woman, unable to remember her own name, falls from the night sky. Can they believe a word she says? And can she help solve the strange events taking place across the city?";
          break;
        case "ChurchOnRubyRoad":
          message =
            "This episode introduces both the 15th Doctor and a new companion. If you don't want a crazy amount to have to get through, start here, there's only two seasons to catch up on!\n> Long ago, on Christmas Eve, a baby was abandoned in the snow. Today, Ruby Sunday meets the Doctor, goblins, stolen babies and, perhaps, the secret of her birth.";
          break;
        case "Future":
          message =
            "Starting Doctor Who can be a big task, so why not tune in this Christmas for the next episode and join the hype with other fans here in the server?";
          break;
        default:
          message = "Unknown button clicked.";
          break;
      }
      await interaction.reply({ content: message, ephemeral: true });
    };

    // Function to create buttons and action row
    const createButtons = (buttons) => {
      const row = new ActionRowBuilder();
      buttons.forEach((button) => {
        row.addComponents(button);
      });
      return row;
    };

    // Create first set of buttons
    const firstButtons = [
      new ButtonBuilder()
        .setCustomId("UnearthlyChild")
        .setEmoji("<:Doctor01:1234958347057496096>")
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId("SpearheadFromSpace")
        .setEmoji("<:Doctor03:1234959424091590667>")
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId("Robot")
        .setEmoji("<:Doctor04:1234959435357622285>")
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId("TVMovie")
        .setEmoji("<:Doctor08:1234959445138739353>")
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId("Rose")
        .setEmoji("<:Doctor09:1179920908928962611>")
        .setStyle(ButtonStyle.Secondary),
    ];

    // Create second set of buttons
    const secondButtons = [
      new ButtonBuilder()
        .setCustomId("EleventhHour")
        .setEmoji("<:Doctor11:1234959468610191400>")
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId("Pilot")
        .setEmoji("<:Doctor12:1234959481604018217>")
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId("WomanWhoFellToEarth")
        .setEmoji("<:Doctor13:1234959490390949979>")
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId("ChurchOnRubyRoad")
        .setEmoji("<:Doctor15:1234959504743993405>")
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId("Future")
        .setEmoji("❓")
        .setStyle(ButtonStyle.Secondary),
    ];

    // Create an embed with bullet points for the buttons
    const embed = new EmbedBuilder()
      .setColor("#003B6F")
      .setTitle("New to Who? Here's some starting points!")
      .addFields({
        name: `<:Doctor01:1234958347057496096> An Unearthly Child`,
        value: `The very first Doctor Who episode from 1963!\n1st Doctor: William Hartnell\nYear: 1963`,
      })
      .addFields({
        name: `<:Doctor03:1234959424091590667> Spearhead from Space`,
        value: `The first colourised episode of Doctor Who!\n3rd Doctor: Jon Pertwee\nYear: 1970`,
      })
      .addFields({
        name: `<:Doctor04:1234959435357622285> Robot`,
        value: `The debut adventure for the longest-running Doctor!\n4th Doctor: Tom Baker\nYear: 1974`,
      })
      .addFields({
        name: `<:Doctor08:1234959445138739353> The TV Movie`,
        value: `American produced movie released while the show was off air!\n8th Doctor: Paul McGann\nYear: 1996`,
      })
      .addFields({
        name: `<:Doctor09:1179920908928962611> Rose    <---- Recommended Starting Point!✅`,
        value: `The first episode of the revival era!\n9th Doctor: Christopher Eccleston\nYear: 2005`,
      })
      .addFields({
        name: `<:Doctor11:1234959468610191400> The Eleventh Hour`,
        value: `Second showrunner of the revival era!\n11th Doctor: Matt Smith\nYear: 2010`,
      })
      .addFields({
        name: `<:Doctor12:1234959481604018217> The Pilot`,
        value: `This episode is designed to be a jumping on point!\n12th Doctor: Peter Capaldi\nYear: 2017`,
      })
      .addFields({
        name: `<:Doctor13:1234959490390949979> The Woman Who Fell to Earth`,
        value: `Third showrunner of the revival era and first female Doctor!\n13th Doctor: Jodie Whittaker\nYear: 2018`,
      })
      .addFields({
        name: `<:Doctor15:1234959504743993405> The Church on Ruby Road`,
        value: `The introduction to the newest era!\n15th Doctor: Ncuti Gatwa\nYear: 2023`,
      })
      .addFields({
        name: `❓The Future...?`,
        value: `Don't want to have to go back? Tune in this Christmas for a new episode!`,
      })
      .setFooter({
        text: "Click a button to get more info!",
      });

    // Sending the initial message with both sets of buttons in an embed
    await interaction.editReply({
      embeds: [embed],
      components: [createButtons(firstButtons), createButtons(secondButtons)],
    });

    // Listen for button clicks continuously
    const collector = interaction.channel.createMessageComponentCollector({
      time: null,
    });

    collector.on("collect", async (interaction) => {
      await buttonHandler(interaction);
    });

    // Handle collector errors
    collector.on("end", () => {
      console.log("Button collector ended.");
    });
  },
};
