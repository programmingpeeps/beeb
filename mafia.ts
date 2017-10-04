// Game is a mafia game

// lfp - Looking for players. Game has just been started.
// day - We're waiting for people to vote to kill a mobster
// night - We're waiting for mobsters to kill people
const enum GameState {
    LookingForPlayers,
    DayTime,
    NightTime
}

const lookingForPlayersWindow = 10; // in seconds

export class Game {
    players: Array<string>;
    chatClient: any;
    channel: string;
    state: GameState;
    initiator: string;

    constructor(initiator: string, chatClient: any, channel: string) {
        this.initiator = initiator;
        this.players = [initiator];
        this.chatClient = chatClient;
        this.channel = channel;
        this.transition(GameState.LookingForPlayers);
    }

    reportPlayers() {
        this.chatClient.say(this.channel, `Current players: ${this.players.join(', ')}`)
    }

    userJoined(username: string) {
        if (!this.players.includes(username)) {
          this.players.push(username);
        }
        this.reportPlayers();
    }

    lookingForPlayersStarted() {
        setTimeout(() => this.transition(GameState.NightTime), lookingForPlayersWindow * 1000);
        this.chatClient.say(this.channel, "The game has started. Type !join to join the game.")
        this.reportPlayers();
    }

    dayTimeStarted() {
        // TODO: Assign roles randomly.
        this.chatClient.say(this.channel, "Day time has started.")
    }

    nightTimeStarted() {
        if (this.players.length < 4) {
          this.chatClient.say(this.channel, "We need at least 4 people for a game. Sorry, this game is now cancelled!");
          return;
        }

        this.chatClient.say(this.channel, "Night time has started.")
    }

    transition(state: GameState) {
        this.state = state;
        switch (this.state) {
            case GameState.LookingForPlayers:
                this.lookingForPlayersStarted();
                break;
            case GameState.DayTime:
                this.dayTimeStarted();
                break;
            case GameState.NightTime:
                this.nightTimeStarted();
                break;
        }
    }
}
