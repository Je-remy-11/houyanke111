const Player = require("./player.js")
const Room = require("./room.js")
const config = require("../defines.js")

var _player_list = []
var _room_info = []

exports.create_player = function(playInfo, socket, callindex) {
    var player = Player(playInfo, socket, callindex, this)
    _player_list.push(player)
}

exports.create_room = function(roomInfo, own_player, callback) {
    if (!own_player || !roomInfo || !roomInfo.rate) {
        if (callback) {
            callback({ code: -2, msg: "参数错误" })
        }
        return
    }

    var needglobal = config.createRoomConfig[roomInfo.rate]?.needCostGold || 0
    console.log("[create_room] needCostGold:" + needglobal + ", playerGold:" + own_player._gold)

    if (own_player._gold < needglobal) {
        console.log("[create_room] 金币不足，拒绝创建房间")
        if (callback) {
            callback({ code: -1, msg: "金币不足" })
        }
        return
    }

    var room = Room(roomInfo, own_player)
    _room_info.push(room)
    console.log("[create_room] 房间已创建，room_id:" + room.room_id)

    room.jion_player(own_player)
    if (callback) {
        callback({
            code: 0,
            msg: "创建成功",
            room: room,
            data: {
                roomid: room.room_id,
                bottom: room.bottom,
                rate: roomInfo.rate
            }
        })
    }
}

exports.join_room = function(data, player, callback) {
    if (!data || !data.roomid || !player) {
        console.log("[join_room] 参数错误")
        if (callback) {
            callback({ code: -2, msg: "参数错误" })
        }
        return
    }

    console.log("[join_room] 尝试加入房间:" + data.roomid)

    for (var i = 0; i < _room_info.length; ++i) {
        if (_room_info[i].room_id === data.roomid) {
            console.log("[join_room] 找到房间:" + data.roomid + ", 玩家加入")
            _room_info[i].jion_player(player)
            if (callback) {
                var resp = {
                    code: 0,
                    msg: "加入成功",
                    room: _room_info[i],
                    data: {
                        roomid: _room_info[i].room_id,
                        bottom: _room_info[i].bottom,
                        rate: _room_info[i].rate
                    }
                }
                if (_room_info[i].gold !== undefined) {
                    resp.data.gold = _room_info[i].gold
                }
                callback(resp)
            }
            return
        }
    }

    console.log("[join_room] 未找到房间:" + data.roomid)
    if (callback) {
        callback({ code: -3, msg: "未找到房间:" + data.roomid })
    }
}

exports.jion_room = exports.join_room

exports.get_room_count = function() {
    return _room_info.length
}

exports.clear_rooms = function() {
    _room_info = []
}
