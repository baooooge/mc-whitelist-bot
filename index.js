const {
  Client,
  GatewayIntentBits,
  Partials,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  ChannelType,
  PermissionFlagsBits,
  StringSelectMenuBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle
} = require('discord.js');
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const express = require('express');
const os = require('os');

const configPath = path.join(__dirname, 'config.json');
const envPath = path.join(__dirname, '.env');

if (!fs.existsSync(envPath)) {
  fs.writeFileSync(envPath, '', 'utf-8');
}

let config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));

function reloadConfig() {
  config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
}

function parseEnvFile() {
  if (!fs.existsSync(envPath)) return {};
  const content = fs.readFileSync(envPath, 'utf-8');
  const envObj = {};
  content.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx !== -1) {
      const key = trimmed.substring(0, eqIdx).trim();
      const val = trimmed.substring(eqIdx + 1).trim();
      envObj[key] = val;
    }
  });
  return envObj;
}

function writeEnvFile(envObj) {
  const lines = [];
  for (const [k, v] of Object.entries(envObj)) {
    lines.push(`${k}=${v || ''}`);
    process.env[k] = v || '';
  }
  fs.writeFileSync(envPath, lines.join('\n'), 'utf-8');
}

function buildSpreadsheetHeaders() {
  const baseHeaders = [
    "申請時間",
    "審核狀態",
    "Discord 標籤",
    "Discord ID",
    "遊戲 ID",
    "審核管理員",
    "拒絕原因"
  ];
  const followups = config.questions.filter(q => q.id !== 'mcId');
  const questionHeaders = followups.map(q => q.text.split('\n')[0]);
  return baseHeaders.concat(questionHeaders);
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages
  ],
  partials: [Partials.Channel, Partials.Message]
});

async function deployApplyPanel() {
  if (!client.isReady()) {
    throw new Error('Bot is offline. Please check DISCORD_TOKEN.');
  }

  const channelId = process.env.APPLY_PANEL_CHANNEL_ID;
  if (!channelId) {
    throw new Error('APPLY_PANEL_CHANNEL_ID is empty.');
  }

  const channel = await client.channels.fetch(channelId).catch(() => null);
  if (!channel || !channel.isTextBased()) {
    throw new Error('Target channel not found or not text-based.');
  }

  let modeNotice = '';
  if (config.serverMode === 'BEDROCK_ONLY') {
    modeNotice = '\n\n本伺服器為基岩版（Bedrock / BDS）專屬，支援 Xbox 玩家 ID。';
  } else if (config.serverMode === 'CROSSPLAY') {
    modeNotice = '\n\n本伺服器支援 Java 版與基岩版雙端互通，點擊開始申請後請依指示選擇您的遊玩版本。';
  }

  const embed = new EmbedBuilder()
    .setTitle(`${config.serverName} 白名單申請`)
    .setDescription(`歡迎加入 ${config.serverName}！\n點擊下方按鈕即可開啟專屬申請流程。${modeNotice}`)
    .setColor(config.embedColor || 0x5865F2);

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('start_application')
      .setLabel('開始申請')
      .setStyle(ButtonStyle.Primary)
  );

  await channel.send({ embeds: [embed], components: [row] });
  return { success: true, channelName: channel.name };
}

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/settings', (req, res) => {
  const envData = parseEnvFile();
  res.json({
    config: config,
    env: envData,
    botOnline: client.isReady(),
    botTag: client.user ? client.user.tag : null
  });
});

app.post('/api/settings', async (req, res) => {
  try {
    const { config: newConfig, env: newEnv, autoDeployPanel } = req.body;

    if (newConfig) {
      fs.writeFileSync(configPath, JSON.stringify(newConfig, null, 2), 'utf-8');
      reloadConfig();
    }

    if (newEnv) {
      writeEnvFile(newEnv);
    }

    if (newEnv && newEnv.DISCORD_TOKEN) {
      if (!client.isReady() || client.token !== newEnv.DISCORD_TOKEN) {
        try {
          if (client.isReady()) await client.destroy();
          await client.login(newEnv.DISCORD_TOKEN);
        } catch (loginErr) {
          console.error('[Discord Error]', loginErr.message);
        }
      }
    }

    let panelResult = null;
    if (autoDeployPanel && client.isReady() && process.env.APPLY_PANEL_CHANNEL_ID) {
      try {
        panelResult = await deployApplyPanel();
      } catch (pErr) {
        panelResult = { error: pErr.message };
      }
    }

    if (process.env.GAS_WEBHOOK_URL) {
      fetch(process.env.GAS_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'SYNC_HEADERS',
          headers: buildSpreadsheetHeaders()
        })
      }).catch(() => {});
    }

    res.json({ status: 'success', panelResult });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

app.post('/api/send-panel', async (req, res) => {
  try {
    const result = await deployApplyPanel();
    res.json({ status: 'success', result });
  } catch (err) {
    res.status(400).json({ status: 'error', message: err.message });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`[Dashboard] Local: http://localhost:${PORT}`);
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        console.log(`[Dashboard] Network: http://${iface.address}:${PORT}`);
      }
    }
  }
});

const sessions = new Map();

function sanitizeId(rawId, isBedrock) {
  let clean = rawId.trim();
  if (isBedrock) {
    clean = clean.replace(/^[.*_]+/, '').trim();
  }
  return clean;
}

function formatFinalCommandId(cleanId, isBedrock) {
  if (isBedrock) {
    const prefix = config.bedrockPrefix || '.';
    const prefixed = cleanId.startsWith(prefix) ? cleanId : `${prefix}${cleanId}`;
    return cleanId.includes(' ') ? `"${prefixed}"` : prefixed;
  }
  return cleanId.includes(' ') ? `"${cleanId}"` : cleanId;
}

function buildCommand(template, targetCommandId) {
  const tpl = template || 'whitelist add {name}';
  return tpl.replace('{name}', targetCommandId);
}

function getFollowupQuestions() {
  return config.questions.filter(q => q.id !== 'mcId');
}

async function sendMcsmCommand(instanceUuid, daemonId, command) {
  if (!instanceUuid || !command) return null;
  try {
    const baseUrl = (process.env.MCSM_URL || '').replace(/\/+$/, '');
    if (!baseUrl || !process.env.MCSM_API_KEY) return null;
    const endpoint = new URL(`${baseUrl}/api/protected_instance/command`);
    endpoint.searchParams.set('apikey', process.env.MCSM_API_KEY);
    endpoint.searchParams.set('uuid', instanceUuid);
    if (daemonId && daemonId.trim() !== '') {
      endpoint.searchParams.set('daemonId', daemonId.trim());
    }
    endpoint.searchParams.set('command', command);

    console.log(`[MCSM Execute] Daemon: ${daemonId || 'Local'} | Instance: ${instanceUuid} | Command: "${command}"`);
    const res = await fetch(endpoint.toString(), { method: 'GET' });
    const text = await res.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
    return data;
  } catch (err) {
    console.error('[MCSM Error]', err);
    return null;
  }
}

client.once('ready', () => {
  console.log(`[Bot Online] Tag: ${client.user.tag}`);
});

client.on('interactionCreate', async (interaction) => {
  if (interaction.isButton()) {
    const { customId, guild, member, user } = interaction;

    if (customId === 'start_application') {
      const existingChannel = guild.channels.cache.find(c => c.name === `apply-${member.user.id}`);
      if (existingChannel) {
        return interaction.reply({
          content: `您已有開啟中的申請頻道：<#${existingChannel.id}>`,
          ephemeral: true
        });
      }

      const applyChannel = await guild.channels.create({
        name: `apply-${member.user.id}`,
        type: ChannelType.GuildText,
        parent: process.env.CATEGORY_ID || null,
        permissionOverwrites: [
          {
            id: guild.roles.everyone.id,
            deny: [PermissionFlagsBits.ViewChannel]
          },
          {
            id: member.id,
            allow: [
              PermissionFlagsBits.ViewChannel,
              PermissionFlagsBits.SendMessages,
              PermissionFlagsBits.ReadMessageHistory
            ]
          },
          {
            id: client.user.id,
            allow: [
              PermissionFlagsBits.ViewChannel,
              PermissionFlagsBits.SendMessages,
              PermissionFlagsBits.ManageChannels
            ]
          }
        ]
      });

      const initialPlatform = config.serverMode === 'BEDROCK_ONLY' ? 'BEDROCK' : (config.serverMode === 'JAVA_ONLY' ? 'JAVA' : null);

      sessions.set(applyChannel.id, {
        userId: member.id,
        platform: initialPlatform,
        rawMcId: null,
        currentStep: 0,
        answers: {},
        isReviewing: false,
        timeout: setTimeout(() => handleSessionTimeout(applyChannel.id), 15 * 60 * 1000)
      });

      await interaction.reply({
        content: `申請頻道已建立：<#${applyChannel.id}>`,
        ephemeral: true
      });

      if (config.serverMode === 'CROSSPLAY') {
        const platformEmbed = new EmbedBuilder()
          .setTitle('選擇您的遊戲平台版本')
          .setDescription('本伺服器支援 Java 版與基岩版雙端互通，請點擊下方按鈕選擇您的遊玩版本：')
          .setColor(0x3498DB);

        const platformRow = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId('select_platform_java')
            .setLabel('Java 版玩家')
            .setStyle(ButtonStyle.Primary),
          new ButtonBuilder()
            .setCustomId('select_platform_bedrock')
            .setLabel('基岩版玩家 (Bedrock)')
            .setStyle(ButtonStyle.Secondary)
        );

        await applyChannel.send({ embeds: [platformEmbed], components: [platformRow] });
      } else {
        await promptForMcId(applyChannel);
      }
    } else if (customId === 'select_platform_java' || customId === 'select_platform_bedrock') {
      const session = sessions.get(interaction.channel.id);
      if (!session || session.userId !== user.id) {
        return interaction.reply({ content: '無效的操作或權限不足。', ephemeral: true });
      }

      session.platform = customId === 'select_platform_bedrock' ? 'BEDROCK' : 'JAVA';
      await interaction.deferUpdate();
      await interaction.message.delete().catch(() => {});
      await promptForMcId(interaction.channel);
    } else if (customId === 'submit_application') {
      const session = sessions.get(interaction.channel.id);
      if (!session || session.userId !== user.id) {
        return interaction.reply({ content: '無效的操作或權限不足。', ephemeral: true });
      }

      await interaction.deferReply();
      const isBedrock = session.platform === 'BEDROCK';
      const cleanMcId = sanitizeId(session.rawMcId, isBedrock);
      const followups = getFollowupQuestions();

      const userReceiptEmbed = new EmbedBuilder()
        .setTitle(`${config.serverName} - 白名單申請已送出`)
        .setDescription('您的白名單申請已成功送出！以下為您的作答複本存檔：')
        .setColor(0x3498DB)
        .addFields(
          { name: '遊戲版本', value: isBedrock ? '基岩版 (Bedrock)' : 'Java 版', inline: true },
          { name: '遊戲 ID', value: `\`${cleanMcId}\``, inline: true }
        )
        .setTimestamp();

      followups.forEach((q, idx) => {
        userReceiptEmbed.addFields({
          name: `${idx + 2}. ${q.text.split('\n')[0]}`,
          value: session.answers[q.id] || '(未填寫)',
          inline: false
        });
      });

      try {
        await user.send({ embeds: [userReceiptEmbed] });
      } catch (err) {
        console.warn(`[DM Delivery] Failed for user ${user.id}`);
      }

      if (process.env.GAS_WEBHOOK_URL) {
        try {
          const payload = {
            action: 'SUBMIT',
            discordUser: user.tag,
            discordId: user.id,
            mcId: cleanMcId,
            answers: followups.map(q => session.answers[q.id] || '')
          };

          await fetch(process.env.GAS_WEBHOOK_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });
        } catch (err) {
          console.error('[GAS Error]', err);
        }
      }

      const reviewChannel = guild.channels.cache.get(process.env.ADMIN_REVIEW_CHANNEL_ID);
      if (reviewChannel && reviewChannel.isTextBased()) {
        const reviewEmbed = new EmbedBuilder()
          .setTitle('白名單審核申請')
          .setColor(0xF1C40F)
          .setThumbnail(user.displayAvatarURL())
          .addFields(
            { name: '申請玩家', value: `<@${user.id}> (${user.tag})`, inline: true },
            { name: 'Discord ID', value: `\`${user.id}\``, inline: true },
            { name: '遊戲 ID', value: `\`${cleanMcId}\` (${isBedrock ? '基岩版' : 'Java版'})`, inline: true }
          )
          .setTimestamp();

        followups.forEach((q, idx) => {
          reviewEmbed.addFields({
            name: `${idx + 2}. ${q.text.split('\n')[0]}`,
            value: session.answers[q.id] || '(未填寫)',
            inline: false
          });
        });

        const reviewRow = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId(`approve:${user.id}:${session.platform}:${encodeURIComponent(cleanMcId)}`)
            .setLabel('批准並寫入白名單')
            .setStyle(ButtonStyle.Success),
          new ButtonBuilder()
            .setCustomId(`reject:${user.id}`)
            .setLabel('拒絕申請')
            .setStyle(ButtonStyle.Danger)
        );

        await reviewChannel.send({ embeds: [reviewEmbed], components: [reviewRow] });
      }

      clearTimeout(session.timeout);
      sessions.delete(interaction.channel.id);

      await interaction.editReply('申請已送出！頻道將在 5 秒後自動關閉。');
      setTimeout(async () => {
        try {
          await interaction.channel.delete();
        } catch (e) {
          console.error('[Channel Delete]', e);
        }
      }, 5000);
    } else if (customId === 'cancel_application') {
      const session = sessions.get(interaction.channel.id);
      if (session) {
        clearTimeout(session.timeout);
        sessions.delete(interaction.channel.id);
      }
      await interaction.reply('已取消申請，頻道即將關閉...');
      setTimeout(async () => {
        try {
          await interaction.channel.delete();
        } catch (e) {
          console.error('[Channel Delete]', e);
        }
      }, 2000);
    } else if (customId.startsWith('approve:')) {
      if (!member.permissions.has(PermissionFlagsBits.ManageGuild) && !member.permissions.has(PermissionFlagsBits.Administrator)) {
        return interaction.reply({ content: '您沒有審核權限。', ephemeral: true });
      }

      await interaction.deferUpdate();

      const parts = customId.split(':');
      const targetUserId = parts[1];
      const targetPlatform = parts[2];
      const rawMcId = decodeURIComponent(parts.slice(3).join(':')).trim();
      const isBedrock = targetPlatform === 'BEDROCK';
      const cleanMcId = sanitizeId(rawMcId, isBedrock);

      const targetCommandId = formatFinalCommandId(cleanMcId, isBedrock);
      const cmdTemplate = isBedrock 
        ? (config.bedrockCommandTemplate || 'whitelist add {name}') 
        : (config.javaCommandTemplate || 'whitelist add {name}');
      const finalCommand = buildCommand(cmdTemplate, targetCommandId);

      const dispatchedInstances = [];

      for (const inst of config.instances) {
        const { instanceUuid, daemonId, target, name } = inst;

        if (!instanceUuid || instanceUuid.trim() === '') continue;
        if (target === 'JAVA_ONLY' && isBedrock) continue;
        if (target === 'BEDROCK_ONLY' && !isBedrock) continue;

        await sendMcsmCommand(instanceUuid.trim(), daemonId ? daemonId.trim() : null, finalCommand);
        dispatchedInstances.push(name || instanceUuid);
      }

      try {
        const targetMember = await guild.members.fetch(targetUserId);
        if (targetMember) {
          const displayNickId = isBedrock && config.serverMode === 'CROSSPLAY' ? `${config.bedrockPrefix || '.'}${cleanMcId}` : cleanMcId;
          const rawBaseName = targetMember.user.globalName || targetMember.user.username;
          const cleanBaseName = rawBaseName.replace(/\s*\([^)]*\)$/, '').trim();
          const suffix = ` (${displayNickId})`;
          const maxBaseLength = 32 - suffix.length;
          const truncated = cleanBaseName.length > maxBaseLength ? cleanBaseName.substring(0, Math.max(0, maxBaseLength)) : cleanBaseName;
          
          if (targetMember.manageable) {
            await targetMember.setNickname(`${truncated}${suffix}`);
          }
          if (process.env.VERIFIED_ROLE_ID) {
            await targetMember.roles.add(process.env.VERIFIED_ROLE_ID);
          }

          const approvedDmEmbed = new EmbedBuilder()
            .setTitle(`${config.serverName} - 白名單審核通過`)
            .setDescription(`您的白名單申請已審核通過！\n\n**遊戲版本**：${isBedrock ? '基岩版' : 'Java版'}\n**遊戲 ID**：\`${cleanMcId}\`\n**已開通伺服器**：${dispatchedInstances.join(', ') || '預設伺服器'}\n\n歡迎進入伺服器遊玩！`)
            .setColor(0x2ECC71)
            .setTimestamp();
          
          await targetMember.send({ embeds: [approvedDmEmbed] }).catch(() => {});
        }
      } catch (err) {
        console.error('[Member Sync Error]', err);
      }

      if (process.env.GAS_WEBHOOK_URL) {
        try {
          await fetch(process.env.GAS_WEBHOOK_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'UPDATE_STATUS',
              discordId: targetUserId,
              status: '已批准',
              reviewer: user.tag
            })
          });
        } catch (err) {
          console.error('[GAS Update Error]', err);
        }
      }

      const originalEmbed = interaction.message.embeds[0];
      const updatedEmbed = EmbedBuilder.from(originalEmbed)
        .setColor(0x2ECC71)
        .addFields({
          name: '審核結果',
          value: `已批准 by <@${user.id}>（已寫入：${dispatchedInstances.join('、')}）`,
          inline: false
        });

      await interaction.editReply({ embeds: [updatedEmbed], components: [] });
    } else if (customId.startsWith('reject:')) {
      if (!member.permissions.has(PermissionFlagsBits.ManageGuild) && !member.permissions.has(PermissionFlagsBits.Administrator)) {
        return interaction.reply({ content: '您沒有審核權限。', ephemeral: true });
      }

      const targetUserId = customId.split(':')[1];

      const modal = new ModalBuilder()
        .setCustomId(`reject_modal:${targetUserId}`)
        .setTitle('填寫拒絕原因');

      const reasonInput = new TextInputBuilder()
        .setCustomId('reject_reason')
        .setLabel('請輸入拒絕原因（將私訊通知玩家）')
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(true)
        .setMaxLength(500);

      modal.addComponents(new ActionRowBuilder().addComponents(reasonInput));
      await interaction.showModal(modal);
    }
  } else if (interaction.isModalSubmit()) {
    if (interaction.customId.startsWith('reject_modal:')) {
      await interaction.deferUpdate();

      const targetUserId = interaction.customId.split(':')[1];
      const reason = interaction.fields.getTextInputValue('reject_reason');

      try {
        const targetMember = await interaction.guild.members.fetch(targetUserId);
        if (targetMember) {
          const rejectedDmEmbed = new EmbedBuilder()
            .setTitle(`${config.serverName} - 白名單審核未通過`)
            .setDescription(`很遺憾通知您，您的白名單申請未通過。\n\n**原因**：\n${reason}\n\n如有疑問請聯絡管理員。`)
            .setColor(0xE74C3C)
            .setTimestamp();

          await targetMember.send({ embeds: [rejectedDmEmbed] }).catch(() => {});
        }
      } catch (err) {
        console.error('[Rejection DM]', err);
      }

      if (process.env.GAS_WEBHOOK_URL) {
        try {
          await fetch(process.env.GAS_WEBHOOK_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'UPDATE_STATUS',
              discordId: targetUserId,
              status: '已拒絕',
              reviewer: interaction.user.tag,
              reason: reason
            })
          });
        } catch (err) {
          console.error('[GAS Reject Error]', err);
        }
      }

      const originalEmbed = interaction.message.embeds[0];
      const updatedEmbed = EmbedBuilder.from(originalEmbed)
        .setColor(0xE74C3C)
        .addFields(
          { name: '審核結果', value: `已拒絕 by <@${interaction.user.id}>`, inline: false },
          { name: '拒絕原因', value: reason, inline: false }
        );

      await interaction.editReply({ embeds: [updatedEmbed], components: [] });
    }
  } else if (interaction.isStringSelectMenu()) {
    if (interaction.customId === 'edit_question_select') {
      const session = sessions.get(interaction.channel.id);
      if (!session || session.userId !== interaction.user.id) {
        return interaction.reply({ content: '無效操作。', ephemeral: true });
      }

      const selectedValue = interaction.values[0];
      if (selectedValue === 'mcId') {
        session.isWaitingEditMcId = true;
        await interaction.reply({
          content: session.platform === 'BEDROCK' ? '請輸入新的 Xbox 玩家代號（Gamertag）：' : '請輸入新的 Minecraft Java 版遊戲 ID：',
          ephemeral: false
        });
      } else {
        const selectedIndex = parseInt(selectedValue, 10);
        session.editingIndex = selectedIndex;
        session.isWaitingEditInput = true;

        const followups = getFollowupQuestions();
        const q = followups[selectedIndex];
        await interaction.reply({
          content: `請輸入第 ${selectedIndex + 2} 題的新答案：\n**${q.text}**`,
          ephemeral: false
        });
      }
    }
  }
});

async function promptForMcId(channel) {
  const session = sessions.get(channel.id);
  if (!session) return;

  const promptText = session.platform === 'BEDROCK'
    ? '請輸入您的 Xbox 玩家代號（Gamertag，大小寫與空格須完全一致，無須手動加點）：'
    : '請輸入您的 Minecraft Java 版遊戲 ID：';

  const embed = new EmbedBuilder()
    .setTitle(`問題 (1/${config.questions.length}) - 填寫遊戲 ID`)
    .setDescription(promptText)
    .setColor(0x3498DB);

  await channel.send({ embeds: [embed] });
}

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  const session = sessions.get(message.channel.id);
  if (!session || session.userId !== message.author.id) return;

  refreshSessionTimeout(message.channel.id);

  if (session.isWaitingEditMcId) {
    session.rawMcId = message.content.trim();
    session.isWaitingEditMcId = false;
    await message.reply('已更新遊戲 ID！');
    await sendReviewPanel(message.channel, session);
    return;
  }

  const followups = getFollowupQuestions();

  if (session.isWaitingEditInput) {
    const q = followups[session.editingIndex];
    session.answers[q.id] = message.content.trim();
    session.isWaitingEditInput = false;
    session.editingIndex = null;
    await message.reply('已更新此題答案！');
    await sendReviewPanel(message.channel, session);
    return;
  }

  if (!session.rawMcId) {
    session.rawMcId = message.content.trim();
    if (followups.length > 0) {
      await sendNextQuestion(message.channel);
    } else {
      session.isReviewing = true;
      await sendReviewPanel(message.channel, session);
    }
    return;
  }

  if (session.currentStep < followups.length) {
    const currentQ = followups[session.currentStep];
    session.answers[currentQ.id] = message.content.trim();
    session.currentStep += 1;

    if (session.currentStep < followups.length) {
      await sendNextQuestion(message.channel);
    } else {
      session.isReviewing = true;
      await sendReviewPanel(message.channel, session);
    }
  }
});

async function sendNextQuestion(channel) {
  const session = sessions.get(channel.id);
  if (!session) return;
  const followups = getFollowupQuestions();
  const q = followups[session.currentStep];
  const embed = new EmbedBuilder()
    .setTitle(`問題 (${session.currentStep + 2}/${config.questions.length})`)
    .setDescription(q.text)
    .setColor(0x3498DB);

  await channel.send({ embeds: [embed] });
}

async function sendReviewPanel(channel, session) {
  const isBedrock = session.platform === 'BEDROCK';
  const cleanMcId = sanitizeId(session.rawMcId, isBedrock);
  const followups = getFollowupQuestions();

  const embed = new EmbedBuilder()
    .setTitle('白名單申請作答總覽')
    .setDescription('請確認以下填寫內容是否正確。可使用下拉選單修改單題；確認無誤請點擊送出。')
    .setColor(0x2ECC71)
    .addFields(
      { name: '遊戲版本', value: isBedrock ? '基岩版 (Bedrock)' : 'Java 版', inline: true },
      { name: '遊戲 ID', value: `\`${cleanMcId}\``, inline: true }
    );

  followups.forEach((q, index) => {
    const ans = session.answers[q.id] || '(未填寫)';
    embed.addFields({
      name: `${index + 2}. ${q.text.split('\n')[0]}`,
      value: ans.length > 1024 ? ans.substring(0, 1021) + '...' : ans,
      inline: false
    });
  });

  const selectOptions = [
    { label: '第 1 題：遊戲 ID', value: 'mcId' }
  ];

  followups.forEach((q, idx) => {
    selectOptions.push({
      label: `第 ${idx + 2} 題：${q.text.substring(0, 20)}`,
      value: idx.toString()
    });
  });

  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId('edit_question_select')
    .setPlaceholder('選擇要修改的項目')
    .addOptions(selectOptions);

  const selectRow = new ActionRowBuilder().addComponents(selectMenu);

  const buttonRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('submit_application')
      .setLabel('確認無誤，正式送出')
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId('cancel_application')
      .setLabel('放棄申請')
      .setStyle(ButtonStyle.Danger)
  );

  await channel.send({
    embeds: [embed],
    components: [selectRow, buttonRow]
  });
}

function handleSessionTimeout(channelId) {
  const session = sessions.get(channelId);
  if (session) {
    sessions.delete(channelId);
    const channel = client.channels.cache.get(channelId);
    if (channel) {
      channel.send('申請已超時（15 分鐘未操作），頻道即將關閉。').catch(() => {});
      setTimeout(() => channel.delete().catch(() => {}), 5000);
    }
  }
}

function refreshSessionTimeout(channelId) {
  const session = sessions.get(channelId);
  if (session) {
    clearTimeout(session.timeout);
    session.timeout = setTimeout(() => handleSessionTimeout(channelId), 15 * 60 * 1000);
  }
}

if (process.env.DISCORD_TOKEN) {
  client.login(process.env.DISCORD_TOKEN).catch(e => {
    console.error('[Discord Error]', e.message);
  });
}