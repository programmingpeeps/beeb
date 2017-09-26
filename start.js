var tmi = require("tmi.js");

var options = {
    options: {
        debug: true
    },
    connection: {
        reconnect: true
    },
    identity: {
        username: "beebthebot",
        password: process.env.BEEB_TWITCH_OAUTH
    },
    channels: ["#programmingpeople"]
};

var client = new tmi.client(options);

// Connect the client to the server..
client.connect();

function getRandomInt(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min)) + min; //The maximum is exclusive and the minimum is inclusive
}

client.on("join", function (channel, username, self) {
    if (self) return; // don't announce ourselves
    if (username == "programmingpeople") return; // don't announce the automod

    client.say("#programmingpeople", `what is up ${username}`)
});

client.on("message", function (channel, userstate, message, self) {
    if (self) return;

    if (message.startsWith("!roll")) {
        client.say("#programmingpeople", `You rolled a ${getRandomInt(1, 20)}!`);
    }
});
