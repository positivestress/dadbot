const Discord = require('discord.js');
const client = new Discord.Client();
const settings = require('./settings.json');
const feeds = require("./feeds.js");

class welcomeMessage{
    constructor(userID, messageID){
        this.userID = userID,
        this.messageID = messageID
    }
}

var welcomeMessages = [];

function hasAccess(user)
{
    if(user.permissions.has("ADMINISTRATOR")) return true;
    else return false;
}

client.on('ready', () => {
    console.log("running");
});

client.on("guildMemberAdd", (member) => {
    member.addRole(member.guild.roles.find(role => role.name == "Whomst?"));
    let channel = member.guild.channels.find(channel => channel.name == "introductions");
    let rules = member.guild.channels.find(channel => channel.name == "rules");
    channel.send(`Welcome, ${member}! At the moment you can only post here, so please read the ${rules} and then introduce yourself (name, age, pronouns, social media, whatever you might want people to know about you) to get access to the rest of the server!`)
    .then(msg => welcomeMessages.push(new welcomeMessage(member.id, msg.id)));
});

client.on("message", (message) => {
    if(message.content.length > 6 &&  message.member.roles.exists("name", "Whomst?")){
        let whomst = message.guild.roles.find(role => role.name == "Whomst?");
        message.member.removeRole(whomst);
        deleteWelcomeMessage(message.member.id, message.channel);
        message.react("👋");
    }
    else if(message.content.startsWith("!addfeed ")){
        if(!hasAccess(message.member)) message.channel.send("You can't do that!");
        else{
            let input = message.content.substring(9);
            feeds.addFeed(input);
        }
    }
    else if(message.content == "!latest invasion angle")
    {
        message.channel.send("Fuck off.");
    }
    else if(message.content.startsWith("!latest "))
    {
        let input = message.content.substring(8);
        feeds.latest(input, message.channel);
    }
});

client.on("guildMemberRemove", (member) => {
    if(member.roles.exists("name", "Whomst?")){
        deleteWelcomeMessage(member.id, member.guild.channels.find(channel => channel.name == "introductions"));
    }
});

function deleteWelcomeMessage(userID, channel){
    for(let i = 0; i < welcomeMessages.length; i++){
        if(welcomeMessages[i].userID == userID){
            let messageID = welcomeMessages[i].messageID;
            welcomeMessages[i] = welcomeMessages[welcomeMessages.length - 1];
            welcomeMessages.pop();
            channel.fetchMessage(messageID)
            .then(toDelete => {
                toDelete.delete();
            })
        }
    }
}

client.login(settings.token);