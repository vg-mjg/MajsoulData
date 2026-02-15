--- 测试用
TextUI = {}

function TextUI:Init(type)
    if not type then
        local mask = UnityEngine.GameObject.New('mask')
        mask.transform:SetParent(UIMgr.Inst.root_error)
        local img = mask.transform.gameObject:AddComponent(typeof(UnityEngine.UI.Image))
        mask.transform:SetLocalPos(0,0,0)
        mask.transform:SetLocalScale(30,30,1)
        mask.transform:SetRectPos(0,0)
        mask.transform:SetSize(1920,1080)
        img:SetColor(1,1,1,0)

        self.InitTimer = TimeMgr.Loop(1,-1,function()
                TimeMgr.Delay(1,function()
                    self.InitTimer:Stop()
                    if not self.EntranceTimer then
                        self.EntranceTimer = TimeMgr.Loop(1,-1,function()
                            if UI_Entrance and UI_Entrance.Inst.transform.gameObject.activeInHierarchy then
                                self.EntranceTimer:Stop()
                                TimeMgr.Delay(2,function()
                                    self:Start()
                                end)
                            end
                        end)
                    end
                end)
            -- end
        end)
    else
        self:StartTestOb()
    end
end

function TextUI:Start()
    self.uilist = {}
    TimeMgr.Delay(2,function()
        LuaTools.AutoClickButton(UI_Entrance.Inst.container_root.btn_regist)
        local zhanghao = string.sub(tonumber(string.sub(UnityEngine.Time.time, -6, -1)) * string.sub(Tools.GetRealTime(), -6, -1), -9, -1) .. '@qq.com'
        local mima = 'testmima'
        UI_Entrance.Inst.page_regist.regist_account:GetComponent(typeof(UnityEngine.UI.InputField)).text = zhanghao
        UI_Entrance.Inst.page_regist.regist_mima:GetComponent(typeof(UnityEngine.UI.InputField)).text = mima
        UI_Entrance.Inst.page_regist.regist_mima2:GetComponent(typeof(UnityEngine.UI.InputField)).text = mima
        UI_Entrance.Inst.page_regist.verify_code:GetComponent(typeof(UnityEngine.UI.InputField)).text = '11111'
        TimeMgr.Delay(0.5,function()
            UI_Entrance.Inst.page_regist.btn_regist.interactable=true
            LuaTools.AutoClickButton(UI_Entrance.Inst.page_regist.btn_regist)

            UI_Entrance.Inst.container_root.login_account:GetComponent(typeof(UnityEngine.UI.InputField)).text = zhanghao
            UI_Entrance.Inst.container_root.login_mima:GetComponent(typeof(UnityEngine.UI.InputField)).text = mima
            TimeMgr.Delay(1,function()
                -- LuaTools.AutoClickButton(UI_Entrance.Inst.container_root.btn_login)
                self.timer = TimeMgr.Loop(0.5,-1,function()
                    if UI_Nickname then
                        self.timer:Stop()
                        UI_Nickname.Inst.textInput.text = string.sub(tonumber(string.sub(UnityEngine.Time.time, -6, -1)) * string.sub(Tools.GetRealTime(), -6, -1), -9, -1)
                        LuaTools.AutoClickButton(UI_Nickname.Inst.transform:Find("root"):Find("btn_confirm"):GetComponent(typeof(UnityEngine.UI.Button)))
                        self.xinshoutimer = TimeMgr.Loop(1,-1,function()
                            if UI_Nickname.Inst.ui_xinshou.transform.gameObject.activeInHierarchy then
                                TimeMgr.Delay(1,
                                function()
                                    self.xinshoutimer:Stop()
                                    LuaTools.AutoClickButton(UI_Nickname.Inst.ui_xinshou.transform:Find("btn_no"):GetComponent(typeof(UnityEngine.UI.Button)))
                                    TimeMgr.Delay(1,function() self:TestShiming() end)
                                end)
                            else
                                LogTool.Debug('TextUI', 'wait create nickname ..')
                            end
                        end)
                    else
                        LogTool.Debug('TextUI', '等待进入游戏')
                    end
                end)
            end)
        end)
    end)
end

function TextUI:TestShiming()
    if not self.shimingtimer1 then
        self.shimingtimer1 = TimeMgr.Loop(0.5,-1,function()
            if UI_ShiMingRenZheng then
                self.shimingtimer1:Stop()
                UI_ShiMingRenZheng.Inst.label_name:GetComponent(typeof(UnityEngine.UI.InputField)).text = '吕德泽'
                UI_ShiMingRenZheng.Inst.label_id:GetComponent(typeof(UnityEngine.UI.InputField)).text = '460026199609300012'
                LuaTools.AutoClickButton(UI_ShiMingRenZheng.Inst.transform:Find("root"):Find("btn"):GetComponent(typeof(UnityEngine.UI.Button)))
                self.shimingtimer = TimeMgr.Loop(1,-1,function()
                    if not UI_ShiMingRenZheng.Inst.transform.gameObject.activeInHierarchy then
                        TimeMgr.Delay(1,
                        function()
                            self.shimingtimer:Stop()
                            TimeMgr.Delay(1,function() self:TestHome() end)
                        end)
                    else
                        LogTool.Debug('TextUI', 'wait create shiming ..')
                    end
                end)
            else
                LogTool.Debug('TextUI', 'wait create shiming ..')
            end
        end)
    end
end
local lobby_btns_name = {'btn_liaoshe','btn_youren','btn_guanzhan','btn_paipu','btn_cangku','btn_shangjia','btn_xunmi'}
function TextUI:TestHome()
    self.openned = false
    self.index = 1
    self.opennedinfo = false
    if UI_Activity and UI_Activity.Inst.transform.gameObject.activeInHierarchy then
        UI_Activity.Inst.root:Close()
    end
    if not self.TestTimer then
        self.TestTimer = TimeMgr.Loop(3,-1,
        function()
            if self.openned then return end
            if not lobby_btns_name[self.index] then
                LogTool.Debug('TextUI', '下层菜单测试结束')
                self.TestTimer:Stop()
                TimeMgr.Delay(1,function()
                    LuaTools.AutoClickButton(UI_Lobby.Inst.container_top.btn_playerinfo)
                    TimeMgr.Delay(5,function()
                        LuaTools.AutoClickButton(UI_SelfPlayerinfo.Inst.transform:Find("content"):Find("root"):Find('btn_close'):GetComponent(typeof(UnityEngine.UI.Button)))
                        self:StartTestFriendRoom()
                    end)
                end)
                return
            end
            if not self.openned and UI_Lobby.Inst.container_btns.transform:Find(lobby_btns_name[self.index]) then
                LuaTools.AutoClickButton(UI_Lobby.Inst.container_btns.transform:Find(lobby_btns_name[self.index]):GetComponent(typeof(UnityEngine.UI.Button)))
                if UI_LiaosheMain and UI_LiaosheMain.Inst.transform.gameObject.activeInHierarchy and self.index == 1 then
                    self.openned = true
                    LogTool.Debug('TextUI', 'aaaaa?')
                    self.index = self.index + 1
                    TimeMgr.Delay(2,function()
                        LuaTools.AutoClickButton(UI_LiaosheSelect.Inst.transform:Find("heads"):Find("btn_visit"):GetComponent(typeof(UnityEngine.UI.Button)))
                        local page = 0
                        self.visit_loop = TimeMgr.Loop(3,-1,function()
                            if page <= 2 then
                                LuaTools.AutoClickButton(UI_Visit.Inst.transform:Find("right"):Find("btn_page"..page):GetComponent(typeof(UnityEngine.UI.Button)))
                                page = page + 1
                            else
                                self.visit_loop:Stop()
                                LogTool.Debug('TextUI', 'cleartiemr')
                                TimeMgr.Delay(2,function()
                                    LuaTools.AutoClickButton(UI_Visit.Inst.transform:Find("top"):Find("btn_back"):GetComponent(typeof(UnityEngine.UI.Button)))
                                    TimeMgr.Delay(2,function()
                                        LuaTools.AutoClickButton(UI_LiaosheSelect.Inst.transform:Find("top"):Find("btn_back"):GetComponent(typeof(UnityEngine.UI.Button)))
                                        TimeMgr.Delay(1,function() self.openned = false
                                            LogTool.Debug('TextUI', 'true')
                                        end)
                                    end)
                                end)
                            end
                        end)
                    end)
                end
                if UI_Paipu and UI_Paipu.Inst.transform.gameObject.activeInHierarchy then
                    self.openned = true
                    self.index = self.index + 1
                    TimeMgr.Delay(2,function()
                        LuaTools.AutoClickButton(UI_Paipu.Inst.transform:Find("top"):Find("btn_back"):GetComponent(typeof(UnityEngine.UI.Button)))
                        TimeMgr.Delay(1,function() self.openned = false end)
                    end)
                end
                if UI_Shop and UI_Shop.Inst.transform.gameObject.activeInHierarchy then
                    self.openned = true
                    self.index = self.index + 1
                    TimeMgr.Delay(2,function()
                        LogTool.Debug('TextUI', '>>>>>>>>>>>>>>> close shop')
                        LuaTools.AutoClickButton(UI_Shop.Inst.transform:Find("top"):Find("btn_back"):Find('node'):Find('btn_back'):GetComponent(typeof(UnityEngine.UI.Button)))
                        TimeMgr.Delay(1,function() self.openned = false end)
                    end)
                end
                if UI_Friend and UI_Friend.Inst.transform.gameObject.activeInHierarchy then
                    self.openned = true
                    self.index = self.index + 1
                    TimeMgr.Delay(2,function()
                        LogTool.Debug('TextUI', '>>>>>>>>>>>>>>> close friend')
                        LuaTools.AutoClickButton(UI_Friend.Inst.transform:Find("top"):Find('container_btn'):Find("btn_back"):GetComponent(typeof(UnityEngine.UI.Button)))
                        TimeMgr.Delay(1,function() self.openned = false end)
                    end)
                end
                if UI_Treasure and UI_Treasure.Inst.transform.gameObject.activeInHierarchy then
                    self.openned = true
                    self.index = self.index + 1
                    TimeMgr.Delay(2,function()
                        LogTool.Debug('TextUI', '>>>>>>>>>>>>>>> close tanfang')
                        LuaTools.AutoClickButton(UI_Treasure.Inst.transform:Find('container_top'):Find('container_left'):Find('top'):Find("btn_back"):GetComponent(typeof(UnityEngine.UI.Button)))
                        TimeMgr.Delay(1,function() self.openned = false end)
                    end)
                end
                if UI_Paipu_New and UI_Paipu_New.Inst.transform.gameObject.activeInHierarchy then
                    self.openned = true
                    self.index = self.index + 1
                    TimeMgr.Delay(2,function()
                        LogTool.Debug('TextUI', '>>>>>>>>>>>>>>> close paipu')
                        LuaTools.AutoClickButton(UI_Paipu_New.Inst.transform:Find("top"):Find('container_btn'):Find("btn_back"):GetComponent(typeof(UnityEngine.UI.Button)))
                        TimeMgr.Delay(1,function() self.openned = false end)
                    end)
                end

                if UI_Ob and UI_Ob.Inst.transform.gameObject.activeInHierarchy then
                    self.openned = true
                    self.index = self.index + 1
                    TimeMgr.Delay(2,function()
                        LogTool.Debug('TextUI', '>>>>>>>>>>>>>>> close Ob')
                        LuaTools.AutoClickButton(UI_Ob.Inst.transform:Find("top"):Find("btn_back"):GetComponent(typeof(UnityEngine.UI.Button)))
                        TimeMgr.Delay(1,function() self.openned = false end)
                    end)
                end

                if UI_Bag and UI_Bag.Inst.transform.gameObject.activeInHierarchy then
                    self.openned = true
                    self.index = self.index + 1
                    TimeMgr.Delay(2,function()
                        LogTool.Debug('TextUI', '>>>>>>>>>>>>>>> close bag')
                        LuaTools.AutoClickButton(UI_Bag.Inst.transform:Find("top"):Find("btn_back"):GetComponent(typeof(UnityEngine.UI.Button)))
                        TimeMgr.Delay(1,function() self.openned = false end)
                    end)
                end
            end
        end)
    end
end

function TextUI:StartTestFriendRoom()
    TimeMgr.Delay(1,function()
        LuaTools.AutoClickButton(UI_Lobby.Inst.container_page0.btn_yourenfang)
        self.openfriendroom = TimeMgr.Loop(1,-1,function()
            if UI_Lobby.Inst.container_page2.transform.gameObject.activeInHierarchy then
                LuaTools.AutoClickButton(UI_Lobby.Inst.container_page2.btn_createRoom)
                if not self.createfriendroom then
                    self.createfriendroom = TimeMgr.Loop(1,-1,function()
                        if UI_CreatRoom and UI_CreatRoom.Inst.transform.gameObject.activeInHierarchy then
                            UI_CreatRoom.Inst.settings.transform:Find("Viewport"):Find("Content"):Find("panel"):Find("moshi"):Find("toggle_group"):Find("Toggle_1"):GetComponent(typeof(UnityEngine.UI.Toggle)).isOn = true
                            UI_CreatRoom.Inst.settings.transform:Find("Viewport"):Find("Content"):Find("panel"):Find("jushu"):Find("toggle_group"):Find("Toggle_0"):GetComponent(typeof(UnityEngine.UI.Toggle)).isOn = true
                            self.createfriendroom:Stop()
                            TimeMgr.Delay(1,function()
                                LuaTools.AutoClickButton(UI_CreatRoom.Inst.btn_create)
                                self.createfriendroomtimer = TimeMgr.Loop(1,-1,function()
                                    if UI_FriendRoom and UI_FriendRoom.Inst.transform.gameObject.activeInHierarchy then
                                        TimeMgr.Loop(1,2,function()
                                            LuaTools.AutoClickButton(UI_FriendRoom.Inst.root.btn_robot)
                                        end)
                                        TimeMgr.Delay(5,function()
                                            LuaTools.AutoClickButton(UI_FriendRoom.Inst.root.btn_ok)
                                            self.destoptimer = TimeMgr.Loop(0.5,-1,function()
                                                if UI_DesktopInfo and UI_DesktopInfo.Inst and UI_DesktopInfo.Inst.transform.gameObject.activeInHierarchy then
                                                    self.isplaying = true
                                                    self.destoptimer:Stop()
                                                    TimeMgr.Loop(2,5,function()
                                                        DesktopMgr.Inst:OperationTimeOut()
                                                    end)
                                                end
                                            end)
                                        end)
                                    end

                                    if UI_GameEnd and UI_GameEnd.Inst.transform.gameObject.activeInHierarchy and self.isplaying then
                                        self.isplaying = false
                                        if UI_HangUpWarn and UI_HangUpWarn.Inst.transform.gameObject.activeInHierarchy then
                                            LuaTools.AutoClickButton(UI_HangUpWarn.Inst.root.btn_confirm)
                                        end
                                        TimeMgr.Delay(5,function()
                                            LuaTools.AutoClickButton(UI_GameEnd.Inst.btn_next)
                                        end)
                                    end
                                end)
                            end)
                        end
                    end)
                end
                self.openfriendroom:Stop()
            end
        end)
    end)
end

function TextUI:StartTestOb()
    local btn = UI_Ob.Inst.content:Find('scrollview'):Find('Mask'):Find('content'):GetChild(1).transform:Find('btn'):GetComponent(typeof(UnityEngine.UI.Button))
    TimeMgr.Delay(3,function()
        LuaTools.AutoClickButton(UI_Ob.Inst.dropdown0.item_choosed)
        TimeMgr.Delay(2,function()
            LuaTools.AutoClickButton(UI_Ob.Inst.dropdown0.root.items[2].transform:GetComponent(typeof(UnityEngine.UI.Button)))
        end)
        TimeMgr.Delay(5,function()
            LuaTools.AutoClickButton(btn)
        end)
    end)
   
    TimeMgr.Loop(1800,-1,function()
        if UI_DesktopInfo and UI_DesktopInfo.Inst.transform.gameObject.activeSelf then
            LuaTools.AutoClickButton(UI_DesktopInfo.Inst.container_righttop.btn_leave)
            TimeMgr.Delay(30,function()
                LuaTools.AutoClickButton(UI_Ob.Inst.btn_refresh)
                TimeMgr.Delay(5,function()
                    LuaTools.AutoClickButton(btn)
                end)
            end)
        else
            LuaTools.AutoClickButton(btn)
        end
    end)
end
return TextUI