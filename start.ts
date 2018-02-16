var tmi = require("tmi.js");
var storage = require('node-persist');
import { Game, ChatEvent, TimeEvent, WhisperEvent } from './mafia';
import * as Collections from 'typescript-collections';
import PhoenixClient from './phoenixchatclient.js';
import DiscordChatClient from './discordchatclient';

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

export class DelayedChatEvent {
    action: string;
    to: string;
    message: string;

    constructor(action: string, to: string, message: string) {
        this.action = action;
        this.to = to;
        this.message = message;
    }
}

export class DelayedChatClient {
    // We need to have a queue for sending and whispering messages
    // so that we don't blow everything up 
    queue: Collections.Queue<DelayedChatEvent>;
    client: any;

    constructor(chatClient: any) {
        this.client = chatClient;
        this.queue = new Collections.Queue<DelayedChatEvent>();
        setInterval(() => {
            if (!this.queue.isEmpty()) {
                console.log(this.queue);
                const event = this.queue.dequeue();
                if (event.action == 'whisper') {
                    console.log(`whispering ${event.to}`);
                    this.client.whisper(event.to, event.message);
                } else {
                    console.log('saying');
                    this.client.say(event.to, event.message);
                }
            }
        }, 3000);
    }

    whisper(username: string, message: string) {
        console.log(`getting whisper command to ${username} ${message}`);
        this.queue.enqueue(new DelayedChatEvent('whisper', username, message));
    }

    say(channel: string, message: string) {
        console.log(`getting say command ${message} to ${channel}`);
        this.queue.enqueue(new DelayedChatEvent('say', channel, message));
    }
};

var client = new DiscordChatClient("", "");

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

var choices = ["mafia chat bot", "Paintball Buy/Sell/Trade", "Bitcoin miner"];
var votes: Map<string, number> = new Map<string, number>()
for (var choice of choices) {
    votes.set(choice, 0);
}
var voted: Array<string> = [];

var game = null;

storage.init().then(function () {
    console.log('storage is init');
    const storedVotes = storage.getItemSync('votes');
    const storedVoted: string[] = storage.getItemSync('voted');
    if (storedVotes) votes = storedVotes;
    if (storedVoted) voted = storedVoted;

    // We don't currently support whispering the bot,
    // not sure if we really need it anyway
    client.on("whisper", function (from, userstate, message, self) {
        if (self) return;

        console.log(`${from} ${userstate} ${message}`)
    
        if (message.startsWith("!")) {
            if (game) {
                game.react(new WhisperEvent(from, message));
            }
        }
    });
    
    client.on("message", function (channel, userstate, message, self) {
        if (self) return;

        if (message.startsWith("!choices"))
            return runAndTellThat("1: mafia chat bot, 2: Paintball Buy/Sell/Trade, 3: Bitcoin miner");

        if (message.startsWith("!test")) {
            client.whisper(userstate.username, 'test');
            return;
        }

        if (message.startsWith("!roll")) {
            client.say("#programmingpeople", `You rolled a ${getYourFate()}!`);
            return;
        }

        if (message.startsWith("!start")) {
            if (game) {
              runAndTellThat(`Sorry ${userstate.username}, we already have a game going! Type !join to join.`)
            } else {
              game = new Game(userstate.username, client, channel);
              let totalTime = 0;
              // bmallred is a baller let's get it
              setInterval(() => {
                  totalTime += 10000;
                  game.react(new TimeEvent(totalTime));
              }, 10000);
            }
            return;
        }

        if (message.startsWith("!")) {
            if (game) {
                game.react(new ChatEvent(userstate.username, message));
            }
            return;
        }
    });

})

function handleVote(message, userstate) {
    const name = userstate.username;
    console.log("voted: " + voted);
    console.log("votes: " + votes);
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