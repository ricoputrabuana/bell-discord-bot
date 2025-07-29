import { Client, GatewayIntentBits, Partials, Events, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } from 'discord.js';
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

client.once(Events.ClientReady, () => {
  console.log(`✅ Bot siap sebagai ${client.user.tag}`);
});

// Beri role unverified saat member join
client.on(Events.GuildMemberAdd, async (member) => {
  const unverified = member.guild.roles.cache.find(r => r.name === process.env.ROLE_UNVERIFIED);
  if (unverified) {
    await member.roles.add(unverified);
    console.log(`➕ ${member.user.tag} diberi role unverified`);
  }
});

// Kirim embed verifikasi ke #rules dengan 2 tombol
client.on(Events.MessageCreate, async (message) => {
  if (message.content === "!kirimverifikasi" && message.member.permissions.has('Administrator')) {
    const embed = new EmbedBuilder()
      .setTitle("📜 Aturan Server")
      .setDescription("Silakan baca aturan dengan baik. Jika kamu setuju, pilih tombol berikut.\n\n✅ **Saya Setuju** — akan diberi akses ke server.\n🕹️ **Saya Pemain Arise** — butuh verifikasi akun Roblox via Bloxlink.")
      .setColor(0x00FF00);

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("verify_member")
        .setLabel("✅ Saya Setuju")
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId("verify_arise")
        .setLabel("🕹️ Saya Pemain Arise")
        .setStyle(ButtonStyle.Primary)
    );

    await message.channel.send({ embeds: [embed], components: [row] });
  }
});

// Handle tombol verifikasi
client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isButton()) return;

  const member = interaction.member;
  const roles = member.roles.cache;

  const roleUnverified = member.guild.roles.cache.find(r => r.name === process.env.ROLE_UNVERIFIED);
  const roleMember = member.guild.roles.cache.find(r => r.name === process.env.ROLE_MEMBER);
  const roleArise = member.guild.roles.cache.find(r => r.name === process.env.ROLE_ARISE);
  const roleBloxlink = member.guild.roles.cache.find(r => r.name === process.env.ROLE_BLOXLINK);

  // Tombol 1: Saya Setuju (Member)
  if (interaction.customId === "verify_member") {
    if (roleUnverified) await member.roles.remove(roleUnverified);
    if (roleMember && !roles.has(roleMember.id)) await member.roles.add(roleMember);

    await interaction.reply({ content: `✅ Kamu telah disetujui sebagai member. Selamat datang!`, ephemeral: true });
  }

  // Tombol 2: Saya Pemain Arise (verifikasi Bloxlink)
  else if (interaction.customId === "verify_arise") {
    if (!roleBloxlink || !roles.has(roleBloxlink.id)) {
      return await interaction.reply({
        content: `❌ Kamu belum memverifikasi akun Roblox melalui Bloxlink.\nSilakan verifikasi terlebih dahulu menggunakan Bloxlink di channel terkait.`,
        ephemeral: true
      });
    }

    if (roleUnverified) await member.roles.remove(roleUnverified);
    if (roleMember && !roles.has(roleMember.id)) await member.roles.add(roleMember);
    if (roleArise && !roles.has(roleArise.id)) await member.roles.add(roleArise);

    await interaction.reply({ content: `🕹️ Kamu telah diverifikasi sebagai Pemain Arise. Selamat datang!`, ephemeral: true });
  }
});

client.login(process.env.TOKEN);