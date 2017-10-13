import PlayerStateManager, { PlayerRole } from '../playerstatemanager';

it('can have a player join', () => { 
    const manager = new PlayerStateManager();
    expect(manager.join('alex')).toEqual(true);
    expect(manager.hasPlayer('alex')).toEqual(true);
});

it('can\'t have a player join twice', () => { 
    const manager = new PlayerStateManager();
    expect(manager.join('alex')).toEqual(true);
    expect(manager.join('alex')).toEqual(false);
    expect(manager.getPlayers()).toHaveLength(1);
});

it ('returns a list of players', () => {
    const manager = new PlayerStateManager();
    expect(manager.join('alex')).toEqual(true);
    expect(manager.getPlayers()).toHaveLength(1);
    expect(manager.getPlayers()[0].user).toEqual('alex');
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

it('assignRoles preserves role assignments', () => {
    const manager = new PlayerStateManager();
    const defaultPlayers: Map<string, PlayerRole> = new Map([
        ['alex', PlayerRole.Mafia], 
        ['jon', PlayerRole.Mafia],
        ['ogtega', PlayerRole.Sheep],
        ['galacticRaven', PlayerRole.Sheep],
        ['ian025', PlayerRole.Sheep],
        ['h0h0h0', PlayerRole.Sheep]
    ]);
    manager.setPlayers(defaultPlayers);
    manager.assignRoles();
    expect(manager.getMafiosos().find(m => m.user == 'alex')).toBeDefined();
    expect(manager.getSheeple().find(m => m.user == 'h0h0h0')).toBeDefined();
});

it('can assign roles', () => {
    const manager = new PlayerStateManager();
    expect(manager.join('alex')).toEqual(true);
    expect(manager.join('Pantsforbirds')).toEqual(true);
    expect(manager.join('greysal')).toEqual(true);
    expect(manager.join('binaryslothtree')).toEqual(true);
    expect(manager.join('MeThudZ_LoL')).toEqual(true);
    manager.assignRoles();
    expect(manager.getMafiosos()).toHaveLength(2);
    expect(manager.getSheeple()).toHaveLength(3);
});