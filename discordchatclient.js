const EventEmitter = require("events");
const Discord = require("discord.js");
const token = process.env.BEEB_DISCORD_TOKEN;
const clientId = process.env.BEEB_DISCORD_CLIENT_ID;
const discordClient = new Discord.Client();

// actions:
// * say to the channel
// * whisper to a person

// events:
// * when someone whispers the bot
// * when someone says something in the channel

class DiscordChatClient extends EventEmitter {
  constructor(endpoint, room) {
    super();

    discordClient.on("ready", () => {
      console.log(`Logged in as ${discordClient.user.tag}!`);
      this.channel = discordClient.channels.get("413897567756222464");
      this.DMs = {};
    });

    discordClient.on("message", msg => {
      const userstate = { username: msg.author.username };
      if (msg.content === "ping") {
        msg.reply(`Pong! Your ping is ${Date.now() - msg.createdTimestamp}ms`);
      } else if (msg.content === "!montell") {
        msg.reply(`https://youtu.be/0hiUuL5uTKc`);
      } else {
        this.emit("message", "lobby", userstate, msg.content, null);
      }
    });
  }

  connect() {
    discordClient.login(token);
  }

  whisper(username, message) {
    console.log(`getting whisper command to ${username} ${message}`);
    var member = this.channel.guild.members.find((m) => {
        return m.user.username == username;
    });
    console.log(member);
    if (!this.DMs[member]) {
      member.createDM().then(channel => {
        this.DMs[member] = channel;
        channel.send(message);
      });
    } else {
      this.DMs[member].send(message);
    }
  }

  say(channel, message) {
    this.channel.send(message);
    console.log(`getting say command ${message} to ${channel}`);
  }
}

export default DiscordChatClient;
