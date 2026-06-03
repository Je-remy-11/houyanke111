function Player(playInfo, socket, callindex, manager) {
    return {
        _gold: playInfo.gold || 0,
        socket: socket,
        callindex: callindex,
        manager: manager,
        name: playInfo.name || "Unknown"
    };
}

module.exports = Player;
