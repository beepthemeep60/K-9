const { SlashCommandBuilder, AttachmentBuilder } = require('discord.js');
const { createCanvas, loadImage } = require('@napi-rs/canvas');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('foil')
        .setDescription('Applies a foil border around your avatar.'),

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

            // create foil border
            const silverGradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
            silverGradient.addColorStop(0, '#D3D3D3');    // Light Grey
            silverGradient.addColorStop(0.25, '#555555'); // Bright White Highlight
            silverGradient.addColorStop(0.5, '#A9A9A9');  // Dark Grey Shadow
            silverGradient.addColorStop(0.75, '#505050'); // Platinum
            silverGradient.addColorStop(1, '#808080');    // Deep Metallic Grey

            // Step 3: Draw the border frame
            const borderThickness = 10; // Size of the border in pixels
            ctx.lineWidth = borderThickness;
            ctx.strokeStyle = silverGradient;

            // Draw the rectangle path aligned to the center of the stroke width
            ctx.strokeRect(
                borderThickness / 2, 
                borderThickness / 2, 
                canvas.width - borderThickness, 
                canvas.height - borderThickness
);

            // Convert canvas back to a Discord attachment
            const buffer = canvas.toBuffer('image/png');
            const attachment = new AttachmentBuilder(buffer, { name: 'foil-avatar.png' });

            // Send response back to Discord
            await interaction.editReply({ files: [attachment] });

        } catch (error) {
            console.error(error);
            await interaction.editReply('Failed to process your avatar image.');
        }
    },
};
