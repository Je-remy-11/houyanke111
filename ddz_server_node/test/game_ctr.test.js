const test = require("node:test")
const assert = require("node:assert/strict")
const gamectr = require("../game/game_ctr.js")

const createPlayer = function(options){
    var player = {
        _gold: 1000,
        _accountID: "10001",
        _nickName: "tester",
        _avatarUrl: "avatar",
    }

    if (options) {
        Object.assign(player, options)
    }

    return player
}

test.beforeEach(function(){
    gamectr.__resetForTests()
})

test("金币足够时创建房间成功并返回正确房间信息", function(){
    var player = createPlayer({ _gold: 1000 })
    var callbackResult = null

    gamectr.create_room({ rate: 1 }, player, function(err, result){
        callbackResult = {
            err: err,
            result: result,
        }
    })

    assert.equal(callbackResult.err, null)
    assert.ok(callbackResult.result)
    assert.equal(callbackResult.result.data.rate, 1)
    assert.equal(callbackResult.result.data.bottom, 1)
    assert.ok(/^[0-9]{6}$/.test(callbackResult.result.data.roomid))
    assert.equal(gamectr.__getRoomInfo().length, 1)
    assert.equal(player._gold, 990)
})

test("金币不足时创建房间失败且不会残留幽灵房间", function(){
    var player = createPlayer({ _gold: 5 })
    var callbackResult = null

    gamectr.create_room({ rate: 1 }, player, function(err, result){
        callbackResult = {
            err: err,
            result: result,
        }
    })

    assert.ok(callbackResult.err)
    assert.equal(callbackResult.err.code, gamectr.__ERROR_CODE.INSUFFICIENT_GOLD)
    assert.equal(callbackResult.err.msg, "create room failed: gold not enough")
    assert.equal(callbackResult.result, null)
    assert.equal(gamectr.__getRoomInfo().length, 0)
    assert.equal(player._gold, 5)
})

test("加入不存在的房间时返回统一错误码并包含房间号", function(){
    var player = createPlayer()
    var callbackResult = null

    gamectr.join_room({ roomid: "654321" }, player, function(err, result){
        callbackResult = {
            err: err,
            result: result,
        }
    })

    assert.ok(callbackResult.err)
    assert.equal(callbackResult.err.code, gamectr.__ERROR_CODE.ROOM_NOT_FOUND)
    assert.match(callbackResult.err.msg, /654321/)
    assert.equal(callbackResult.err.roomid, "654321")
    assert.equal(callbackResult.result, null)
})
