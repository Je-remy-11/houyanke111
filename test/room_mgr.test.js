const roomMgr = require('../ddz_server_node/game/game_ctr.js');

// Mock 依赖项
jest.mock("../ddz_server_node/defines.js", () => ({
    createRoomConfig: {
        'primary': { needCostGold: 100 }
    }
}), { virtual: true });

jest.mock("../ddz_server_node/game/room.js", () => {
    return jest.fn((roomInfo, player) => ({
        room_id: "123456",
        bottom: 10,
        rate: roomInfo.rate,
        gold: 1000,
        join_player: jest.fn()
    }));
}, { virtual: true });

describe("斗地主房间管理模块回归测试", () => {
    
    beforeEach(() => {
        roomMgr._clear_rooms(); // 每个用例前清空内存状态
    });

    test("场景1：金币足够的玩家创建房间成功", (done) => {
        const mockPlayer = { id: "p1", _gold: 150 };
        const mockRoomInfo = { rate: 'primary' };

        roomMgr.create_room(mockRoomInfo, mockPlayer, (code, result) => {
            // 验证：回调状态码为 0
            expect(code).toBe(0);
            // 验证：数据结构正确
            expect(result.data.roomid).toBe("123456");
            expect(result.data.rate).toBe("primary");
            // 验证：房间确实被加入了全局数组
            expect(roomMgr._get_rooms().length).toBe(1);
            done();
        });
    });

    test("场景2：金币不足的玩家创建房间失败，验证幽灵房间修复", (done) => {
        const mockPlayer = { id: "p2", _gold: 50 }; // 需要 100，只有 50
        const mockRoomInfo = { rate: 'primary' };

        roomMgr.create_room(mockRoomInfo, mockPlayer, (code, result) => {
            // 验证：回调状态码为 -1 (INSUFFICIENT_GOLD)
            expect(code).toBe(-1);
            expect(result.msg).toBe("Insufficient gold");
            // 验证：房间数组长度仍为 0，彻底解决幽灵房间
            expect(roomMgr._get_rooms().length).toBe(0);
            done();
        });
    });

    test("场景3：玩家尝试加入一个不存在的房间，验证错误码统一", (done) => {
        const mockPlayer = { id: "p3", _gold: 500 };
        const mockData = { roomid: "999999" }; // 不存在的房间号

        roomMgr.join_room(mockData, mockPlayer, (code, result) => {
            // 验证：回调状态码为 -2 (ROOM_NOT_FOUND) 而不是字符串
            expect(code).toBe(-2);
            // 验证：错误信息中携带了引发错误的房间号
            expect(result.msg).toContain("999999");
            done();
        });
    });
});