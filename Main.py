#!/usr/bin/env python3
"""
Discord Trade Evaluation Bot - Python Version
A bot for evaluating ROBLOX item trades with demand-based value adjustments.
"""

import os
import sqlite3
import json
import csv
import io
import asyncio
from datetime import datetime, timezone
from typing import List, Dict, Tuple, Optional
import logging

import discord
from discord import app_commands
from discord.ext import commands

# Load environment variables
from dotenv import load_dotenv
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Database setup
DB_PATH = './pekora.db'

def init_database():
    """Initialize the database with required tables."""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # Create tables
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS items (
            id INTEGER PRIMARY KEY,
            name TEXT UNIQUE,
            value INTEGER,
            demand TEXT
        )
    ''')
    
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS settings (
            key TEXT PRIMARY KEY,
            value TEXT
        )
    ''')
    
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS history (
            id INTEGER PRIMARY KEY,
            user_id TEXT,
            timestamp INTEGER,
            your_items TEXT,
            their_items TEXT,
            your_value INTEGER,
            their_value INTEGER,
            verdict TEXT,
            proof TEXT
        )
    ''')
    
    conn.commit()
    conn.close()

def get_setting(key: str) -> Optional[str]:
    """Get a setting from the database."""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute('SELECT value FROM settings WHERE key = ?', (key,))
    result = cursor.fetchone()
    conn.close()
    return result[0] if result else None

def set_setting(key: str, value: str):
    """Set a setting in the database."""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute('INSERT OR REPLACE INTO settings(key, value) VALUES(?, ?)', (key, value))
    conn.commit()
    conn.close()

def get_biases() -> Dict[str, float]:
    """Get demand bias multipliers."""
    default_biases = {
        'high': 1.1,
        'normal': 1.0,
        'low': 0.9,
        'terrible': 0.8,
        'rising': 1.2,
        'ok': 1.0
    }
    
    biases_str = get_setting('biases')
    if biases_str:
        return json.loads(biases_str)
    else:
        # Set default biases
        set_setting('biases', json.dumps(default_biases))
        return default_biases

def set_bias(tag: str, multiplier: float):
    """Set a bias multiplier for a demand tag."""
    biases = get_biases()
    biases[tag] = multiplier
    set_setting('biases', json.dumps(biases))

def seed_database():
    """Seed the database with initial items if empty."""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    cursor.execute('SELECT COUNT(*) FROM items')
    count = cursor.fetchone()[0]
    
    if count == 0:
        seed_data = [
            ("Black Sparkle Time Fedora", 9000, "high"),
            ("Green Sparkle Time Fedora", 11000, "high"),
            ("Midnight Blue Sparkle Time Fedora", 18500, "normal"),
            ("Orange Sparkle Time Fedora", 4500, "normal"),
            ("Pink Sparkle Time Fedora", 7250, "normal"),
            ("Red Sparkle Time Fedora", 18500, "high"),
            ("Purple Sparkle Time Fedora", 2750, "low"),
            ("Sky Blue Sparkle Time Fedora", 8500, "low"),
            ("Sparkle Time Fedora", 4000, "low"),
            ("Blackvalk", 15000, "high"),
            ("Ice Valkyrie", 2500, "low"),
            ("Emerald Valkyrie", 7250, "normal"),
            ("Tixvalk", 2500, "low"),
            ("Valkyrie Helm", 0, "high"),
            ("Dominus Astra", 25000, "low"),
            ("Dominus Empyreus", 60000, "high"),
            ("Dominus Frigidus", 20000, "high"),
            ("Dominus Infernus", 35000, "low"),
            ("Dominus Messor", 2750, "low"),
            ("Dominus Praefectus", 1234, "terrible"),
            ("Dominus Rex", 5000, "low"),
            ("Dominus Vespertilio", 4500, "low"),
            ("Dominus Aureus", 14000, "low"),
            ("Domino Crown", 25000, "low"),
            ("Red Domino Crown", 16000, "terrible"),
            ("Disgraced Baron of the Federation", 4750, "low"),
            ("Duke of the Federation", 28500, "normal"),
            ("Earl of the Federation", 12000, "terrible"),
            ("Lord of the Federation", 55000, "low"),
            ("Viscount of the Federation", 1500, "low"),
            ("Clockwork's Headphones", 3000, "normal"),
            ("Clockwork's Shades", 3300, "normal"),
            ("Fiery Horns of the Netherworld", 6800, "normal"),
            ("Frozen Horns of the Frigid Planes", 0, "high"),
            ("Poisoned Horns of the Toxic Wasteland", 3000, "normal"),
            ("Red Void Star", 7500, "normal"),
            ("The Void Star", 3500, "high"),
            ("Silver King of the Night", 2500, "normal"),
            ("Bling $$ Necklace", 20000, "normal"),
            ("Eccentric Shop Teacher", 37500, "low"),
            ("Eerie Pumpkin Head", 12000, "low"),
            ("Rainbow Shaggy", 10000, "normal"),
            ("Subarctic Commando", 4500, "normal"),
            ("Transient Harmonica", 0, "ok"),
            ("Ghosdeeri", 4000, "normal"),
            ("Brighteyes' Bloxy Cola", 5500, "normal"),
            ("Interstellar Wings", 4500, "low"),
            ("Classic Fedora", 3000, "normal"),
            ("Telamon's Chicken Suit", 2500, "normal"),
            ("Telamon Hair", 5500, "low"),
            ("Playful Vampire", 0, "low"),
            ("Prankster", 3500, "high"),
            ("Red Glowing Eyes", 9000, "high"),
            ("Super Super Happy Face", 3000, "normal"),
            ("Yum!", 5500, "terrible"),
            ("Dual Darkhearts", 10000, "low"),
            ("Twin Kodachi", 2000, "rising")
        ]
        
        cursor.executemany('INSERT INTO items(name, value, demand) VALUES(?, ?, ?)', seed_data)
        conn.commit()
        logger.info('Seeded database with default items.')
    
    conn.close()

def parse_items_csv(items_str: str) -> List[str]:
    """Parse comma-separated item names."""
    if not items_str:
        return []
    return [item.strip() for item in items_str.split(',') if item.strip()]

def get_item_value_with_bias(name: str) -> Dict:
    """Get item value with demand bias applied."""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM items WHERE name = ? COLLATE NOCASE', (name,))
    row = cursor.fetchone()
    conn.close()
    
    if not row:
        return {'value': 0, 'found': False, 'demand': None}
    
    _, item_name, base_value, demand = row
    biases = get_biases()
    multiplier = biases.get(demand, 1.0)
    adjusted_value = round(base_value * multiplier)
    
    return {
        'value': adjusted_value,
        'found': True,
        'base': base_value,
        'demand': demand
    }

def evaluate_trade_logic(your_items: List[str], their_items: List[str]) -> Dict:
    """Evaluate a trade and return comprehensive results."""
    your_value = 0
    their_value = 0
    your_details = []
    their_details = []
    unfound = []
    
    # Calculate your items
    for item in your_items:
        item_data = get_item_value_with_bias(item)
        your_value += item_data['value']
        your_details.append({'name': item, **item_data})
        if not item_data['found']:
            unfound.append(item)
    
    # Calculate their items
    for item in their_items:
        item_data = get_item_value_with_bias(item)
        their_value += item_data['value']
        their_details.append({'name': item, **item_data})
        if not item_data['found']:
            unfound.append(item)
    
    # Calculate difference (positive means you profit)
    diff = their_value - your_value
    
    # Determine verdict
    if diff >= 1000:
        verdict = 'Accept'
    elif diff <= -1000:
        verdict = 'Decline'
    else:
        verdict = 'Fair / Consider demand'
    
    # Extra heuristic for high-demand items
    count_high_their = len([x for x in their_details if x.get('demand') == 'high'])
    count_high_your = len([x for x in your_details if x.get('demand') == 'high'])
    
    if count_high_their - count_high_your >= 2 and diff >= -800:
        verdict = 'Consider (their high-demand items)'
    
    # Suggestions
    suggested_additional = max(0, ((your_value - their_value) // 100 + 1) * 100) if your_value > their_value else 0
    suggested_giveback = max(0, ((their_value - your_value) // 100 + 1) * 100) if their_value > your_value else 0
    
    return {
        'your_value': your_value,
        'their_value': their_value,
        'diff': diff,
        'verdict': verdict,
        'your_details': your_details,
        'their_details': their_details,
        'unfound': unfound,
        'suggested_additional': suggested_additional,
        'suggested_giveback': suggested_giveback
    }

def add_item(name: str, value: int, demand: str):
    """Add an item to the database."""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute('INSERT INTO items(name, value, demand) VALUES(?, ?, ?)', (name, value, demand))
    conn.commit()
    conn.close()

def update_item(name: str, value: Optional[int] = None, demand: Optional[str] = None):
    """Update an item in the database."""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    if value is not None and demand is not None:
        cursor.execute('UPDATE items SET value = ?, demand = ? WHERE name = ?', (value, demand, name))
    elif value is not None:
        cursor.execute('UPDATE items SET value = ? WHERE name = ?', (value, name))
    elif demand is not None:
        cursor.execute('UPDATE items SET demand = ? WHERE name = ?', (demand, name))
    
    conn.commit()
    conn.close()

def remove_item(name: str):
    """Remove an item from the database."""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute('DELETE FROM items WHERE name = ?', (name,))
    conn.commit()
    conn.close()

def get_all_items() -> List[Tuple]:
    """Get all items from the database."""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM items ORDER BY name COLLATE NOCASE')
    items = cursor.fetchall()
    conn.close()
    return items

def add_to_history(user_id: str, your_items: List[str], their_items: List[str], 
                   your_value: int, their_value: int, verdict: str, proof: Optional[str] = None):
    """Add a trade evaluation to history."""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    timestamp = int(datetime.now(timezone.utc).timestamp() * 1000)
    cursor.execute('''
        INSERT INTO history(user_id, timestamp, your_items, their_items, your_value, their_value, verdict, proof)
        VALUES(?, ?, ?, ?, ?, ?, ?, ?)
    ''', (user_id, timestamp, '|'.join(your_items), '|'.join(their_items), your_value, their_value, verdict, proof))
    conn.commit()
    conn.close()

def get_history(limit: int = 10) -> List[Tuple]:
    """Get trade history."""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM history ORDER BY timestamp DESC LIMIT ?', (limit,))
    history = cursor.fetchall()
    conn.close()
    return history

def update_last_history_verdict(verdict: str):
    """Update the verdict of the most recent history entry."""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute('UPDATE history SET verdict = ? WHERE id = (SELECT id FROM history ORDER BY id DESC LIMIT 1)', (verdict,))
    conn.commit()
    conn.close()

def is_admin(member) -> bool:
    """Check if a member is an admin."""
    if not member:
        return False
    
    admin_role_name = os.getenv('ADMIN_ROLE', 'Trade Admin')
    return (
        member.guild_permissions.manage_guild or
        any(role.name == admin_role_name for role in member.roles)
    )

def build_evaluation_embed(user: discord.User, eval_result: Dict, proof: Optional[str] = None) -> discord.Embed:
    """Build the evaluation embed."""
    color = 0x00FF00 if eval_result['diff'] >= 0 else 0xFF3333
    
    embed = discord.Embed(
        title='Trade Evaluation',
        color=color,
        timestamp=datetime.now(timezone.utc)
    )
    
    embed.set_footer(text=f"Requested by {user.display_name}", icon_url=user.display_avatar.url)
    
    embed.add_field(name='Your total (biased)', value=str(eval_result['your_value']), inline=True)
    embed.add_field(name="Their total (biased)", value=str(eval_result['their_value']), inline=True)
    embed.add_field(name='Difference', value=f"{'+' if eval_result['diff'] >= 0 else ''}{eval_result['diff']}", inline=True)
    embed.add_field(name='Verdict', value=eval_result['verdict'], inline=False)
    
    def items_to_string(details: List[Dict]) -> str:
        lines = []
        for d in details[:12]:  # Limit to 12 items
            found_mark = '' if d['found'] else ' (UNVALUED)'
            base = f"base:{d['base']}" if 'base' in d else ''
            demand = f"demand:{d['demand']}" if d.get('demand') else ''
            line = f"• {d['name']} — {d['value']} {found_mark} {base} {demand}".strip()
            lines.append(line)
        return '\n'.join(lines) if lines else '—'
    
    embed.add_field(name='Your items', value=items_to_string(eval_result['your_details']), inline=True)
    embed.add_field(name='Their items', value=items_to_string(eval_result['their_details']), inline=True)
    
    if eval_result['unfound']:
        unfound_text = '\n'.join(eval_result['unfound'][:20])
        embed.add_field(name='Unrecognized items', value=unfound_text, inline=False)
    
    if proof:
        embed.add_field(name='Proof link', value=proof, inline=False)
    
    # Suggestions
    suggestions = []
    if eval_result['suggested_additional'] > 0:
        suggestions.append(f"They should add **{eval_result['suggested_additional']}** ROBLOX value to match you.")
    if eval_result['suggested_giveback'] > 0:
        suggestions.append(f"You could ask for **{eval_result['suggested_giveback']}** more or remove items.")
    
    if suggestions:
        embed.add_field(name='Suggestion', value='\n'.join(suggestions), inline=False)
    
    return embed

# Discord Bot Setup
intents = discord.Intents.default()
intents.message_content = True

class TradeBot(commands.Bot):
    def __init__(self):
        super().__init__(command_prefix='!', intents=intents)
    
    async def on_ready(self):
        logger.info(f'Logged in as {self.user} (ID: {self.user.id})')
        try:
            synced = await self.tree.sync()
            logger.info(f'Synced {len(synced)} command(s)')
        except Exception as e:
            logger.error(f'Failed to sync commands: {e}')

bot = TradeBot()

@bot.tree.command(name='evaluate', description='Evaluate a trade between your items and their items')
@app_commands.describe(
    your_items='Comma-separated list of your items',
    their_items='Comma-separated list of their items',
    proof='Optional proof link (screenshot, etc.)'
)
async def evaluate(interaction: discord.Interaction, your_items: str, their_items: str, proof: str = None):
    await interaction.response.defer()
    
    try:
        your_items_list = parse_items_csv(your_items)
        their_items_list = parse_items_csv(their_items)
        
        eval_result = evaluate_trade_logic(your_items_list, their_items_list)
        
        # Save to history
        add_to_history(
            str(interaction.user.id),
            your_items_list,
            their_items_list,
            eval_result['your_value'],
            eval_result['their_value'],
            eval_result['verdict'],
            proof
        )
        
        embed = build_evaluation_embed(interaction.user, eval_result, proof)
        
        # Create buttons
        view = TradeButtonView()
        
        await interaction.followup.send(embed=embed, view=view)
        
    except Exception as e:
        logger.error(f'Error in evaluate command: {e}')
        await interaction.followup.send(f'Error: {e}')

class TradeButtonView(discord.ui.View):
    def __init__(self):
        super().__init__(timeout=300)  # 5 minutes
    
    @discord.ui.button(label='Accept', style=discord.ButtonStyle.success)
    async def accept_trade(self, interaction: discord.Interaction, button: discord.ui.Button):
        update_last_history_verdict('Manual Accept')
        await interaction.response.edit_message(content='✅ You marked this trade as **accepted**. Logged.', view=None)
    
    @discord.ui.button(label='Decline', style=discord.ButtonStyle.danger)
    async def decline_trade(self, interaction: discord.Interaction, button: discord.ui.Button):
        update_last_history_verdict('Manual Decline')
        await interaction.response.edit_message(content='❌ You marked this trade as **declined**. Logged.', view=None)
    
    @discord.ui.button(label='Suggest Counter', style=discord.ButtonStyle.primary)
    async def counter_trade(self, interaction: discord.Interaction, button: discord.ui.Button):
        update_last_history_verdict('Manual Counter Suggested')
        await interaction.response.edit_message(content='💡 **Suggested counter**: Check the evaluation suggestions above.', view=None)

# Item management commands
@bot.tree.command(name='item_add', description='[ADMIN] Add a new item to the database')
@app_commands.describe(name='Item name', value='Item value', demand='Demand level')
@app_commands.choices(demand=[
    app_commands.Choice(name='high', value='high'),
    app_commands.Choice(name='normal', value='normal'),
    app_commands.Choice(name='low', value='low'),
    app_commands.Choice(name='terrible', value='terrible'),
    app_commands.Choice(name='rising', value='rising'),
    app_commands.Choice(name='ok', value='ok'),
])
async def item_add(interaction: discord.Interaction, name: str, value: int, demand: str):
    if not is_admin(interaction.user):
        await interaction.response.send_message('Admin only.', ephemeral=True)
        return
    
    try:
        add_item(name, value, demand)
        await interaction.response.send_message(f'✅ Added item **{name}** = {value} ({demand})', ephemeral=True)
    except Exception as e:
        await interaction.response.send_message(f'❌ Failed to add: {e}', ephemeral=True)

@bot.tree.command(name='item_update', description='[ADMIN] Update an existing item')
@app_commands.describe(name='Item name', value='New value (optional)', demand='New demand level (optional)')
@app_commands.choices(demand=[
    app_commands.Choice(name='high', value='high'),
    app_commands.Choice(name='normal', value='normal'),
    app_commands.Choice(name='low', value='low'),
    app_commands.Choice(name='terrible', value='terrible'),
    app_commands.Choice(name='rising', value='rising'),
    app_commands.Choice(name='ok', value='ok'),
])
async def item_update(interaction: discord.Interaction, name: str, value: int = None, demand: str = None):
    if not is_admin(interaction.user):
        await interaction.response.send_message('Admin only.', ephemeral=True)
        return
    
    update_item(name, value, demand)
    await interaction.response.send_message(f'✅ Updated **{name}**', ephemeral=True)

@bot.tree.command(name='item_remove', description='[ADMIN] Remove an item from the database')
@app_commands.describe(name='Item name to remove')
async def item_remove(interaction: discord.Interaction, name: str):
    if not is_admin(interaction.user):
        await interaction.response.send_message('Admin only.', ephemeral=True)
        return
    
    remove_item(name)
    await interaction.response.send_message(f'✅ Removed **{name}** (if existed)', ephemeral=True)

@bot.tree.command(name='list_export', description='[ADMIN] Export the item list as CSV')
async def list_export(interaction: discord.Interaction):
    if not is_admin(interaction.user):
        await interaction.response.send_message('Admin only.', ephemeral=True)
        return
    
    items = get_all_items()
    
    # Create CSV
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(['name', 'value', 'demand'])
    
    for item in items:
        writer.writerow([item[1], item[2], item[3]])  # Skip ID column
    
    csv_content = output.getvalue()
    output.close()
    
    file = discord.File(io.BytesIO(csv_content.encode()), filename='value_list.csv')
    await interaction.response.send_message(file=file, ephemeral=True)

@bot.tree.command(name='history', description='View trade evaluation history')
@app_commands.describe(limit='Number of recent entries to show (default: 10)')
async def history(interaction: discord.Interaction, limit: int = 10):
    history_data = get_history(min(limit, 50))  # Cap at 50
    
    if not history_data:
        await interaction.response.send_message('No history found.', ephemeral=True)
        return
    
    lines = []
    for record in history_data[:20]:  # Limit display to 20
        record_id, user_id, timestamp, your_items, their_items, your_value, their_value, verdict, proof = record
        date = datetime.fromtimestamp(timestamp / 1000, tz=timezone.utc).strftime('%Y-%m-%d %H:%M')
        lines.append(f'• [{record_id}] {date} — <@{user_id}> — {your_value}/{their_value} — {verdict}')
    
    content = '\n'.join(lines)
    ephemeral = not is_admin(interaction.user)
    await interaction.response.send_message(content, ephemeral=ephemeral)

@bot.tree.command(name='set_bias', description='[ADMIN] Set demand bias multiplier')
@app_commands.describe(demand_tag='Demand tag to modify', multiplier='Multiplier value')
@app_commands.choices(demand_tag=[
    app_commands.Choice(name='high', value='high'),
    app_commands.Choice(name='normal', value='normal'),
    app_commands.Choice(name='low', value='low'),
    app_commands.Choice(name='terrible', value='terrible'),
    app_commands.Choice(name='rising', value='rising'),
    app_commands.Choice(name='ok', value='ok'),
])
async def set_bias_command(interaction: discord.Interaction, demand_tag: str, multiplier: float):
    if not is_admin(interaction.user):
        await interaction.response.send_message('Admin only.', ephemeral=True)
        return
    
    set_bias(demand_tag, multiplier)
    await interaction.response.send_message(f'Set bias for {demand_tag} = {multiplier}', ephemeral=True)

def main():
    """Main function to run the bot."""
    # Initialize database
    init_database()
    seed_database()
    
    # Get token from environment
    token = os.getenv('DISCORD_TOKEN')
    if not token:
        logger.error('DISCORD_TOKEN environment variable not found!')
        return
    
    # Run bot
    bot.run(token)

if __name__ == '__main__':
    main()