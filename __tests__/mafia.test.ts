import { Game, GameState, ChatEvent, TimeEvent } from '../mafia';

// TODO: can't join twice
// TODO: rate limiting queue
// TODO: move to nighttime and let the killers know they should vote to kill

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

it('joining adds a player to the game', () => { 
    let fakeChatClient = new FakeChatClient();
    const game = new Game("jon", fakeChatClient, "#programmingpeople");
    game.react(new ChatEvent('alex', '!join'))
    game.react(new ChatEvent('ogtega', '!join'))
    expect(fakeChatClient.buffer.includes("Current players: jon, alex, ogtega")).toBe(true)
});


it('fails to start without enough people', () => { 
    let fakeChatClient = new FakeChatClient();
    const game = new Game("jon", fakeChatClient, "#programmingpeople");
    game.react(new ChatEvent('alex', '!join'))
    game.react(new TimeEvent(10000))
    expect(fakeChatClient.buffer.includes("Not enough players to start a game. Must be at least 5!")).toBe(true)
});

it('starts with enough people', () => {
    let fakeChatClient = new FakeChatClient();
    const game = new Game("jon", fakeChatClient, "#programmingpeople");
    game.react(new ChatEvent('alex', '!join'))
    game.react(new ChatEvent('galacticRaven', '!join'))
    game.react(new ChatEvent('ian025', '!join'))
    game.react(new ChatEvent('EzGame247', '!join'))
    game.react(new TimeEvent(10000))
    expect(fakeChatClient.buffer.includes("It's daytime. The evil Kappa s are among you, figure out who you think they are, and type !vote <username> to vote to knock 'em out.")).toBe(true)
});

it('tallies votes', () => {
    let fakeChatClient = new FakeChatClient();
    const game = new Game("jon", fakeChatClient, "#programmingpeople");
    game.react(new ChatEvent('alex', '!join'));
    game.react(new ChatEvent('galacticRaven', '!join'));
    game.react(new ChatEvent('ian025', '!join'));
    game.react(new ChatEvent('EzGame247', '!join'));
    game.react(new TimeEvent(10000));
    game.react(new ChatEvent('alex', '!vote ian025'));
    game.react(new ChatEvent('EzGame247', '!vote ian025'));
    expect(fakeChatClient.buffer).toContain("ian025: 2");
});

it('voting twice means the last vote is the one that counts', () => {
    let fakeChatClient = new FakeChatClient();
    const game = new Game("jon", fakeChatClient, "#programmingpeople");
    game.react(new ChatEvent('alex', '!join'));
    game.react(new ChatEvent('galacticRaven', '!join'));
    game.react(new ChatEvent('ian025', '!join'));
    game.react(new ChatEvent('EzGame247', '!join'));
    game.react(new TimeEvent(10000));
    game.react(new ChatEvent('alex', '!vote ian025'));
    expect(fakeChatClient.buffer).toContain("ian025: 1");
    game.react(new ChatEvent('alex', '!vote jon'));
    expect(fakeChatClient.buffer).toContain("jon: 1");
});

it('cant vote for yourself', () => {
    let fakeChatClient = new FakeChatClient();
    const game = new Game("jon", fakeChatClient, "#programmingpeople");
    game.react(new ChatEvent('alex', '!join'));
    game.react(new ChatEvent('galacticRaven', '!join'));
    game.react(new ChatEvent('ian025', '!join'));
    game.react(new ChatEvent('EzGame247', '!join'));
    game.react(new TimeEvent(10000));
    game.react(new ChatEvent('alex', '!vote alex'));
    expect(fakeChatClient.buffer).toContain("You can't vote for yourself!");
});

// TODO: somebody dies
it('somebody dies after everyone has voted', () => {
    let fakeChatClient = new FakeChatClient();
    const game = new Game("jon", fakeChatClient, "#programmingpeople");
    game.react(new ChatEvent('alex', '!join'));
    game.react(new ChatEvent('galacticRaven', '!join'));
    game.react(new ChatEvent('ian025', '!join'));
    game.react(new ChatEvent('EzGame247', '!join'));
    game.react(new TimeEvent(10000));
    game.react(new ChatEvent('alex', '!vote jon'));
    game.react(new ChatEvent('galacticRaven', '!vote alex'));
    game.react(new ChatEvent('ian025', '!vote alex'));
    game.react(new ChatEvent('EzGame247', '!vote alex'));
    game.react(new ChatEvent('jon', '!vote alex'));
    expect(fakeChatClient.buffer).toContain("alex is dead, may he sheep in peace.");
});

it('somebody dies after time expires');