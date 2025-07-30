import {
  Client,
  GatewayIntentBits,
  Partials,
  Events,
  EmbedBuilder,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
  SlashCommandBuilder,
  REST,
  Routes
} from 'discord.js';
import dotenv from 'dotenv';
dotenv.config();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ],
  partials: [Partials.Message, Partials.Channel, Partials.Reaction]
});

// Ready
client.once(Events.ClientReady, async () => {
  console.log(`✅ Bot ready as ${client.user.tag}`);

  const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

  const commands = [
    new SlashCommandBuilder()
      .setName('send-rules')
      .setDescription('Send the rules message with a verification button'),
  ].map(command => command.toJSON());

  try {
    await rest.put(
      Routes.applicationCommands(client.user.id),
      { body: commands }
    );
    console.log('✅ Slash command registered.');
  } catch (error) {
    console.error('❌ Failed to register slash command:', error);
  }
});

// Assign 'Unknown' role on join
client.on(Events.GuildMemberAdd, async (member) => {
  const unknown = member.guild.roles.cache.find(r => r.name === process.env.ROLE_UNKNOWN);
  if (unknown) {
    await member.roles.add(unknown);
    console.log(`➕ ${member.user.tag} assigned Unknown role.`);
  }
});

// Slash command to send rules with button
client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === 'send-rules') {
    if (!interaction.member.permissions.has('Administrator')) {
      return await interaction.reply({
        content: '❌ You do not have permission to use this command.',
        ephemeral: true
      });
    }

    const embed = new EmbedBuilder()
      .setTitle("📜 After Reading")
      .setDescription("Click the button below to get the Verified Member role and access the rest of the server.")
      .setColor(0x00FF00);

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("verify_member")
        .setLabel("✅ I Agree")
        .setStyle(ButtonStyle.Success)
    );

    await interaction.channel.send({ embeds: [embed], components: [row] });
    await interaction.reply({ content: '✅ Rules message sent.', ephemeral: true });
  }
});

// Handle '✅ I Agree' button
client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isButton()) return;
  if (interaction.customId !== 'verify_member') return;

  const member = interaction.member;
  const roles = member.roles.cache;

  const roleUnknown = member.guild.roles.cache.find(r => r.name === process.env.ROLE_UNKNOWN);
  const roleGuest = member.guild.roles.cache.find(r => r.name === process.env.ROLE_GUEST);
  const roleMember = member.guild.roles.cache.find(r => r.name === process.env.ROLE_MEMBER);

  if (roleMember && !roles.has(roleMember.id)) await member.roles.add(roleMember);
  if (roleGuest && roles.has(roleGuest.id)) await member.roles.remove(roleGuest);
  if (roleUnknown && roles.has(roleUnknown.id)) await member.roles.remove(roleUnknown);

  await interaction.reply({ content: '✅ You are now verified as a Member. Welcome!', ephemeral: true });
});

client.on(Events.GuildMemberUpdate, async (oldMember, newMember) => {
  const roleGuildMember = newMember.guild.roles.cache.find(r => r.name === process.env.ROLE_GUILD_MEMBER);
  const roleGuildGuest = newMember.guild.roles.cache.find(r => r.name === process.env.ROLE_GUILD_GUEST);
  const roleUnknown = newMember.guild.roles.cache.find(r => r.name === process.env.ROLE_UNKNOWN);

  const hadGuildMember = oldMember.roles.cache.has(roleGuildMember?.id);
  const hasGuildMember = newMember.roles.cache.has(roleGuildMember?.id);

  const hadGuildGuest = oldMember.roles.cache.has(roleGuildGuest?.id);
  const hasGuildGuest = newMember.roles.cache.has(roleGuildGuest?.id);

  const hadUnknown = oldMember.roles.cache.has(roleUnknown?.id);
  const hasUnknown = newMember.roles.cache.has(roleUnknown?.id);

  if (!hadGuildGuest && hasGuildGuest && hasUnknown) {
    await newMember.roles.remove(roleUnknown);
    console.log(`🧹 Removed Unknown from ${newMember.user.tag} after choosing Arise Crossover`);
  }

  if (!hadGuildMember && hasGuildMember && hasGuildGuest) {
    await newMember.roles.remove(roleGuildGuest);
    console.log(`🛡️ ${newMember.user.tag} promoted to Guild Member (Guild Guest removed)`);
  }
});

client.login(process.env.TOKEN);
