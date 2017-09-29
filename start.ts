var tmi = require("tmi.js");
var storage = require('node-persist');

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

var runAndTellThat = function (message) {
    client.say("#programmingpeople", message);
}

var getYourFate = function() {
    return getRandomInt(1, 20);
}

function voteAnnouncement(votes: Object) {
    var s = [];
    for (var prop in votes) {
        s.push(`${prop} has ${votes[prop]} votes `);
    }
    return s.join(',');
}

var choices = ["big timer bot", "Paintball Buy/Sell/Trade", "Bitcoin miner", "chat game"];
var votes: Map<string, number> = new Map<string, number>()
for (var choice in choices) {
    votes.set(choice, 0);
}
var voted: Array<string> = [];

storage.init().then(function () {
    console.log('storage is init');
    const storedVotes = storage.getItemSync('votes');
    const storedVoted: string[] = storage.getItemSync('voted');
    if (storedVotes) votes = storedVotes;
    if (storedVoted) voted = storedVoted;
    
    client.on("join", function (channel, username, self) {
        if (self) return; // don't announce ourselves
        if (username == "programmingpeople") return; // don't announce the automod

        client.say("#programmingpeople", `what is up ${username}? You need to !roll playa`)
    });

    client.on("message", function (channel, userstate, message, self) {
        if (self) return;

        if (message.startsWith("!roll")) {
            client.say("#programmingpeople", `You rolled a ${getYourFate()}!`);
        }
        if (message.startsWith("!vote")) {
            const name = userstate.username;
            console.log(voted);
            console.log(votes);
            if ((voted as any).find(x => x == name)) {
                console.log("Found this playa");
                return;
            }
            const re = /!vote (\d+)/;
            const match = message.match(re);
            if (!match) return;
            const realDealMatch = message.match(re)[1];
            const choice = parseInt(realDealMatch, 10);
            // Is this a valid choice
            if (!choices[choice - 1]) return;
            // Push the username to voted so they can't vote again
            voted.push(name);
            votes[choices[choice - 1]] = votes[choices[choice - 1]] + 1;
            // Save to localStorage
            storage.setItem('votes', votes);
            storage.setItem('voted', voted);
            runAndTellThat(`${name} voted, ${voteAnnouncement(votes)}`);
            console.log(votes);
        }
        if (message.startsWith("!choices")) {
            runAndTellThat("1: big timer bot, 2: Paintball Buy/Sell/Trade, 3: Bitcoin miner, 4: chat game");
        }
    });
})