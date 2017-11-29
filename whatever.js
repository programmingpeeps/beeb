const WebSocket = require("ws");
const EventEmitter = require("events");
const { Socket } = require("phoenix-channels");

class PhoenixClient extends EventEmitter {
  constructor(endpoint, room) {
    super();
    let socket = new Socket("ws://localhost:4000/socket", {
      params: { user: "bot" }
    });
    socket.connect();
    this.channel = socket.channel("room:lobby", {});
    this.whisperChannel = socket.channel("room:bot", {});
    this.whisperChannel.join();
    this.whisperChannel.on("dm_msg", payload => {
      const userstate = { username: payload.user };
      this.emit("whisper", payload.user, userstate, payload.message, null);
    });
  }

  connect() {
    this.channel
      .join()
      .receive("ok", resp => {
        console.log("Joined successfully", resp);
      })
      .receive("error", resp => {
        console.log("Unable to join", resp);
      });
    this.channel.on("new_msg", payload => {
      const userstate = { username: payload.user };
      this.emit("message", "lobby", userstate, payload.message, null);
    });
  }

  whisper(username, message) {
    this.channel.push("dm_msg", { to: username, message: message });
  }

  say(room, message) {
    this.channel.push("new_msg", { body: message });
  }
}

export default PhoenixClient;

/*
var client = new PhoenixClient("", "");
client.say("lebron", "testing123")
client.whisper("test", "a private message")

client.on("message", (channel, userstate, message, self) => {
  console.log(channel)
  console.log(userstate)
  console.log(message)
})
*/

/*
whisper (username, message)
say (room, message)

callbacks for .on("whisper", function(from, userstate, message, self))
  .on("message", function (channel, userstate, message, self))
*/
