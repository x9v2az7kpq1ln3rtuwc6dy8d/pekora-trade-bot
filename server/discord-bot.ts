import { 
  Client, 
  GatewayIntentBits, 
  SlashCommandBuilder, 
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChatInputCommandInteraction,
  ButtonInteraction,
  AttachmentBuilder
} from 'discord.js';
interface ItemValueResult {
  value: number;
  found: boolean;
  baseValue: number;
  demand: string | null;
}

interface ItemDetail {
  name: string;
  result: ItemValueResult;
}

interface TradeEvaluation {
  yourValue: number;
  theirValue: number;
  difference: number;
  verdict: string;
  yourDetails: ItemDetail[];
  theirDetails: ItemDetail[];
  unfoundItems: string[];
  suggestedAdditional: number;
  suggestedGiveback: number;
}

const ADMIN_ROLE_NAME = process.env.ADMIN_ROLE || "Trade Admin";

export class DiscordTradeBot {
  private client: Client;
  private serverUrl: string;

  constructor(serverUrl: string = 'http://localhost:5000') {
    this.client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers
      ]
    });
    
    this.serverUrl = serverUrl;
    this.setupEventHandlers();
  }

  private setupEventHandlers() {
    this.client.once('ready', () => {
      console.log(`Discord bot logged in as ${this.client.user?.tag}`);
      this.registerCommands();
    });
    
    this.client.on('guildCreate', async (guild) => {
      try {
        console.log(`Bot joined new guild: ${guild.name}`);
        await this.registerGuildCommands(guild);
      } catch (error) {
        console.error(`Failed to register commands for guild ${guild.name}:`, error);
      }
    });

    this.client.on('interactionCreate', async (interaction) => {
      try {
        if (interaction.isChatInputCommand()) {
          await this.handleSlashCommand(interaction);
        } else if (interaction.isButton()) {
          await this.handleButtonInteraction(interaction);
        }
      } catch (error) {
        console.error('Error handling interaction:', error);
        const reply = { content: 'An error occurred while processing your request.', ephemeral: true };
        
        if (interaction.isRepliable()) {
          if (interaction.replied || interaction.deferred) {
            await interaction.editReply(reply);
          } else {
            await interaction.reply(reply);
          }
        }
      }
    });
  }

  private async registerGuildCommands(guild: any) {
    const commands = this.getCommandBuilders();
    await guild.commands.set(commands.map(c => c.toJSON()));
    console.log(`Registered Discord commands for guild: ${guild.name}`);
  }

  private getCommandBuilders() {
    return [
      new SlashCommandBuilder()
        .setName('evaluate')
        .setDescription('Evaluate a trade between ROBLOX items')
        .addStringOption(option =>
          option.setName('your_items')
            .setDescription('Your items (comma separated)')
            .setRequired(true))
        .addStringOption(option =>
          option.setName('their_items')
            .setDescription('Their items (comma separated)')
            .setRequired(true))
        .addStringOption(option =>
          option.setName('proof')
            .setDescription('Proof link (optional)')
            .setRequired(false)),

      new SlashCommandBuilder()
        .setName('item_add')
        .setDescription('Add a new item to the database (Admin only)')
        .addStringOption(option =>
          option.setName('name')
            .setDescription('Item name')
            .setRequired(true))
        .addIntegerOption(option =>
          option.setName('value')
            .setDescription('Item value')
            .setRequired(true))
        .addStringOption(option =>
          option.setName('demand')
            .setDescription('Demand level')
            .setRequired(true)
            .addChoices(
              { name: 'High', value: 'high' },
              { name: 'Normal', value: 'normal' },
              { name: 'Low', value: 'low' },
              { name: 'Terrible', value: 'terrible' },
              { name: 'Rising', value: 'rising' },
              { name: 'OK', value: 'ok' }
            )),

      new SlashCommandBuilder()
        .setName('item_update')
        .setDescription('Update an existing item (Admin only)')
        .addStringOption(option =>
          option.setName('name')
            .setDescription('Item name')
            .setRequired(true))
        .addIntegerOption(option =>
          option.setName('value')
            .setDescription('New item value')
            .setRequired(false))
        .addStringOption(option =>
          option.setName('demand')
            .setDescription('New demand level')
            .setRequired(false)
            .addChoices(
              { name: 'High', value: 'high' },
              { name: 'Normal', value: 'normal' },
              { name: 'Low', value: 'low' },
              { name: 'Terrible', value: 'terrible' },
              { name: 'Rising', value: 'rising' },
              { name: 'OK', value: 'ok' }
            )),

      new SlashCommandBuilder()
        .setName('item_remove')
        .setDescription('Remove an item from the database (Admin only)')
        .addStringOption(option =>
          option.setName('name')
            .setDescription('Item name')
            .setRequired(true)),

      new SlashCommandBuilder()
        .setName('history')
        .setDescription('View trade evaluation history')
        .addIntegerOption(option =>
          option.setName('limit')
            .setDescription('Number of records to show (max 50)')
            .setRequired(false)),

      new SlashCommandBuilder()
        .setName('set_bias')
        .setDescription('Set demand bias multiplier (Admin only)')
        .addStringOption(option =>
          option.setName('demand_tag')
            .setDescription('Demand tag')
            .setRequired(true)
            .addChoices(
              { name: 'High', value: 'high' },
              { name: 'Normal', value: 'normal' },
              { name: 'Low', value: 'low' },
              { name: 'Terrible', value: 'terrible' },
              { name: 'Rising', value: 'rising' },
              { name: 'OK', value: 'ok' }
            ))
        .addNumberOption(option =>
          option.setName('multiplier')
            .setDescription('Multiplier value (0.1-3.0)')
            .setRequired(true)),

      new SlashCommandBuilder()
        .setName('list_export')
        .setDescription('Export item list as CSV (Admin only)')
    ];
  }

  private async registerCommands() {
    const commands = this.getCommandBuilders();

    try {
      // Fetch all guilds to ensure we have them all
      await this.client.guilds.fetch();
      
      // Register commands per guild for faster testing
      const guilds = this.client.guilds.cache;
      for (const [guildId, guild] of guilds) {
        await guild.commands.set(commands.map(c => c.toJSON()));
        console.log(`Registered Discord commands for guild: ${guild.name}`);
      }
      
      // Only register globally in production
      if (process.env.NODE_ENV === 'production') {
        await this.client.application?.commands.set(commands.map(c => c.toJSON()));
        console.log('Successfully registered Discord slash commands globally');
      }
    } catch (error) {
      console.error('Failed to register Discord commands:', error);
    }
  }

  private async handleSlashCommand(interaction: ChatInputCommandInteraction) {
    switch (interaction.commandName) {
      case 'evaluate':
        await this.handleEvaluate(interaction);
        break;
      case 'item_add':
        await this.handleItemAdd(interaction);
        break;
      case 'item_update':
        await this.handleItemUpdate(interaction);
        break;
      case 'item_remove':
        await this.handleItemRemove(interaction);
        break;
      case 'history':
        await this.handleHistory(interaction);
        break;
      case 'set_bias':
        await this.handleSetBias(interaction);
        break;
      case 'list_export':
        await this.handleListExport(interaction);
        break;
    }
  }

  private async handleButtonInteraction(interaction: ButtonInteraction) {
    const [action, historyId] = interaction.customId.split(':');
    
    if (!historyId) {
      await interaction.reply({ content: 'Invalid button interaction.', ephemeral: true });
      return;
    }

    switch (action) {
      case 'accept_trade':
        await this.updateHistoryStatus(historyId, 'accepted');
        await interaction.update({
          content: '✅ You marked this trade as **accepted**. Logged.',
          components: []
        });
        break;
      case 'decline_trade':
        await this.updateHistoryStatus(historyId, 'declined');
        await interaction.update({
          content: '❌ You marked this trade as **declined**. Logged.',
          components: []
        });
        break;
      case 'counter_trade':
        await this.updateHistoryStatus(historyId, 'counter');
        await interaction.update({
          content: '💡 **Suggested counter**: Check the evaluation suggestions above.',
          components: []
        });
        break;
    }
  }

  private async handleEvaluate(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();

    const yourItems = interaction.options.getString('your_items', true);
    const theirItems = interaction.options.getString('their_items', true);
    const proof = interaction.options.getString('proof');

    const yourItemsList = this.parseItemsCSV(yourItems);
    const theirItemsList = this.parseItemsCSV(theirItems);

    // Save to history via API
    const response = await fetch(`${this.serverUrl}/api/evaluate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        yourItems,
        theirItems,
        proof: proof || ''
      })
    });
    
    if (!response.ok) {
      throw new Error('Failed to evaluate trade');
    }
    
    const evaluationWithHistory = await response.json() as TradeEvaluation & { historyId: string };
    const { historyId, ...evaluation } = evaluationWithHistory;

    const embed = this.buildEvaluationEmbed(interaction.user, evaluation, proof);
    const buttons = this.buildActionButtons(historyId);

    await interaction.editReply({
      embeds: [embed],
      components: [buttons]
    });
  }

  private async handleItemAdd(interaction: ChatInputCommandInteraction) {
    if (!this.isAdmin(interaction)) {
      await interaction.reply({ content: 'Admin only.', ephemeral: true });
      return;
    }

    const name = interaction.options.getString('name', true);
    const value = interaction.options.getInteger('value', true);
    const demand = interaction.options.getString('demand', true);

    try {
      const response = await fetch(`${this.serverUrl}/api/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, value, demand })
      });
      
      if (!response.ok) {
        throw new Error('Failed to add item');
      }
      
      await interaction.reply({
        content: `✅ Added item **${name}** = ${value} (${demand})`,
        ephemeral: true
      });
    } catch (error) {
      await interaction.reply({
        content: `❌ Failed to add: ${error instanceof Error ? error.message : 'Unknown error'}`,
        ephemeral: true
      });
    }
  }

  private async handleItemUpdate(interaction: ChatInputCommandInteraction) {
    if (!this.isAdmin(interaction)) {
      await interaction.reply({ content: 'Admin only.', ephemeral: true });
      return;
    }

    const name = interaction.options.getString('name', true);
    const value = interaction.options.getInteger('value');
    const demand = interaction.options.getString('demand');

    try {
      // Get all items to find the one to update
      const itemsResponse = await fetch(`${this.serverUrl}/api/items`);
      const items = await itemsResponse.json();
      const item = items.find((i: any) => i.name.toLowerCase() === name.toLowerCase());
      
      if (!item) {
        await interaction.reply({
          content: `❌ Item "${name}" not found.`,
          ephemeral: true
        });
        return;
      }

      const updateData: any = {};
      if (value !== null) updateData.value = value;
      if (demand !== null) updateData.demand = demand;

      const response = await fetch(`${this.serverUrl}/api/items/${item.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData)
      });
      
      if (!response.ok) {
        throw new Error('Failed to update item');
      }
      
      await interaction.reply({
        content: `✅ Updated **${name}**`,
        ephemeral: true
      });
    } catch (error) {
      await interaction.reply({
        content: `❌ Failed to update: ${error instanceof Error ? error.message : 'Unknown error'}`,
        ephemeral: true
      });
    }
  }

  private async handleItemRemove(interaction: ChatInputCommandInteraction) {
    if (!this.isAdmin(interaction)) {
      await interaction.reply({ content: 'Admin only.', ephemeral: true });
      return;
    }

    const name = interaction.options.getString('name', true);

    try {
      // Get all items to find the one to remove
      const itemsResponse = await fetch(`${this.serverUrl}/api/items`);
      const items = await itemsResponse.json();
      const item = items.find((i: any) => i.name.toLowerCase() === name.toLowerCase());
      
      if (!item) {
        await interaction.reply({
          content: `✅ Removed **${name}** (if existed)`,
          ephemeral: true
        });
        return;
      }

      const response = await fetch(`${this.serverUrl}/api/items/${item.id}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) {
        throw new Error('Failed to remove item');
      }
      
      await interaction.reply({
        content: `✅ Removed **${name}** (if existed)`,
        ephemeral: true
      });
    } catch (error) {
      await interaction.reply({
        content: `❌ Failed to remove: ${error instanceof Error ? error.message : 'Unknown error'}`,
        ephemeral: true
      });
    }
  }

  private async handleHistory(interaction: ChatInputCommandInteraction) {
    const limit = Math.min(interaction.options.getInteger('limit') || 10, 50);

    try {
      const response = await fetch(`${this.serverUrl}/api/trade-history?limit=${limit}`);
      const history = await response.json();

      if (history.length === 0) {
        await interaction.reply({ content: 'No history found.', ephemeral: true });
        return;
      }

      let content = '';
      for (let i = 0; i < Math.min(history.length, 20); i++) {
        const record = history[i];
        const date = new Date(record.timestamp!).toLocaleDateString();
        content += `• [${record.id.slice(0, 8)}] ${date} — <@${record.userId}> — ${record.yourValue}/${record.theirValue} — ${record.verdict}\n`;
      }

      const ephemeral = !this.isAdmin(interaction);
      await interaction.reply({ content, ephemeral });
    } catch (error) {
      await interaction.reply({
        content: `❌ Failed to get history: ${error instanceof Error ? error.message : 'Unknown error'}`,
        ephemeral: true
      });
    }
  }

  private async handleSetBias(interaction: ChatInputCommandInteraction) {
    if (!this.isAdmin(interaction)) {
      await interaction.reply({ content: 'Admin only.', ephemeral: true });
      return;
    }

    const demandTag = interaction.options.getString('demand_tag', true);
    const multiplier = interaction.options.getNumber('multiplier', true);

    if (multiplier < 0.1 || multiplier > 3.0) {
      await interaction.reply({
        content: '❌ Multiplier must be between 0.1 and 3.0',
        ephemeral: true
      });
      return;
    }

    try {
      const response = await fetch(`${this.serverUrl}/api/bias-settings/${demandTag}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ multiplier })
      });
      
      if (!response.ok) {
        throw new Error('Failed to set bias');
      }
      
      await interaction.reply({
        content: `Set bias for ${demandTag} = ${multiplier}`,
        ephemeral: true
      });
    } catch (error) {
      await interaction.reply({
        content: `❌ Failed to set bias: ${error instanceof Error ? error.message : 'Unknown error'}`,
        ephemeral: true
      });
    }
  }

  private async handleListExport(interaction: ChatInputCommandInteraction) {
    if (!this.isAdmin(interaction)) {
      await interaction.reply({ content: 'Admin only.', ephemeral: true });
      return;
    }

    try {
      const response = await fetch(`${this.serverUrl}/api/items`);
      const items = await response.json();

      // Generate CSV content
      const csvHeader = 'name,value,demand\n';
      const csvRows = items.map((item: any) => 
        `"${item.name}",${item.value},"${item.demand}"`
      ).join('\n');

      const csvContent = csvHeader + csvRows;
      const buffer = Buffer.from(csvContent, 'utf-8');
      const attachment = new AttachmentBuilder(buffer, { name: 'value_list.csv' });

      await interaction.reply({
        files: [attachment],
        ephemeral: true
      });
    } catch (error) {
      await interaction.reply({
        content: `❌ Failed to export: ${error instanceof Error ? error.message : 'Unknown error'}`,
        ephemeral: true
      });
    }
  }

  private parseItemsCSV(itemsStr: string): string[] {
    if (!itemsStr || itemsStr.trim().length === 0) {
      return [];
    }
    
    return itemsStr.split(',')
      .map(item => item.trim())
      .filter(item => item.length > 0);
  }


  private buildEvaluationEmbed(user: any, evaluation: TradeEvaluation, proof?: string | null) {
    const embed = new EmbedBuilder()
      .setTitle('🔍 Trade Evaluation')
      .setColor(evaluation.verdict.includes('Accept') ? 0x00ff00 : 
               evaluation.verdict.includes('Decline') ? 0xff0000 : 0xffff00)
      .setTimestamp()
      .addFields(
        {
          name: '💰 Your Value',
          value: evaluation.yourValue.toLocaleString(),
          inline: true
        },
        {
          name: '💎 Their Value', 
          value: evaluation.theirValue.toLocaleString(),
          inline: true
        },
        {
          name: '📊 Difference',
          value: `${evaluation.difference > 0 ? '+' : ''}${evaluation.difference.toLocaleString()}`,
          inline: true
        },
        {
          name: '⚖️ Verdict',
          value: evaluation.verdict,
          inline: false
        }
      );

    if (evaluation.unfoundItems.length > 0) {
      embed.addFields({
        name: '❓ Unknown Items',
        value: evaluation.unfoundItems.join(', '),
        inline: false
      });
    }

    if (proof) {
      embed.addFields({
        name: '🔗 Proof',
        value: proof,
        inline: false
      });
    }

    embed.setFooter({
      text: `Requested by ${user.username}`,
      iconURL: user.displayAvatarURL()
    });

    return embed;
  }

  private buildActionButtons(historyId: string) {
    return new ActionRowBuilder<ButtonBuilder>()
      .addComponents(
        new ButtonBuilder()
          .setCustomId(`accept_trade:${historyId}`)
          .setLabel('Accept')
          .setStyle(ButtonStyle.Success)
          .setEmoji('✅'),
        new ButtonBuilder()
          .setCustomId(`decline_trade:${historyId}`)
          .setLabel('Decline')
          .setStyle(ButtonStyle.Danger)
          .setEmoji('❌'),
        new ButtonBuilder()
          .setCustomId(`counter_trade:${historyId}`)
          .setLabel('Suggest Counter')
          .setStyle(ButtonStyle.Primary)
          .setEmoji('💡')
      );
  }

  private async updateHistoryStatus(historyId: string, status: string) {
    try {
      const response = await fetch(`${this.serverUrl}/api/trade-history/${historyId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      
      if (!response.ok) {
        throw new Error('Failed to update history status');
      }
    } catch (error) {
      console.error('Failed to update history status:', error);
    }
  }

  private isAdmin(interaction: ChatInputCommandInteraction | ButtonInteraction): boolean {
    const member = interaction.member;
    if (!member || !('roles' in member)) return false;
    
    if (Array.isArray(member.roles)) {
      return member.roles.some(roleId => {
        const role = interaction.guild?.roles.cache.get(roleId);
        return role?.name === ADMIN_ROLE_NAME;
      });
    } else {
      return member.roles.cache.some(role => role.name === ADMIN_ROLE_NAME);
    }
  }

  public async start(token: string) {
    try {
      await this.client.login(token);
    } catch (error) {
      console.error('Failed to start Discord bot:', error);
      throw error;
    }
  }

  public async stop() {
    this.client.destroy();
  }
}