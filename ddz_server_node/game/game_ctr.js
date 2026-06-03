const Player = require("./player.js")
const Room = require("./room.js")
const config = require("../defines.js")

// 统一错误码定义
const ErrorCode = {
    SUCCESS: 0,
    GOLD_INSUFFICIENT: -1,
    ROOM_NOT_FOUND: -2,
    PARAM_INVALID: -3,
    ROOM_CONFIG_INVALID: -4,
}

var _player_list = []
var _room_info = []

// 辅助函数：统一错误回调格式
function _errorCallback(callback, code, msg, extra) {
    if (callback) {
        callback(code, {
            code: code,
            msg: msg,
            ...(extra || {})
        })
    }
}

// 辅助函数：统一成功回调格式
function _successCallback(callback, data) {
    if (callback) {
        callback(ErrorCode.SUCCESS, data)
    }
}

exports.create_player = function(playInfo, socket, callindex) {
    var player = Player(playInfo, socket, callindex, this)
    _player_list.push(player)
    return player
}

exports.create_room = function(roomInfo, own_player, callback) {
    // 参数防御性校验
    if (!own_player) {
        return _errorCallback(callback, ErrorCode.PARAM_INVALID, "player is null")
    }
    if (!roomInfo || roomInfo.rate === undefined) {
        return _errorCallback(callback, ErrorCode.PARAM_INVALID, "roomInfo or rate is invalid")
    }

    var rateConfig = config.createRoomConfig[roomInfo.rate]
    if (!rateConfig) {
        return _errorCallback(callback, ErrorCode.ROOM_CONFIG_INVALID, "invalid room rate config")
    }

    var needglobal = rateConfig.needCostGold
    console.log("create room needglobal:" + needglobal + ", player gold:" + own_player._gold)

    // 【修复】先校验金币，再创建房间，避免幽灵房间
    if (own_player._gold < needglobal) {
        console.log("create room FAIL: gold insufficient, player:" + own_player._accountID)
        return _errorCallback(callback, ErrorCode.GOLD_INSUFFICIENT, "gold insufficient, need:" + needglobal)
    }

    // 金币校验通过后，才创建房间并加入列表
    var room = Room(roomInfo, own_player)
    _room_info.push(room)
    console.log("create room SUCCESS: roomid=" + room.room_id + ", player:" + own_player._accountID)

    room.jion_player(own_player)

    _successCallback(callback, {
        room: room,
        data: {
            roomid: room.room_id,
            bottom: room.bottom,
            rate: roomInfo.rate
        }
    })
}

// 修复函数名拼写：jion_room -> join_room
// 同时保留旧名称向后兼容
exports.join_room = function(data, player, callback) {
    // 参数防御性校验
    if (!player) {
        return _errorCallback(callback, ErrorCode.PARAM_INVALID, "player is null")
    }
    if (!data || !data.roomid) {
        return _errorCallback(callback, ErrorCode.PARAM_INVALID, "data.roomid is required")
    }

    for (var i = 0; i < _room_info.length; ++i) {
        if (_room_info[i].room_id === data.roomid) {
            _room_info[i].jion_player(player)
            var resp = {
                room: _room_info[i],
                data: {
                    roomid: _room_info[i].room_id,
                    bottom: _room_info[i].bottom,
                    rate: _room_info[i].rate,
                    // gold 字段来自房间对象的 gold 属性 (rate * bottom)，非玩家金币
                    // 如客户端需要玩家金币，应在 player 对象上获取
                    gold: _room_info[i].gold !== undefined ? _room_info[i].gold : 0,
                }
            }
            _successCallback(callback, resp)
            return
        }
    }

    // 房间未找到，返回统一格式错误码
    console.log("join_room FAIL: room not found, roomid=" + data.roomid)
    _errorCallback(callback, ErrorCode.ROOM_NOT_FOUND, "room not found: " + data.roomid, { roomid: data.roomid })
}

// 向后兼容：保留旧拼写名称，内部调用修复后的函数
exports.jion_room = exports.join_room

// 提供获取房间列表长度的接口（用于调试和监控）
exports.get_room_count = function() {
    return _room_info.length
}

exports.get_player_count = function() {
    return _player_list.length
}
