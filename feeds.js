const Parser = require('rss-parser');
const parser = new Parser();
const MongoClient = require('mongodb').MongoClient
const mongourl = "mongodb://localhost:27017/bot";
const assert = require('assert');

function connect()
{
    console.log("connected!");
}

async function checkForUpdate(url)
{
    let feed = await parser.parseURL(url);
    if(feed.items[0].enclosure)
        return feed.items[0].isoDate;
    else return feed.items[1].isoDate;
}

async function latest(url)
{
    let feed = await parser.parseURL(url);
    let result = {};
    result.title = feed.title;
    if(feed.items[0].enclosure)
        result.item = feed.items[0];
    else result.item = feed.items[1];
    return result;
};

async function verify(url)
{
    try
    {
        let episode = await latest(url);
        return episode.item.isoDate;
    }
    catch (err) { return false; }
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

async function list()
{
    let result = [];
    result = await getAllFeeds();
    return result;
}

async function getAllFeeds()
{
    var result = [];
    MongoClient.connect(mongourl, function(err, db) {
        let dbo = db.db("bot");
        dbo.collection("feeds", function(err, collection) {
            // assert.equal("null, err");
            var cursor = collection.find();
            cursor.forEach(function(item) {
                let thisItem = {};
                // thisItem.name = item.name; DOES NOT WORK YET
                thisItem.title = item.title;
                thisItem.url = item.url;
                result.push(thisItem);
            });
        });
    });
    return await result;
}

module.exports.checkForUpdate = checkForUpdate;
module.exports.latest = latest;
module.exports.connect = connect;
module.exports.verify = verify;
module.exports.parseAdd = parseAdd;
module.exports.list = list;
