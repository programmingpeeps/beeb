import { Game } from '../mafia';

class FakeChatClient {
    buffer: Array<string>;

    constructor() {
        this.buffer = [];
    }

    say(channel, message) {
        this.buffer.push(message);
    }
};

it('starts with the initiator as a player', () => { 
    let fakeChatClient = new FakeChatClient();
    const game = new Game("jon", fakeChatClient, "#programmingpeople");
    expect(fakeChatClient.buffer.includes("Current players: jon")).toBe(true)
});