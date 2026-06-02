const { SlashCommandBuilder, AttachmentBuilder } = require('discord.js');
const { createCanvas, loadImage } = require('@napi-rs/canvas');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('unpleasant')
        .setDescription('Applies an unpleasant gradient over your avatar.'),

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

            // create unpleasant gradient
            const gradient = ctx.createLinearGradient(0, 0, 0, canvas.width, canvas.height);
            gradient.addColorStop(0, '#00ff0d');  // unpleasant green
            gradient.addColorStop(0.5, '#fd33ff');  // unpleasant pink
            gradient.addColorStop(1, '#9e5203');  // unpleasant orange

            // blend gradient over image
            ctx.globalCompositeOperation = 'multiply';
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // convert canvas back to discord attachment
            const buffer = canvas.toBuffer('image/png');
            const attachment = new AttachmentBuilder(buffer, { name: 'unpleasant-avatar.png' });

            await interaction.editReply({ files: [attachment] });

        } catch (error) {
            console.error(error);
            await interaction.editReply('Failed to process avatar image.');
        }
    },
};
