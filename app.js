const Discord = require('discord.js');
const client = new Discord.Client();
const settings = require('./settings.json');

var welcomeMessages = []

client.on('ready', () => {
    console.log("running");
});

client.on("guildMemberAdd", (member) => {
    member.addRole(member.guild.roles.find(role => role.name == "Whomst?"));
    let channel = member.guild.channels.find(ch => ch.name === "introductions");
    let rules = member.guild.channels.find(ch => ch.name === "rules");
    channel.send(`Welcome, ${member}! At the moment you can only post here, so please read the ${rules} and then introduce yourself (name, age, pronouns, social media, whatever you might want people to know about you) to get access to the rest of the server!`)
    .then(msg => welcomeMessages.push([member.id, msg.id]));
});

client.on("message", (message) => {
    let whomst = message.guild.roles.find(role => role.name == "Whomst?");
    if(message.content.length > 6 &&  message.member.roles.exists("name", "Whomst?")){
        message.member.removeRole(whomst);
        let toDelete = findWelcomeMessage(message.member.id);
        message.channel.fetchMessage(toDelete)
        .then(msgToDelete => {
            msgToDelete.delete();
            message.react("👋");
        });
    }
});

function findWelcomeMessage(userID){
    for(let i = 0; i < welcomeMessages.length; i++){
        if(welcomeMessages[i][0] == userID){
            let messageID = welcomeMessages[i][1]
            welcomeMessages[i] = welcomeMessages[welcomeMessages.length - 1];
            welcomeMessages.pop();
            return messageID;
        }
    }
}


client.login(settings.token);