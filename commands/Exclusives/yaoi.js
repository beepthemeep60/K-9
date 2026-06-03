const { SlashCommandBuilder } = require("discord.js");

const links = [
'https://cdn.discordapp.com/attachments/1044241077982466138/1245740075179053117/Untitled620_20230305223309.png?ex=6659d95a&is=665887da&hm=2ec977f620f389765b2180b4ceb74dd7a85bd5071d08f4a840899c239f03a52c&',
'https://cdn.discordapp.com/attachments/1044241077982466138/1245740075485102110/IMG_9837.jpg?ex=6659d95a&is=665887da&hm=1723e6b517f57e3b90384e9c0ea7c283e49c98e1be6be36350985ec42dad244f&',
'https://cdn.discordapp.com/attachments/1044241077982466138/1245740075728502814/IMG_0311.jpg?ex=6659d95a&is=665887da&hm=170cae938e6755eb7697ce2dc6cc14efa154c955453fa0d7f022636b59437af7&',
'https://cdn.discordapp.com/attachments/1044241077982466138/1245740076034424843/IMG_0423.jpg?ex=6659d95a&is=665887da&hm=80907663e9c7ebac131a1caa0ccde055a9b78739ef9ec9a9840702046fb697dc&',
'https://cdn.discordapp.com/attachments/1044241077982466138/1245740076420567121/IMG_9835.jpg?ex=6659d95a&is=665887da&hm=bb49a2b260c59b289f01c0520000528ec2cb2c96abdb996334fb474e92cc2eb3&',
'https://cdn.discordapp.com/attachments/1044241077982466138/1245740076676415650/IMG_3852.jpg?ex=6659d95b&is=665887db&hm=c3468238b62109b0e2b8846b8fb61377911698e26f7b26f7fe4665492a97af01&',
'https://cdn.discordapp.com/attachments/1044241077982466138/1245740076919423056/IMG_3853.jpg?ex=6659d95b&is=665887db&hm=7538bfdf8fb6072fafd8e5d532e58aed1dc1ce2d21d595051b305485134f006f&',
'https://cdn.discordapp.com/attachments/1044241077982466138/1245740077162958869/IMG_2702.jpg?ex=6659d95b&is=665887db&hm=94c9ba965181d1fb4effa5b48c3afd63bd43b6749f5151cd058e86a146e586cd&',
'https://cdn.discordapp.com/attachments/1044241077982466138/1245740077351571566/IMG_2705.jpg?ex=6659d95b&is=665887db&hm=42a8740aecb3194f418cab078cdc50aaf13c3594a484e49ed9d90b783197af2f&',
'https://cdn.discordapp.com/attachments/1044241077982466138/1245740077561151569/IMG_2127.jpg?ex=6659d95b&is=665887db&hm=4dcd16d5183c94a9e688590ad84f22fefa4f5340b33bc8308134da49fe8d9a72&',
'https://cdn.discordapp.com/attachments/1035684381005729902/1339093150765027418/IMG_5587.jpg?ex=67c5daee&is=67c4896e&hm=c98058d4a9713f61548e74b7a187e46a36167686e75651964004ab8508e99e77&'
]

module.exports = {
  data: new SlashCommandBuilder()
    .setName("yaoi")
    .setDescription("Exclusive duckie-only command"),
  async execute(interaction) {
    await interaction.deferReply();
    const randomIndex = Math.floor(Math.random() * links.length);
    const randomLink = links[randomIndex];
    await interaction.editReply(randomLink);
  },
};
