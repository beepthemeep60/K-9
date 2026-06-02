const { SlashCommandBuilder, AttachmentBuilder } = require('discord.js');
const { createCanvas, loadImage } = require('@napi-rs/canvas');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('gold')
        .setDescription('Applies a gold gradient over your avatar.'),

    async execute(interaction) {
        await interaction.deferReply();

        try {
            // get user's avatar URL (1024px)
            const avatarUrl = interaction.user.displayAvatarURL({ extension: 'png', size: 1024 });

            // load avatar into canvas
            const inputImage = await loadImage(avatarUrl);
            
            // create square canvas to match avatar
            const canvas = createCanvas(inputImage.width, inputImage.height);
            const ctx = canvas.getContext('2d');

            // draw original avatar
            ctx.drawImage(inputImage, 0, 0, canvas.width, canvas.height);

            // create diagonal gold gradient
            const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
            gradient.addColorStop(0, '#583f0c');  // Dark Gold
            gradient.addColorStop(0.25, '#fff156'); // Light Yellow Gold
            gradient.addColorStop(0.5, '#6d4f0d');  // Golden Metallic
            gradient.addColorStop(0.75, '#fff048'); // Reflection Highlights
            gradient.addColorStop(1, '#5e3e08');  // Deep Gold Shadow

            // blend gradient over image
            ctx.globalCompositeOperation = 'overlay';
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // convert back to discord attachment
            const buffer = canvas.toBuffer('image/png');
            const attachment = new AttachmentBuilder(buffer, { name: 'gold-avatar.png' });

            await interaction.editReply({ files: [attachment] });

        } catch (error) {
            console.error(error);
            await interaction.editReply('Failed to process your avatar image.');
        }
    },
};
