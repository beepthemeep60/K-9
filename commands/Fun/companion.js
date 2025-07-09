const { SlashCommandBuilder } = require("discord.js");

const companionData = [
  {
    name: "Rose Tyler",
    gif: "https://cdn.discordapp.com/attachments/1233862314558623765/1233862626933735445/rose-tyler.gif?ex=662ea39e&is=662d521e&hm=4484b7367110a4a486490f0d18a1b6e5bb73881bccfc18bcdf2df5ced00fd533&",
  },
  {
    name: "Martha Jones",
    gif: "https://cdn.discordapp.com/attachments/1233862314558623765/1233862627289993398/martha-jones.gif?ex=662ea39e&is=662d521e&hm=9a15fb58b995b0cc0f61963b6ad21f7bc73bc7efce6d0f64b55e4e258ff5b5d1&",
  },
  {
    name: "Donna Noble",
    gif: "https://cdn.discordapp.com/attachments/1233862314558623765/1233862627751497728/donna-noble.gif?ex=662ea39e&is=662d521e&hm=860f2e9eb819b958f776f764dea868234ab00454af2956dd38dfb7cdf82a4d6e&",
  },
  {
    name: "Amy Pond",
    gif: "https://cdn.discordapp.com/attachments/1233862314558623765/1233862628305014914/amy-pond.gif?ex=662ea39e&is=662d521e&hm=937a08775702362ce48bc79e35542ee01ae35c48ede05ba9ab48d53d524471cf&",
  },
  {
    name: "Rory Williams",
    gif: "https://cdn.discordapp.com/attachments/1233862314558623765/1233862628690886696/rory-williams.gif?ex=662ea39e&is=662d521e&hm=e3d117b411928a3e780b14c95ade1ca0c5e41dd0403ff75bd7967a3d44e75e2c&",
  },
  {
    name: "Clara Oswald",
    gif: "https://cdn.discordapp.com/attachments/1233862314558623765/1233862629056053419/clara-oswald.gif?ex=662ea39e&is=662d521e&hm=99af97ad944c8e412d2e54cd7f7acfecce72f9a0e3c9bcf2ec6dc88847fa0ad6&",
  },
  {
    name: "Bill Potts",
    gif: "https://cdn.discordapp.com/attachments/1233862314558623765/1233862629525684365/bill-potts.gif?ex=662ea39e&is=662d521e&hm=7f23e006429932029ae023150d89af203c14c5520a94151b07d8a803e25330ae&",
  },
  {
    name: "Nardole",
    gif: "https://cdn.discordapp.com/attachments/1233862314558623765/1233862629865291776/nardole.gif?ex=662ea39f&is=662d521f&hm=558150ff7600cea3f4ee1b607cd06c9ce7fc3a65f98558828646ab3dc892a199&",
  },
  {
    name: "Yasmin Khan",
    gif: "https://cdn.discordapp.com/attachments/1233862314558623765/1233862630415011891/yasmin-khan.gif?ex=662ea39f&is=662d521f&hm=aaa7e43907c420e41ceec2383296ff642d2e169f504e4a5319d5b068d10ca488&",
  },
  {
    name: "Graham O'Brien",
    gif: "https://cdn.discordapp.com/attachments/1233862314558623765/1233862630783975476/graham-obrien.gif?ex=662ea39f&is=662d521f&hm=569b6be4d2345f624eb4fc17779cd30118a7976764d8afe870ac43e046cf87c8&",
  },
  {
    name: "Ryan Sinclair",
    gif: "https://cdn.discordapp.com/attachments/1233862314558623765/1233862674429902929/ryan-sinclair.gif?ex=662ea3a9&is=662d5229&hm=3d62b95dd58cecb18d128977a86373ab15f1b29fed744b6e91771409447a93c3&",
  },
  {
    name: "Dan Lewis",
    gif: "https://cdn.discordapp.com/attachments/1233862314558623765/1233862674849468427/dan-lewis.gif?ex=662ea3a9&is=662d5229&hm=1e271e482f4c5d4fb4a74eec038ce58c975f65fe6128e019e1553655dd3e8575&",
  },
  {
    name: "River Song",
    gif: "https://cdn.discordapp.com/attachments/1233862314558623765/1233862675235213333/river-song.gif?ex=662ea3a9&is=662d5229&hm=5420f509fc2ccf655049a1986945bc35630b92112cff89753d412b7c2a2c7b0f&",
  },
  {
    name: "Jack Harkness",
    gif: "https://cdn.discordapp.com/attachments/1233862314558623765/1233862675675611247/jack-harkness.gif?ex=662ea3a9&is=662d5229&hm=2d253cf4ef10db2c239312e432b4086bd7de31f437e33ee8090e91d3c439b6cb&",
  },
  {
    name: "Sarah Jane Smith",
    gif: "https://cdn.discordapp.com/attachments/1233862314558623765/1233862676103565393/sarah-jane.gif?ex=662ea3aa&is=662d522a&hm=8f23eafa4a680956b033cc2e11116e80826cb48d2dcb1c38da07ab2365a28dd9&",
  },
  {
    name: "Jackie Tyler",
    gif: "https://cdn.discordapp.com/attachments/1233862314558623765/1233862676535447552/jackie-tyler.gif?ex=662ea3aa&is=662d522a&hm=b520d79e73e2938b4503616f50aa28477be9dccddd88cbc72dea6b0e98a3cdf4&",
  },
  {
    name: "Ruby Sunday",
    gif: "https://cdn.discordapp.com/attachments/1233862314558623765/1233863083177410631/ruby-sunday.gif?ex=662ea40b&is=662d528b&hm=96dc3d3ce5377e87b5f724cba5ca70ae001f0d5786d688daa4ad5ecc67d2cd1f&",
  },
  {
    name: "Belinda Chandra",
    gif: "https://media4.giphy.com/media/v1.Y2lkPTc5MGI3NjExMzZwbDAzcWJhcWVkN2M0Y3JxdzV6eDY0bXZtcXdmNXZ4bXRrbXJucyZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/h4BDqeqFq7PqLe88bK/giphy.gif",
  }
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName("companion")
    .setDescription("Become a random companion"),
  async execute(interaction) {
    await interaction.deferReply();

    const randomNumber = Math.floor(Math.random() * 18);

    await interaction.editReply(companionData[randomNumber].gif);

    // Check whether the bot has permission to change members' nicknames
    // and whether the bot is above the member in the hierarchy
    if (
      interaction.channel
        .permissionsFor(interaction.client.user)
        .has("ManageNicknames") &&
      interaction.member.manageable
    ) {
      let nicknameWithUsername = `${companionData[randomNumber].name} (${interaction.member.user.username})`;

      if (nicknameWithUsername.length <= 32) {
        interaction.member.setNickname(nicknameWithUsername).catch((error) => {
          console.error("Error setting nickname with username:", error);
        });
      } else {
        interaction.member
          .setNickname(companionData[randomNumber].name)
          .catch((error) => {
            console.error("Error setting nickname without username:", error);
          });
      }
    }
  },
};
