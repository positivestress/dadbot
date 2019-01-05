const Discord = require('discord.js');
const MongoClient = require('mongodb').MongoClient
const mongourl = "mongodb://localhost:27017/bot";
var XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest;
var DOMParser = require("domparser").DOMParser;

var xhttp = new XMLHttpRequest();
var parser = new DOMParser();

function addFeed(input, channel)
{
    let toAdd = parseAdd(input);
    if(!toAdd){
        channel.send("Failed to add feed. Make sure your request is in the format: \"!addfeed title url\".");
        return;
    }
    try{
        xhttp.onreadystatechange = function(){
            if(this.readyState == 4 && this.status == 200)
            {
                let response = parser.parseFromString(this.responseText);
                let items = response.getElementsByTagName("item");
                for(let i = 0; i < items.length; i++){
                    if(isEpisode(items[i]))
                    {
                        MongoClient.connect(mongourl, (err, db) => {
                            let dbo = db.db("bot");
                            dbo.collection("feeds").findOne({slug: toAdd.slug}).then(res => {
                                if(res){
                                    channel.send(`The name "${toAdd.slug}" is already in use.`);
                                    return;
                                }
                                else{
                                    toAdd.link = response.getElementsByTagName("channel")[0].getElementsByTagName("link")[0].textContent;
                                    toAdd.title = response.getElementsByTagName("channel")[0].getElementsByTagName("title")[0].textContent;
                                    toAdd.lastUpdated = items[i].getElementsByTagName("pubDate")[0].textContent;
                                    dbo.collection("feeds").insert(toAdd);
                                    channel.send(`Successfully added ${toAdd.slug}.`);
                                    return;
                                }
                            });
                        });
                        break;
                    }
                }
            }
        }
        xhttp.open("GET", toAdd.feedURL);
        xhttp.send();
    }
    catch(err) { channel.send("Failed to add feed. Make sure you are using a valid RSS feed URL."); return; }
}

function removeFeed(input, channel){
    MongoClient.connect(mongourl, (err, db) => {
        let dbo = db.db("bot");
        dbo.collection("feeds").findOne({slug: input})
        .then(response => {
            if(!response) channel.send(`There is no feed with the title "${input}".`);
            else{
                dbo.collection("feeds").remove({slug: input});
                channel.send("Feed removed.");
            }
        });
    });
}

function latest(slug, channel){
    MongoClient.connect(mongourl, (err, db) => {
        let dbo = db.db("bot");
        dbo.collection("feeds").findOne({slug: slug})
        .then(response => { 
            if(!response){
                channel.send(`There is no feed with the title "${slug}".`);
                return;
            }
            let url = response.feedURL;
            xhttp.onreadystatechange = function(){
                if(this.readyState == 4 && this.status == 200){
                    let response = parser.parseFromString(this.responseText);
                    let items = response.getElementsByTagName("item");
                    for(let i = 0; i < items.length; i++){
                        if(isEpisode(items[i])){
                            let result = items[i].getElementsByTagName("link")[0].textContent;
                            channel.send(result);
                            return;
                        }
                    }
                }
            }
            xhttp.open("GET", url);
            xhttp.send();
        });
    });
}

function list(channel){
    MongoClient.connect(mongourl, (err, db) => {
        let dbo = db.db("bot");
        let output = "";
        let embed = new Discord.RichEmbed().setColor(0x9999FF).setTitle("Podcasts");
        dbo.collection("feeds").find().forEach(item => {
            output += `\`${item.slug}\` - **[${item.title}](${item.link})**\n`;
        }).then(() => {
            embed.setDescription(output);
            channel.send(embed);
        });
    });
}

function checkForUpdates(channel){
    let requests = [];
    let check = function(){
        if(this.readyState == 4 && this.status == 200)
        {
            let response = parser.parseFromString(this.responseText);
            let title = response.getElementsByTagName("channel")[0].getElementsByTagName("title")[0].textContent;
            let items = response.getElementsByTagName("item");
            for(let i = 0; i < items.length; i++){
                if(isEpisode(items[i]))
                {
                    MongoClient.connect(mongourl, (err, db) => {
                        let dbo = db.db("bot");
                        dbo.collection("feeds").findOne({title: title}).then(res => {
                            let newest = items[i].getElementsByTagName("pubDate")[0].textContent;
                            if(newest != res.lastUpdated){
                                let episodeLink = items[i].getElementsByTagName("link")[0].textContent;
                                channel.send(`New episode of ${title}! ${episodeLink}`);
                                dbo.collection("feeds").updateOne({title: title}, {$set: {lastUpdated: newest}});
                            }
                        });
                    });
                    break;
                }
            }
        }
    }
    MongoClient.connect(mongourl, (err, db) => {
        let dbo = db.db("bot");
        dbo.collection("feeds").find().forEach(item => {
            var request = new XMLHttpRequest();
            request.open("GET", item.feedURL);
            request.onreadystatechange = check;
            requests.push(request);
        }).then(() => {
            requests.forEach(req => {
                req.send();
            });
        });
    });
}

function parseAdd(message)
{
    let result = {};
    let space;
    for(var i = 0; i < message.length; i++)
    {
        if(message[i] == ' ')
        {
            space = i;
            break;
        }
    }
    if(i == message.length) return false;
    result.slug = message.substring(0, space);
    result.feedURL = message.substring(space + 1);
    return result;
}

function isEpisode(item)
{
    let categories = item.getElementsByTagName("category");
    if(categories.length == 0) return true;
    for(let i = 0; i < categories.length; i++)
    {
        if(categories[i].textContent == "Episodes") return true;
    }
    return false;
}

module.exports.addFeed = addFeed;
module.exports.latest = latest;
module.exports.removeFeed = removeFeed;
module.exports.list = list;
module.exports.checkForUpdates = checkForUpdates;