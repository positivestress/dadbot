const Discord = require('discord.js');
const MongoClient = require('mongodb').MongoClient
const mongourl = "mongodb://localhost:27017/bot";
var XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest;
var DOMParser = require("domparser").DOMParser;
const he = require("he");

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
                            if(err){
                                channel.send("Oops! Something fucked up!");
                                return;
                            }
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
        if(err){
            channel.send("Oops! Something fucked up!");
            return;
        }
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
        if(err){
            channel.send("Oops! Something fucked up!");
            return;
        }
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
                            let embed = new Discord.RichEmbed().setColor(0x9999FF);
                            let podcastTitle = response.getElementsByTagName("channel")[0].getElementsByTagName("title")[0].textContent;
                            let episodeTitle = items[i].getElementsByTagName("title")[0].textContent;
                            let link = items[i].getElementsByTagName("link")[0].textContent;
                            let description = items[i].getElementsByTagName("description")[0].textContent;
                            let image = response.getElementsByTagName("itunes:image")[0].getAttribute("href");
                            if(!image)
                            {
                                let images = response.getElementsByTagName("image");
                                image = findBestImage(images);
                            }
                            description = formatForEmbed(description);
                            description = he.decode(description);
                            embed.setTitle(episodeTitle).setURL(link).setDescription(description).setImage(image);
                            channel.send(`Latest episode of ${podcastTitle}:`);
                            channel.send(embed);
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
        if(err){
            channel.send("Oops! Something fucked up!");
            return;
        }
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
                        if(err){
                            return;
                        }
                        let dbo = db.db("bot");
                        dbo.collection("feeds").findOne({title: title}).then(res => {
                            let newest = items[i].getElementsByTagName("pubDate")[0].textContent;
                            if(newest != res.lastUpdated){
                                channel.send(`New episode of ${title}!`);
                                dbo.collection("feeds").updateOne({title: title}, {$set: {lastUpdated: newest}});
                                let embed = new Discord.RichEmbed().setColor(0x9999FF);
                                let episodeTitle = items[i].getElementsByTagName("title")[0].textContent;
                                let link = items[i].getElementsByTagName("link")[0].textContent;
                                let description = items[i].getElementsByTagName("description")[0].textContent;
                                let image = response.getElementsByTagName("itunes:image")[0].getAttribute("href");
                                if(!image)
                                {
                                    let images = response.getElementsByTagName("image");
                                    image = findBestImage(images);
                                }
                                description = formatForEmbed(description);
                                description = he.decode(description);
                                embed.setTitle(episodeTitle).setURL(link).setDescription(description).setImage(image);
                                channel.send(embed);
                                return;
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

function prepareForFormatting(textContent){
    let output = [];
    let inAnchor = false;
    for(let i = 0; i < textContent.length; i++){
        if(textContent[i] == '<'){
            if(textContent.substring(i, i + 4) == "</a>")
            {
                let section = {type: "anchorEnd"};
                output.push(section);
                i += 3;
                inAnchor = false;
                continue;
            }
            if(textContent.substring(i+1, i+3) != "a " && textContent.substring(i+1, i+3) != "/a"){
                inAnchor = false;
                while(textContent[i] != '>') i++;
                continue;
            }
            inAnchor = true;
            for(let j = i; textContent[j-1] != '"'; j++){
                i++;
            }
            let contents = "";
            for(let j = i; textContent.substring(j, j+2) != '" ' && textContent.substring(j, j+2) != '">'; j++){
                contents += textContent[j];
                i++;
            }
            let section = {type: "anchorLink", text: contents};
            for(let j = i; textContent[j] != '>'; j++){
                i++;
            }
            output.push(section);
            continue;
        }
        let contents = "";
        for(let j = i; textContent[j] != '<' && j < textContent.length; j++){
            contents += textContent[j];
            i++;
        }
        let section = {type: "text", text: contents}
        i--;
        output.push(section);
    }
    for(let i = 0; i < output.length - 1; i++){
        if(output[i].type == "text" && output[i+1].type == "text"){
            output[i].text += output[i+1].text;
            let start = output.slice(0, i+1);
            let end = output.slice(i+2, output.length);
            output = start.concat(end);
        }
    }
    return output;
}

function applyLinksToText(sectioned){
    let output = "";
    for(let i = 0; i < sectioned.length; i++){
        if(sectioned[i].type == "text" && i == 0){
            output += sectioned[i].text;
        }
        else if(sectioned[i].type == "text" && sectioned[i-1].type == "anchorLink"){
            output += '[';
            output += sectioned[i].text;
            output += '](';
            output += sectioned[i-1].text;
            output += ')';
        }
        else if(sectioned[i].type == "text" && sectioned[i-1].type == "anchorEnd"){
            output += sectioned[i].text;
        }
    }
    return output;
}

function findBestImage(images){
    let image;
    for(let i = 0; i < images.length; i++){
        if(images[i].getElementsByTagName("width").length != 0) continue;
        image = images[i].getElementsByTagName("url")[0].textContent;
    }
    return image;
}

function formatForEmbed(textContent){
    let prepared = prepareForFormatting(textContent);
    let formatted = applyLinksToText(prepared);
    return formatted;
}

module.exports.addFeed = addFeed;
module.exports.latest = latest;
module.exports.removeFeed = removeFeed;
module.exports.list = list;
module.exports.checkForUpdates = checkForUpdates;