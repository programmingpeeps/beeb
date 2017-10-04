// Game is a mafia game

export class Game {
    players: Array<string>;
    chatClient: any;
    channel: string;
    started: boolean;

    constructor(initiator: string, chatClient: any, channel: string) {
        this.players = [initiator];
        this.chatClient = chatClient;
        this.channel = channel;
        this.chatClient.say(channel, "The game has started. Type !join to join the game.")
        this.reportPlayers();
        this.started = true;
    }

    inProgress() {
        return this.started;
    }

    reportPlayers() {
        this.chatClient.say(this.channel, `Current players: ${this.players.join(', ')}`)
    }
}
