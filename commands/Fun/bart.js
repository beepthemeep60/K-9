const { SlashCommandBuilder } = require('discord.js');
const ytdlp = require('yt-dlp-exec');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('ffmpeg-static');
const path = require('path');
const fs = require('fs');

ffmpeg.setFfmpegPath(ffmpegPath);

module.exports = {
  data: new SlashCommandBuilder()
    .setName('bart')
    .setDescription('youtube to bart converter')
    .addStringOption(option =>
      option
        .setName('url')
        .setDescription('YouTube link')
        .setRequired(true)
    ),

  async execute(interaction) {
    await interaction.deferReply();

    const url = interaction.options.getString('url');

    const tempDir = path.join(__dirname, '../temp');
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);

    const audioPath = path.join(tempDir, 'audio.mp3');
    const outputPath = path.join(tempDir, 'output.mp4');
    const gifPath = path.join(__dirname, '../../assets/bart.gif');

    try {
      // Download audio
      await ytdlp(url, {
        extractAudio: true,
        audioFormat: 'mp3',
        output: audioPath,
        noPlaylist: true,
      });

      // Combine audio + gif
      await new Promise((resolve, reject) => {
        ffmpeg()
          .input(gifPath)
          .inputOptions(['-stream_loop -1'])
          .input(audioPath)
          .outputOptions([
            '-c:v libx264',
            '-pix_fmt yuv420p',
            '-shortest',
            '-t 60'
          ])
          .save(outputPath)
          .on('end', resolve)
          .on('error', reject);
      });

      // Reply with video
      await interaction.editReply({
        files: [outputPath]
      });

    } catch (err) {
      console.error(err);
      await interaction.editReply('❌ Something went wrong processing that link.');
    }
  }
};
