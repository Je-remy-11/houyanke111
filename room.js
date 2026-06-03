function Room(roomInfo, owner) {
    return {
        room_id: roomInfo.roomid || Math.random().toString(36).substring(7),
        bottom: roomInfo.bottom || 10,
        rate: roomInfo.rate,
        owner: owner,
        players: [],
        gold: 0,
        
        jion_player: function(player) {
            this.players.push(player);
        }
    };
}

module.exports = Room;
