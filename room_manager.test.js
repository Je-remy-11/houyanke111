const RoomManager = require('./room_manager.js');
const Player = require('./player.js');

describe('RoomManager 房间管理模块测试', () => {
    
    beforeEach(() => {
        RoomManager.clear_rooms();
    });

    test('测试用例1: 金币足够的玩家创建房间成功', () => {
        // 准备测试数据
        const player = Player({ name: "测试玩家", gold: 1000 }, null, 1);
        const roomInfo = { rate: 1, bottom: 10 };
        
        // 执行测试
        let callbackResult = null;
        RoomManager.create_room(roomInfo, player, (result) => {
            callbackResult = result;
        });

        // 验证结果
        expect(callbackResult).not.toBeNull();
        expect(callbackResult.code).toBe(0);
        expect(callbackResult.data.roomid).toBeDefined();
        expect(callbackResult.data.rate).toBe(1);
        expect(RoomManager.get_room_count()).toBe(1);
    });

    test('测试用例2: 金币不足的玩家创建房间失败', () => {
        // 准备测试数据
        const player = Player({ name: "穷玩家", gold: 50 }, null, 2);
        const roomInfo = { rate: 1, bottom: 10 };
        
        // 执行测试
        let callbackResult = null;
        RoomManager.create_room(roomInfo, player, (result) => {
            callbackResult = result;
        });

        // 验证结果
        expect(callbackResult).not.toBeNull();
        expect(callbackResult.code).toBe(-1);
        expect(callbackResult.msg).toBe("金币不足");
        expect(RoomManager.get_room_count()).toBe(0);
    });

    test('测试用例3: 加入不存在的房间', () => {
        // 准备测试数据
        const player = Player({ name: "测试玩家", gold: 500 }, null, 3);
        
        // 执行测试
        let callbackResult = null;
        RoomManager.join_room({ roomid: "不存在的房间123" }, player, (result) => {
            callbackResult = result;
        });

        // 验证结果
        expect(callbackResult).not.toBeNull();
        expect(callbackResult.code).toBe(-3);
        expect(callbackResult.msg).toContain("不存在的房间123");
    });

    test('向后兼容: jion_room 别名应正常工作', () => {
        const player = Player({ name: "兼容测试", gold: 500 }, null, 4);
        
        let callbackResult = null;
        RoomManager.jion_room({ roomid: "test_room" }, player, (result) => {
            callbackResult = result;
        });

        expect(callbackResult.code).toBe(-3);
    });

    test('参数校验: 缺少 player 参数应返回错误', () => {
        let callbackResult = null;
        RoomManager.create_room({ rate: 1 }, null, (result) => {
            callbackResult = result;
        });

        expect(callbackResult.code).toBe(-2);
    });
});
