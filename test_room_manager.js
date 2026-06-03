const RoomManager = require('./room_manager_fixed.js');
const Player = require('./player.js');

function test1() {
    console.log("\n=== 测试用例1：金币足够的玩家创建房间成功 ===");
    RoomManager.clear_rooms();
    
    const player1 = Player({ name: "张三", gold: 1000 }, null, 1);
    const roomInfo = { rate: 1, bottom: 10 };
    
    RoomManager.create_room(roomInfo, player1, (result) => {
        console.log("回调结果:", result);
        if (result.code === 0 && result.data.roomid && result.data.rate === 1) {
            console.log("✅ 测试用例1通过");
        } else {
            console.log("❌ 测试用例1失败");
        }
    });
}

function test2() {
    console.log("\n=== 测试用例2：金币不足的玩家创建房间失败 ===");
    RoomManager.clear_rooms();
    
    const player2 = Player({ name: "李四", gold: 50 }, null, 2);
    const roomInfo = { rate: 1, bottom: 10 };
    
    RoomManager.create_room(roomInfo, player2, (result) => {
        console.log("回调结果:", result);
        const roomCount = RoomManager.get_room_count();
        if (result.code === -1 && result.msg === "金币不足" && roomCount === 0) {
            console.log("✅ 测试用例2通过");
        } else {
            console.log("❌ 测试用例2失败，当前房间数量:", roomCount);
        }
    });
}

function test3() {
    console.log("\n=== 测试用例3：加入不存在的房间 ===");
    RoomManager.clear_rooms();
    
    const player3 = Player({ name: "王五", gold: 500 }, null, 3);
    
    RoomManager.join_room({ roomid: "不存在的房间ID" }, player3, (result) => {
        console.log("回调结果:", result);
        if (result.code === -3 && result.msg.includes("不存在的房间ID")) {
            console.log("✅ 测试用例3通过");
        } else {
            console.log("❌ 测试用例3失败");
        }
    });
}

function test4() {
    console.log("\n=== 测试用例4：并发创建房间（模拟幽灵房间） ===");
    RoomManager.clear_rooms();
    
    const poorPlayer = Player({ name: "穷玩家", gold: 50 }, null, 4);
    let successCount = 0;
    let failCount = 0;
    
    for (let i = 0; i < 10; i++) {
        setTimeout(() => {
            RoomManager.create_room({ rate: 1 }, poorPlayer, (result) => {
                if (result.code === 0) {
                    successCount++;
                } else {
                    failCount++;
                }
                
                if (successCount + failCount === 10) {
                    const finalRoomCount = RoomManager.get_room_count();
                    console.log(`并发测试完成: 成功${successCount}, 失败${failCount}, 剩余房间${finalRoomCount}`);
                    if (finalRoomCount === 0) {
                        console.log("✅ 测试用例4通过，无幽灵房间残留");
                    } else {
                        console.log("❌ 测试用例4失败，存在幽灵房间");
                    }
                }
            });
        }, i * 10);
    }
}

test1();
setTimeout(test2, 200);
setTimeout(test3, 400);
setTimeout(test4, 600);
