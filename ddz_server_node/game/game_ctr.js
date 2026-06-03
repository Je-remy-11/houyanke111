const Player = require("./player.js")
const Room = require("./room.js")
const config = require("../defines.js")

var _player_list = []
var _room_info = []

// 1. 定义标准错误码，确保与客户端协议一致
const ERROR_CODE = {
    SUCCESS: 0,
    INSUFFICIENT_GOLD: -1,
    ROOM_NOT_FOUND: -2,
    PARAMS_ERROR: -3,
    SERVER_ERROR: -4
};

exports.create_player = function(playInfo, socket, callindex){
    var player = Player(playInfo, socket, callindex, this)
    _player_list.push(player)
}

exports.create_room = function(roomInfo, own_player, callback){
    // 防御性校验：避免 undefined 引发服务器宕机
    if (!roomInfo || !roomInfo.rate || !own_player) {
        if (callback) callback(ERROR_CODE.PARAMS_ERROR, { msg: "Invalid parameters" });
        return;
    }

    var rateConfig = config.createRoomConfig[roomInfo.rate];
    if (!rateConfig) {
        if (callback) callback(ERROR_CODE.PARAMS_ERROR, { msg: "Invalid rate config" });
        return;
    }

    // 校验金币是否足够
    var needglobal = rateConfig.needCostGold;
    if (own_player._gold < needglobal) {
        console.warn(`[CreateRoom] Failed: Insufficient gold. Player: ${own_player.id}`);
        if (callback) callback(ERROR_CODE.INSUFFICIENT_GOLD, { msg: "Insufficient gold" });
        return;
    }

    // 校验通过，实例化房间并加入全局列表
    var room = Room(roomInfo, own_player)
    _room_info.push(room)

    // 兼容底层拼写错误
    if (typeof room.join_player === 'function') {
        room.join_player(own_player);
    } else if (typeof room.jion_player === 'function') {
        room.jion_player(own_player);
    }

    if (callback){
        callback(ERROR_CODE.SUCCESS, {
            room: room,
            data: {
                roomid: room.room_id,
                bottom: room.bottom,
                rate: roomInfo.rate
            }
        });
    }
}

// 修正拼写错误，主逻辑放在正确命名的函数中
exports.join_room = function(data, player, callback){
    // 防御性校验
    if (!data || !data.roomid || !player) {
        if (callback) callback(ERROR_CODE.PARAMS_ERROR, { msg: "Invalid parameters" });
        return;
    }

    for (var i = 0; i < _room_info.length; ++i) {
        if (_room_info[i].room_id === data.roomid) {
            let current_room = _room_info[i];
            
            if (typeof current_room.join_player === 'function') {
                current_room.join_player(player);
            } else if (typeof current_room.jion_player === 'function') {
                current_room.jion_player(player);
            }

            if (callback) {
                // 使用 const 声明，修复原代码的隐式全局变量污染
                const resp = {
                    room: current_room,
                    data: {
                        roomid: current_room.room_id,
                        bottom: current_room.bottom,
                        rate: current_room.rate,
                        // 确保 gold 字段不为 undefined，若不存在则回退为 0
                        gold: current_room.gold !== undefined ? current_room.gold : 0, 
                    }
                };
                callback(ERROR_CODE.SUCCESS, resp);
            }
            return;
        }
    }

    // 房间未找到，返回标准错误码与详细信息
    if (callback) {
        callback(ERROR_CODE.ROOM_NOT_FOUND, { 
            msg: `Room not found: ${data.roomid}`,
            roomid: data.roomid 
        });
    }
}

// 协议向后兼容：保留错误拼写的导出，防止外部路由调用报错
exports.jion_room = exports.join_room;

// 暴露辅助方法用于测试清空状态
exports._get_rooms = () => _room_info;
exports._clear_rooms = () => { _room_info = []; };
