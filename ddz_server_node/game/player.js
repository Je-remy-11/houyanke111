module.exports = function(info, socket, callindex, gamectr){
   var that = {}
   that._nickName = info.nick_name
   that._accountID = info.account_id
   that._avatarUrl = info.avatar_url
   that._gold = info.gold_count
   that._socket = socket
   that._gamesctr = gamectr
   that._room = undefined
   that._seatindex = 0
   that._isready = false
   that._cards = []

   const _notify = function (type, result, data, callBackIndex) {
    console.log("notify =" + JSON.stringify(data))
    that._socket.emit("notify", {
        type: type,
        result: result,
        data: data,
        callBackIndex: callBackIndex
    })
   }

   const _normalizeError = function(err){
        if (!err) {
            return null
        }

        if (typeof err === "object" && typeof err.code === "number") {
            return err
        }

        if (typeof err === "number") {
            return {
                code: err,
                msg: ""
            }
        }

        return {
            code: -1,
            msg: String(err)
        }
   }

   const _buildNotifyData = function(error, data){
        if (!error) {
            return data
        }

        var payload = data
        if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
            payload = {}
        }

        payload.error = error
        return payload
   }

   _notify("login_resp", 0, {goldcount: that._gold}, callindex)

   that._socket.on("disconnect", function(){
        console.log("player disconnect")
        if (that._room) {
            that._room.playerOffLine(that)
        }
   })

   that.removePushCards = function(remve_cards){
        if (remve_cards.length == 0) {
            return
        }

        for (var i = 0; i < remve_cards.length; i++) {
            var rcard = remve_cards[i]
            if (rcard == null) {
                continue
            }

            for (var j = 0; j < that._cards.length; j++) {
                if (rcard.cardid == that._cards[j].cardid) {
                    that._cards.splice(j, 1)
                }
            }
        }
   }

   that._socket.on("notify", function(req){
        var cmd = req.cmd
        var data = req.data
        var callindex = req.callindex
        console.log("_notify" + JSON.stringify(req))
        switch(cmd){
            case "createroom_req":
                that._gamesctr.create_room(data, that, function(err, result){
                    var error = _normalizeError(err)
                    if (error) {
                        console.log("create_room err:" + JSON.stringify(error))
                    } else {
                        that._room = result.room
                        console.log("create_room:" + JSON.stringify(result.data))
                    }

                    _notify("createroom_resp", error ? error.code : 0, _buildNotifyData(error, result ? result.data : null), callindex)
                })
                break
            case "joinroom_req":
                that._gamesctr.join_room(data, that, function(err, result){
                    var error = _normalizeError(err)
                    if (error) {
                        console.log("joinroom_req err" + JSON.stringify(error))
                    } else {
                        that._room = result.room
                    }

                    _notify("joinroom_resp", error ? error.code : 0, _buildNotifyData(error, result ? result.data : null), callindex)
                })
                break
            case "enterroom_req":
                if (that._room) {
                    that._room.enter_room(that, function(err, result){
                        if (err != 0) {
                            _notify("enter_room_resp", err, {}, callindex)
                        } else {
                            that._seatindex = result.seatindex
                            _notify("enter_room_resp", err, result, callindex)
                        }
                    })
                } else {
                    console.log("that._room is null")
                }
                break
            case "player_ready_notify":
                if (that._room) {
                    that._isready = true
                    that._room.playerReady(that)
                }
                break
            case "player_start_notify":
                if (that._room) {
                    that._room.playerStart(that, function(err, result){
                        if (err) {
                            console.log("player_start_notify err" + err)
                            _notify("player_start_notify", err, null, callindex)
                        } else {
                            _notify("player_start_notify", err, result.data, callindex)
                        }
                    })
                }
                break
            case "player_rob_notify":
                if (that._room) {
                    that._room.playerRobmaster(that, data)
                }
                break
            case "chu_bu_card_req":
                if (that._room) {
                    that._room.playerBuChuCard(that, data)
                }
                break
            case "chu_card_req":
                if (that._room) {
                    console.log("that._room")
                    that._room.playerChuCard(that, data, function(err, result){
                        if (err) {
                            console.log("playerChuCard cb err:" + err + " " + result)
                            _notify("chu_card_res", err, result.data, callindex)
                        }
                        _notify("chu_card_res", err, result.data, callindex)
                    })
                }
                break
            default:
                break
        }
   })

   that.sendPlayerJoinRoom = function(data){
    console.log("player join room notify" + JSON.stringify(data))
     _notify("player_joinroom_notify", 0, data, 0)
   }

   that.sendplayerReady = function(data){
       _notify("player_ready_notify", 0, data, 0)
   }

   that.gameStart = function(){
       _notify("gameStart_notify", 0, {}, 0)
   }

   that.sendPlayerChangeManage = function(data){
         console.log("sendPlayerChangeManage: account:" + data)
         _notify("changehousemanage_notify", 0, data, 0)
   }

   that.sendCard = function(data){
    that._cards = data
    _notify("pushcard_notify", 0, data, 0)
   }

    that.SendCanRob = function(data){
        console.log("SendCanRob" + data)
        _notify("canrob_notify", 0, data, 0)
    }

    that.sendRobState = function(data){
        _notify("canrob_state_notify", 0, data, 0)
    }

    that.SendChangeMaster = function(data){
        _notify("change_master_notify", 0, data, 0)
    }

    that.SendShowBottomCard = function(data){
        _notify("change_showcard_notify", 0, data, 0)
    }

    that.SendChuCard = function(data){
        _notify("can_chu_card_notify", 0, data, 0)
    }

    that.sendRoomState = function(data){
        _notify("room_state_notify", 0, data, 0)
    }

    that.SendOtherChuCard = function(data){
        _notify("other_chucard_notify", 0, data, 0)
    }
    return that
}
