const { SlashCommandBuilder, AttachmentBuilder } = require('discord.js');
const { createCanvas, loadImage } = require('@napi-rs/canvas');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('rainbow')
        .setDescription('Applies a rainbow gradient over your avatar.'),

    async execute(interaction) {
        // Defer reply because fetching and processing takes time
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

            // create diagonal rainbow gradient
            const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
            gradient.addColorStop(0, '#FF0000dd');    // red
            gradient.addColorStop(0.17, '#FF7F00dd'); // orange
            gradient.addColorStop(0.33, '#FFFF00dd'); // yellow
            gradient.addColorStop(0.5, '#00FF00dd');  // green
            gradient.addColorStop(0.67, '#00a2ffdd'); // blue
            gradient.addColorStop(0.83, '#4B0082dd'); // indigo
            gradient.addColorStop(1, '#9400D3dd');    // violet

            // blend gradient over image
            ctx.globalCompositeOperation = 'multiply';
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // convert back to discord attachment
            const buffer = canvas.toBuffer('image/png');
            const attachment = new AttachmentBuilder(buffer, { name: 'rainbow-avatar.png' });

            await interaction.editReply({ files: [attachment] });

        } catch (error) {
            console.error(error);
            await interaction.editReply('Failed to process your avatar image.');
        }
    },
};
