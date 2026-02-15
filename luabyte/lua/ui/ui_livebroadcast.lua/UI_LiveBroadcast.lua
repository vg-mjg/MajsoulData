require "UI.UIBase"
require "UI.UIBlock"
require "GameUtility"
UI_LiveBroadcast = UIBase:Inherit()


-- ================= funcs ==================

--'play', 'paipu', 'live_broadcast'
local EMJ_Mode = GameUtility.EMJ_Mode
--'none', 'gameing', 'end', 'interrupt'
local ELiveState = GameUtility.ELiveState
local json = require('cjson')
function UI_LiveBroadcast:OnCreate()
    UI_LiveBroadcast.Inst = self

    self.state = ELiveState.none
    self.game_uuid = ''
                                        --unit:{timestamp:int, category:int, name:string, data:Object}
    self.segments = {}                  --{segment_id:int, segment_uri:string, units:unit[], loaded:bool}
    self.pending_units = {}
    self.is_realtime = false
    self.time0 = 0
    self.time_start = 0
    self.segment_index = 0
    self.unit_index = 0
    self.during_asknew = false
    self.retry_loadtime = 0
    self.segment_end_second = 0
    self.do_unit_cd = 0
    self.time_stop_length = 0
    self.time_stop_start_time = 0
    self.timerMgr = TimerMgr:Init()
    self.action_timerMgr = TimerMgr:Init()
    self.pending_get_table = {}
    self.locking_time = 0
    self.game_live_start_time = -1

    --LiveConfig
    self.liveconfig = {}
    self.liveconfig.show_hand = false
    self.liveconfig.show_paopai = false
    self.liveconfig.show_replay = false
    self.liveconfig.transform = self.transform:Find('config'):GetComponent(typeof(UnityEngine.RectTransform))
    self.liveconfig.btn_out = self.liveconfig.transform:Find('btn_out'):GetComponent(typeof(UnityEngine.UI.Button))
    self.liveconfig.btn_out.onClick:AddListener(function()
        self.liveconfig.switch()
    end)
    self.liveconfig.choosed_show_hand = self.liveconfig.transform:Find('btn_shoupai'):Find('choosed')
    self.liveconfig.choosed_show_hand.gameObject:SetActive(false)
    self.liveconfig.choosed_show_paopai = self.liveconfig.transform:Find('btn_paopai'):Find('choosed')
    self.liveconfig.choosed_show_paopai.gameObject:SetActive(false)
    self.liveconfig.choosed_show_replay = self.liveconfig.transform:Find('btn_replay'):Find('choosed')
    self.liveconfig.choosed_show_replay.gameObject:SetActive(false)
    self.liveconfig.transform:Find('btn_shoupai'):GetComponent(typeof(UnityEngine.UI.Button)).onClick:AddListener(function()
        self.liveconfig.show_hand = not self.liveconfig.show_hand
        self.liveconfig.choosed_show_hand.gameObject:SetActive(self.liveconfig.show_hand)
        DesktopMgr.Inst:OnShowHandChanged(self.liveconfig.show_hand)
    end)
    self.liveconfig.transform:Find('btn_paopai'):GetComponent(typeof(UnityEngine.UI.Button)).onClick:AddListener(function()
        self.liveconfig.show_paopai = not self.liveconfig.show_paopai
        self.liveconfig.choosed_show_paopai.gameObject:SetActive(self.liveconfig.show_paopai)
        DesktopMgr.Inst:OnShowPaopaiChanged(self.liveconfig.show_paopai)
    end)
    self.liveconfig.transform:Find('btn_replay'):GetComponent(typeof(UnityEngine.UI.Button)).onClick:AddListener(function()
        self.liveconfig.show_replay = not self.liveconfig.show_replay
        self.liveconfig.choosed_show_replay.gameObject:SetActive(self.liveconfig.show_replay)
        if self.liveconfig.show_replay then
            --找到最近的合规的unit
            if UI_Replay_Cell.Inst:Show() then
                local segment_index = self.segment_index
                local unit_index = self.unit_index
                local flag = true
                pcall(function()
                    for i = self.segment_index, 1, -1 do
                        for j = #self.segments[i].units, 1, -1 do
                            if self.segment_index == i then
                                if j <= self.unit_index and flag and self.segments[i].units[j].category == 1 then
                                    segment_index = i
                                    unit_index = j
                                    flag = false
                                end
                            else
                                if flag and self.segments[i].units[j].category == 1 then
                                    segment_index = i
                                    unit_index = j
                                    flag = false
                                end
                            end
                        end
                    end
                end)
                UI_Replay_Cell.Inst:InitData(self.segments, segment_index, unit_index)
                self.in_record = true
                --因为这里的回放模式既不属于Replay，也需要是Livebroadcast，需要关闭change_score按钮，不然切换场次会误按
                UI_DesktopInfo.Inst.btn_change_score.gameObject:SetActive(false)
                self.show_replay_time = UnityEngine.Time.time
                self.action_timerMgr:ClearAllTimers()
                DesktopMgr.Inst:ClearOperationShow()
            else
                self.liveconfig.show_replay = not self.liveconfig.show_replay
                self.liveconfig.choosed_show_replay.gameObject:SetActive(self.liveconfig.show_replay)
            end
        else
            if UI_Replay_Cell.Inst:Hide() then
                self.in_record = false
                --因为这里的回放模式既不属于Replay，也需要是Livebroadcast，需要关闭change_score按钮，不然切换场次会误按
                UI_DesktopInfo.Inst.btn_change_score.gameObject:SetActive(true)
                -- self.time0 = self.time0 + UnityEngine.Time.time - self.time_start
                -- self.time0 = self.time0 - self.show_replay_time + UnityEngine.Time.time
                -- self.time_start = UnityEngine.Time.time
                self:_fastSync()
                self.action_timerMgr:Loop(0.1, -1, function()
                    self:_timeDoAction(false)
                end)
            else
                self.liveconfig.show_replay = not self.liveconfig.show_replay
                self.liveconfig.choosed_show_replay.gameObject:SetActive(self.liveconfig.show_replay)
            end    
        end
    end)
    self.liveconfig.reset = function()
        self.liveconfig.show_hand = false
        self.liveconfig.show_paopai = false
        self.liveconfig.show_replay = false
        self.in_record = false
        DesktopMgr.Inst:OnShowHandChanged(false)
        DesktopMgr.Inst:OnShowPaopaiChanged(false)
        self.liveconfig.choosed_show_hand.gameObject:SetActive(false)
        self.liveconfig.choosed_show_paopai.gameObject:SetActive(false)
	    self.liveconfig.choosed_show_replay.gameObject:SetActive(false)
        self.liveconfig.transform:SetRectPos(0, self.liveconfig.rect_y)
    end
    self.liveconfig.rect_y = self.liveconfig.transform.anchoredPosition.y
    self.liveconfig.switch = function()
        local target_x = 0
        if self.liveconfig.transform.anchoredPosition.x >= 249 then
            target_x = 0
        else
            target_x = 250
        end
        DG.Tweening.DOTween.To(
            DG.Tweening.Core.DOGetter_float(function() return self.liveconfig.transform.anchoredPosition.x end),
            DG.Tweening.Core.DOSetter_float(function(x)
                self.liveconfig.transform:SetRectPos(x, self.liveconfig.rect_y)
            end), target_x, 0.2
        )
        TimeMgr.Delay(0.2, function()
            self.liveconfig.btn_out.interactable = true
        end)
        self.liveconfig.btn_out.interactable = false
    end

    self.transform:Find('config'):Find('label_word').gameObject:SetActive(GameMgr.Inst.client_language == 'chs')
    self.transform:Find('config'):Find('img_word').gameObject:SetActive(GameMgr.Inst.client_language ~= 'chs')

    self.hint.text = '...'..Tools.StrOfLocalization(3105)
end

function UI_LiveBroadcast:Show()
    self.transform.gameObject:SetActive(true)
    self.is_game_end = false
end

function UI_LiveBroadcast:Hide()
    self.is_realtime = false
    self.realtime_hint.gameObject:SetActive(false)
    self.transform.gameObject:SetActive(false)
    self.timerMgr:ClearAllTimers()
    self.action_timerMgr:ClearAllTimers()
    self.pending_units = {}
    self.game_live_start_time = -1
end

function UI_LiveBroadcast:FetchInfo(game_uuid, complete)
    local request = ProtoMgr.CreateRequest('Lobby', 'fetchGameLiveInfo')
    request.game_uuid = game_uuid
    LobbyNetMgr.SendRequest('Lobby', 'fetchGameLiveInfo', request, function(err, res)
        if err or (res.error and res.error.code ~= 0) then
            UIMgr.Inst:Show_NetReqError('fetchGameLiveInfo', err, res)
            if complete then
                local param = {}
                param.success = false
                complete(param)
            end
        else
            if res.left_start_seconds and res.left_start_seconds ~= 0 then
                UIMgr.Inst:Show_WaitOb(game_uuid, res.left_start_seconds, complete)
            else
                if complete then
                    local param = {}
                    param.success = true
                    param.data = res
                    complete(param)
                end
            end
        end
    end)
end

function UI_LiveBroadcast:OnChangeMainBody()
    if not self.in_record then
        -- self.time0 = self.time0 + UnityEngine.Time.time - self.time_start
        -- self.time_start = UnityEngine.Time.time
        self.do_unit_cd = 0
        self:_fastSync()
    else
        UI_Replay_Cell.Inst:OnChangeMainBody()
    end
end

--game_uuid:string, msg:Object, account_id:int
function UI_LiveBroadcast:GoToWatch(game_uuid, msg, account_id)
    LogTool.Info('LiveBroadcast', 'GoToWatch: ' .. pt.block(msg))
    UIMgr.Inst:Show_Loading('enter_mj')

    local live_head = msg.live_head
    local players = {{},{},{},{}}

    for i = 1, #live_head.players do
        local _seat = -1
        for j = 1, #live_head.seat_list do
            if live_head.seat_list[j] == live_head.players[i].account_id then
                _seat = j
            end
        end
        if _seat ~= -1 then
            players[_seat] = live_head.players[i]
        else
            LogTool.Warning('LiveBroadcast', 'GoToWatch Error 未找到位置: ' .. pt.block(live_head.players[i]))
        end
    end

    local ai_level = 2
    local d_config = live_head.game_config.mode
    --有extendinfo说明是老牌谱
    if d_config.extendinfo and d_config.extendinfo ~= '' then
        ai_level = 2
    end
    if d_config.detail_rule then
        if d_config.detail_rule.ai_level ~= 0 then
            ai_level = d_config.detail_rule.ai_level
        end
    end

    for i = 1, #players do
        if not players[i] or not players[i].nickname then
            players[i] = Tools.get_robot_data(ai_level)
        end 
    end

    Scene_MJ.Inst:OpenMJRoom(players, function()
        DesktopMgr.Inst:InitRoom(live_head.game_config, players, account_id, EMJ_Mode.live_broadcast, function()
            UI_Loading.Inst:SetProgress(0.7)
            self.timerMgr:Delay(1, function()
                GameMgr.Inst:EnterMJ()
                UI_Loading.Inst:SetProgress(0.8)
                self:StartLive(game_uuid, msg)
            end)
        end)
    end, function(p)
        UI_Loading.Inst:SetProgress(0.7 * p)
    end)
end

--data:units
function UI_LiveBroadcast:StartRealtimeLive(data, time_start)
    LogTool.Info('LiveBroadcast', 'start realtime live: ' .. pt.block(data))
    self.is_realtime = true
    self.realtime_hint.gameObject:SetActive(true)
    self.time0 = time_start
    self.segment_index = 1
    self.segments = {}
    self:Show()
    self.liveconfig.reset()
    self.do_unit_cd = 0

    local temp_units = {}
    for i = 1, #data.actions do
        table.insert(temp_units, self:_parseUnit(data.actions[i]))
    end

    table.insert(self.segments, {
        segment_id = 1,
        units = temp_units,
        loaded = true
    })

    self.timerMgr:Loop(0.1, -1, function()
        for i = 1, #self.pending_units do
            table.insert(self.segments[1].units, self:_parseUnit(self.pending_units[i].unit))
        end
        self.pending_units = {}
    end)
    local realtime_hint_canvas = self.realtime_hint.transform:GetComponent(typeof(UnityEngine.CanvasGroup))
    self.timerMgr:LoopFrame(1, -1, function()
        local t = UnityEngine.Time.time - time_start
        t = t - Mathf.Floor(t / 4) * 4
        if t < 2 then
            realtime_hint_canvas.alpha = (t / 2) * 0.7 + 0.3
        else
            realtime_hint_canvas.alpha = (1 - (t - 2) / 2) * 0.7 + 0.3
        end
    end)
    self.timerMgr:Loop(100, -1, function()
        local request = ProtoMgr.CreateRequest('Lobby', 'refreshGameObserveAuth')
        request.token = MJNetMgr.Inst.ob_token
        LobbyNetMgr.SendRequest('Lobby', 'refreshGameObserveAuth', request, function(err, res)
            if err or (res and res.error and res.error.code ~= 0) then
                UIMgr.Inst:Show_NetReqError('refreshGameObserveAuth', err, res)
            else

            end
        end)
    end)
    self:_onFirstLoadOver()
end

--game_uuid:string, msg:Object
function UI_LiveBroadcast:StartLive(game_uuid)
    self.realtime_hint.gameObject:SetActive(false)
    self:FetchInfo(game_uuid, function(res)
        if res.success then
            local msg = res.data
            LogTool.Info('LiveBroadcast', 'StartLive: game_uuid: ' .. game_uuid .. ' msg: ' .. pt.block(msg))
            self.segment_index = 1
            self.segments = {}
            self.time0 = msg.now_millisecond / 1000
            self.time_start = UnityEngine.Time.time
        
            local count = 0
            local failed = false
            self.game_uuid = game_uuid
            self:Show()
            self.liveconfig.reset()
            self.do_unit_cd = 0
        
            local loadover = function(data)
                if failed then
                    return
                end
                if data.success then
                    local flag = true
                    for i = 1, #self.segments do
                        if self.segments[i].segment_id == data.id and flag then
                            self.segments[i].units = data.units
                            self.segments[i].loaded = true
                            flag = false
                        end
                    end
                    count = count + 1
                    UI_Loading.Inst:SetProgress(0.8 + 0.2 * (count / #self.segments))
                    if count == #self.segments then
                        self:_onFirstLoadOver()
                        for i = 1, #self.segments do
                            for j = 1, #self.segments[i].units do
                                local unit = self.segments[i].units[j]
                                if unit.timestamp < self.game_live_start_time or self.game_live_start_time == -1 then
                                    self.game_live_start_time = unit.timestamp
                                end
                            end
                        end
                        GameMgr.Inst:OnLoadEnd('ob')
                    end
                else
                    pcall(function()
                        local last_success_segment_name = ''
                        if self.segments and #self.segments > 0 then
                            last_success_segment_name = self.segments[#self.segments].uri
                        end
                        local info = {
                            condition = 'loading',
                            uuid = self.game_uuid,
                            segment_name = data.url,
                            last_success_segment_name = last_success_segment_name,
                            error_info = data.message,
                            gametime_since_start = -1
                        }
                        UI_ErrorInfo.HandleInfo(json.encode(info), 'ob_failure')
                    end)

                    failed = true
                    UIMgr.Inst:Show_NetReqError('loading segments', {message = Tools.StrOfLocalization(15)})
                    self:_forceQuit()
                end
            end

            
            for i = 1, #msg.segments do
                local id = msg.segments[i].segment_id
                local uri = msg.segments[i].segment_uri
                local segment = {}
                segment.segment_id = id
                --新的uri前缀由客户端根据线路填充
                segment.segment_uri = LobbyNetMgr.live_url .. uri
                table.insert(self.segments, segment)
                -- local index = i
                -- self:_loadUnit(id, uri, function(data)
                --     loadover(data)
                -- end)
            end
            
            local segment_index = 1
            self.loadnext = function()
                local segment = self.segments[segment_index]
                if segment then
                    self:_loadUnit(segment.segment_id, segment.segment_uri, function(data)
                        loadover(data)
                        segment_index = segment_index + 1
                        self.loadnext()
                    end)
                else
                    self.loadnext = nil
                end
            end
            self.loadnext()
        end
        GameMgr.Inst:OnLoadStart('ob')
    end)
end

function UI_LiveBroadcast:_onFirstLoadOver()
    if self:_fastSync() then
        UIMgr.Inst:Hide_Loading()
        self.state = ELiveState.gameing
        self.action_timerMgr:Loop(0.1, -1, function()
            self:_timeDoAction(false)
        end)
        if not self.is_realtime then
            local units = self.segments[#self.segments].units
            local maxt = units[#units].timestamp
            self.segment_end_second = maxt
            self.timerMgr:Loop(3.7, -1, function()
                self:_askNewSegment()
            end)
        else

        end
    end
end

--fast:bool
function UI_LiveBroadcast:_timeDoAction(fast)
    if self.segment_index > #self.segments then return false end
    local s = self.segments[self.segment_index]
    if not s.loaded then return false end
    if (self.segment_index == #self.segments and self.unit_index > #s.units) or (self.unit_index > #s.units and self.is_realtime) then return false end
    local u = s.units[self.unit_index]
    local t = self.time0 + UnityEngine.Time.time - self.time_start
    if u.timestamp > t and not self.is_realtime then return true end
    if u.name == 'NotifyGameEndResult' then return true end
    if u.category == 1 and UnityEngine.Time.time < self.do_unit_cd then return true end
    local isLast = self:_unitIsTimeLast(self.segment_index, self.unit_index + 1)
    if isLast then
        t = t - self:_getTimeStop(self.segment_index, self.unit_index + 1, self.time_stop_start_time)
    end

    local usetime = 0
    if not self.is_realtime then
        usetime = t - u.timestamp
    else
        usetime = Tools.GetRealTime() - self.time0 - u.timestamp
        if usetime < 0 then usetime = 0 end
    end

    if fast then
        if isLast then
            self:_doUnit(u, true, usetime)
        else
            self:_doUnit(u, true, -1)
        end
    else
        local _t = self:_doUnit(u, false, usetime)
        if _t > 0 then
            self.do_unit_cd = UnityEngine.Time.time + _t
        end
    end

    self.unit_index = self.unit_index + 1
    if self.unit_index > #s.units and not self.is_realtime then
        self.unit_index = 1
        self.segment_index = self.segment_index + 1
    end

    return self:_timeDoAction(fast)
end

function UI_LiveBroadcast:_doUnit(unit, fast, usetime)
    if unit.category == 1 then
        if not DesktopMgr.Inst.time_stopped then
            self.time_stop_length = 0
        end

        if fast then
            self:_doFastRecord(unit.name, unit.data, usetime)
            return 0
        else
            return self:_doRecord(unit.name, unit.data, usetime)
        end
    else
        if unit.name == 'GameNewRoundState' then
            for i = 1, #unit.data.seat_states do
                DesktopMgr.Inst.player_link_state[i] = unit.data.seat_states[i]
            end
            UI_DesktopInfo.Inst:RefreshLinks()
        elseif unit.name == 'NotifyGameEndResult' then
            for i = 1, #unit.data.result.players do
                unit.data.result.players[i].seat = unit.data.result.players[i].seat + 1
            end
            DesktopMgr.Inst.game_end_result = unit.data.result
            UIMgr.Inst:Hide_LiveBroadcast()
            UIMgr.Inst:Show_GameEnd(DesktopMgr.Inst.game_end_result)
        elseif unit.name == 'NotifyPlayerConnectionState' then
            UI_DesktopInfo.Inst:_onPlayerConnectionState(unit.data)
        elseif unit.name == 'GameEndAction' then
            if unit.data.state == 3 then
                UIMgr.Inst:Show_PopOutNoTitle(Tools.StrOfLocalization(16), function()
                    Scene_MJ.Inst:ForceOut()
                end)
            end
        elseif unit.name == 'NotifyGamePause' then
            DesktopMgr.Inst:SetGameStop(unit.data.paused)
            if self.time_stop_start_time > 0 then
                self.time_stop_length = self.time_stop_length + unit.timestamp - self.time_stop_start_time
            end
            if DesktopMgr.Inst.time_stopped then
                self.time_stop_start_time = unit.timestamp
            else
                self.time_stop_start_time = -1
            end
        elseif unit.name == 'NotifyGameBroadcast' and not fast then
            UI_DesktopInfo.Inst:_onGameBroadcast(unit.data)
        end
        return -1
    end
end

function UI_LiveBroadcast:_doRecord(name, data, usetime)
    DesktopMgr.Inst:ClearOperationShow()
    local t = 0
    LogTool.Info('LiveBroadcast', 'do record:' .. name)
    if name == 'RecordNewRound' then t = ActionNewRound.Record(data, usetime)
    elseif name == 'RecordDiscardTile' then t = ActionDiscardTile.Record(data, usetime)
    elseif name == 'RecordDealTile' then t = ActionDealTile.Record(data, usetime)
    elseif name == 'RecordChiPengGang' then t = ActionChiPengGang.Record(data, usetime)
    elseif name == 'RecordAnGangAddGang' then t = ActionAnGangAddGang.Record(data, usetime)
    elseif name == 'RecordBaBei' then t = ActionBaBei.Record(data)
    elseif name == 'RecordChangeTile' then ActionChangeTile.Record(data)
    elseif name == 'RecordHule' then t = ActionHule.Record(data)
    elseif name == 'RecordLiuJu' then t = ActionLiuJu.Record(data)
    elseif name == 'RecordNoTile' then t = ActionNoTile.Record(data)
    elseif name == 'RecordHuleXueZhanMid' then t = ActionHuleXueZhanMid.Record(data)
    elseif name == 'RecordHuleXueZhanEnd' then t = ActionHuleXueZhanEnd.Record(data)
    elseif name == 'RecordSelectGap' then t = ActionSelectGap.Record(data)
    elseif name == 'RecordGangResult' then t = ActionGangResult.Record(data)
    elseif name == 'RecordGangResultEnd' then t = ActionGangResultEnd.Record(data)
    elseif name == 'RecordRevealTile' then t = ActionRevealTile.Record(data)
    elseif name == 'RecordUnveilTile' then t = ActionUnveilTile.Record(data)
    elseif name == 'RecordLockTile' then t = ActionLockTile.Record(data)
    elseif name == 'RecordNewCard' then ActionNewCard.Record(data)
    end
    DesktopMgr.Inst.recent_action = action
    return t
end

function UI_LiveBroadcast:_doFastRecord(name, data, usetime)
    local t = 0
    if name == 'RecordNewRound' then ActionNewRound.FastRecord(data, usetime)
    elseif name == 'RecordDiscardTile' then ActionDiscardTile.FastRecord(data, usetime)
    elseif name == 'RecordDealTile' then ActionDealTile.FastRecord(data, usetime)
    elseif name == 'RecordChiPengGang' then ActionChiPengGang.FastRecord(data, usetime)
    elseif name == 'RecordAnGangAddGang' then ActionAnGangAddGang.FastRecord(data, usetime)
    elseif name == 'RecordBaBei' then ActionBaBei.FastRecord(data)
    elseif name == 'RecordChangeTile' then ActionChangeTile.FastRecord(data)
    elseif name == 'RecordHule' then ActionHule.FastRecord(data)
    elseif name == 'RecordLiuJu' then ActionLiuJu.FastRecord(data)
    elseif name == 'RecordNoTile' then ActionNoTile.FastRecord(data)
    elseif name == 'RecordHuleXueZhanMid' then t = ActionHuleXueZhanMid.FastRecord(data)
    elseif name == 'RecordHuleXueZhanEnd' then t = ActionHuleXueZhanEnd.FastRecord(data)
    elseif name == 'RecordSelectGap' then t = ActionSelectGap.FastRecord(data)
    elseif name == 'RecordRevealTile' then t = ActionRevealTile.FastRecord(data)
    elseif name == 'RecordUnveilTile' then t = ActionUnveilTile.FastRecord(data)
    elseif name == 'RecordLockTile' then t = ActionLockTile.FastRecord(data)
    elseif name == 'RecordNewCard' then ActionNewCard.FastRecord(data)
    end
end

--segment_index, unit_index:int
function UI_LiveBroadcast:_unitIsTimeLast(segment_index, unit_index)
    if segment_index > #self.segments then return true end
    local s = self.segments[segment_index]
    if not s.loaded then return true end
    if #s.units < unit_index then
        return self:_unitIsTimeLast(segment_index + 1, 1)
    else
        local t = self.time0 + UnityEngine.Time.time - self.time_start
        local u = s.units[unit_index]
        if u.timestamp > t then
            return true
        else
            if u.category == 2 then 
                return self:_unitIsTimeLast(segment_index, unit_index + 1)
            else
                return false
            end
        end
    end
end

--segment_index, unit_index, time_stop_start_time:number
function UI_LiveBroadcast:_getTimeStop(segment_index, unit_index, time_stop_start_time)
    local t_all = 0
    if time_stop_start_time > 0 then
        t_all = self.time0 + UnityEngine.Time.time - self.time_start - time_stop_start_time
    end
    if segment_index > #self.segments then
        return t_all
    end

    local s = self.segments[segment_index]
    if not s.loaded then return t_all end
    if #s.units < unit_index then
        return self:_getTimeStop(segment_index + 1, 1, time_stop_start_time)
    else
        local u = s.units[unit_index]
        local t = self.time0 + UnityEngine.Time.time - self.time_start
        if u.timestamp > t then
            return t_all
        else
            if u.category == 1 then
                return 0
            elseif u.name == 'NotifyGamePause' then
                local timeLength = 0
                if time_stop_start_time > 0 then
                    timeLength = timeLength + u.timestamp - time_stop_start_time
                end
                if u.data.paused then
                    time_stop_start_time = u.timestamp
                else
                    time_stop_start_time = -1
                end

                return timeLength + self:_getTimeStop(segment_index, unit_index + 1, time_stop_start_time)
            else
                return self:_getTimeStop(segment_index, unit_index + 1, time_stop_start_time)
            end
        end
    end
end

function UI_LiveBroadcast:_fastSync()
    local last_newround_segment = -1
    local last_newround_unit = -1
    self.time_stop_start_time = -1
    self.time_stop_length = 0
    self.do_unit_cd = 0
    local t = self.time0 + UnityEngine.Time.time - self.time_start

    for i = 1, #self.segments do
        local s = self.segments[i]
        for j = 1, #s.units do
            if s.units[j].timestamp <= t then
                if s.units[j].name == 'RecordNewRound' then
                    last_newround_segment = i
                    last_newround_unit = j
                end
            end
        end
    end

    --如果没有则游戏刚开始，找到第一个NewRound
    if last_newround_segment == -1 then
        last_newround_segment = 1
        local s = self.segments[1]
        local flag = true
        for j = 1, #s.units do
            if s.units[j].name == 'RecordNewRound' and flag then
                last_newround_segment = 1
                last_newround_unit = j
                if not self.is_realtime then
                    self.time0 = s.units[j].timestamp - 0.05
                end
                flag = false
            end
        end
    end

    if last_newround_unit == -1 then
        LogTool.Warning('LiveBroadcast', '数据里面没有RecordNewRound')
        if not self.is_realtime then
            UIMgr.Inst:Show_ErrorInfo(Tools.StrOfLocalization(15))
            self:_forceQuit()
            return false
        else
            self.segment_index = 1
            self.unit_index = 1
            return true
        end
    else
        self.segment_index = last_newround_segment
        self.unit_index = last_newround_unit
        -- self.time_start = UnityEngine.Time.time
        self.state = ELiveState.gameing
        self:_timeDoAction(true)
        return true
    end
end

function UI_LiveBroadcast:_askNewSegment()
    if self.during_asknew or self.retry_loadtime >= 3 then return end
    if not self.segments[#self.segments].loaded then return end
    if self.is_game_end then return end
    local t = self.time0 + UnityEngine.Time.time - self.time_start
    if (t + 15) < self.segment_end_second then return end
    self.during_asknew = true
    
    local request = ProtoMgr.CreateRequest('Lobby', 'fetchGameLiveLeftSegment')
    request.game_uuid = self.game_uuid
    request.last_segment_id = self.segments[#self.segments].segment_id
    LobbyNetMgr.SendRequest('Lobby', 'fetchGameLiveLeftSegment', request, function(err, res)
        self.during_asknew = false
        if err or (res.error and res.error.code ~= 0) then
            self.retry_loadtime = self.retry_loadtime + 1
            if self.retry_loadtime >= 3 then
                UIMgr.Inst:Show_NetReqError('fetchGameLiveLeftSegment', err, res)

                pcall(function()
                    local gametime_since_start = -1
                    if self.game_live_start_time ~= -1 then
                        gametime_since_start = t - self.game_live_start_time
                    end
                    local info = {
                        condition = 'runtime',
                        uuid = self.game_uuid,
                        segment_name = '',
                        last_success_segment_name = LobbyNetMgr.live_url .. self.segments[#self.segments].uri,
                        error_info = 'server_timeout',
                        gametime_since_start = gametime_since_start
                    }
                    UI_ErrorInfo.HandleInfo(json.encode(info), 'ob_failure')
                end)
            end
        else
            self.retry_loadtime = 0
            local segments = res.segments
            self.segment_end_second = res.segment_end_millisecond / 1000

            local loadover = function(data)
                if data.success then
                    local flag = true
                    for i = 1, #self.segments do
                        if self.segments[i].segment_id == data.id and flag then
                            self.segments[i].units = data.units
                            self.segments[i].loaded = true
                            flag = false
                        end
                    end
                    for j = 1, #data.units do
                        if data.units[j].name == 'NotifyGameEndResult' then
                            self.is_game_end = true
                        end
                    end
                else
                    pcall(function()
                        local last_success_segment_name = ''
                        if self.segments and #self.segments > 0 then 
                            last_success_segment_name = LobbyNetMgr.live_url .. self.segments[#self.segments].uri
                        end
                        local gametime_since_start = -1
                        if self.game_live_start_time ~= -1 then gametime_since_start = t - self.game_live_start_time end
                        local info = {
                            condition = 'runtime',
                            uuid = self.game_uuid,
                            segment_name = data.url,
                            last_success_segment_name = last_success_segment_name,
                            error_info = data.message,
                            gametime_since_start = gametime_since_start
                        }
                        UI_ErrorInfo.HandleInfo(json.encode(info), 'ob_failure')
                    end)

                    UIMgr.Inst:Show_NetReqError('loading segments', {message = Tools.StrOfLocalization(15)})
                    self:_forceQuit()
                end
            end

            local maxid = self.segments[#self.segments].segment_id

            for i = 1, #segments do
                local id = segments[i].segment_id
                local url = LobbyNetMgr.live_url ..  segments[i].segment_uri
                if id > maxid then
                    local segment = {}
                    segment.segment_id = id
                    segment.uri = url
                    segment.units = {}
                    segment.loaded = false
                    table.insert(self.segments, segment)
                    self:_loadUnit(id, url, function(data)
                        loadover(data)
                    end)
                end
            end
        end
    end)
end

function UI_LiveBroadcast:_loadUnit(id, url, complete, retry_count)
    if self.pending_get_table[url] then return end
    self.pending_get_table[url] = 1

    retry_count = retry_count or 1
    local callback = function(res, err)
        if not self.pending_get_table[url] then return end
        self.pending_get_table[url] = nil
        if err then
            LogTool.Error('LiveBroadcast', '_loadUnit error: ' .. pt.block(err) .. ',id: ' .. id .. ',url:' .. url)
            if retry_count > 3 then
                if complete then
                    local param = {}
                    param.success = false
                    param.id = id
                    param.url = url
                    param.message = 'download_timeout'
                    complete(param)
                end
            else
                retry_count = retry_count + 1
                self:_loadUnit(id, url, complete, retry_count)
            end
        else
            LogTool.Info('LiveBroadcast', '_loadUnit success ,id: ' .. id .. ',url:' .. url)
            xpcall(function()
                local wrapper = ProtoMgr.CreateMsg('Wrapper')
                wrapper:ParseFromString(res)
                local decodedMsg = ProtoMgr.CreateMsg('GameLiveSegment')
                decodedMsg:ParseFromString(wrapper.data)
                local units = {}
                for i = 1, #decodedMsg.actions do
                    table.insert(units, self:_parseUnit(decodedMsg.actions[i]))
                end
                
                local param = {}
                param.success = true
                param.id = id
                param.units = units
                param.url = url
                if complete then
                    complete(param)
                end
            end, function()
                local param = {}
                param.success = false
                param.id = id
                param.url = url
                param.message = 'parse_error'
                if complete then
                    complete(param)
                end
            end)
        end
    end

    LuaTools.AsyncHttpsGet(url, callback, 'application/octet-stream')
    TimeMgr.Delay(5, function()
        callback(nil, 'TIMEOUT')
    end)
end

--data:Object
function UI_LiveBroadcast:_parseUnit(data)
    local wrapper = ProtoMgr.CreateMsg('Wrapper')
    wrapper:ParseFromString(data.action_data)

    local param = {}
    param.timestamp = data.timestamp / 1000
    param.category = data.action_category
    param.name = string.sub(wrapper.name, 5, -1)

    local decodedMsg = ProtoMgr.CreateMsg(param.name)
    decodedMsg:ParseFromString(wrapper.data)
    param.data = decodedMsg

    return param
end

function UI_LiveBroadcast:_forceQuit()
    self.state = ELiveState.none
    UIMgr.Inst:Hide_LiveBroadcast()
    GameMgr.Inst:EnterLobby()
end

function UI_LiveBroadcast:OnScoreChangeConfirm()
    self.do_unit_cd = 0
    if self.segment_index > #self.segments then
        return false
    end

    local s = self.segments[self.segment_index]
    if not s.loaded then return false end
    if self.segment_index == #self.segments and self.unit_index > #s.units then
        return false
    end
    local u = s.units[self.unit_index]
    if u.name == 'NotifyGameEndResult' then
        UIMgr.Inst:Hide_ScoreChange()
        self:_doUnit(u, false, 0)
    end
end

function UI_LiveBroadcast:_get_newround(segment_index, unit_index)
    local current_unit = self.segments[segment_index].units[unit_index]
    local last_newround_segment = -1
    local last_newround_unit = -1
    --找到离当前unit最近的RecordNewRound
    for i = self.segment_index, 1, -1 do
        local s = self.segments[i]
        local flag = true
        for j = #s.units, 1, -1 do
            if s.units[j].timestamp <= current_unit.timestamp and flag then
                if s.units[j].name == 'RecordNewRound' then
                    last_newround_segment = i
                    last_newround_unit = j
                    flag = false
                end
            end
        end
    end
    return last_newround_segment, last_newround_unit
end

return UI_LiveBroadcast
