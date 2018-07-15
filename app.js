const { promisify } = require("util");
const Discord = require('discord.js');
const client = new Discord.Client();
const settings = require('./settings.json');
const MongoClient = require('mongodb').MongoClient
const mongourl = "mongodb://localhost:27017/bot";
const assert = require('assert');
const twemoji = require('twemoji');
const feeds = require('./feeds.js');

client.on('ready', () => {
    console.log("running");
});

// THIS BOT IS A MESS. PLEASE DON'T JUDGE ME. IT'S A WORK IN PROGRESS AND I'VE NEVER DONE THIS BEFORE


function hasAccess(user)
{
    if(user.permissions.has("ADMINISTRATOR")) return true;
    else return false;
}

function parseEmoji(message)
{
    let parsed = twemoji.parse(message, function(icon, options) {
        return ''.concat(
          options.base, // by default Twitter Inc. CDN
          options.size, // by default "36x36" string
          '/',
          icon,         // the found emoji as code point
          options.ext   // by default ".png"
        );
      });
    if(parsed === message)
    {
        let colons = 0;
        for(var i = 0; i < message.length - 1; i++)
        {
            if(message[i] == ':') colons++;
            if(colons == 2){ i++; break; }
        }
        return `https://cdn.discordapp.com/emojis/${message.substring(i, i+18)}.png`;
    }
    else
    {
        let result = parsed.split("src=\"").pop();
        return result.substring(0, result.length-3);
    }
}



client.on('message', message => {
    if(message.author == client.user) return;
    if(message.author.bot) return;
  

    if(message.content.startsWith("!latest "))
    {
        let title = message.content.substring(8);
        MongoClient.connect(mongourl, function(err, db){
            let dbo = db.db("bot");
            dbo.collection('feeds').findOne({title: title}, function(err, res){
                if(err) throw err;
                let podcast = new Promise(function(resolve, reject){
                    resolve(feeds.latest(res.url));
                });
                podcast.then(function(value){
                    message.channel.send(`Latest episode of **${value.title}**: ${value.item.link}`);
                });
            })
            db.close();
        });
    }

    
    if(message.content.startsWith("!addfeed "))
    {
        if(!hasAccess(message.member))
        {
            message.channel.send("No.");
            return;
        }
        let output = feeds.parseAdd(message.content.substring(9));
        if(!output)
        {
            message.channel.send("Please enter new feeds with the format: \`!addfeed [feed_title] [url]\` and make sure you are using a valid RSS feed.");
            return;
        }
        let verified = feeds.verify(output.url);
        verified.then(function(val) {
            if(!val)
            {
                message.channel.send("Please enter new feeds with the format: \`!addfeed [feed_title] [url]\` and make sure you are using a valid RSS feed.");
                return;
            }
            MongoClient.connect(mongourl, function(err, db){
                let dbo = db.db("bot");
                dbo.collection("feeds").findOne(
                    {
                        $or: [
                            { title: output.title },
                            { url: output.url }
                        ]
                    }, function(err, res) {
                        if(err) throw err;
                        if(!res)
                        {
                            dbo.collection("feeds").insertOne({title: output.title, url: output.url, last_updated: val}, function(err, result) {
                                if(err) throw err;
                                message.channel.send(`Added ${output.title}.`);
                            });
                            db.close();
                        }
                        else{
                            if(res.url == output.url){
                                message.channel.send(`This feed is already stored as ${res.title}.`);
                            }
                            else{
                                message.channel.send("This title is already in use.");
                            }
                            db.close();
                        }
                    }
                );
            });
        });
        return;
    }
    if(message.content.startsWith("!removefeed "))
    {
        if(!hasAccess(message.member))
        {
            message.channel.send("No.");
            return;
        }
        let title = message.content.substring(12);
        MongoClient.connect(mongourl, function(err, db) {
            if(err) throw err;
            let dbo = db.db("bot");
            dbo.collection("feeds").deleteOne({title: title}, function(err, res){
                if(err) throw err;
                if(!res.result.n){
                    message.channel.send(`${title} not found.`);
                    db.close();
                }
                else{
                    message.channel.send(`Deleted ${title}.`);
                    db.close();
                }
            })
            db.close();
        })
        return;
    }

    if(message.content === "!grass")
    {
        message.channel.sendFile('https://cdn.discordapp.com/attachments/433386476978307072/465365510096289792/grass.png');
    }

    if(message.content === "!sfw")
    {
        message.channel.sendFile('https://cdn.discordapp.com/attachments/433386476978307072/465392719234334723/sasuke.png');
    }
    
    if(message.content.startsWith("!embiggen "))
    {   
        let emoji = parseEmoji(message.content);
        message.channel.sendFile(emoji);
    }

    if(message.content === "!start")
    {
        if(!hasAccess(message.member))
        {
            message.channel.send("No.");
            return;
        }
        message.channel.send("\:ok_hand:")
        let interval = setInterval(function() {
            MongoClient.connect(mongourl, function(err, db){
                let dbo = db.db("bot");
                dbo.collection("feeds", function(err, collection){
                    assert.equal(null, err);
                    var cursor = collection.find();
                    cursor.forEach(function(item){
                        let latestEpisode = feeds.checkForUpdate(item.url);
                        latestEpisode.then(function(val) {
                            if(val != item.last_updated){
                                let newEpisode = feeds.latest(item.url);
                                newEpisode.then(function(value) {
                                    client.channels.get("430714070681780244").send(`New episode detected from ${value.title}! ${value.item.link}`);
                                    let updated = { $set: {title: item.title, url: item.url, last_updated: val} };
                                    dbo.collection("feeds").updateOne({title: item.title}, updated, function(err, res) {
                                        if(err) throw err;
                                    })
                                });
                            }
                        });
                    });
                });
            });
        }, 60000);
    }
    

    if(message.content.match(/dick/i) && message.content.match(/I like it/i))
    {
        message.channel.send("bet you do.");
        return;
    }
    if(message.content.match(/dick/i) && !(message.content.toLowerCase() == "dick?")){
        message.channel.send("dick?");
        return;
    }
    if(message.content.toLowerCase() == "dick?"){
        message.channel.send("cock.");
        return;
    }
    if(message.content.match(/^cock$/i) || message.content.match(/^cock.$/i)){
        message.channel.send("ah, dick. I like it.");
        return;
    }
    if(message.content.match(/bet you do.$/i) || message.content.match(/bet you do$/i))
    {
        message.channel.send("nope, it's pussy for me!");
        return;
    }
    if(message.content.match(/pussy for me/i)){
        message.react("465295260306898944");
        return;
    }

});

client.login(settings.token);
