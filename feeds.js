const Discord = require('discord.js');
const client = new Discord.Client();
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
                            dbo.collection("feeds").findOne({title: toAdd.title}).then(res => {
                                if(res){
                                    channel.send(`The title "${toAdd.title}" is already in use.`);
                                    return;
                                }
                                else{
                                    dbo.collection("feeds").insert(toAdd);
                                    channel.send(`Successfully added ${toAdd.title}.`);
                                    return;
                                }
                            });
                        });
                        break;
                    }
                }
            }
        }
        xhttp.open("GET", toAdd.url);
        xhttp.send();
    }
    catch(err) { channel.send("Failed to add feed. Make sure you are using a valid RSS feed URL."); return; }
}

function latest(title, channel){
    MongoClient.connect(mongourl, (err, db) => {
        let dbo = db.db("bot");
        dbo.collection("feeds").findOne({title: title})
        .then(response => { 
            let url = response.url;
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
    result.title = message.substring(0, space);
    result.url = message.substring(space + 1);
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

async function verify(url)
{
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
                            dbo.collection("feeds").insert();
                        });
                        channel.send(`Successfully added ${toAdd.title}.`);
                    }
                }
            }
        }
        xhttp.open("GET", url);
        xhttp.send();
    }
    catch(err) { return false; }
}

module.exports.addFeed = addFeed;
module.exports.latest = latest;