import { PlayerStateManager } from '../playerstatemanager';

it('can have a player join', () => { 
    const manager = new PlayerStateManager();
    expect(manager.join('alex')).toEqual(true);
    expect(manager.hasPlayer('alex')).toEqual(true);
});

it('can\'t have a player join twice', () => { 
    const manager = new PlayerStateManager();
    expect(manager.join('alex')).toEqual(true);
    expect(manager.join('alex')).toEqual(false);
});

it ('returns a list of players', () => {
    const manager = new PlayerStateManager();
    expect(manager.join('alex')).toEqual(true);
    expect(manager.players).toEqual(['alex']);
});

it('can kill a player', () => { 
    const manager = new PlayerStateManager();
    expect(manager.join('alex')).toEqual(true);
    expect(manager.kill('alex')).toEqual(true);
    expect(manager.hasPlayer('alex')).toEqual(false);
});

it('can\'t kill an already dead player', () => { 
    const manager = new PlayerStateManager();
    expect(manager.join('alex')).toEqual(true);
    expect(manager.kill('alex')).toEqual(true);
    expect(manager.kill('alex')).toEqual(false);
});