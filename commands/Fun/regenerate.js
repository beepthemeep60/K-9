const { SlashCommandBuilder } = require("discord.js");
const { Collection } = require("discord.js");

const cooldowns = new Collection();

module.exports = {
  data: new SlashCommandBuilder()
    .setName("regenerate")
    .setDescription("Love from Gallifrey, boys!"),
  async execute(interaction) {
    const member = interaction.member.user.username;
    let canNickname = true;
    const randomNumber = Math.floor(Math.random() * 20) + 1;
    if (
      !interaction.channel
        .permissionsFor(interaction.client.user)
        .has("ManageNicknames")
    ) {
      canNickname = false;
    } else if (!interaction.member.manageable) {
      // The above if statement determines whether the client user is above the member
      // who ran the command in the hierarchy, according to role position and guild ownership.
      canNickname = false;
    }
    await interaction.deferReply();
    if (randomNumber === 1) {
      await interaction.editReply(
        "https://cdn.discordapp.com/attachments/1233859483956936757/1233859812937437194/1.gif?ex=662ea0ff&is=662d4f7f&hm=b111c0b647e6458844081a9b0c3ba5698ce68755244aac81aa841f0b35ab5c78&"
      );
      if (canNickname === true) {
        const nicknameWithUsername = `The 2nd Doctor (${interaction.member.user.username})`;

        if (nicknameWithUsername.length <= 32) {
          interaction.member
            .setNickname(nicknameWithUsername)
            .catch((error) => {
              console.error("Error setting nickname with username:", error);
            });
        } else {
          interaction.member.setNickname("The 2nd Doctor").catch((error) => {
            console.error("Error setting nickname without username:", error);
          });
        }
      }
    } else if (randomNumber === 2) {
      //2 to 3
      await interaction.editReply(
        "https://cdn.discordapp.com/attachments/1233859483956936757/1233859813390418060/2.gif?ex=662ea0ff&is=662d4f7f&hm=51407c9ec3b4d747b62e90827ee7aef626c60f11edc708eb026916732345a8d5&"
      );
      if (canNickname === true) {
        const nicknameWithUsername = `The 3rd Doctor (${interaction.member.user.username})`;

        if (nicknameWithUsername.length <= 32) {
          interaction.member
            .setNickname(nicknameWithUsername)
            .catch((error) => {
              console.error("Error setting nickname with username:", error);
            });
        } else {
          interaction.member.setNickname("The 3rd Doctor").catch((error) => {
            console.error("Error setting nickname without username:", error);
          });
        }
      }
    } else if (randomNumber === 3) {
      //3 to 4
      await interaction.editReply(
        "https://cdn.discordapp.com/attachments/1233859483956936757/1233859813935546388/3.gif?ex=662ea0ff&is=662d4f7f&hm=cf0a623056712a76acb4950b2ec1135fd8f5923a6c4a3f514cdd1cb0e6b4468d&"
      );
      if (canNickname === true) {
        const nicknameWithUsername = `The 4th Doctor (${interaction.member.user.username})`;

        if (nicknameWithUsername.length <= 32) {
          interaction.member
            .setNickname(nicknameWithUsername)
            .catch((error) => {
              console.error("Error setting nickname with username:", error);
            });
        } else {
          interaction.member.setNickname("The 4th Doctor").catch((error) => {
            console.error("Error setting nickname without username:", error);
          });
        }
      }
    } else if (randomNumber === 4) {
      //4 to 5
      await interaction.editReply(
        "https://cdn.discordapp.com/attachments/1233859483956936757/1233859814753566770/4.gif?ex=662ea0ff&is=662d4f7f&hm=fdc403137f1591aaa0cf7d67c2f3c6763e6fa89f1b536796b0526503ea7bbcc2&"
      );
      if (canNickname === true) {
        const nicknameWithUsername = `The 5th Doctor (${interaction.member.user.username})`;

        if (nicknameWithUsername.length <= 32) {
          interaction.member
            .setNickname(nicknameWithUsername)
            .catch((error) => {
              console.error("Error setting nickname with username:", error);
            });
        } else {
          interaction.member.setNickname("The 5th Doctor").catch((error) => {
            console.error("Error setting nickname without username:", error);
          });
        }
      }
    } else if (randomNumber === 5) {
      //5 to 6
      await interaction.editReply(
        "https://cdn.discordapp.com/attachments/1233859483956936757/1233859815567265853/5.gif?ex=662ea100&is=662d4f80&hm=74f288f462ba0e6e9270a4d449c62920a063a3c2b7a0d5e5e3ebfb86f4bd33b9&"
      );
      if (canNickname === true) {
        const nicknameWithUsername = `The 6th Doctor (${interaction.member.user.username})`;

        if (nicknameWithUsername.length <= 32) {
          interaction.member
            .setNickname(nicknameWithUsername)
            .catch((error) => {
              console.error("Error setting nickname with username:", error);
            });
        } else {
          interaction.member.setNickname("The 6th Doctor").catch((error) => {
            console.error("Error setting nickname without username:", error);
          });
        }
      }
    } else if (randomNumber === 6) {
      //6 to 7
      await interaction.editReply(
        "https://cdn.discordapp.com/attachments/1233859483956936757/1233859816766832680/6.gif?ex=662ea100&is=662d4f80&hm=dfa2a9ee72c0eb5bc38edf76ddbd2796aee775d92766eea497b95b352aabc871&"
      );
      if (canNickname === true) {
        const nicknameWithUsername = `The 7th Doctor (${interaction.member.user.username})`;

        if (nicknameWithUsername.length <= 32) {
          interaction.member
            .setNickname(nicknameWithUsername)
            .catch((error) => {
              console.error("Error setting nickname with username:", error);
            });
        } else {
          interaction.member.setNickname("The 7th Doctor").catch((error) => {
            console.error("Error setting nickname without username:", error);
          });
        }
      }
    } else if (randomNumber === 7) {
      //7 to 8
      await interaction.editReply(
        "https://cdn.discordapp.com/attachments/1233859483956936757/1233859817370816562/7.gif?ex=662ea100&is=662d4f80&hm=3aeae1c17c2664f8720341a4f480941cb38c28d30b8bdcd49ce06c00d854deac&"
      );
      if (canNickname === true) {
        const nicknameWithUsername = `The 8th Doctor (${interaction.member.user.username})`;

        if (nicknameWithUsername.length <= 32) {
          interaction.member
            .setNickname(nicknameWithUsername)
            .catch((error) => {
              console.error("Error setting nickname with username:", error);
            });
        } else {
          interaction.member.setNickname("The 8th Doctor").catch((error) => {
            console.error("Error setting nickname without username:", error);
          });
        }
      }
    } else if (randomNumber === 8) {
      //8 to War
      await interaction.editReply(
        "https://cdn.discordapp.com/attachments/1233859483956936757/1233859818071261234/8.gif?ex=662ea100&is=662d4f80&hm=a40769563c1312edf22b3f3ab016e18e0133a933dd191c2826f85e95768633fd&"
      );
      if (canNickname === true) {
        const nicknameWithUsername = `The War Doctor (${interaction.member.user.username})`;

        if (nicknameWithUsername.length <= 32) {
          interaction.member
            .setNickname(nicknameWithUsername)
            .catch((error) => {
              console.error("Error setting nickname with username:", error);
            });
        } else {
          interaction.member.setNickname("The War Doctor").catch((error) => {
            console.error("Error setting nickname without username:", error);
          });
        }
      }
    } else if (randomNumber === 9) {
      //War to 9
      await interaction.editReply(
        "https://cdn.discordapp.com/attachments/1233859483956936757/1233859828905152532/war.gif?ex=662ea103&is=662d4f83&hm=563c82420d7f3a2d6c3b2cf86fb4e5e8baeca34a5d153395fcbc87ecc625642f&"
      );
      if (canNickname === true) {
        const nicknameWithUsername = `The 9th Doctor (${interaction.member.user.username})`;

        if (nicknameWithUsername.length <= 32) {
          interaction.member
            .setNickname(nicknameWithUsername)
            .catch((error) => {
              console.error("Error setting nickname with username:", error);
            });
        } else {
          interaction.member.setNickname("The 9th Doctor").catch((error) => {
            console.error("Error setting nickname without username:", error);
          });
        }
      }
    } else if (randomNumber === 10) {
      //9 to 10
      await interaction.editReply(
        "https://cdn.discordapp.com/attachments/1233859483956936757/1233859818608001185/9.gif?ex=662ea100&is=662d4f80&hm=38c73f4e0c9cc01e750cb1b0539cf62add2b5232c188f5cb08b8db7354bc065e&"
      );
      if (canNickname === true) {
        const nicknameWithUsername = `The 10th Doctor (${interaction.member.user.username})`;

        if (nicknameWithUsername.length <= 32) {
          interaction.member
            .setNickname(nicknameWithUsername)
            .catch((error) => {
              console.error("Error setting nickname with username:", error);
            });
        } else {
          interaction.member.setNickname("The 10th Doctor").catch((error) => {
            console.error("Error setting nickname without username:", error);
          });
        }
      }
    } else if (randomNumber === 11) {
      //10 to 10
      await interaction.editReply(
        "https://cdn.discordapp.com/attachments/1233859483956936757/1233859825121755156/10Alt.gif?ex=662ea102&is=662d4f82&hm=d0876ab5a82d2aa53996387adc615bf3598bc68fc75bd9c82f39ba08d44848c9&"
      );
      if (canNickname === true) {
        const nicknameWithUsername = `The 10th Doctor (${interaction.member.user.username})`;

        if (nicknameWithUsername.length <= 32) {
          interaction.member
            .setNickname(nicknameWithUsername)
            .catch((error) => {
              console.error("Error setting nickname with username:", error);
            });
        } else {
          interaction.member.setNickname("The 10th Doctor").catch((error) => {
            console.error("Error setting nickname without username:", error);
          });
        }
      }
    } else if (randomNumber === 12) {
      //10 to 11
      await interaction.editReply(
        "https://cdn.discordapp.com/attachments/1233859483956936757/1233859824454734014/10.gif?ex=662ea102&is=662d4f82&hm=34bc064adef29d35dfa8d502a19046c9cd7d224da72229389f882dd200e43b66&"
      );
      if (canNickname === true) {
        const nicknameWithUsername = `The 11th Doctor (${interaction.member.user.username})`;

        if (nicknameWithUsername.length <= 32) {
          interaction.member
            .setNickname(nicknameWithUsername)
            .catch((error) => {
              console.error("Error setting nickname with username:", error);
            });
        } else {
          interaction.member.setNickname("The 11th Doctor").catch((error) => {
            console.error("Error setting nickname without username:", error);
          });
        }
      }
    } else if (randomNumber === 13) {
      //11 to 12
      await interaction.editReply(
        "https://cdn.discordapp.com/attachments/1233859483956936757/1233859825692053564/11.gif?ex=662ea102&is=662d4f82&hm=7eeed552f758e87c7978afd7c13c9d7a94a8ace04b564b8ae2de9cead8487cfb&"
      );
      if (canNickname === true) {
        const nicknameWithUsername = `The 12th Doctor (${interaction.member.user.username})`;

        if (nicknameWithUsername.length <= 32) {
          interaction.member
            .setNickname(nicknameWithUsername)
            .catch((error) => {
              console.error("Error setting nickname with username:", error);
            });
        } else {
          interaction.member.setNickname("The 12th Doctor").catch((error) => {
            console.error("Error setting nickname without username:", error);
          });
        }
      }
    } else if (randomNumber === 14) {
      //12 to 13
      await interaction.editReply(
        "https://cdn.discordapp.com/attachments/1233859483956936757/1233859826191437824/12.gif?ex=662ea102&is=662d4f82&hm=742913ae75e3df98d0d43b6df7f1e2b38f199710f755e6466b668561ad0ac3ff&"
      );
      if (canNickname === true) {
        const nicknameWithUsername = `The 13th Doctor (${interaction.member.user.username})`;

        if (nicknameWithUsername.length <= 32) {
          interaction.member
            .setNickname(nicknameWithUsername)
            .catch((error) => {
              console.error("Error setting nickname with username:", error);
            });
        } else {
          interaction.member.setNickname("The 13th Doctor").catch((error) => {
            console.error("Error setting nickname without username:", error);
          });
        }
      }
    } else if (randomNumber === 15) {
      //13 to Master
      await interaction.editReply(
        "https://cdn.discordapp.com/attachments/1233859483956936757/1233859827340673155/13Alt.gif?ex=662ea102&is=662d4f82&hm=10a14328e01d85e8dee614be5e36d911729eb16e0f9066a6c54badb12a463b0c&"
      );
      if (canNickname === true) {
        const nicknameWithUsername = `The Master Doctor (${interaction.member.user.username})`;

        if (nicknameWithUsername.length <= 32) {
          interaction.member
            .setNickname(nicknameWithUsername)
            .catch((error) => {
              console.error("Error setting nickname with username:", error);
            });
        } else {
          interaction.member.setNickname("The Master Doctor").catch((error) => {
            console.error("Error setting nickname without username:", error);
          });
        }
      }
    } else if (randomNumber === 16) {
      //Master to 13
      await interaction.editReply(
        "https://cdn.discordapp.com/attachments/1233859483956936757/1233859827805982792/13Master.gif?ex=662ea102&is=662d4f82&hm=fb9bb30631d2c5362487f9a39cc708a6d58c3f9f3d245cb55451555e8c52db32&"
      );
      if (canNickname === true) {
        const nicknameWithUsername = `The 13th Doctor (${interaction.member.user.username})`;

        if (nicknameWithUsername.length <= 32) {
          interaction.member
            .setNickname(nicknameWithUsername)
            .catch((error) => {
              console.error("Error setting nickname with username:", error);
            });
        } else {
          interaction.member.setNickname("The 13th Doctor").catch((error) => {
            console.error("Error setting nickname without username:", error);
          });
        }
      }
    } else if (randomNumber === 17) {
      //13 to 14
      await interaction.editReply(
        "https://cdn.discordapp.com/attachments/1233859483956936757/1233859826749018213/13.gif?ex=662ea102&is=662d4f82&hm=7cbfbecde8f294a0bf1f7667a6e7a23b8dad27b4906c8682e1b00bf4deaf3d02&"
      );
      if (canNickname === true) {
        const nicknameWithUsername = `The 14th Doctor (${interaction.member.user.username})`;

        if (nicknameWithUsername.length <= 32) {
          interaction.member
            .setNickname(nicknameWithUsername)
            .catch((error) => {
              console.error("Error setting nickname with username:", error);
            });
        } else {
          interaction.member.setNickname("The 14th Doctor").catch((error) => {
            console.error("Error setting nickname without username:", error);
          });
        }
      }
    } else if (randomNumber === 18) {
      //bigeneration
      await interaction.editReply(
        "https://cdn.discordapp.com/attachments/1233859483956936757/1233861701368021013/bigeneration.gif?ex=662ea2c1&is=662d5141&hm=5369a85b87bd0cdeb81f88bc8589c2789824da2fc276334317dcbc2a00e2b66b&"
      );
      if (canNickname === true) {
        const nicknameWithUsername = `The 15th Doctor (${interaction.member.user.username})`;

        if (nicknameWithUsername.length <= 32) {
          interaction.member
            .setNickname(nicknameWithUsername)
            .catch((error) => {
              console.error("Error setting nickname with username:", error);
            });
        } else {
          interaction.member.setNickname("The 15th Doctor").catch((error) => {
            console.error("Error setting nickname without username:", error);
          });
        }
      }
    } else if (randomNumber === 19) {
      //15 to 16
      await interaction.editReply(
        "https://media.giphy.com/media/gExs8MSVNYAzsjLhmc/giphy.gif"
      );
      if (canNickname === true) {
        const nicknameWithUsername = `The 16th Doctor (${interaction.member.user.username})`;

        if (nicknameWithUsername.length <= 32) {
          interaction.member
            .setNickname(nicknameWithUsername)
            .catch((error) => {
              console.error("Error setting nickname with username:", error);
            });
        } else {
          interaction.member.setNickname("The 16th Doctor").catch((error) => {
            console.error("Error setting nickname without username:", error);
          });
        }
      }
    } else if (randomNumber === 20) {
      //shrek
      await interaction.editReply(
        "https://cdn.discordapp.com/attachments/1233859483956936757/1233859828376666183/shrek.gif?ex=662ea103&is=662d4f83&hm=f573c74f6bc57d3d511e6f8f8c651b7707d7ba09ef1c1159580b73cb74d4fc39&"
      );
      if (canNickname === true) {
        const nicknameWithUsername = `The Shroctor (${interaction.member.user.username})`;

        if (nicknameWithUsername.length <= 32) {
          interaction.member
            .setNickname(nicknameWithUsername)
            .catch((error) => {
              console.error("Error setting nickname with username:", error);
            });
        } else {
          interaction.member.setNickname("The Shroctor").catch((error) => {
            console.error("Error setting nickname without username:", error);
          });
        }
      }
    }
  },
};
