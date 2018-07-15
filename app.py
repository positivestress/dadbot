import discord
import re
import json

client = discord.Client()

with open("settings.json") as f:
    st=json.load(f)

prefix = st["prefix"]

@client.event
async def on_ready():
    print('We have logged in as {0.user}'.format(client))

def has_admin(member):
    return member.server_permissions.administrator

def is_cmd(content, command):
    return re.match(r"{}{}( .*|$)".format(prefix, command), content)


@client.event
async def on_message(message):
    admin = has_admin(message.author)
    if message.author == client.user:
        return
    if message.author.bot:
        return
    
    
    content = message.content.casefold()

    if is_cmd(content, "latest"):
        # Here and later: should use gpodder's podcastparser library
        await client.send_message(message.channel, 'Function not implemented!!') #FIXME
        return
    if is_cmd(content, "addfeed"):
        if admin:
            await client.send_message(message.channel, 'Function not implemented!!') #FIXME
        else:
            await client.send_message(message.channel, 'naaaah')
        return
    if is_cmd(content, "removefeed"):
        if admin:
            await client.send_message(message.channel, 'Function not implemented!!') #FIXME
        else:
            await client.send_message(message.channel, 'naaaah')
        return
    if is_cmd(content, "grass"):
        e = discord.Embed()
        e.set_image(url='https://cdn.discordapp.com/attachments/433386476978307072/465365510096289792/grass.png')
        await client.send_message(message.channel, embed=e)
        return
    if is_cmd(content, "sfw"):
        e = discord.Embed()
        e.set_image(url='https://cdn.discordapp.com/attachments/433386476978307072/465392719234334723/sasuke.png')
        await client.send_message(message.channel, embed=e)
        return
    if is_cmd(content, "embiggen"):
        # this is the hard one: there are seemingly no emoji-parsing libraries in Python, so at best we could
        # find emoji-space sequences and attempt to point those to twitter - except ZWJ and Fitzpatrick will
        # not work in the naive case.
        await client.send_message(message.channel, 'Function not implemented!!') #FIXME
        return
    if is_cmd(content, "start"):
        if admin:
            await client.send_message(message.channel, 'Function not implemented!!') #FIXME
        else:
            await client.send_message(message.channel, 'naaaah')
        return
    if "dick" in content and "i like it" in content:
        await client.send_message(message.channel, 'bet you do.')
        return
    if re.search(r"\bdick[^\w?]", content):
        await client.send_message(message.channel, 'dick?')
        return
    if content == "dick?":
        await client.send_message(message.channel, 'cock.')
        return
    if re.match(r"cock(\.)?$", content):
        await client.send_message(message.channel, 'ah, dick. I like it.')
        return
    if re.search(r"bet you do(\.)?", content):
        await client.send_message(message.channel, "nope! it's pussy for me")
        return
    if re.search(r"pussy for me", content):
        await client.add_reaction(message, ":emmy:465295260306898944")
        return

client.run(st["token"])
