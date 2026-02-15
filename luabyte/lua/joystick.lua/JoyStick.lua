require("GameUtility")

---@class JoyStick
JoyStick = {
    ---@type JoyStick
    Inst = nil
}
local EMJ_Mode = GameUtility.EMJ_Mode

local npadState = nil
local npadStyle = nil
local npadId = nil

function JoyStick:Init()
    local o = {}
    setmetatable(o, self)
    self.__index = self
    if not CatfoodSDK then
        return
    end
    self.Inst = o
    o.joycon = CatfoodSDK.JoyStickController.Inst
    -- o.t = UnityEngine.GameObject.Find('logswitch').transform:GetComponent(typeof(UnityEngine.UI.Text))
    o.joycon:InitJoyStick(function()
        UI_DesktopInfo.Inst:RefreshHandpaiButton(true)
        o.tag:SetActive(false)
        -- o.t.text = o.t.text .. ':' .. pt.block(o.player_replay) .. UnityEngine.Time.time .. '||'
        o.timerMgr:DelayFrame(1, function()
            o.player_replay = false
        end)
        if UI_Replay and UI_Replay.Inst and UI_Replay.Inst.transform.gameObject.activeSelf then
            UI_Replay.Inst.transform:Find('root'):Find('nslight').gameObject:SetActive(true)

            for i = 1, 4 do
                if UI_DesktopInfo.Inst.player_infos[i].headbtn and UI_DesktopInfo.Inst.player_infos[i].headbtn.enable then
                    UI_DesktopInfo.Inst.player_infos[i].headbtn:_close()
                end
            end
            self.last_char_index = nil
            UI_Replay.Inst.page_paishan.hide()
        end
        if UI_Replay_Cell and UI_Replay_Cell.Inst and UI_Replay_Cell.Inst.transform.gameObject.activeSelf then
            for i = 1, 4 do
                if UI_DesktopInfo.Inst.player_infos[i].headbtn and UI_DesktopInfo.Inst.player_infos[i].headbtn.enable then
                    UI_DesktopInfo.Inst.player_infos[i].headbtn:_close()
                end
            end
            self.last_char_index = nil
            UI_Replay_Cell.Inst.transform:Find('root'):Find('nslight').gameObject:SetActive(true)
        end
    end, function()
        JoyStick.Inst:TriggerMouseEffect()
    end)

    npadState = nn.hid.NpadState.New()
    npadStyle = nn.hid.NpadStyle.Invalid
    npadId = nn.hid.NpadId.Invalid

    o:OnInit()
end

function JoyStick:OnInit()
    self.timerMgr = TimerMgr:Init()
    self.cd_time = 0
    self.cd_first = 0.2
    self.cd_delay = 0.1
    self.during_joycon = false
    self.opening_pages = {}
    self.rightbanner_open = false
    self.leftbanner_open = false
    -- 二级页面打开以后加锁
    self.pagelock = false
    self.ingame = false
    self.btn_funcs = {}

    self.inited = true
end

function JoyStick:InJiesuan()
    if UI_ScoreChange and UI_ScoreChange.Inst and UI_ScoreChange.Inst.transform.gameObject.activeSelf then
        return true
    end
    if UI_GameEnd and UI_GameEnd.Inst and UI_GameEnd.Inst.transform.gameObject.activeSelf then
        return true
    end
    if UI_Win and UI_Win.Inst and UI_Win.Inst.transform.gameObject.activeSelf then
        return true
    end
    if UI_SelectGap and UI_SelectGap.Inst and UI_SelectGap.Inst.transform.gameObject.activeSelf then
        return true
    end
    return false
end

-- 左右面板同时只支持按一个 只处理对局中的页面
function JoyStick:_update()
    if not self.inited then
        return
    end
    if not self.ingame then
        if self.player_replay then
            self.player_replay = false
            self.joycon:SetTemporary(false)
            if UI_DesktopInfo and UI_DesktopInfo.Inst then
                UI_DesktopInfo.Inst:RefreshHandpaiButton(true)
            end
        end
        return
    end
    if not self.tag then
        self.tag = self.joycon:GetCursor()
    end

    if self:UpdatePadState() then
        if DesktopMgr.Inst:is_playing_effect() then
            return
        end
        -- if UnityEngine.Input.GetKeyDown(UnityEngine.KeyCode.J) or UnityEngine.Input.GetKeyDown(UnityEngine.KeyCode.JoyStickButton4) then
        if npadState:GetButtonDown(nn.hid.NpadButton.ZL) or UnityEngine.Input.GetKeyDown(UnityEngine.KeyCode.J) then
            -- 快捷按钮
            -- self.t.text = 'L'  .. pt.block(self.player_replay)
            if self.player_replay or self:InJiesuan() then
                return
            end
            self.during_joycon = true
            if self.btn_funcs[nn.hid.NpadButton.ZL] then
                local f = self.btn_funcs[nn.hid.NpadButton.ZL]
                f()
                return
            end
            self:OpenLeftBanner(nn.hid.NpadButton.ZL)
        end
        -- if UnityEngine.Input.GetKeyUp(UnityEngine.KeyCode.J) or UnityEngine.Input.GetKeyUp(UnityEngine.KeyCode.JoyStickButton4) then
        if npadState:GetButtonUp(nn.hid.NpadButton.ZL) or UnityEngine.Input.GetKeyUp(UnityEngine.KeyCode.J) then
            -- 快捷按钮
            if self.player_replay or self:InJiesuan() then
                return
            end
            self.during_joycon = true
            self:CloseLeftBanner()
        end
        -- -- if UnityEngine.Input.GetKeyDown(UnityEngine.KeyCode.L) or UnityEngine.Input.GetKeyDown(UnityEngine.KeyCode.JoyStickButton5) then
        if npadState:GetButtonDown(nn.hid.NpadButton.ZR) or UnityEngine.Input.GetKeyDown(UnityEngine.KeyCode.L) then
            if self.player_replay or self:InJiesuan() then
                return
            end
            -- 表情页面
            self.during_joycon = true
            if self.btn_funcs[nn.hid.NpadButton.ZR] then
                local f = self.btn_funcs[nn.hid.NpadButton.ZR]
                f()
                return
            end
            if DesktopMgr.Inst.mode == EMJ_Mode.play then
                self:OpenRightBanner()
            else
                if (DesktopMgr.Inst.mode == EMJ_Mode.paipu or DesktopMgr.Inst.mode == EMJ_Mode.live_broadcast) and
                    not self.player_replay then
                    -- 进入牌谱播放的引导页面
                    -- self.t.text = self.t.text .. 'SetTemper' .. UnityEngine.Time.time
                    self.player_replay = true
                    self.joycon:SetTemporary(self.player_replay)
                    self.tag:SetActive(true)
                    if self.last_char_index then
                        if UI_DesktopInfo.Inst.player_infos[self.last_char_index].headbtn and
                            UI_DesktopInfo.Inst.player_infos[self.last_char_index].headbtn.enable then
                            UI_DesktopInfo.Inst.player_infos[self.last_char_index].headbtn:_close()
                        end
                        self.last_char_index = nil
                    end
                    UI_DesktopInfo.Inst:RefreshHandpaiButton(not self.player_replay)
                    if UI_Replay and UI_Replay.Inst and UI_Replay.Inst.transform.gameObject.activeSelf then
                        UI_Replay.Inst.transform:Find('root'):Find('nslight').gameObject:SetActive(false)
                        UI_Replay.Inst.page_paishan.hide()
                    end
                    if UI_Replay_Cell and UI_Replay_Cell.Inst and UI_Replay_Cell.Inst.transform.gameObject.activeSelf then
                        UI_Replay_Cell.Inst.transform:Find('root'):Find('nslight').gameObject:SetActive(false)
                    end
                end
            end
        end

        -- -- if UnityEngine.Input.GetKeyUp(UnityEngine.KeyCode.L) or UnityEngine.Input.GetKeyDown(UnityEngine.KeyCode.JoyStickButton5) then
        if npadState:GetButtonUp(nn.hid.NpadButton.ZR) or UnityEngine.Input.GetKeyUp(UnityEngine.KeyCode.L) then
            -- 表情页面
            if self.player_replay or self:InJiesuan() then
                return
            end
            self.during_joycon = true
            if DesktopMgr.Inst.mode == EMJ_Mode.play then
                self:CloseRightBanner()
            end
        end

        if npadState:GetButtonDown(nn.hid.NpadButton.X) or UnityEngine.Input.GetKeyUp(UnityEngine.KeyCode.U) then
            if self.btn_funcs[nn.hid.NpadButton.X] then
                local f = self.btn_funcs[nn.hid.NpadButton.X]
                f()
                return
            end
            if UI_OtherPlayerInfo and UI_OtherPlayerInfo.Inst and
                UI_OtherPlayerInfo.Inst.transform.gameObject.activeSelf then
                UIMgr.Inst:Hide_OtherPlayerInfo()
            else
                self.cd_time = UnityEngine.Time.time + self.cd_first
            end
            self.during_joycon = true
            -- X 显示自己资料 再按一次取消
            -- 长按X+方向键显示四家资料
        end

        if npadState:GetButtonDown(nn.hid.NpadButton.Y) or UnityEngine.Input.GetKeyDown(UnityEngine.KeyCode.Y) then
            if self.player_replay or self:InJiesuan() then
                return
            end
            self.during_joycon = true
            if self.btn_funcs[nn.hid.NpadButton.Y] then
                local f = self.btn_funcs[nn.hid.NpadButton.Y]
                f()
                return
            end
            if UI_TingPai and UI_TingPai.Inst and UI_TingPai.Inst.transform.gameObject.activeSelf then
                UI_TingPai.Inst:Btn_Show()
            end
            UI_DesktopInfo.Inst:Btn_ChangeScore()
        end

        if npadState:GetButtonUp(nn.hid.NpadButton.Y) or UnityEngine.Input.GetKeyUp(UnityEngine.KeyCode.Y) then

            self.during_joycon = true
            if UI_TingPai and UI_TingPai.Inst and UI_TingPai.Inst.transform.gameObject.activeSelf then
                UI_TingPai.Inst:HideRoot()
            end
        end

        if DesktopMgr and DesktopMgr.Inst then
            if DesktopMgr.Inst.mode == EMJ_Mode.play or not self.player_replay then
                if npadState:GetButtonUp(nn.hid.NpadButton.R) or UnityEngine.Input.GetKeyUp(UnityEngine.KeyCode.H) then

                    if self:InJiesuan() then
                        return
                    end

                    if UI_Config and UI_Config.Inst and UI_Config.Inst.transform.gameObject.activeSelf then
                        UI_Config.Inst:NextTab()
                        return
                    end
                    --役种展示
                    if UI_Rules and UI_Rules.Inst and UI_Rules.Inst.transform.gameObject.activeSelf then
                        UI_Rules.Inst.page_rule:NextTab()
                        return
                    end
                    if UI_OtherPlayerInfo and UI_OtherPlayerInfo.Inst and
                        UI_OtherPlayerInfo.Inst.transform.gameObject.activeSelf then
                        UI_OtherPlayerInfo.Inst:ShowNextTag()
                        return
                    end

                    self.during_joycon = true
                    if not self.last_char_index then
                        self.last_char_index = 2
                    end
                    local index = DesktopMgr.Inst:seat2LocalPosition(self.last_char_index)
                    if UI_DesktopInfo.Inst.player_infos[index].headbtn and
                        UI_DesktopInfo.Inst.player_infos[index].headbtn.enable then
                        UI_DesktopInfo.Inst.player_infos[index].headbtn:_close()
                    end
                    self.last_char_index = self.last_char_index - 1
                    if self.last_char_index < 1 then
                        self.last_char_index = DesktopMgr.Inst:get_player_count()
                    end
                    index = DesktopMgr.Inst:seat2LocalPosition(self.last_char_index)
                    LuaTools.AutoClickButton(UI_DesktopInfo.Inst.player_infos[index].headbtn.btn_head)
                end
                if npadState:GetButtonUp(nn.hid.NpadButton.L) or UnityEngine.Input.GetKeyUp(UnityEngine.KeyCode.G) then

                    if self:InJiesuan() then
                        return
                    end
                    -- 设置
                    if UI_Config and UI_Config.Inst and UI_Config.Inst.transform.gameObject.activeSelf then
                        UI_Config.Inst:LastTab()
                        return
                    end
                    --役种展示
                    if UI_Rules and UI_Rules.Inst and UI_Rules.Inst.transform.gameObject.activeSelf then
                        UI_Rules.Inst.page_rule:PrevTab()
                        return
                    end
                    -- 角色信息
                    if UI_OtherPlayerInfo and UI_OtherPlayerInfo.Inst and
                        UI_OtherPlayerInfo.Inst.transform.gameObject.activeSelf then
                        UI_OtherPlayerInfo.Inst:ShowLastTag()
                        return
                    end
                    self.during_joycon = true
                    -- 切换目标
                    if not self.last_char_index then
                        self.last_char_index = 2
                    end
                    local index = DesktopMgr.Inst:seat2LocalPosition(self.last_char_index)

                    if UI_DesktopInfo.Inst.player_infos[index].headbtn and
                        UI_DesktopInfo.Inst.player_infos[index].headbtn.enable then
                        UI_DesktopInfo.Inst.player_infos[index].headbtn:_close()
                    end
                    self.last_char_index = self.last_char_index + 1

                    if self.last_char_index > DesktopMgr.Inst:get_player_count() then
                        self.last_char_index = 1
                    end
                    index = DesktopMgr.Inst:seat2LocalPosition(self.last_char_index)
                    LuaTools.AutoClickButton(UI_DesktopInfo.Inst.player_infos[index].headbtn.btn_head)
                end
            end
        end

        -- -- if UnityEngine.Input.GetKeyDown(UnityEngine.KeyCode.U) then
        if npadState:GetButtonDown(nn.hid.NpadButton.StickL) or npadState:GetButtonDown(nn.hid.NpadButton.StickR) then
            -- R3/L3 MD5
            if self:InJiesuan() then
                return
            end
            if self.player_replay then
                return
            end
            self.during_joycon = true
            UI_DesktopInfo.Inst.container_lefttop:Btn_MD5Change()
        end

        -- if UnityEngine.Input.GetKeyDown(UnityEngine.KeyCode.E) or UnityEngine.Input.GetKey(UnityEngine.KeyCode.JoyStickButton8) then
        if (npadState:GetButtonDown(nn.hid.NpadButton.Plus) or UnityEngine.Input.GetKeyDown(UnityEngine.KeyCode.E)) then
            if self:InJiesuan() then
                return
            end
            if self.player_replay then
                return
            end
            if UI_OtherPlayerInfo.Inst.transform.gameObject.activeSelf or
                UI_MJVoteEnd.Inst.transform.gameObject.activeSelf or
                UI_SecondConfirm.Inst.transform.gameObject.activeSelf then
                return
            end
            self.during_joycon = true
            if UI_Config and UI_Config.Inst and not UI_Config.Inst.transform.gameObject.activeSelf then
                UIMgr.Inst:Show_Config()
            elseif UI_Config and UI_Config.Inst then
                UIMgr.Inst:Hide_Config()
            end
            -- 弹出设置 +
        end

        -- -- if UnityEngine.Input.GetKeyDown(UnityEngine.KeyCode.Q) or UnityEngine.Input.GetKey(UnityEngine.KeyCode.JoyStickButton9) then
        if npadState:GetButtonDown(nn.hid.NpadButton.Minus) or UnityEngine.Input.GetKeyDown(UnityEngine.KeyCode.I) then
            -- 退出游戏/番种 -
            if self:InJiesuan() then
                return
            end
            if UI_Config.Inst.transform.gameObject.activeSelf then
                return
            end
            if UI_OtherPlayerInfo.Inst.transform.gameObject.activeSelf or
                UI_MJVoteEnd.Inst.transform.gameObject.activeSelf or
                UI_SecondConfirm.Inst.transform.gameObject.activeSelf then
                return
            end
            self.during_joycon = true
            if UI_DesktopInfo.Inst.container_righttop.btn_startvote.transform.gameObject.activeSelf then
                UI_DesktopInfo.Inst.container_righttop:Btn_StartVote()
                -- elseif UI_DesktopInfo.Inst.container_righttop.btn_fanzhong.transform.gameObject.activeSelf then
                --     UI_DesktopInfo.Inst.container_righttop:Btn_FanZhong()
            else
                UI_DesktopInfo.Inst.container_righttop:Btn_Leave()
            end
        end

        -- 短按
        if UnityEngine.Input.GetKeyDown(UnityEngine.KeyCode.A) or npadState:GetButtonDown(nn.hid.NpadButton.Left) then
            self.during_joycon = true
            if DesktopMgr.Inst.mode == EMJ_Mode.play or (not self.player_replay) then
                self:ButtonLeftPlay()
            elseif DesktopMgr.Inst.mode == EMJ_Mode.paipu then
                self:ButtonLeftReplay()
            end
            -- self.cd_time = UnityEngine.Time.time + 0.5

        end
        if UnityEngine.Input.GetKeyDown(UnityEngine.KeyCode.D) or npadState:GetButtonDown(nn.hid.NpadButton.Right) then
            self.during_joycon = true
            if DesktopMgr.Inst.mode == EMJ_Mode.play or (not self.player_replay) then
                self:ButtonRightPlay()
            elseif DesktopMgr.Inst.mode == EMJ_Mode.paipu then
                self:ButtonRightReplay()
            end
            -- self.cd_time = UnityEngine.Time.time + 0.5
        end
        -- 选
        if UnityEngine.Input.GetKeyDown(UnityEngine.KeyCode.W) or npadState:GetButtonDown(nn.hid.NpadButton.Up) then
            self.during_joycon = true
            if DesktopMgr.Inst.mode == EMJ_Mode.play then
                self:ButtonUpPage()
            elseif not self.player_replay then
                self:ButtonUpReplay()
            end
            -- self.cd_time = UnityEngine.Time.time + 0.5
        end

        if UnityEngine.Input.GetKeyDown(UnityEngine.KeyCode.S) or npadState:GetButtonDown(nn.hid.NpadButton.Down) then
            self.during_joycon = true
            if DesktopMgr.Inst.mode == EMJ_Mode.play then
                self:ButtonDownPlay()
            elseif not self.player_replay then
                self:ButtonDownReplay()
            end
            -- self.cd_time = UnityEngine.Time.time + 0.5
        end

        -- 区分长按
        if UnityEngine.Input.GetKey(UnityEngine.KeyCode.A) or npadState:GetButton(nn.hid.NpadButton.Left) then
            if self:LockingLonghandle() then
                return
            end
            self.during_joycon = true
            if UnityEngine.Time.time > self.cd_time and npadState.preButtons == npadState.buttons then
                if DesktopMgr.Inst.mode == EMJ_Mode.play or (not self.player_replay) then
                    self:ButtonLeftPlay(true)
                elseif DesktopMgr.Inst.mode == EMJ_Mode.paipu then
                    -- self:ButtonLeftReplay(true)
                end
                self.cd_time = UnityEngine.Time.time + self.cd_delay
            end
        end
        if UnityEngine.Input.GetKey(UnityEngine.KeyCode.D) or npadState:GetButton(nn.hid.NpadButton.Right) then
            if self:LockingLonghandle() then
                return
            end
            self.during_joycon = true
            if UnityEngine.Time.time > self.cd_time and npadState.preButtons == npadState.buttons then
                if DesktopMgr.Inst.mode == EMJ_Mode.play or (not self.player_replay) then
                    self:ButtonRightPlay(true)
                else
                    -- self:ButtonRightReplay(true)
                end
                self.cd_time = UnityEngine.Time.time + self.cd_delay
            end
        end

        if npadState:GetButtonDown(nn.hid.NpadButton.A) or UnityEngine.Input.GetKeyDown(UnityEngine.KeyCode.C) then
            self.during_joycon = true
            self:ButtonConfirm()
            self:TriggerMouseEffect()
        end

        if npadState:GetButton(nn.hid.NpadButton.StickRRight) then
            if self:InJiesuan() then
                return
            end
            self.during_joycon = true
            self.joycon:PendingScrollByAxisButton(3)
        end

        if npadState:GetButton(nn.hid.NpadButton.StickRLeft) then
            if self:InJiesuan() then
                return
            end
            self.during_joycon = true
            self.joycon:PendingScrollByAxisButton(4)
        end

        if npadState:GetButton(nn.hid.NpadButton.StickRDown) or UnityEngine.Input.GetKey(UnityEngine.KeyCode.N) then
            if self:InJiesuan() then
                return
            end
            self.during_joycon = true
            self.joycon:PendingScrollByAxisButton(2)
        end

        if npadState:GetButton(nn.hid.NpadButton.StickRUp) then
            if self:InJiesuan() then
                return
            end
            self.during_joycon = true
            self.joycon:PendingScrollByAxisButton(1)
        end
        if npadState:GetButtonDown(nn.hid.NpadButton.B) or UnityEngine.Input.GetKeyDown(UnityEngine.KeyCode.X) then
            -- 牌山
            self.during_joycon = true
            if self.btn_funcs[nn.hid.NpadButton.B] then
                local f = self.btn_funcs[nn.hid.NpadButton.B]
                f()
                return
            end
            if DesktopMgr.Inst.mode == EMJ_Mode.paipu and UI_Replay and UI_Replay.Inst and #self.opening_pages == 0 then
                if self.player_replay then
                    return
                end
                if UI_Replay and UI_Replay.Inst and UI_Replay.Inst.transform.gameObject.activeSelf then
                    UI_Replay.Inst.page_paishan.show()
                end
            else
                self:ButtonTryClose()
            end
        end
        -- if true then
        --     return
        -- end
    end
end

-- 判断是否
function JoyStick:LockingLonghandle()
    if UI_LiqiZimo and UI_LiqiZimo.Inst and UI_LiqiZimo.Inst.transform.gameObject.activeInHierarchy then
        return true
    end

    if UI_ChiPengHu and UI_ChiPengHu.Inst and UI_ChiPengHu.Inst.transform.gameObject.activeInHierarchy then
        return true
    end

    if UI_SelectGap and UI_SelectGap.Inst and UI_SelectGap.Inst.transform.gameObject.activeInHierarchy then
        return true
    end

    if DesktopMgr.Inst.mainrole._during_liqi then
        return true
    end

    return false
end

function JoyStick:ButtonLeftPlay(skip)
    if not self.inited then
        return
    end
    -- if DesktopMgr.Inst.mode ~= EMJ_Mode.play then return end
    if UnityEngine.Time.time < self.cd_time then
        return
    end
    if not skip then
        self.cd_time = UnityEngine.Time.time + self.cd_first
    end
    if self:NeedChoosePai() or
        (not self.interactable_objs or (self.interactable_objs.Length and self.interactable_objs.Length <= 0)) then
        DesktopMgr.Inst.mainrole:ChooseLastPai(skip)
    else
        self:OnSelect('left')
    end
end

function JoyStick:ButtonLeftReplay(skip)
    if not self.inited then
        return
    end
    if DesktopMgr.Inst.mode ~= EMJ_Mode.paipu then
        return
    end
    if UnityEngine.Time.time < self.cd_time then
        return
    end
    if not skip then
        self.cd_time = UnityEngine.Time.time + self.cd_first
    end
    if self:NeedChoosePai() or
        (not self.interactable_objs or (self.interactable_objs.Length and self.interactable_objs.Length <= 0)) then
        if UI_Replay and UI_Replay.Inst and UI_Replay.Inst.transform.gameObject.activeSelf then
            if npadState:GetButton(nn.hid.NpadButton.A) then
                UI_Replay.Inst:Btn_PreXun()
            else
                UI_Replay.Inst:Btn_PreStep()
            end
        end
        if UI_Replay_Cell and UI_Replay_Cell.Inst and UI_Replay_Cell.Inst.transform.gameObject.activeSelf then
            if npadState:GetButton(nn.hid.NpadButton.A) then
                UI_Replay_Cell.Inst:Btn_PreXun()
            else
                UI_Replay_Cell.Inst:Btn_PreStep()
            end
        end
    else
        if self.now_page and self.now_select_obj then
            self:OnSelect('left')
        end
    end
end

function JoyStick:ButtonRightPlay(skip)
    if not self.inited then
        return
    end
    -- if DesktopMgr.Inst.mode ~= EMJ_Mode.play then return end
    if UnityEngine.Time.time < self.cd_time then
        return
    end
    if not skip then
        self.cd_time = UnityEngine.Time.time + self.cd_first
    end
    if self:NeedChoosePai() or
        (not self.interactable_objs or (self.interactable_objs.Length and self.interactable_objs.Length <= 0)) then
        DesktopMgr.Inst.mainrole:ChooseNextPai(skip)
    else
        -- if self.now_page and self.now_select_obj then
        self:OnSelect('right')
        -- end
    end
end

function JoyStick:ButtonRightReplay(skip)
    if not self.inited then
        return
    end
    -- if DesktopMgr.Inst.mode ~= EMJ_Mode.paipu then return end
    if UnityEngine.Time.time < self.cd_time then
        return
    end
    if not skip then
        self.cd_time = UnityEngine.Time.time + self.cd_first
    end
    -- if not self.interactable_objs or (self.interactable_objs.Length and self.interactable_objs.Length <= 0) then
    if self:NeedChoosePai() or
        (not self.interactable_objs or (self.interactable_objs.Length and self.interactable_objs.Length <= 0)) then
        if UI_Replay and UI_Replay.Inst and UI_Replay.Inst.transform.gameObject.activeSelf then
            if npadState:GetButton(nn.hid.NpadButton.A) then
                UI_Replay.Inst:Btn_NextXun()
            else
                UI_Replay.Inst:Btn_NextStep()
            end
        end

        if UI_Replay_Cell and UI_Replay_Cell.Inst and UI_Replay_Cell.Inst.transform.gameObject.activeSelf then
            if npadState:GetButton(nn.hid.NpadButton.A) then
                UI_Replay_Cell.Inst:Btn_NextXun()
            else
                UI_Replay_Cell.Inst:Btn_NextStep()
            end
        end
    else
        if self.now_page and self.now_select_obj then
            self:OnSelect('right')
        end
    end
end

function JoyStick:ButtonDownPlay(skip)
    if not self.inited then
        return
    end
    -- if DesktopMgr.Inst.mode ~= EMJ_Mode.play then return end
    if UnityEngine.Time.time < self.cd_time then
        return
    end
    if not skip then
        self.cd_time = UnityEngine.Time.time + self.cd_first
    end
    if self.now_page and self.now_select_obj then
        self:OnSelect('down')
    end
end

function JoyStick:ButtonDownReplay(skip)
    if not self.inited then
        return
    end
    if DesktopMgr.Inst.mode ~= EMJ_Mode.paipu and DesktopMgr.Inst.mode ~= EMJ_Mode.live_broadcast then
        return
    end
    if UnityEngine.Time.time < self.cd_time then
        return
    end
    if not skip then
        self.cd_time = UnityEngine.Time.time + self.cd_first
    end
    if not self.interactable_objs or (self.interactable_objs.Length and self.interactable_objs.Length <= 0) then
        if UI_Replay and UI_Replay.Inst and UI_Replay.Inst.transform and UI_Replay.Inst.transform.gameObject.activeSelf then
            UI_Replay.Inst:Btn_NextRound()
        end
        if UI_Replay_Cell and UI_Replay_Cell.Inst and UI_Replay_Cell.Inst.transform and
            UI_Replay_Cell.Inst.transform.gameObject.activeSelf then
            UI_Replay_Cell.Inst:Btn_PreRound()
        end
    else
        if self.now_page and self.now_select_obj then
            self:OnSelect('down')
        end
    end
end

function JoyStick:ButtonUpReplay(skip)
    if not self.inited then
        return
    end
    if DesktopMgr.Inst.mode ~= EMJ_Mode.paipu and DesktopMgr.Inst.mode ~= EMJ_Mode.live_broadcast then
        return
    end
    if UnityEngine.Time.time < self.cd_time then
        return
    end
    if not skip then
        self.cd_time = UnityEngine.Time.time + self.cd_first
    end
    if not self.interactable_objs or (self.interactable_objs.Length and self.interactable_objs.Length <= 0) then
        if UI_Replay and UI_Replay.Inst and UI_Replay.Inst.transform and UI_Replay.Inst.transform.gameObject.activeSelf then
            UI_Replay.Inst:Btn_PreRound()
        end
        if UI_Replay_Cell and UI_Replay_Cell.Inst and UI_Replay_Cell.Inst.transform and
            UI_Replay_Cell.Inst.transform.gameObject.activeSelf then
            UI_Replay_Cell.Inst:Btn_PreRound()
        end
    else
        if self.now_page and self.now_select_obj then
            self:OnSelect('up')
        end
    end
end

function JoyStick:ButtonConfirm()
    if not self.inited then
        return
    end
    -- if DesktopMgr.Inst.mode ~= EMJ_Mode.play then return end
    if self.last_char_index then
        if UI_DesktopInfo.Inst.player_infos[self.last_char_index].headbtn and
            UI_DesktopInfo.Inst.player_infos[self.last_char_index].headbtn.enable then
            UI_DesktopInfo.Inst.player_infos[self.last_char_index].headbtn:_close()
        end
        self.last_char_index = nil
    end
    if self.player_replay then
        return
    end
    if self.tag and self.tag.activeSelf and not self:NeedChoosePai() then
        self.joycon:OnButtonClick()
    else
        if self.now_select_obj and not self.on_select and not self:NeedChoosePai() then
            LuaTools.AutoClickButton(self.now_select_obj)
        else
            if DesktopMgr.Inst.mode == EMJ_Mode.play then
                DesktopMgr.Inst.mainrole:ButtonConfirm()
            elseif DesktopMgr.Inst.mode == EMJ_Mode.paipu then
                if UI_Replay and UI_Replay.Inst and UI_Replay.Inst.transform.gameObject.activeSelf then
                    UI_Replay.Inst:Btn_Play()
                end
                if UI_Replay_Cell and UI_Replay_Cell.Inst and UI_Replay_Cell.Inst.transform.gameObject.activeSelf then
                    UI_Replay_Cell.Inst:Btn_Play()
                end
            end
        end
    end
end

function JoyStick:ButtonTryClose()
    if not self.inited then
        return
    end
    if self.last_char_index then
        if UI_DesktopInfo.Inst.player_infos[self.last_char_index].headbtn and
            UI_DesktopInfo.Inst.player_infos[self.last_char_index].headbtn.enable then
            UI_DesktopInfo.Inst.player_infos[self.last_char_index].headbtn:_close()
        end
        self.last_char_index = nil
    end
    local close_page = false
    if self.opening_pages[1] and not self.opening_pages[1].root.locking then
        self:ClosePage(self.opening_pages[1].root)
        close_page = true
    end
    self.pagelock = false

    if #self.opening_pages == 0 and not close_page then
        DesktopMgr.Inst.mainrole:ChooseRecentPai()
    end
end

function JoyStick:OpenLeftBanner()
    if not self.inited then
        return
    end
    if self.rightbanner_open then
        return
    end
    -- 按钮再次点击是关闭，关闭后的可以选择页面应该是自摸/吃碰页面
    if DesktopMgr.Inst.mode == EMJ_Mode.play then
        UI_DesktopInfo.Inst.container_func:Btn_Func(1)
    elseif DesktopMgr.Inst.mode == EMJ_Mode.paipu then
        UI_Replay.Inst.paipuconfig.switch(1)
    elseif DesktopMgr.Inst.mode == EMJ_Mode.live_broadcast then
        UI_LiveBroadcast_New.Inst.liveconfig.switch(1)
    end
    self.leftbanner_open = true
end

function JoyStick:CloseLeftBanner()
    if not self.inited then
        return
    end
    if (not self.leftbanner_open) or (self.rightbanner_open) then
        return
    end
    -- 按钮再次点击是关闭，关闭后的可以选择页面应该是自摸/吃碰页面
    if DesktopMgr.Inst.mode == EMJ_Mode.play then
        UI_DesktopInfo.Inst.container_func:Btn_Func(2)
    elseif DesktopMgr.Inst.mode == EMJ_Mode.paipu then
        UI_Replay.Inst.paipuconfig.switch(2)
    elseif DesktopMgr.Inst.mode == EMJ_Mode.live_broadcast then
        UI_LiveBroadcast_New.Inst.liveconfig.switch(2)
    end
    self.leftbanner_open = false
end

function JoyStick:ButtonLDown()
    if not self.inited then
        return
    end
    if not self.ButtonLFunc then
        self:OpenLeftBanner()
    else
        self.ButtonLFunc()
    end
end

function JoyStick:ButtonRDown()
    if not self.inited then
        return
    end
    if not self.ButtonRFunc then
        self:OpenRightBanner()
    else
        self.ButtonLFunc()
    end
end

function JoyStick:OpenRightBanner()
    if not self.inited then
        return
    end
    if self.leftbanner_open then
        return
    end
    UI_DesktopInfo.Inst.block_emo:_switchShow(1)
    self.rightbanner_open = true
end

function JoyStick:CloseRightBanner()
    if not self.inited then
        return
    end
    if not self.rightbanner_open or self.leftbanner_open then
        return
    end
    UI_DesktopInfo.Inst.block_emo:_switchShow(2)
    self.rightbanner_open = false
end

-- 手动调用当前页面弹出时是否可以选中牌
function JoyStick:SetChoosePai(can)
    if not self.inited then
        return
    end
    self.need_choose_pai = can
    if can then
        DesktopMgr.Inst.mainrole:ChooseCurrentPai()
    end
end

-- 判断是否强制需要选牌操作
function JoyStick:NeedChoosePai()
    if not self.inited then
        return
    end
    if UI_ChangeTile and UI_ChangeTile.Inst and UI_ChangeTile.Inst.transform.gameObject.activeSelf then
        if self.need_choose_pai and self.now_page and self.now_page.root == UI_ChangeTile.Inst then
            return true
        end
        return false
    end

    -- if #self.opening_pages == 0 then
    --     return true
    -- end
    return self.need_choose_pai
end

-- 弹窗类的页面可以互动区域
function JoyStick:SetPage(root, root_name, func_close, default)
    if not self.inited then
        return
    end
    if self.last_char_index then
        if UI_DesktopInfo.Inst.player_infos[self.last_char_index].headbtn and
            UI_DesktopInfo.Inst.player_infos[self.last_char_index].headbtn.enable then
            UI_DesktopInfo.Inst.player_infos[self.last_char_index].headbtn:_close()
        end
        self.last_char_index = nil
    end
    if not self.ingame or self.player_replay then
        return
    end
    local temp_name = ''
    local temp_obj = nil
    if self.now_page then
        temp_name = self.now_page.name
        temp_obj = self.now_select_obj
    end
    self:ResetPageData()
    local index = -1
    for i = 1, #self.opening_pages do
        if self.opening_pages[i].root == root then
            index = i
            self.opening_pages[index].during_close = false
            self.now_page = self.opening_pages[index]
        end
    end
    if index < 0 then
        local _t = {
            name = root_name,
            root = root,
            func_close = func_close,
            default_btn = default
        }
        table.insert(self.opening_pages, _t)
        -- self.now_page = _t
        -- else
        --     local _page = self.opening_pages[index]
        --     table.remove(self.opening_pages,index)
        --     table.insert(self.opening_pages,_page)
    end
    self:SortPage()
    self:ResetCursor(temp_name, temp_obj)
end

function JoyStick:ClosePage(root)
    if not self.inited then
        return
    end
    if not self.ingame or self.player_replay then
        return
    end
    local index = -1
    for i = 1, #self.opening_pages do
        if self.opening_pages[i].root == root then
            index = i
        end
    end
    if index < 0 then
        return
    end
    if self.opening_pages[index].during_close then
        LogTool.Warning('ClosePage', '尝试关闭正在关闭的页面: ' .. pt.block(self.opening_pages[index]))
        return
    end
    self.tag:SetActive(false)
    -- 屏幕点按钮需要调用closepage，防止死循环在这里加上锁
    self.opening_pages[index].during_close = true
    if self.opening_pages[index].func_close then
        self.opening_pages[index].func_close()
    end
    table.remove(self.opening_pages, index)

    local temp_name = ''
    local temp_obj = nil
    if self.now_page then
        temp_name = self.now_page.name
        temp_obj = self.now_select_obj
    end
    self:SortPage()
    self:ResetCursor(temp_name, temp_obj)
end

--用来判断ui层级
local page_layout = Basic.Enum({
    'UI_ErrorInfo',
    'UI_SecondConfirm',
    'UI_Hanguplogout',
    'UI_HangUpWarn',
    'UI_GameEnd',
    'UI_HuleShow',
    'UI_Win',
    'UI_Config',
    'UI_MD5Info',
    'UI_MJVoteEnd',
    'UI_OtherPlayerInfo',
    'UI_Rules',
    'UI_ScoreChange',
    'UI_Replay_Paishan',
    'UI_Replay_PaipuConfig',
    'UI_Replay',
    'UI_ChangeTile',
    'UI_SelectGap',
    'UI_LiqiZimo_Liqi',
    'UI_LiqiZimo_Detail',
    'UI_LiqiZimo_Btns',
    'UI_LiqiZimo',
    'UI_ChiPengHu_Detial',
    'UI_ChiPengHu',
    'UI_LiveBroadcast_New',
    'UI_BlockEmo',
    'UI_DesktopInfo',
})

function JoyStick:ResetCursor(temp_name, temp_obj)
    if not self.inited then
        return
    end
    if self.now_page and self.now_page.default_btn then
        -- 层级没变的话不需要重新设置目标
        if temp_name ~= self.now_page.name then
            self:SetSelect(self.now_page.default_btn)
        else
            self.now_select_obj = temp_obj
        end
        if self.tag then
            self.tag:SetActive(true)
        end
    end
end

function JoyStick:SortPage()
    if not self.inited then
        return
    end
    table.sort(self.opening_pages, function(a, b)
        return page_layout[a.name] < page_layout[b.name]
    end)

    local str = 'pages:'
    for i = 1, #self.opening_pages do
        str = str .. ' ' .. (self.opening_pages[i].name)
    end
    self.now_page = self.opening_pages[1]
    if not self.now_page then
        self:ResetPageData()
    else
        self.interactable_objs = self.now_page.root.transform:GetComponentsInChildren(typeof(UnityEngine.UI.Button),
            true)
    end
end

function JoyStick:ResetPageData()
    if not self.inited then
        return
    end
    if self.tag then
        self.tag:SetActive(false)
    end
    self.now_page = nil
    self.now_select_obj = nil
    self.interactable_objs = nil
    self.last_char_index = 1
end

function JoyStick:ButtonUpPage()
    if not self.inited then
        return
    end
    if not self.now_page and #self.opening_pages > 0 then
        self.now_page = self.opening_pages[#self.opening_pages]
    end

    if UI_ChangeTile and UI_ChangeTile.Inst and UI_ChangeTile.Inst.transform.gameObject.activeSelf then
        if not self.now_page or self.now_page.root == UI_ChangeTile.Inst then
            LuaTools.AutoClickButton(UI_ChangeTile.Inst.btn_confirm)
            return
        end
    end
    if self.now_page then
        if not self.now_select_obj then
            DesktopMgr.Inst.mainrole:_resetJoyStickState()
            self:SortPage()
            if not self.interactable_objs then
                self.interactable_objs = {}
            end
            self:SetSelect(self.interactable_objs[0])
        else
            self:OnSelect('up')
        end
    end
end

function JoyStick:SetSelect(obj)
    if not self.inited then
        return
    end
    self.now_select_obj = obj
    if obj and obj.transform and obj.transform.gameObject then
        self.tag:SetActive(true)
        self:SetTarget(obj.transform.gameObject)
    end
end

function JoyStick:OnSelect(axis)
    if not self.inited then
        return
    end
    self.on_select = true
    if not self.tag then
        self.tag = self.joycon:GetCursor()
    end
    local origin_pos = UnityEngine.Camera.main:WorldToScreenPoint(self.tag.transform.position)
    local temp_obj = self.now_select_obj
    local count = 0
    if self.interactable_objs then
        for i = 0, self.interactable_objs.Length - 1 do
            if not temp_obj or Tools.IsNil(temp_obj) then
                temp_obj = self.interactable_objs[i]
            else
                if self.interactable_objs[i] ~= temp_obj and
                    self.interactable_objs[i].transform.gameObject.activeInHierarchy then
                    -- 判断下一个按钮在哪
                    count = count + 1
                    local s = self:PendingSearch(axis, self.interactable_objs[i], origin_pos, temp_obj)
                    if s then
                        temp_obj = self.interactable_objs[i]
                    end
                end
            end
        end
    end

    if temp_obj then
        self:SortPage()
        if not temp_obj.transform.gameObject.activeInHierarchy and
            (not self.interactable_objs or self.interactable_objs.Length == 0) then
            self.tag:SetActive(false)
            self.on_select = false
            return
        end
    else
        LogTool.Warning('SelectObj', '选中目标异常！')
    end
    if not self:PendingScroll(axis, self.now_select_obj, temp_obj) then
        self:SetSelect(temp_obj)
    end
    self.on_select = false
end

function JoyStick:PendingSearch(axis, res, ori, temp)
    if not self.inited then
        return
    end
    local index = 0
    if axis == 'up' then
        index = 1
    elseif axis == 'down' then
        index = 2
    elseif axis == 'right' then
        index = 3
    elseif axis == 'left' then
        index = 4
    end
    if Tools.IsNil(self.now_select_obj) then
        return self.joycon:SearchObj(index, temp.transform.gameObject, temp.transform.gameObject,
            res.transform.gameObject)
    else
        return self.joycon:SearchObj(index, self.now_select_obj.transform.gameObject, temp.transform.gameObject,
            res.transform.gameObject)
    end
end

function JoyStick:PendingScroll(axis, pre, newselect)
    if not self.inited then
        return
    end
    local index = 0
    if axis == 'up' then
        index = 1
    elseif axis == 'down' then
        index = 2
    elseif axis == 'right' then
        index = 3
    elseif axis == 'left' then
        index = 4
    end
    if newselect then
        return self.joycon:PendingScroll(index, pre.transform.gameObject, newselect.transform.gameObject)
    else
        return self.joycon:PendingScroll(index, pre.transform.gameObject)
    end
end

-- 对局中与非对局中逻辑不一样
-- mode : 1 对局 2 牌谱 3 观战
function JoyStick:TriggerGame(mode)
    if not self.inited then
        return
    end
    self.timerMgr:ClearAllTimers()
    LogTool.Info('InitRoom', 'JoyStick trigger game, mode: ' .. pt.block(mode))
    if mode then
        self.timerMgr:LoopFrame(1, -1, function()
            self:_update()
        end)
    end
    self:ResetData()
    self.ingame = mode == EMJ_Mode.play
    self.opening_pages = {}
    self:ResetPageData()
    self.joycon:SetTrigger(mode == EMJ_Mode.play)
end

function JoyStick:ResetData()
    if not self.inited then
        return
    end
    self.player_replay = false
    self.joycon:SetTemporary(false)
    if UI_DesktopInfo and UI_DesktopInfo.Inst then
        UI_DesktopInfo.Inst:RefreshHandpaiButton(true)
    end
    -- if UI_Replay and UI_Replay.Inst then
    --     UI_Replay.Inst.transform:Find('root'):Find('nslight').gameObject:SetActive(true)
    -- end

    -- if UI_Replay_Cell and UI_Replay_Cell.Inst then
    --     UI_Replay_Cell.Inst.transform:Find('root'):Find('nslight').gameObject:SetActive(true)
    -- end
    if self.last_char_index then
        if UI_DesktopInfo.Inst.player_infos[self.last_char_index].headbtn and
            UI_DesktopInfo.Inst.player_infos[self.last_char_index].headbtn.enable then
            UI_DesktopInfo.Inst.player_infos[self.last_char_index].headbtn:_close()
        end
        self.last_char_index = nil
    end
end

function JoyStick:ResetMap()
    if not self.inited then
        return
    end
    self.joycon:ResetMap()
end

function JoyStick:SetTarget(go)
    if not self.inited then
        return
    end
    if self.last_char_index then
        if UI_DesktopInfo.Inst.player_infos[self.last_char_index].headbtn and
            UI_DesktopInfo.Inst.player_infos[self.last_char_index].headbtn.enable then
            UI_DesktopInfo.Inst.player_infos[self.last_char_index].headbtn:_close()
        end
        self.last_char_index = nil
    end
    self.joycon:SetTarget(go)
end

function JoyStick:UpdatePadState()
    if not self.inited then
        return
    end
    if UnityEngine.Application.isEditor then
        return true
    end
    npadState = self.joycon:GetNpadState()
    local handheldStyle = nn.hid.Npad.GetStyleSet(nn.hid.NpadId.Handheld)
    -- local handheldState = npadState
    -- self.t.text = 'hand_1' .. pt.block(handheldStyle)
    if (handheldStyle ~= nn.hid.NpadStyle.None) then
        -- nn.hid.Npad.GetState(handheldState,nn.hid.NpadId.Handheld,handheldStyle)
        -- self.t.text = 'hand_2' .. pt.block(handheldStyle) .. '\n' .. pt.block(npadState.buttons)
        -- handheldState = npadState
        if (npadState.buttons ~= nn.hid.NpadButton.None) then
            -- npadId = nn.NpadId.Handheld
            -- npadStyle = handheldStyle
            -- npadState = handheldState
            self.during_joycon = true
            return true
        end
    else
        -- self.t.text = 'handnone' .. pt.block(handheldStyle)
    end

    local no1Style = nn.hid.Npad.GetStyleSet(nn.hid.NpadId.No1)
    -- self.t.text = 'no1_1' .. "\n" .. pt.block(no1Style)
    if (no1Style ~= nn.hid.NpadStyle.None) then
        -- nn.hid.Npad.GetState(no1State,nn.hid.NpadId.No1,no1Style)
        -- self.t.text = 'no1_2' .. "\n" .. pt.block(no1Style) .. '\n' .. pt.block(npadState.buttons)
        if (npadState.buttons ~= nn.hid.NpadButton.None) then
            self.during_joycon = true
            return true
        end
    else
        -- self.t.text = 'no1none' .. pt.block(no1Style)
    end
    return true
    -- if (npadId == nn.hid.NpadId.Handheld and handheldStyle ~= nn.hid.npadStyle.None) then
    --     npadId = nn.hid.NpadId.Handheld
    --     npadStyle = handheldStyle
    --     npadState = handheldState
    -- else
    --     if (npadId == nn.hid.NpadId.No1 and npadStyle ~= nn.hid.npadStyle.None)  then
    --         npadId = nn.hid.NpadId.No1
    --         npadStyle = no1Style
    --         npadState = no1State
    --     else
    --         npadId = nn.hid.NpadId.Invalid
    --         npadStyle = nn.hid.NpadStyle.Invalid
    --         npadState:Clear()
    --         return false
    --     end
    -- end
end

function JoyStick:RegistFuncByBtn(btn_type, btn)
    if not self.inited then
        return
    end
    self.joycon:RegistJoyStickFuncByBtn(btn_type, btn)
end

function JoyStick:RegistJoyStickFunc(btn_type, func)
    if not self.inited then
        return
    end
    self.joycon:RegistJoyStickFunc(btn_type, func)
end

function JoyStick:RemoveJoyStickFunc(btn_type)
    if not self.inited then
        return
    end
    self.joycon:RemoveJoyStickFunc(btn_type)
end

function JoyStick:ResetJoyStickFunc()
    if not self.inited then
        return
    end
    self.joycon:ResetJoyStickFunc()
end

function JoyStick:ResetJoyStickBtn()
    if not self.inited then
        return
    end
    self.joycon:ResetJoyStickBtn()
end

function JoyStick:LockMouse(lock)
    if not self.inited then
        return
    end
    self.joycon:LockButton(lock)
end

-- 模拟鼠标点击特效
function JoyStick:TriggerMouseEffect()
    if not self.inited then
        return
    end
    if not self.tag then
        self.tag = self.joycon:GetCursor()
    end
    if self.tag.activeInHierarchy then
        LobbyBackground.Inst:TriggerMouseEffect(self.tag.transform.position)
    end
end

function JoyStick:AddListener(btn_type, func)
    if not self.inited then
        return
    end
    self.btn_funcs[btn_type] = func
end

function JoyStick:RemoveAllListeners()
    if not self.inited then
        return
    end
    self.btn_funcs = {}
end