/**
 * game_ctr.js 回归测试
 * 使用 Jest 框架
 * 运行方式: npx jest game_ctr.test.js
 */

// ================ 模拟依赖 ================

// 模拟 defines.js (config)
jest.mock('../defines.js', () => ({
    createRoomConfig: {
        '1': { needCostGold: 10, bottom: 1, rate: 1 },
        '2': { needCostGold: 100, bottom: 10, rate: 2 },
    }
}))

// 模拟 room.js
jest.mock('../game/room.js', () => {
    return jest.fn((roomInfo, player) => {
        const roomId = String(Math.random()).slice(2, 8)
        return {
            room_id: roomId,
            bottom: roomInfo.bottom || 1,
            rate: roomInfo.rate || 1,
            gold: (roomInfo.bottom || 1) * (roomInfo.rate || 1),
            _player_list: [],
            join_player: jest.fn(function(p) {
                this._player_list.push(p)
            }),
        }
    })
})

// 模拟 player.js (只用于 create_player)
jest.mock('../game/player.js', () => {
    return jest.fn((info, socket, callindex, gamectr) => {
        return {
            _accountID: info.account_id,
            _gold: info.gold_count,
            _nickName: info.nick_name,
        }
    })
})

const gameCtr = require('../game/game_ctr')

// ================ 辅助函数 ================

function makePlayer(accountID, gold) {
    return {
        _accountID: accountID,
        _gold: gold,
        _nickName: 'Player_' + accountID,
    }
}

// ================ 测试用例 ================

describe('game_ctr - create_room', () => {

    // 测试用例 1：金币足够的玩家创建房间成功
    test('TC1: 金币足够的玩家创建房间成功，验证回调收到正确的 roomid 和 rate', (done) => {
        const player = makePlayer('test_001', 100) // 100 gold, rate=1 needs 10 gold
        const roomInfo = { rate: '1' }

        gameCtr.create_room(roomInfo, player, (err, result) => {
            // 验证错误码为 SUCCESS
            expect(err).toEqual({ code: 0, msg: 'success' })

            // 验证 result 存在
            expect(result).not.toBeNull()

            // 验证 data 包含正确的 roomid、rate
            expect(result.data).toHaveProperty('roomid')
            expect(result.data.roomid).toMatch(/^\d{6}$/) // 6位数字
            expect(result.data.rate).toBe('1')
            expect(result.data.bottom).toBe(1)

            // 验证金币被正确扣除 (100 - 10 = 90)
            expect(player._gold).toBe(90)
            expect(result.data.gold).toBe(90)

            done()
        })
    })

    // 测试用例 2：金币不足的玩家创建房间失败
    test('TC2: 金币不足的玩家创建房间失败，验证错误码且 _room_info 中不包含该房间', (done) => {
        const player = makePlayer('test_002', 5) // 5 gold, rate=1 needs 10 gold — 不足
        const roomInfo = { rate: '1' }

        // 在调用前记录 _room_info 长度
        const beforeLen = gameCtr._room_info ? gameCtr._room_info.length : 0

        gameCtr.create_room(roomInfo, player, (err, result) => {
            // 验证错误码为 GOLD_NOT_ENOUGH: { code: -1, msg: 'gold not enough' }
            expect(err).toHaveProperty('code', -1)
            expect(err).toHaveProperty('msg', 'gold not enough')

            // 验证 result 为 null（失败时不返回房间数据）
            expect(result).toBeNull()

            // 验证金币未被扣除（校验失败，不执行扣费）
            expect(player._gold).toBe(5)

            // 验证 _room_info 中不包含该玩家的房间
            // 注意：由于修复后是先校验再创建，_room_info 应该没有任何新增
            const afterLen = gameCtr._room_info ? gameCtr._room_info.length : 0
            expect(afterLen).toBe(beforeLen)

            done()
        })
    })

    // 测试用例 3：加入不存在的房间
    test('TC3: 玩家加入不存在的房间，验证回调收到统一错误码且消息中包含房间号', (done) => {
        const player = makePlayer('test_003', 100)
        const nonExistentRoomId = '999999'

        gameCtr.join_room(
            { roomid: nonExistentRoomId },
            player,
            (err, result) => {
                // 验证错误码为 ROOM_NOT_FOUND: { code: -2, msg: 'room not found' }
                expect(err).toHaveProperty('code', -2)
                expect(err).toHaveProperty('msg', 'room not found')

                // 验证返回的数据中包含房间号信息
                expect(result).not.toBeNull()
                expect(result.data).toHaveProperty('roomid', nonExistentRoomId)
                expect(result.data.msg).toContain(nonExistentRoomId)

                done()
            }
        )
    })
})

describe('game_ctr - join_room', () => {

    // 测试用例 4：加入存在的房间成功
    test('TC4: 玩家加入一个已存在的房间成功', (done) => {
        const owner = makePlayer('owner_001', 100)
        const joiner = makePlayer('joiner_001', 200)

        // 先创建一个房间
        gameCtr.create_room({ rate: '1' }, owner, (err, createResult) => {
            expect(err.code).toBe(0)
            const roomid = createResult.data.roomid

            // 然后加入该房间
            gameCtr.join_room(
                { roomid: roomid },
                joiner,
                (err, joinResult) => {
                    expect(err.code).toBe(0)
                    expect(joinResult.data.roomid).toBe(roomid)
                    expect(joinResult.data).toHaveProperty('bottom')
                    expect(joinResult.data).toHaveProperty('rate')
                    expect(joinResult.data).toHaveProperty('gold')
                    done()
                }
            )
        })
    })

    // 测试用例 5：参数防御性校验 — data.roomid 为空
    test('TC5: 传入空 roomid 加入房间，返回 INVALID_PARAM 错误', (done) => {
        const player = makePlayer('test_005', 100)

        gameCtr.join_room(
            { roomid: null },
            player,
            (err, result) => {
                expect(err).toHaveProperty('code', -3) // INVALID_PARAM
                expect(err).toHaveProperty('msg', 'invalid parameter')
                done()
            }
        )
    })

    // 测试用例 6：参数防御性校验 — player 为空
    test('TC6: 传入 null player 加入房间，返回 INVALID_PARAM 错误', (done) => {
        gameCtr.join_room(
            { roomid: '123456' },
            null,
            (err, result) => {
                expect(err).toHaveProperty('code', -3)
                expect(err).toHaveProperty('msg', 'invalid parameter')
                done()
            }
        )
    })
})

describe('game_ctr - 高并发幽灵房间验证', () => {

    // 测试用例 7：高并发下金币不足的玩家不会产生幽灵房间
    test('TC7: 100 个并发创建请求（金币均不足），_room_info 不会增长', (done) => {
        const CONCURRENCY = 100
        let completed = 0
        const beforeLen = gameCtr._room_info ? gameCtr._room_info.length : 0

        for (let i = 0; i < CONCURRENCY; i++) {
            const poorPlayer = makePlayer('poor_' + i, 5) // 金币 5 < 需要 10
            gameCtr.create_room({ rate: '1' }, poorPlayer, (err, result) => {
                expect(err.code).toBe(-1)
                expect(result).toBeNull()
                completed++

                if (completed === CONCURRENCY) {
                    // 验证 _room_info 没有增长（没有幽灵房间）
                    const afterLen = gameCtr._room_info ? gameCtr._room_info.length : 0
                    expect(afterLen).toBe(beforeLen)
                    done()
                }
            })
        }
    })
})