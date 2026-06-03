const Player = require("./player.js")
const Room = require("./room.js")
const config = require("../defines.js")

var _player_list = []
var _room_info = []

var ERROR_CODE = {
    INVALID_ROOM_INFO: -1001,
    INVALID_PLAYER: -1002,
    INSUFFICIENT_GOLD: -1003,
    ROOM_CREATE_FAILED: -1004,
    INVALID_JOIN_DATA: -1005,
    ROOM_NOT_FOUND: -1006,
    ROOM_FULL: -1007,
}

var createError = function(code, msg, extra){
    var error = {
        code: code,
        msg: msg,
    }

    if (extra && typeof extra === "object") {
        for (var key in extra) {
            error[key] = extra[key]
        }
    }

    return error
}

var getRoomConfig = function(rate){
    if (rate === undefined || rate === null) {
        return null
    }

    return config.createRoomConfig[String(rate)] || null
}

var findRoomById = function(roomid){
    for (var i = 0; i < _room_info.length; ++i) {
        if (_room_info[i].room_id === roomid) {
            return _room_info[i]
        }
    }

    return null
}

var removeRoomById = function(roomid){
    for (var i = 0; i < _room_info.length; ++i) {
        if (_room_info[i].room_id === roomid) {
            _room_info.splice(i, 1)
            return true
        }
    }

    return false
}

var buildRoomResponse = function(room){
    var data = {
        roomid: room.room_id,
        bottom: room.bottom,
        rate: room.rate,
    }

    if (typeof room.gold !== "undefined") {
        data.gold = room.gold
    }

    return {
        room: room,
        data: data,
    }
}

var isPlayerAlreadyInRoom = function(room, player){
    if (!room || !room._player_list || !player) {
        return false
    }

    for (var i = 0; i < room._player_list.length; ++i) {
        if (room._player_list[i] && room._player_list[i]._accountID === player._accountID) {
            return true
        }
    }

    return false
}

exports.create_player = function(playInfo, socket, callindex){
    var player = Player(playInfo, socket, callindex, this)
    _player_list.push(player)
}

exports.create_room = function(roomInfo, own_player, callback){
    var roomConfig = roomInfo ? getRoomConfig(roomInfo.rate) : null

    if (!own_player) {
        if (callback) {
            callback(createError(ERROR_CODE.INVALID_PLAYER, "create room failed: player is empty"), null)
        }
        return
    }

    if (!roomInfo || !roomConfig) {
        if (callback) {
            callback(createError(ERROR_CODE.INVALID_ROOM_INFO, "create room failed: invalid room config", { rate: roomInfo && roomInfo.rate }), null)
        }
        return
    }

    var needGold = roomConfig.needCostGold
    console.log("create room needglobal:" + needGold)

    if (typeof own_player._gold !== "number" || own_player._gold < needGold) {
        if (callback) {
            callback(createError(ERROR_CODE.INSUFFICIENT_GOLD, "create room failed: gold not enough", { needGold: needGold, currentGold: own_player._gold }), null)
        }
        return
    }

    var room = null
    var originalGold = own_player._gold

    try {
        own_player._gold -= needGold
        room = Room(roomInfo, own_player)

        if (!room || typeof room.jion_player !== "function") {
            throw new Error("invalid room instance")
        }

        room.jion_player(own_player)
        _room_info.push(room)

        if (callback) {
            callback(null, buildRoomResponse(room))
        }
    } catch (err) {
        own_player._gold = originalGold

        if (room && room.room_id) {
            removeRoomById(room.room_id)
        }

        if (callback) {
            callback(createError(ERROR_CODE.ROOM_CREATE_FAILED, "create room failed: " + err.message), null)
        }
    }
}

exports.join_room = function(data, player, callback){
    if (!player) {
        if (callback) {
            callback(createError(ERROR_CODE.INVALID_PLAYER, "join room failed: player is empty"), null)
        }
        return
    }

    if (!data || typeof data.roomid !== "string" || data.roomid.trim() === "") {
        if (callback) {
            callback(createError(ERROR_CODE.INVALID_JOIN_DATA, "join room failed: roomid is empty"), null)
        }
        return
    }

    var roomid = data.roomid.trim()
    var room = findRoomById(roomid)

    if (!room) {
        if (callback) {
            callback(createError(ERROR_CODE.ROOM_NOT_FOUND, "join room failed: room " + roomid + " not found", { roomid: roomid }), null)
        }
        return
    }

    if (isPlayerAlreadyInRoom(room, player)) {
        if (callback) {
            callback(null, buildRoomResponse(room))
        }
        return
    }

    if (room._player_list && room._player_list.length >= config.roomFullPlayerCount) {
        if (callback) {
            callback(createError(ERROR_CODE.ROOM_FULL, "join room failed: room is full", { roomid: roomid }), null)
        }
        return
    }

    try {
        room.jion_player(player)
        if (callback) {
            callback(null, buildRoomResponse(room))
        }
    } catch (err) {
        if (callback) {
            callback(createError(ERROR_CODE.INVALID_JOIN_DATA, "join room failed: " + err.message, { roomid: roomid }), null)
        }
    }
}

exports.jion_room = exports.join_room

exports.__getRoomInfo = function(){
    return _room_info.slice()
}

exports.__resetForTests = function(){
    _player_list = []
    _room_info = []
}

exports.__ERROR_CODE = ERROR_CODE
