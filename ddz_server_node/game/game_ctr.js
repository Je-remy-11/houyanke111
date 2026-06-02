const Player = require("./player.js")
const Room = require("./room.js")
const config = require("../defines.js")

var _player_list = []
var _room_info = []

const ERROR_CODE = {
    INVALID_ROOM_INFO: -1001,
    INVALID_PLAYER: -1002,
    INVALID_RATE: -1003,
    GOLD_NOT_ENOUGH: -1004,
    ROOM_NOT_FOUND: -1005,
    ROOM_FULL: -1006,
    CREATE_ROOM_FAILED: -1007,
    PLAYER_ALREADY_IN_ROOM: -1008,
}

const createError = function(code, msg, data){
    return {
        code: code,
        msg: msg,
        data: data || null,
    }
}

const buildRoomResponseData = function(room){
    var data = {
        roomid: room.room_id,
        bottom: room.bottom,
        rate: room.rate,
    }

    if (typeof room.gold !== "undefined"){
        data.gold = room.gold
    }

    return data
}

const getRoomConfig = function(rate){
    return config.createRoomConfig[String(rate)]
}

const getRoomById = function(roomid){
    for (var i = 0; i < _room_info.length; ++i){
        if (_room_info[i].room_id === roomid){
            return _room_info[i]
        }
    }

    return null
}

const isPlayerInRoom = function(room, player){
    if (!room || !room._player_list || !player){
        return false
    }

    for (var i = 0; i < room._player_list.length; ++i){
        if (room._player_list[i]._accountID === player._accountID){
            return true
        }
    }

    return false
}

const isRoomFull = function(room){
    if (!room || !room._player_list){
        return false
    }

    return room._player_list.length >= config.roomFullPlayerCount
}

exports.create_player = function(playInfo,socket,callindex){
    var player = Player(playInfo,socket,callindex,this)
    _player_list.push(player)
}

exports.create_room = function(roomInfo,own_player,callback){
    if (!own_player){
        if (callback){
            callback(createError(ERROR_CODE.INVALID_PLAYER,"create room failed: player is required"),null)
        }
        return
    }

    var roomConfig = roomInfo ? getRoomConfig(roomInfo.rate) : null
    if (!roomInfo || !roomConfig){
        if (callback){
            callback(createError(ERROR_CODE.INVALID_RATE,"create room failed: invalid rate",{
                rate: roomInfo ? roomInfo.rate : undefined,
            }),null)
        }
        return
    }

    if (own_player._room){
        if (callback){
            callback(createError(ERROR_CODE.PLAYER_ALREADY_IN_ROOM,"create room failed: player already in room",{
                roomid: own_player._room.room_id,
            }),null)
        }
        return
    }

    var needglobal = roomConfig.needCostGold
    console.log("[game_ctr][create_room] accountid:%s rate:%s needgold:%s currentgold:%s", own_player._accountID, roomInfo.rate, needglobal, own_player._gold)

    if (own_player._gold < needglobal){
        if (callback){
            callback(createError(ERROR_CODE.GOLD_NOT_ENOUGH,"create room failed: gold not enough",{
                rate: roomInfo.rate,
                needGold: needglobal,
                currentGold: own_player._gold,
            }),null)
        }
        return
    }

    own_player._gold -= needglobal

    var room = null
    try{
        room = Room(roomInfo,own_player)
        room.jion_player(own_player)
        _room_info.push(room)
    }catch (error){
        own_player._gold += needglobal
        console.log("[game_ctr][create_room] create failed:%s", error && error.stack ? error.stack : error)
        if (callback){
            callback(createError(ERROR_CODE.CREATE_ROOM_FAILED,"create room failed: internal error",{
                rate: roomInfo.rate,
                reason: error ? error.message : "unknown error",
            }),null)
        }
        return
    }

    if (callback){
        callback(null,{
            room:room,
            data:buildRoomResponseData(room),
        })
    }
}

exports.join_room = function(data,player,callback){
    if (!player){
        if (callback){
            callback(createError(ERROR_CODE.INVALID_PLAYER,"join room failed: player is required"),null)
        }
        return
    }

    if (!data || !data.roomid){
        if (callback){
            callback(createError(ERROR_CODE.INVALID_ROOM_INFO,"join room failed: roomid is required",{
                roomid: data ? data.roomid : undefined,
            }),null)
        }
        return
    }

    var roomid = String(data.roomid)
    var room = getRoomById(roomid)

    if (!room){
        if (callback){
            callback(createError(ERROR_CODE.ROOM_NOT_FOUND,"join room failed: room " + roomid + " not found",{
                roomid: roomid,
            }),null)
        }
        return
    }

    if (player._room && player._room.room_id !== roomid){
        if (callback){
            callback(createError(ERROR_CODE.PLAYER_ALREADY_IN_ROOM,"join room failed: player already in room " + player._room.room_id,{
                roomid: player._room.room_id,
                targetRoomid: roomid,
            }),null)
        }
        return
    }

    if (isPlayerInRoom(room, player)){
        if (callback){
            callback(null,{
                room: room,
                data: buildRoomResponseData(room),
            })
        }
        return
    }

    if (isRoomFull(room)){
        if (callback){
            callback(createError(ERROR_CODE.ROOM_FULL,"join room failed: room is full",{
                roomid: roomid,
                playerCount: room._player_list.length,
                limit: config.roomFullPlayerCount,
            }),null)
        }
        return
    }

    room.jion_player(player)
    if(callback){
        callback(null,{
            room:room,
            data:buildRoomResponseData(room),
        })
    }
}

exports.jion_room = exports.join_room

exports.__test__ = {
    resetState: function(){
        _player_list.length = 0
        _room_info.length = 0
    },
    getRooms: function(){
        return _room_info.slice()
    },
    getPlayers: function(){
        return _player_list.slice()
    },
    ERROR_CODE: ERROR_CODE,
}
