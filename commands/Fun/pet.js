const { SlashCommandBuilder, ActionRowBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ButtonBuilder, ButtonStyle, EmbedBuilder } = require("discord.js");
const { response } = require("express");
const fs = require("node:fs");

function savePetsFile(originalContents, userID, newLine) {
    const updatedLines = originalContents
        .split("\n")
        .filter(line => line.trim() !== "" && !line.startsWith(userID + ",")); // Remove blanks and user duplicates

    updatedLines.push(newLine); // Add updated line
    const cleanedContents = updatedLines.join("\n") + "\n"; // Join and add final newline
    fs.writeFileSync("./pets.txt", cleanedContents, "utf-8");
}


module.exports = {
    data: new SlashCommandBuilder()
        .setName("pet")
        .setDescription("Raise a pet!"),
    async execute(interaction) {
        const userID = interaction.user.id;

        // Check if pet exists
        const fileContents = fs.readFileSync("./pets.txt", "utf-8");
        const line = fileContents
            .split("\n")
            .find((l) => l.startsWith(userID + ","));

        if (!line) {
            // Create first set of buttons
            const firstButtons = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId("cat").setEmoji("🐱").setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId("dog").setEmoji("🐶").setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId("chicken").setEmoji("🐥").setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId("duck").setEmoji("🦆").setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId("snake").setEmoji("🐍").setStyle(ButtonStyle.Secondary)
            );

            // Create second set of buttons
            const secondButtons = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId("worm").setEmoji("🪱").setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId("omnom").setEmoji("<:OmNomNibble:1226347188301336716>").setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId("handles").setEmoji("<:Handles:1019777437963407361>").setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId("peachdog").setEmoji("<:ThisFuckassDog:1329507509094060104>").setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId("mpreg").setEmoji("🫃").setStyle(ButtonStyle.Secondary)
            );

            // Create third set of buttons
            const thirdButtons = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId("dalek").setEmoji("<:Stare:1018283310700560405>").setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId("truth").setEmoji("<:True:1253870607398080535>").setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId("nine").setEmoji("<:Doctor09:1179920908928962611>").setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId("ianto").setEmoji("<:Ianto:1226674508656672909>").setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId("nardole").setEmoji("<:ThumbsUp:1126321177300844564>").setStyle(ButtonStyle.Secondary)
            );

            // Create fourth set of buttons
            const fourthButtons = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId("k9").setEmoji("<:Affirmative:1019680728759419011>").setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId("owen").setEmoji("<:Owen:1315373305598836736>").setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId("tardis").setEmoji("<:TARDIS:1018284360379682926>").setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId("moodeng").setEmoji("<:Moodeng:1286766576028356620>").setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId("slitheen").setEmoji("<:Slitheen:1018283628586881095>").setStyle(ButtonStyle.Secondary)
            );

            const response = await interaction.reply({
                content: "## Pet Shop!\nPick an animal for your pet!",
                components: [firstButtons, secondButtons, thirdButtons, fourthButtons],
                fetchReply: true,
            });

            const collectorFilter = (i) => i.user.id === interaction.user.id;

            const confirmation = await response.awaitMessageComponent({
                filter: collectorFilter,
                time: 60000,
            });

            let petEmoji;
            switch (confirmation.customId) {
                case "cat":
                    petEmoji = "🐱";
                    break;
                case "dog":
                    petEmoji = "🐶";
                    break;
                case "chicken":
                    petEmoji = "🐥";
                    break;
                case "duck":
                    petEmoji = "🦆";
                    break;
                case "snake":
                    petEmoji = "🐍";
                    break;
                case "worm":
                    petEmoji = "🪱";
                    break;
                case "omnom":
                    petEmoji = "<:OmNomNibble:1226347188301336716>";
                    break;
                case "handles":
                    petEmoji = "<:Handles:1019777437963407361>";
                    break;
                case "peachdog":
                    petEmoji = "<:ThisFuckassDog:1329507509094060104>";
                    break;
                case "mpreg":
                    petEmoji = "🫃";
                    break;
                case "dalek":
                    petEmoji = "<:Stare:1018283310700560405>";
                    break;
                case "truth":
                    petEmoji = "<:True:1253870607398080535>";
                    break;
                case "nine":
                    petEmoji = "<:Doctor09:1179920908928962611>";
                    break;
                case "ianto":
                    petEmoji = "<:Ianto:1226674508656672909>";
                    break;
                case "nardole":
                    petEmoji = "<:ThumbsUp:1126321177300844564>";
                    break;
                case "k9":
                    petEmoji = "<:Affirmative:1019680728759419011>";
                    break;
                case "owen":
                    petEmoji = "<:Owen:1315373305598836736>";
                    break;
                case "tardis":
                    petEmoji = "<:TARDIS:1018284360379682926>";
                    break;
                case "moodeng":
                    petEmoji = "<:Moodeng:1286766576028356620>";
                    break;
                case "slitheen":
                    petEmoji = "<:Slitheen:1018283628586881095>";
                    break;
                default:
                    petEmoji = "";
            }

            await confirmation.update({
                content: `You adopted a ${petEmoji}!`,
                components: [],
            });

            // Store the user's pet type in the file
            let currentDate = new Date();
            const newLine = `${userID},,${petEmoji},100,${currentDate},${currentDate},0,100`; // Added separate timestamps for feeding and playing
            savePetsFile(fileContents, userID, newLine);

            // Inform the user to run the command again to name their pet
            await interaction.followUp({
                content: "Run the command again to name your pet!",
            });
        } else {
            let [user, pet, petEmoji, hunger, feedDate, playDate, xp, happiness] = line.split(",");
            hunger = Number(hunger); // Ensure hunger is a number
            xp = Number(xp); // Ensure xp is a number
            happiness = Number(happiness); // Ensure happiness is a number
            if (!pet) {
                // Create the modal
                const modal = new ModalBuilder()
                    .setCustomId("petShop")
                    .setTitle("Pet Shop");
                // Create the text input components
                const petInput = new TextInputBuilder()
                    .setCustomId("petInput")
                    .setLabel("What do you want to name your pet?")
                    .setStyle(TextInputStyle.Short)
                    // Set the maximum number of characters to allow
                    .setMaxLength(20)
                    // Set the minimum number of characters required for submission
                    .setMinLength(1)
                    // Set a placeholder string to prompt the user
                    .setPlaceholder("Enter your pet's name")
                    // Require a value in this input field
                    .setRequired(true);

                const firstActionRow = new ActionRowBuilder().addComponents(petInput);
                modal.addComponents(firstActionRow);

                // Show the modal to the user
                await interaction.showModal(modal);
                const submitted = await interaction
                    .awaitModalSubmit({
                        // Timeout after a minute of not receiving any valid Modals
                        time: 60000,
                        // Make sure we only accept Modals from the User who sent the original Interaction we're responding to
                        filter: (i) => i.user.id === interaction.user.id,
                    })
                    .catch((error) => {
                        // Catch any Errors that are thrown (e.g. if the awaitModalSubmit times out after 60000 ms)
                        console.error(error);
                        return null;
                    });
                if (submitted) {
                    const petName = submitted.fields.fields.first().value;
                    if (petName) {
                        if (petName.includes("@")) {
                            await submitted.reply({
                                content: `You cannot have an @ in the name of your pet!`,
                            });
                        } else {
                            await submitted.reply({
                                content: `You named your pet "${petName}"!`,
                            });
                            await interaction.followUp({
                                content: "Run the command again to interact with your pet!",
                            });
                            let currentDate = new Date();
                            const newLine = `${userID},${petName},${petEmoji},100,${currentDate},${currentDate},0,100\n`; // Added 100 for initial happiness
                            savePetsFile(fileContents, userID, newLine);
                        }
                    } else {
                        console.error("Pet name is undefined");
                    }
                }
            } else {
                // Calculate the time difference and update hunger and happiness
                const storedFeedDateObject = new Date(feedDate);
                const storedPlayDateObject = new Date(playDate);
                const currentDate = new Date();
                const timeDifference = Math.abs(currentDate - storedFeedDateObject) / 36e5;
                hunger = Math.max(hunger - timeDifference * (100 / 48)); // Deplete over 48 hours
                hunger = Math.round(hunger);
                const playTimeDifference = Math.abs(currentDate - storedPlayDateObject) / 36e5;
                happiness = Math.max(0, happiness - playTimeDifference * (100 / 48)); // Deplete over 48 hours
                happiness = Math.round(happiness);
                // Check if hunger or happiness are below 0
                if (hunger <= 0) {
                    await interaction.reply("Your pet starved to death.\nRun /pet to adopt a new pet.");
                    const updatedContents = fileContents.replace(line, '');
                    fs.writeFileSync("./pets.txt", updatedContents, "utf-8");
                    return;
                }

                if (happiness <= 0) {
                    await interaction.reply("Your pet got too sad and ran away.\nRun /pet to adopt a new pet.");
                    const updatedContents = fileContents.replace(line, '');
                    fs.writeFileSync("./pets.txt", updatedContents, "utf-8");
                    return;
                }

                // Calculate hoursElapsed before using it
                const now = new Date();
                const lastPlayed = new Date(playDate); // date from file (used for cooldown)
                const hoursElapsed = (now - lastPlayed) / 3600000; // convert ms to hours

                // Create action buttons
                const actionButtons = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId("feed").setLabel("Feed").setStyle(ButtonStyle.Primary).setDisabled(hunger >= 75),
                    new ButtonBuilder().setCustomId("play").setLabel("Play").setStyle(ButtonStyle.Primary).setDisabled(hoursElapsed < 6),
                    new ButtonBuilder().setCustomId("abandon").setLabel("Abandon").setStyle(ButtonStyle.Danger)
                );

                            // Check for double XP roles
                            const doubleXpRoles = [
                                "1018290989246468116", // mods
                                "1271816605654978623", // gambling
                                "1312574581118079077", // curator
                                "1104044177215471677", // wall
                                "1018200127598497893", // booster
                                "1163825738051498105",
                                "1163825260194447381",
                                "1163825574603653200", // ^^ halloween event roles
                                "1345969083870347295", // puzzle solver
                                "1146535148884603060" // testing server test role
                            ];
                            const userRoles = interaction.member.roles.cache.map(role => role.id);
                            const hasDoubleXpRole = doubleXpRoles.some(role => userRoles.includes(role));

                // Create an embed to show the pet's status
                const createStatusEmbed = (hunger, xp, happiness) => {
                    const xpToNextLevel = 1000 - (xp % 1000);
                    return new EmbedBuilder()
                        .setColor(0x0099ff)
                        .setTitle(`${pet}'s Status`)
                        .setDescription(`Here is the current status of <@${userID}>'s pet ${petEmoji}`)
                        .addFields(
                            { name: 'Hunger', value: `${hunger}%`, inline: true },
                            { name: 'Happiness', value: `${happiness}%`, inline: true },
                            { name: 'Level', value: `${Math.floor(xp / 1000) + 1}`, inline: true }, // Calculate level based on XP
                            { name: 'XP to Next Level', value: `${xpToNextLevel} XP`, inline: true } // Show XP to next level
                        )
                        .setTimestamp();
                };
                const statusEmbed = createStatusEmbed(hunger, xp, happiness);

                if (!hasDoubleXpRole) {
                    // 1/50 chance to send a message about boosters
                    if (Math.random() < 1 / 50) {
                        responseContent = "<:WOWZER:1172337118547288064> Did you know boosters get 2x pet xp? <:WOWZER:1172337118547288064>";
                    } else {responseContent = "";}
                } else {responseContent = "";}
                const response = await interaction.reply({
                    content: responseContent,
                    embeds: [statusEmbed],
                    components: [actionButtons],
                    fetchReply: true,
                });
                
                const collector = response.createMessageComponentCollector({
                    filter: (i) => i.user.id === interaction.user.id,
                    time: 60000,
                });

                collector.on("collect", async (action) => {
                    switch (action.customId) {
                        case "feed": {
                            const now = new Date();
                            const lastFed = new Date(feedDate); // date from file (used for cooldown)
                            const hoursElapsed = (now - lastFed) / 3600000; // convert ms to hours

                            // Enforce a 3-hour cooldown using the stored date
                            if (hoursElapsed < 3) {
                                const waitTime = (3 - hoursElapsed).toFixed(1);
                                await action.reply(`You must wait ${waitTime} more hours before feeding again! ${petEmoji}`);
                                break;
                            }

                            // Calculate the time difference and update hunger
                            const storedFeedDateObject = new Date(feedDate);
                            const currentDate = new Date();
                            const timeDifference = Math.abs(currentDate - storedFeedDateObject) / 36e5;

                            // Add 50 to the current hunger
                            const feedIncrease = 50;
                            let newHunger = hunger + feedIncrease;
                            let newXp = Number(xp); // convert xp to a number
                            if (newHunger > 100) {
                                let xpGain = newHunger - 100;
                                if (hasDoubleXpRole) {
                                    xpGain *= 2;
                                }
                                newXp += xpGain;
                                newHunger = 100;
                            }

                            // Update the pet record with the new values and update the last-feed timestamp
                            const newFeedDate = now.toString(); // using local time format
                            const newLine = `${user},${pet},${petEmoji},${newHunger},${newFeedDate},${playDate},${newXp},${happiness}`; // Include hunger
                            savePetsFile(fileContents, userID, newLine);

                            await action.reply(`You fed your pet! ${pet} is now at ${newHunger}% hunger. ${petEmoji}`);

                            // Update local variables for future interactions
                            hunger = newHunger;
                            xp = newXp;
                            feedDate = newFeedDate;

                            // Optionally, update the embed and buttons
                            const updatedActionButtons = new ActionRowBuilder().addComponents(
                                new ButtonBuilder().setCustomId("feed").setLabel("Feed").setStyle(ButtonStyle.Primary).setDisabled(hunger >= 75 || hoursElapsed < 3),
                                new ButtonBuilder().setCustomId("play").setLabel("Play").setStyle(ButtonStyle.Primary).setDisabled(hoursElapsed < 6),
                                new ButtonBuilder().setCustomId("abandon").setLabel("Abandon").setStyle(ButtonStyle.Danger)
                            );
                            const updatedEmbed = createStatusEmbed(hunger, xp, happiness); // Include hunger
                            await interaction.editReply({ embeds: [updatedEmbed], components: [updatedActionButtons] });
                            break;
                        }
                        
                        case "play": {
                            const now = new Date();
                            const lastPlayed = new Date(playDate); // date from file (used for cooldown)
                            const hoursElapsed = (now - lastPlayed) / 3600000; // convert ms to hours
                        
                            // Enforce a 6-hour cooldown using the stored date
                            if (hoursElapsed < 6) {
                                const waitTime = (6 - hoursElapsed).toFixed(1);
                                await action.reply(`You must wait ${waitTime} more hours before playing again! ${petEmoji}`);
                                break;
                            }
                        
                            // Calculate the time difference and update happiness
                            const storedPlayDateObject = new Date(playDate);
                            const currentDate = new Date();
                            const timeDifference = Math.abs(currentDate - storedPlayDateObject) / 36e5;
                            
                            // Add 25 to the current happiness
                            const playIncrease = 25;
                            let newHappiness = happiness + playIncrease;
                            let newXp = Number(xp); // convert xp to a number
                            if (newHappiness > 100) {
                                let xpGain = newHappiness - 100;
                                if (hasDoubleXpRole) {
                                    xpGain *= 2;
                                }
                                newXp += xpGain;
                                newHappiness = 100;
                            }

                                                    
                            // Update the pet record with the new values and update the last-play timestamp
                            const newPlayDate = now.toString(); // using local time format
                            const newLine = `${user},${pet},${petEmoji},${hunger},${feedDate},${newPlayDate},${newXp},${newHappiness}`; // Include happiness
                            savePetsFile(fileContents, userID, newLine);
                        
                            await action.reply(`You played with your pet! ${pet} is now at ${newHappiness}% happiness. ${petEmoji}`);
                        
                            // Update local variables for future interactions
                            happiness = newHappiness;
                            xp = newXp;
                            playDate = newPlayDate;
                        
                            // Optionally, update the embed and buttons
                            const updatedActionButtons = new ActionRowBuilder().addComponents(
                                new ButtonBuilder().setCustomId("feed").setLabel("Feed").setStyle(ButtonStyle.Primary).setDisabled(hunger >= 75 || hoursElapsed < 3),
                                new ButtonBuilder().setCustomId("play").setLabel("Play").setStyle(ButtonStyle.Primary).setDisabled(hoursElapsed < 6),
                                new ButtonBuilder().setCustomId("abandon").setLabel("Abandon").setStyle(ButtonStyle.Danger)
                            );
                            const updatedEmbed = createStatusEmbed(hunger, xp, happiness); // Include happiness
                            await interaction.editReply({ embeds: [updatedEmbed], components: [updatedActionButtons] });
                            break;
                        }
                        
                        case "abandon":
                            const confirmButtons = new ActionRowBuilder().addComponents(
                                new ButtonBuilder().setCustomId("confirm_abandon").setLabel("Yes").setStyle(ButtonStyle.Danger),
                                new ButtonBuilder().setCustomId("cancel_abandon").setLabel("No").setStyle(ButtonStyle.Secondary)
                            );
                
                            await action.reply({
                                content: "Are you sure you want to abandon your pet?",
                                components: [confirmButtons],
                            });

                            const confirmCollector = action.channel.createMessageComponentCollector({
                                filter: (i) => i.user.id === interaction.user.id,
                                time: 15000,
                            });

                            confirmCollector.on('collect', async (confirmAction) => {
                                if (confirmAction.customId === "confirm_abandon") {
                                    const updatedContents = fileContents.replace(line, '');
                                    fs.writeFileSync("./pets.txt", updatedContents, "utf-8");
                                    await confirmAction.update({
                                        content: `You released your pet ${petEmoji} into oncoming traffic, where it was immediately hit by an 18-wheeler.`,
                                        components: [],
                                    });
                                    collector.stop();
                                } else if (confirmAction.customId === "cancel_abandon") {
                                    await confirmAction.update({
                                        content: `You decided not to abandon your pet ${petEmoji}.`,
                                        components: [],
                                    });
                                }
                            });

                            confirmCollector.on('end', collected => {
                                if (collected.size === 0) {
                                    action.followUp({
                                        content: "Abandon action timed out.",
                                        components: [],
                                    });
                                }
                            });
                            break;
                        default:
                            await action.reply(`Invalid action.`);
                            const updatedActionButtons = new ActionRowBuilder().addComponents(
                                new ButtonBuilder().setCustomId("feed").setLabel("Feed").setStyle(ButtonStyle.Primary).setDisabled(hunger >= 75 || hoursElapsed < 3),
                                new ButtonBuilder().setCustomId("play").setLabel("Play").setStyle(ButtonStyle.Primary).setDisabled(hoursElapsed < 6),
                                new ButtonBuilder().setCustomId("abandon").setLabel("Abandon").setStyle(ButtonStyle.Danger)
                            );
                            const updatedEmbed = createStatusEmbed(hunger, xp, happiness); // Include happiness
                            await interaction.editReply({ embeds: [updatedEmbed], components: [updatedActionButtons] });
                            break;
                    }

                    // Update the embed with the new status
                    const updatedActionButtons = new ActionRowBuilder().addComponents(
                        new ButtonBuilder().setCustomId("feed").setLabel("Feed").setStyle(ButtonStyle.Primary).setDisabled(hunger >= 75 || hoursElapsed < 3),
                        new ButtonBuilder().setCustomId("play").setLabel("Play").setStyle(ButtonStyle.Primary).setDisabled(hoursElapsed < 6),
                        new ButtonBuilder().setCustomId("abandon").setLabel("Abandon").setStyle(ButtonStyle.Danger)
                    );

                    // Update the embed with the new status
                    const updatedEmbed = createStatusEmbed(hunger, xp, happiness);
                    await interaction.editReply({ embeds: [updatedEmbed], components: [updatedActionButtons] });
                });

                collector.on('end', collected => {
                    console.log(`Collected ${collected.size} interactions.`);
                });
            }
        }
    },
};

