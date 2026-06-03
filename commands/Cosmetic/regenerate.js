const { SlashCommandBuilder } = require("discord.js");
const { Collection } = require("discord.js");
const { setTemporaryNickname } = require("../../nicknameManager");

const regenerationData = [
  {
    name: "The 2nd Doctor",
    gif: "https://cdn.discordapp.com/attachments/1233859483956936757/1233859812937437194/1.gif?ex=662ea0ff&is=662d4f7f&hm=b111c0b647e6458844081a9b0c3ba5698ce68755244aac81aa841f0b35ab5c78&",
  },
  {
    name: "The 3rd Doctor",
    gif: "https://cdn.discordapp.com/attachments/1233859483956936757/1233859813390418060/2.gif?ex=662ea0ff&is=662d4f7f&hm=51407c9ec3b4d747b62e90827ee7aef626c60f11edc708eb026916732345a8d5&",
  },
  {
    name: "The 4th Doctor",
    gif: "https://cdn.discordapp.com/attachments/1233859483956936757/1233859813935546388/3.gif?ex=662ea0ff&is=662d4f7f&hm=cf0a623056712a76acb4950b2ec1135fd8f5923a6c4a3f514cdd1cb0e6b4468d&",
  },
  {
    name: "The 5th Doctor",
    gif: "https://cdn.discordapp.com/attachments/1233859483956936757/1233859814753566770/4.gif?ex=662ea0ff&is=662d4f7f&hm=fdc403137f1591aaa0cf7d67c2f3c6763e6fa89f1b536796b0526503ea7bbcc2&",
  },
  {
    name: "The 6th Doctor",
    gif: "https://cdn.discordapp.com/attachments/1233859483956936757/1233859815567265853/5.gif?ex=662ea100&is=662d4f80&hm=74f288f462ba0e6e9270a4d449c62920a063a3c2b7a0d5e5e3ebfb86f4bd33b9&",
  },
  {
    name: "The 7th Doctor",
    gif: "https://cdn.discordapp.com/attachments/1233859483956936757/1233859816766832680/6.gif?ex=662ea100&is=662d4f80&hm=dfa2a9ee72c0eb5bc38edf76ddbd2796aee775d92766eea497b95b352aabc871&",
  },
  {
    name: "The 8th Doctor",
    gif: "https://cdn.discordapp.com/attachments/1233859483956936757/1233859817370816562/7.gif?ex=662ea100&is=662d4f80&hm=3aeae1c17c2664f8720341a4f480941cb38c28d30b8bdcd49ce06c00d854deac&",
  },
  {
    name: "The War Doctor",
    gif: "https://cdn.discordapp.com/attachments/1233859483956936757/1233859818071261234/8.gif?ex=662ea100&is=662d4f80&hm=a40769563c1312edf22b3f3ab016e18e0133a933dd191c2826f85e95768633fd&",
  },
  {
    name: "The 9th Doctor",
    gif: "https://cdn.discordapp.com/attachments/1233859483956936757/1233859828905152532/war.gif?ex=662ea103&is=662d4f83&hm=563c82420d7f3a2d6c3b2cf86fb4e5e8baeca34a5d153395fcbc87ecc625642f&",
  },
  {
    name: "The 10th Doctor",
    gif: "https://cdn.discordapp.com/attachments/1233859483956936757/1233859818608001185/9.gif?ex=662ea100&is=662d4f80&hm=38c73f4e0c9cc01e750cb1b0539cf62add2b5232c188f5cb08b8db7354bc065e&",
  },
  {
    name: "The 10th Doctor",
    gif: "https://cdn.discordapp.com/attachments/1233859483956936757/1233859825121755156/10Alt.gif?ex=662ea102&is=662d4f82&hm=d0876ab5a82d2aa53996387adc615bf3598bc68fc75bd9c82f39ba08d44848c9&",
  },
  {
    name: "The 11th Doctor",
    gif: "https://cdn.discordapp.com/attachments/1233859483956936757/1233859824454734014/10.gif?ex=662ea102&is=662d4f82&hm=34bc064adef29d35dfa8d502a19046c9cd7d224da72229389f882dd200e43b66&",
  },
  {
    name: "The 12th Doctor",
    gif: "https://cdn.discordapp.com/attachments/1233859483956936757/1233859825692053564/11.gif?ex=662ea102&is=662d4f82&hm=7eeed552f758e87c7978afd7c13c9d7a94a8ace04b564b8ae2de9cead8487cfb&",
  },
  {
    name: "The 13th Doctor",
    gif: "https://cdn.discordapp.com/attachments/1233859483956936757/1233859826191437824/12.gif?ex=662ea102&is=662d4f82&hm=742913ae75e3df98d0d43b6df7f1e2b38f199710f755e6466b668561ad0ac3ff&",
  },
  {
    name: "The Master",
    gif: "https://cdn.discordapp.com/attachments/1233859483956936757/1233859827340673155/13Alt.gif?ex=662ea102&is=662d4f82&hm=10a14328e01d85e8dee614be5e36d911729eb16e0f9066a6c54badb12a463b0c&",
  },
  {
    name: "The 13th Doctor",
    gif: "https://cdn.discordapp.com/attachments/1233859483956936757/1233859827805982792/13Master.gif?ex=662ea102&is=662d4f82&hm=fb9bb30631d2c5362487f9a39cc708a6d58c3f9f3d245cb55451555e8c52db32&",
  },
  {
    name: "The 14th Doctor",
    gif: "https://cdn.discordapp.com/attachments/1233859483956936757/1233859826749018213/13.gif?ex=662ea102&is=662d4f82&hm=7cbfbecde8f294a0bf1f7667a6e7a23b8dad27b4906c8682e1b00bf4deaf3d02&",
  },
  {
    name: "The 15th Doctor",
    gif: "https://cdn.discordapp.com/attachments/1233859483956936757/1233861701368021013/bigeneration.gif?ex=662ea2c1&is=662d5141&hm=5369a85b87bd0cdeb81f88bc8589c2789824da2fc276334317dcbc2a00e2b66b&",
  },
  {
    name: "The 16th Doctor",
    gif: "https://media.giphy.com/media/gExs8MSVNYAzsjLhmc/giphy.gif",
  },
  {
    name: "The Shroctor",
    gif: "https://cdn.discordapp.com/attachments/1233859483956936757/1233859828376666183/shrek.gif?ex=662ea103&is=662d4f83&hm=f573c74f6bc57d3d511e6f8f8c651b7707d7ba09ef1c1159580b73cb74d4fc39&",
  },
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName("regenerate")
    .setDescription("Love from Gallifrey, boys!"),
  async execute(interaction) {
    await interaction.deferReply();

    const randomNumber = Math.floor(Math.random() * regenerationData.length);

    const regeneration = regenerationData[randomNumber];

    await interaction.editReply(regeneration.gif);

    // Check whether the bot can change nicknames
    if (
      interaction.channel
        .permissionsFor(interaction.client.user)
        .has("ManageNicknames") &&
      interaction.member.manageable
    ) {
      try {
        let nicknameWithUsername = `${regeneration.name} (${interaction.user.username})`;

        const nickname =
          nicknameWithUsername.length <= 32
            ? nicknameWithUsername
            : regeneration.name;

        const originalName = await setTemporaryNickname(
          interaction.member,
          nickname,
        );
        if (originalName !== null) {
          await interaction.followUp({
            content: `Your nickname will revert back to "${originalName}" in 3 minutes!`,
            flags: ["Ephemeral"],
          });
        } else {
          await interaction.followUp({
            content: `Your nickname will revert back to "${interaction.user.displayName}" in 3 minutes!`,
            flags: ["Ephemeral"],
          });
        }
      } catch (error) {
        console.error("Failed to update nickname:", error);
      }
    }
  },
};
