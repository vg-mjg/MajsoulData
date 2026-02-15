require "UI.UIBase"
require "UI.UIBlock"
require "UI.UI_Name"

UI_Paipu_New = UIBase:Inherit()
UI_Paipu_New.PopCollect = UIBlock:Inherit()
UI_Paipu_New.PopOtherpaipu = UIBlock:Inherit()
local pt = require("PrintTable")
-- ================= funcs ==================
local Etype = {ALL = 0,FRIEND = 1,RANK = 2,MATCH = 4, COLLECT = 100}
function UI_Paipu_New:OnCreate()
    UI_Paipu_New.Inst = self
    self.plist = {} --存放当前获取列表的信息
    self.collect_lst = {}
    --ulist已加载的item数量
    self.collect_lst_item_count = 0
    self.collect_info = {}
    self.init = true
    self.initlist = true
    self.onLoad = false
    self.anim = self.transform:GetComponent(typeof(UnityEngine.Animator))
    self.type = Etype.ALL
    self.have_more_paipu = {}
    self.uuid_list = {}
    self.record_map = {}
    self.collect_limit = 20
    self.oldimg = self.allImg
    LuaTools.LoadSprite("pic/myres/shop/tab_choose", nil, nil, function(spr)
        self.chooseSprite = spr
    end)
    LuaTools.LoadSprite("pic/myres/shop/tab_unchoose", nil, nil, function(spr)
        self.unchooseSprite = spr
    end)
    LuaTools.LoadSprite("pic/myres/lobby/collect_star", nil, nil, function(spr)
        self.collectedStar = spr
    end)
    LuaTools.LoadSprite("pic/myres/lobby/collect_star_gray", nil, nil, function(spr)
        self.uncollectStar = spr
    end)
    self.PaipuList=self.transform:Find('content'):Find('bg'):Find('Mask'):GetComponent(typeof(NormalUList)) --通过这个调用C#脚本的方法
    self.PaipuList:InitValue()
    self.pop_collect.inputTx = self.pop_collect.input.transform:GetComponent(typeof(UnityEngine.UI.InputField))
    self.pop_otherpaipu.inputTx = self.pop_otherpaipu.ui_popInput.transform:GetComponent(typeof(UnityEngine.UI.InputField))
    self.bg = self.transform:Find('content'):Find('bg')
    self.scrollrect = self.transform:Find('content'):Find('bg'):Find('Mask'):GetComponent(typeof(UnityEngine.UI.ScrollRect))
    self.pop_otherpaipu.share_anonymous = Tools.getplayerprefshandler().GetInt('share_anonymous')
    self.pop_otherpaipu.btn_hide.isOn = self.pop_otherpaipu.share_anonymous == 1
    self:CreateTemplete(12)
    self._locking = false
    if WindowManager.instance.ScreenSizeChangeEvent then
		WindowManager.instance.ScreenSizeChangeEvent = WindowManager.instance.ScreenSizeChangeEvent + function(width, height) self:RecalcSize(width, height) end
	else
		WindowManager.instance.ScreenSizeChangeEvent = function(width, height) self:RecalcSize(width, height) end
    end
    self:RecalcSize(UnityEngine.Camera.main.pixelWidth, UnityEngine.Camera.main.pixelHeight)
    self:AdaptButtonPos(UnityEngine.Camera.main.pixelWidth, UnityEngine.Camera.main.pixelHeight)
end

function UI_Paipu_New:AdaptButtonPos(width, height)
    if not self.adapt_button_pos_inited then
        if WindowManager.instance.ScreenSizeChangeEvent then
            WindowManager.instance.ScreenSizeChangeEvent = WindowManager.instance.ScreenSizeChangeEvent + function(width, height) self:AdaptButtonPos(width, height) end
        else
            WindowManager.instance.ScreenSizeChangeEvent = function(width, height) self:AdaptButtonPos(width, height) end
        end
        self.adapt_button_pos_inited = true
    end
    local screenRatio = width / height
	local originRatio = 1920 / 1080
    new_size_x = 1920 * (screenRatio / originRatio)
    local deltaX = (new_size_x - 1920) / 2
    if screenRatio < originRatio then
        deltaX = 0
    end
    local top = self.transform:Find('top'):GetComponent(typeof(UnityEngine.RectTransform))
    top:SetSize(new_size_x, top.rect.size.y)
end

function UI_Paipu_New:RecalcSize(width,height)
    local screenRatio = width / height
    local originRatio = 16/9
    if screenRatio <= originRatio then
        local ratio = screenRatio / originRatio
        self.bg:SetSize(self.bg.rect.width,1080/ratio - 210)
    else
        self.bg:SetSize(self.bg.rect.width,870)
    end

    self:ResetScrollbar()
end

function UI_Paipu_New:Init()
    -- 放到fetchInfo
    -- local request = ProtoMgr.CreateRequest('Lobby', 'fetchCollectedGameRecordList')
    -- LobbyNetMgr.SendRequest('Lobby', 'fetchCollectedGameRecordList',request,function(err,res)
    --     if err or res.error.code ~= 0 then
    --         UIMgr.Inst:Show_NetReqError('fetchCollectedGameRecordList',err,res)
    --     else
    --         if res.record_list then
    --             local list = res.record_list
    --             for i=1,#list do
    --                 local _info = {uuid=list[i].uuid,time=list[i].end_time,remarks = list[i].remarks}
    --                 self.collect_info[_info.uuid] = _info
    --                 table.insert(self.collect_lst,_info.uuid)
    --             end
    --             table.sort(self.collect_lst,function(a,b)
    --                 return self.collect_info[b].time < self.collect_info[a].time
    --             end)
    --         end
    --         if res.record_collect_limit then
    --             self.collect_limit = res.record_collect_limit
    --         end
    --         self.PaipuList:SetFunc(function(go,realindex) UI_Paipu_New.Inst:UpdateItem(go,realindex)end)
    --     end
    -- end)
end

function UI_Paipu_New:makeCollectedGameRecordList(res,err)
    if err or res.error.code ~= 0 then
        UIMgr.Inst:Show_NetReqError('fetchCollectedGameRecordList',err,res)
    else
        if res.record_list then
            local list = res.record_list
            for i=1,#list do
                local _info = {uuid=list[i].uuid,time=list[i].end_time,remarks = list[i].remarks}
                self.collect_info[_info.uuid] = _info
                table.insert(self.collect_lst,_info.uuid)
            end
            table.sort(self.collect_lst,function(a,b)
                return self.collect_info[b].time < self.collect_info[a].time
            end)
        end
        if res.record_collect_limit then
            self.collect_limit = res.record_collect_limit
        end
        self.PaipuList:SetFunc(function(go,realindex) UI_Paipu_New.Inst:UpdateItem(go,realindex)end)
    end
end

function UI_Paipu_New:Show()
    if self.locking then return end
    self.locking = true
    self.type = Etype.ALL
    self.enable = true
    self.scrollrect.verticalNormalizedPosition = 1
    self:Switch(self.allImg)
    if not self.plist[self.type] or #self.plist[self.type] == 0 then
        self:OnGetRecordList(0,30)
    else
        self:OnGetRecordList(#self.plist[self.type],30)
    end
    self:AnimAlphaIn(self.container_top,{x=0,y=30},0.2)
    self:AnimAlphaIn(self.root,{x=0,y=-30},0.2, 0, function()
        self.locking = false
    end)
    self.transform.gameObject:SetActive(true)
    self:RefreshCollectCount()
    if JoyStick and JoyStick.Inst then
        JoyStick.Inst:RegistFuncByBtn(nn.hid.NpadButton.B,self.container_top.transform:Find('container_btn'):Find('btn_back'):GetComponent(typeof(UnityEngine.UI.Button)))
    end
    ControllerMgr.RegistFunc(ControllerMgr.EButton.back, self.transform.gameObject, function ()
        self:Hide()
    end)
end

function UI_Paipu_New:RefreshCollectCount()
    self.label_collectlimit.text = (#self.collect_lst) .. '/' .. self.collect_limit
end

function UI_Paipu_New:Hide(hidehome)
    if self._locking then return end
    self._locking = true
    self:AnimAlphaOut(self.container_top,{x=0,y=30},0.2)
    self:AnimAlphaOut(self.root,{x=0,y=-30},0.2)
    TimeMgr.Delay(0.2,function()
        self.transform.gameObject:SetActive(false)
        if not hidehome then
            UIMgr.Inst:Show_Lobby()
            self._locking = false
        end
    end)
    self.enable = false
end

function UI_Paipu_New:Switch(newimg)
    self.oldimg.sprite = self.unchooseSprite
    self.oldimg.transform:Find('label_name'):GetComponent(typeof(UnityEngine.UI.Text)):SetColor(140/255,182/255,95/255,1)
    newimg.sprite = self.chooseSprite
    newimg.transform:Find('label_name'):GetComponent(typeof(UnityEngine.UI.Text)):SetColor(217/255,178/255,99/255,1)
    self.oldimg = newimg

    if self.type ~= Etype.COLLECT then
        if UI_Paipu_New.Inst.plist[self.type]  then
            self.PaipuList:InitPos(#UI_Paipu_New.Inst.plist[self.type])
        else
            self.PaipuList:InitPos(0)
        end
    else
        self.collect_lst_item_count = 0
        self.PaipuList:InitPos(0)
    end
    self:ResetScrollbar()
    self:RefreshNoPaipuHint()
end

function UI_Paipu_New:RefreshNoPaipuHint()
    local no_paipu = false
    if self.type ~= Etype.COLLECT then
        if UI_Paipu_New.Inst.plist[self.type]  then
            no_paipu = #UI_Paipu_New.Inst.plist[self.type] == 0
        else
            no_paipu = true
        end
    else
        no_paipu = #self.collect_lst == 0
    end
    self.noinfo.transform.gameObject:SetActive(no_paipu)
end

function UI_Paipu_New:ResetScrollbar()
    if self.type == Etype.COLLECT then
        if #self.collect_lst*240 > self.bg.rect.height then
            self.scrollbar.transform.gameObject:SetActive(true)
        else
            self.scrollbar.transform.gameObject:SetActive(false)
        end
    else
        if self.plist[self.type] and #self.plist[self.type]*240 >self.bg.rect.height then
            self.scrollbar.transform.gameObject:SetActive(true)
        else
            self.scrollbar.transform.gameObject:SetActive(false)
        end
    end
end


function UI_Paipu_New:AddCollect(uuid,start_time,end_time,remarks,go,index)
    if self.collect_info[uuid] then return end
    if #self.collect_lst + 1 > self.collect_limit then
        UIMgr.Inst:Show_ErrorInfo(Tools.StrOfLocalization(2767))
        return
    end
    local request = ProtoMgr.CreateRequest('Lobby', 'addCollectedGameRecord')
    request.uuid = uuid
    request.remarks = remarks
    request.start_time = start_time
    request.end_time = end_time
    LobbyNetMgr.SendRequest('Lobby', 'addCollectedGameRecord',request,function(err,res) end)
    local info = {}
    info.uuid = uuid
    info.remarks = remarks
    info.time = end_time
    self.collect_info[uuid] = info
    table.insert(self.collect_lst, uuid)
    table.sort(self.collect_lst,function(a,b)
        return self.collect_info[b].time < self.collect_info[a].time
    end)
    if go then
        self:UpdateItem(go,index)
    else
        self.PaipuList:InitPos(#self.plist[self.type])
    end
    self:RefreshCollectCount()
    if UI_DesktopInfo and UI_DesktopInfo.Inst and UI_DesktopInfo.Inst.transform.gameObject.activeSelf then
        UI_DesktopInfo.Inst:RefreshCollect()
    end
    self:RefreshNoPaipuHint()
end
function UI_Paipu_New:RemoveCollect(uuid,go,index)
    if not self.collect_info[uuid] then return end
    UIMgr.Inst:Show_SecondConfirm(Tools.StrOfLocalization(3248), function()
        local request = ProtoMgr.CreateRequest('Lobby', 'removeCollectedGameRecord')
        request.uuid = uuid
        LobbyNetMgr.SendRequest('Lobby', 'removeCollectedGameRecord',request,function(err,res) end)
        self.collect_info[uuid] = nil
        for i=1,#self.collect_lst do
            if self.collect_lst[i] == uuid then
                table.remove( self.collect_lst, i )
            end
        end
        table.sort(self.collect_lst,function(a,b)
            return self.collect_info[b].time < self.collect_info[a].time
        end)
        if go then
            self:UpdateItem(go,index)
        end
        if self.type == Etype.COLLECT then
            self.collect_lst_item_count = 0
            self.PaipuList:InitPos(0)
            self:OnGetRecordList(0, 10)
        elseif not go then
            self.PaipuList:InitPos(#self.plist[self.type])
        end
        self:RefreshCollectCount()
        self:RefreshNoPaipuHint()
        if UI_DesktopInfo and UI_DesktopInfo.Inst and UI_DesktopInfo.Inst.transform.gameObject.activeSelf then
            UI_DesktopInfo.Inst:RefreshCollect()
        end
    end)
end

function UI_Paipu_New:ShowAll()
    if self.onLoad then return end
    if self.type ~= Etype.ALL then
        self.type = Etype.ALL
        self.scrollrect.verticalNormalizedPosition = 1
        if not self.plist[self.type] then
            self:OnGetRecordList(0,30)
        else
            self:OnGetRecordList(#self.plist[self.type],30)
        end
        self:Switch(self.allImg)
    end
end

function UI_Paipu_New:ShowRank()
    if self.onLoad then return end
    if self.type ~= Etype.RANK then
        self.scrollrect.verticalNormalizedPosition = 1
        self.type = Etype.RANK
        if not self.plist[self.type] then
            self:OnGetRecordList(0,30)
        else
            self:OnGetRecordList(#self.plist[self.type],30)
        end
        self:Switch(self.rankImg)
    end
end
function UI_Paipu_New:ShowFriend()
    if self.onLoad then return end
    if self.type ~= Etype.FRIEND then
        self.scrollrect.verticalNormalizedPosition = 1
        self.type = Etype.FRIEND
        if not self.plist[self.type] then
            self:OnGetRecordList(0,30)
        else
            self:OnGetRecordList(#self.plist[self.type],30)
        end
        self:Switch(self.friendImg)
    end
end
function UI_Paipu_New:ShowCollect()
    if self.onLoad then return end
    if self.type ~= Etype.COLLECT then
        self.scrollrect.verticalNormalizedPosition = 1
        self.type = Etype.COLLECT
        --先init ulist 0
        self:Switch(self.collectImg)
        --fetch 前30个collect add ulist
        self:OnGetRecordList(0, 10)
    end
end
function UI_Paipu_New:ShowMatch()
    if self.onLoad then return end
    if self.type ~= Etype.MATCH then
        self.scrollrect.verticalNormalizedPosition = 1
        self.type = Etype.MATCH
        self:Switch(self.matchImg)
        if not self.plist[self.type] then
            self:OnGetRecordList(0,30)
        else
            self:OnGetRecordList(#self.plist[self.type],30)
        end
    end
end

---@param indexMin integer realindex
function UI_Paipu_New:OnGetRecordList(indexMin,listcount,go)
    if self.have_more_paipu[self.type] == false then
        return
    end
    if self.onLoad == false then
        if self.type == Etype.COLLECT then
            --需要fetch的uuids
            local uuids = {}
            --ulist需要add的牌谱数
            local _count = 0
            -- fetchGameRecordsDetail 最多30个
            local index = indexMin
            for i = 1, 10 do
                index = indexMin + i
                if index <= #self.collect_lst then
                    _count = _count + 1
                    local uuid = self.collect_lst[index]
                    if not self.record_map[uuid] then
                        table.insert(uuids,uuid)
                    end
                    table.insert(self.uuid_list,uuid)
                else
                    break
                end
            end
            if #uuids > 0 then
                local request = ProtoMgr.CreateRequestFromTable('Lobby','fetchGameRecordsDetail', {uuid_list = uuids})
                self.onLoad = true
                LobbyNetMgr.SendRequest('Lobby','fetchGameRecordsDetail',request,function(err,res)
                    self.onLoad = false
                    if err or res.error.code ~= 0 then
                        UIMgr.Inst:Show_NetReqError('fetchGameRecordsDetail',err,res)
                    else
                        for i=1,#res.record_list do
                            local uuid = res.record_list[i].uuid
                            if not self.record_map[uuid] then
                                self.record_map[uuid] = res.record_list[i]
                            end
                        end
                        self.collect_lst_item_count = self.collect_lst_item_count + _count
                        self.PaipuList:AddItem(_count)
                        self:RefreshCollectCount()
                        self:RefreshNoPaipuHint()
                    end
                end)
            else
                self.collect_lst_item_count = self.collect_lst_item_count + _count
                self.PaipuList:AddItem(_count)
            end
            self:ResetScrollbar()
            self:RefreshNoPaipuHint()
        else
            local request = ProtoMgr.CreateRequest('Lobby','fetchGameRecordList')
            self.onLoad = true
            request.start = indexMin
            request.count = listcount
            request.type = self.type
            LobbyNetMgr.SendRequest('Lobby','fetchGameRecordList',request,function(err,res)
                if err or res.error.code ~= 0 then
                    UIMgr.Inst:Show_NetReqError('fetchGameRecordList',err,res)
                else
                    self.onLoad = false
                    if res.record_list and #res.record_list > 0 then
                        if not self.plist[self.type] or #self.plist[self.type] == 0 then
                            self.plist[self.type] = {}
                            self.initlist = true
                        end
                        for i = 1,#res.record_list do
                            table.insert(self.plist[self.type], #self.plist[self.type] +1, res.record_list[i])
                        end
                        if #res.record_list > 0 and res.record_list then
                            for i=1,#res.record_list do
                                local uuid = res.record_list[i].uuid
                                table.insert(self.uuid_list,uuid)
                                if not self.record_map[uuid] then
                                    self.record_map[uuid] =  res.record_list[i]
                                end
                            end
                        end
                        if #res.record_list == 30 then
                            self.have_more_paipu[self.type] = true
                        else
                            self.have_more_paipu[self.type] = false
                        end
                    else
                        self.have_more_paipu[self.type] = false
                    end
                    if self.plist[self.type] then
                        if self.initlist then
                            self.PaipuList:InitPos(#self.plist[self.type])
                            self.initlist = false
                        else
                            self.PaipuList:AddItem(#res.record_list)
                            if go then
                                self:UpdateItem(go,indexMin,true)
                            end
                        end
                    else
                        self.PaipuList:InitPos(0)
                    end
                    self:ResetScrollbar()
                    self:RefreshNoPaipuHint()
                end
            end)
        end
    end
end

--牌谱过期后调用此函数重新拉取
function UI_Paipu_New:FetchNewList()
    self.have_more_paipu = {}
    self.onLoad = false
end

--查看牌谱
function UI_Paipu_New:Watch(url)
    if UI_PiPeiYuYue.Inst.transform.gameObject.activeSelf then
        UIMgr.Inst:Show_PopOutNoTitle(Tools.StrOfLocalization(204))
        return
    end
    UIMgr.Inst:CompleteNewbieTask(GameUtility.ENewbieTaskType.paipu)
    GameMgr.Inst:CheckPaipu(url, GameMgr.Inst.account_id, 0)
    -- UIMgr.Inst:Hide_Paipu(true)
end

--分享牌谱
function UI_Paipu_New:Share(uuid)
    if self.locking then return end
    self.locking = true
    self.pop_otherpaipu.title.text = Tools.StrOfLocalization(2124)
    self.pop_otherpaipu.btn_confirm.transform.gameObject:SetActive(false)
    self.pop_otherpaipu.uuid = uuid
    local _jiami_accoun_id = Tools.encode_account_id(GameMgr.Inst.account_id)
    if self.pop_otherpaipu.share_anonymous == 1 then
        local _d = uuid
        _d = UI_Paipu_New.Inst:Encode(uuid)..'_a'.._jiami_accoun_id
        -- self.linkstr = Tools.StrOfLocalization(2126)..':'.. GameMgr.Inst.config_data.link_url..'?paipu='.. _d .. '_2'
        self.linkstr = Tools.StrOfLocalization(2126)..':'..GameMgr.Inst.config_data.link_url..'?paipu='.. _d .. '_2'
    else
        -- self.linkstr = Tools.StrOfLocalization(2126)..':'..GameMgr.Inst.config_data.link_url..'?paipu='..uuid..'_a'.._jiami_accoun_id
        self.linkstr = Tools.StrOfLocalization(2126)..':'..GameMgr.Inst.config_data.link_url..'?paipu='..uuid..'_a'.._jiami_accoun_id
    end
    self.pop_otherpaipu.btn_copy.transform.gameObject:SetActive(true)
    self.pop_otherpaipu.btn_hide.transform.gameObject:SetActive(true)
    self.pop_otherpaipu.inputTx.text = self.linkstr
    self.pop_otherpaipu.transform.gameObject:SetActive(true)
    self:AnimPopOut(self.pop_otherpaipu.transform,function()
        self.locking  = false
    end)
end

function UI_Paipu_New.PopOtherpaipu:SetAnonymous(x)
    if x==1 then --匿名
        self.share_anonymous = 1
        Tools.getplayerprefshandler().SetInt('share_anonymous',1)
    else
        self.share_anonymous = 0
        Tools.getplayerprefshandler().SetInt('share_anonymous',0)
    end

    local uuid = self.uuid
    if not uuid then return end
    local _jiami_accoun_id = Tools.encode_account_id(GameMgr.Inst.account_id)
    if self.share_anonymous == 1 then
        local _d = uuid
        _d = UI_Paipu_New.Inst:Encode(uuid)..'_a'.._jiami_accoun_id
        UI_Paipu_New.Inst.linkstr = Tools.StrOfLocalization(2126)..':'.. GameMgr.Inst.config_data.link_url..'?paipu='.. _d .. '_2'
    else
        UI_Paipu_New.Inst.linkstr = Tools.StrOfLocalization(2126)..':'..GameMgr.Inst.config_data.link_url..'?paipu='..uuid..'_a'.._jiami_accoun_id
    end
    self.inputTx.text = UI_Paipu_New.Inst.linkstr
end

function UI_Paipu_New.PopOtherpaipu:CopyLink(index)
    if self.locking then return end
    self.locking = true
    UnityEngine.GUIUtility.systemCopyBuffer = UI_Paipu_New.Inst.linkstr or ''
    UIMgr.Inst:Show_FlyTips(Tools.StrOfLocalization(2125), 0.75)
    UI_Paipu_New.Inst:AnimPopHide(self.transform,function()
        self.locking = false
        self.transform.gameObject:SetActive(false)
    end)
end

--查看牌谱
function UI_Paipu_New:OpenOther()
    if self.locking then return end
    self.locking = true
    self:AnimPopOut(self.pop_otherpaipu.transform,function()
        self.locking = false
    end)
    self.pop_otherpaipu.title.text = Tools.StrOfLocalization(2128)
    self.pop_otherpaipu.ui_popInput.transform:GetComponent(typeof(UnityEngine.UI.InputField)).text = ''
    self.pop_otherpaipu.btn_confirm.transform.gameObject:SetActive(true)
    self.pop_otherpaipu.btn_copy.transform.gameObject:SetActive(false)
    self.pop_otherpaipu.btn_hide.transform.gameObject:SetActive(false)
    self.pop_otherpaipu.transform.gameObject:SetActive(true)

    ControllerMgr.RegistFunc(ControllerMgr.EButton.back, self.pop_otherpaipu.transform.gameObject, function ()
        self.pop_otherpaipu:Close()
    end)
end

function UI_Paipu_New.PopOtherpaipu:ConfirmCheck()
    if UI_PiPeiYuYue.Inst.transform.gameObject.activeSelf then 
        UIMgr.Inst:Show_PopOutNoTitle(Tools.StrOfLocalization(204))
        return
    end
    if self.ui_popInput.transform:GetComponent(typeof(UnityEngine.UI.InputField)).text == '' then
        UIMgr.Inst:Show_PopOutNoTitle(Tools.StrOfLocalization(3690))
        return
    end
    if self.locking then return end
    self.locking = true
    self:AnimPopHide(self.transform, function()
        self.locking = false
        self.transform.gameObject:SetActive(false)
    end)
    if UI_PiPeiYuYue.Inst.transform.gameObject.activeSelf then
        UIMgr.Inst:Show_PopOutNoTitle(Tools.StrOfLocalization(204))
        return
    end
    local text = self.ui_popInput.transform:GetComponent(typeof(UnityEngine.UI.InputField)).text
    local p = string.sub(text,string.len(text) - 1,-1)
    local _anonymous = false

    -- if string.sub(p, 1, 1) == '-' and bit.band(tonumber(string.sub(p,2,2))) then
    --     _anonymous = true
    -- end
    -- if _anonymous then
    --     text = string.sub(text,1,string.len(text) - 2)
    -- end
   
    --paipu config
    local raw_config = Tools.Split(text, '=')
    raw_config = raw_config[#raw_config]
    --split
    local splitted_config = Tools.Split(raw_config, '_')

    --get account_id
    local account_id = -1
    if #splitted_config > 1 then
        if string.sub(splitted_config[2], 1, 1) == 'a' then
            account_id = Tools.decode_account_id(tonumber(string.sub(splitted_config[2], 2, -1)))
        end
        if tonumber(string.sub(splitted_config[2], 1, 1)) and bit.band(tonumber(string.sub(splitted_config[2], 1, 1))) then
            _anonymous = true
        end
    end

    --get anonymous and real uuid
    local uuid = splitted_config[1]
    if #splitted_config == 3 and tonumber(splitted_config[3]) and bit.band(tonumber(splitted_config[3])) then
        _anonymous = true
    end
    if _anonymous then
        uuid = UI_Paipu_New.Inst:Decode(uuid)
    end
    local config = 0
    UIMgr.Inst:CompleteNewbieTask(GameUtility.ENewbieTaskType.paipu)
    GameMgr.Inst:CheckPaipu(uuid, account_id, config, _anonymous,true)
end

function UI_Paipu_New:RefreshForce()
    self.plist = {}
    for key,value in pairs(self.have_more_paipu) do
        self.have_more_paipu[key] = true
    end
end

function UI_Paipu_New.PopOtherpaipu:Close()
    if self.locking then return end
    self.locking = true
    UI_Paipu_New.Inst:AnimPopHide(self.transform,function()
        self.transform.gameObject:SetActive(false)
        self.locking = false
    end)
end

-- 通知C#创建Item
function UI_Paipu_New:CreateTemplete(count)
    self.PaipuList:InitTemp(count)
end

-- 列表增加长度
function UI_Paipu_New:AddUList(count)
    self.PaipuList:Additem(count)
end

function UI_Paipu_New.PopCollect:Show(uuid,start_time,end_time,go,index)
    self.locking = true
    self.uuid = uuid
    self.start_time = start_time
    self.end_time = end_time
    self.inputTx.text = ''
    self.inputTx.onValueChanged:RemoveAllListeners()
    self.inputTx.onValueChanged:AddListener(function(str)
        self.inputTx.text = Tools.FullWidth2HalfWidth(str)
    end)
    self.go = go
    self.index = index
    self.toolong.transform.gameObject:SetActive(false)
    self.blackbg:SetColor(1,1,1,0)
    self.blackbg:_DOFade(0.5,0.15)
    UI_Paipu_New:AnimPopOut(self.root,function() self.locking = false end)
    self.transform.gameObject:SetActive(true)
    
    ControllerMgr.RegistFunc(ControllerMgr.EButton.back, self.transform.gameObject, function ()
        self:Close()
    end)
end

function UI_Paipu_New.PopCollect:Close()
    if self.locking then return end
    self.locking = true
    UI_Paipu_New.Inst:AnimPopHide(self.root,function()
        self.locking = false
        self.transform.gameObject:SetActive(false)
    end)
    self.blackbg:_DOFade(0,0.15)
end
function UI_Paipu_New.PopCollect:ConfirmCollect()
    if self.locking then return end
    if Tools.GetStringLength(self.inputTx.text) > 30 then
        self.toolong.transform.gameObject:SetActive(true)
    else
        self.toolong.transform.gameObject:SetActive(false)
        UI_Paipu_New.Inst:AddCollect(self.uuid,self.start_time,self.end_time,self.inputTx.text,self.go,self.index)
        self.transform.gameObject:SetActive(false)
    end
end



-- 根据真实ID更新Item(列表查找) realIndex = -1 时清空列表
function UI_Paipu_New:UpdateItem(go,realindex,force)
    go.name = realindex
    UI_Paipu_New.Inst.plist[UI_Paipu_New.Inst.type] = UI_Paipu_New.Inst.plist[UI_Paipu_New.Inst.type] or {}
    if UI_Paipu_New.Inst.type ~= Etype.COLLECT and (realindex + 1  >= #UI_Paipu_New.Inst.plist[UI_Paipu_New.Inst.type]) and not force then
        UI_Paipu_New.Inst:OnGetRecordList(realindex + 1,30)
        -- go:SetActive(false)
        if #UI_Paipu_New.Inst.plist[UI_Paipu_New.Inst.type] ~= realindex + 1 then
            return
        end
    end
    local gr = {}
    if self.type == Etype.COLLECT then
        gr = self.record_map[self.collect_lst[realindex+1]]
        --有未加载的collect
        if realindex + 2 <= #self.collect_lst and realindex + 2 > self.collect_lst_item_count then
            self:OnGetRecordList(realindex + 1, 10)
        end
    else
        gr = UI_Paipu_New.Inst.plist[UI_Paipu_New.Inst.type][realindex + 1]
    end
    if gr == nil then
        go:SetActive(false)
        return
    end
    go:SetActive(true)
    local players = gr.result.players
    for i=1,4 do
        local player = go.transform:Find("p".. tostring(i - 1))
        local player_name_container = UI_Name:Init( player:Find("container_name"), GameUtility.ENameFilterServiceType.REPLAY)
        -- local playertxt = player:Find("name"):GetComponent(typeof(UnityEngine.UI.Text))
        local scoretxt = player:Find("score"):GetComponent(typeof(UnityEngine.UI.Text))
        local rank = player:Find("rank"):GetComponent(typeof(UnityEngine.UI.Text))
        local rank_word = player:Find("rank_word"):GetComponent(typeof(UnityEngine.UI.Text))
        player_name_container:SetColor(160/255,160/255,160/255,1)
        scoretxt:SetColor(185/255,173/255,48/255,1)
        rank:SetColor(75/255,142/255,211/255,1)
        rank_word:SetColor(75/255,142/255,211/255,1)
        if GameMgr.Inst.prefer_language == 'en' then
            if rank.text == '1' then
                rank_word.text = 'st'
            elseif rank.text == '2' then
                rank_word.text = 'nd'
            elseif rank.text == '3' then
                rank_word.text = 'rd'
            else
                rank_word.text = 'th'
            end
        elseif GameMgr.Inst.prefer_language == 'kr' then
            rank_word.text = Tools.StrOfLocalization(2283)
        end
        player:Find("chosen").gameObject:SetActive(false)
        player_name_container:SetName(Tools.StrOfLocalization(2133))
        if i <= #players then
            player.gameObject:SetActive(true)
            scoretxt.text = players[i].part_point_1
            for j=1,#gr.accounts do
                if gr.accounts[j].seat == players[i].seat then
                    player_name_container:SetName(gr.accounts[j].nickname,gr.accounts[j].account_id,gr.accounts[j].verified)
                    if gr.accounts[j].account_id == GameMgr.Inst.account_id then
                        player:Find("chosen").gameObject:SetActive(true)
                        player_name_container:SetColor(1,1,1,1)
                        scoretxt:SetColor(1,211/255,92/255,1)
                        rank:SetColor(82/255,198/255,252/255,1)
                        rank_word:SetColor(82/255,198/255,252/255,1)
                    end
                end
            end
        else
            player.gameObject:SetActive(false)
        end
    end
    local room_desc = Tools.get_room_desc(gr.config)
    local roomTx = go.transform:Find("room"):GetComponent(typeof(UnityEngine.UI.Text))
    if GameMgr.Inst.prefer_language == 'en' then
        roomTx.transform:SetSize(310,98)
        roomTx.fontSize = 32
    else
        roomTx.transform:SetSize(480,66)
        roomTx.fontSize = 42
    end
    roomTx.text =  room_desc.text

    local default_remarks = ''
    if gr.config.category == 1 then
        default_remarks = Tools.StrOfLocalization(2023)
    elseif gr.config.category == 4 then
        default_remarks = Tools.StrOfLocalization(2025)
    elseif gr.config.category == 2 then
        local meta = gr.config.meta
        if meta then
            local d_table = ExcelMgr.GetData('desktop','matchmode',meta.mode_id)
            if d_table then
                default_remarks = d_table['room_name_' .. GameMgr.Inst.prefer_language]
            end
        end
    end
    local label_remark = go.transform:Find('remarks_info'):GetComponent(typeof(UnityEngine.UI.Text))
    local container_input = go.transform:Find('input'):GetComponent(typeof(UnityEngine.UI.InputField))
    local btn_input = go.transform:Find('btn_input'):GetComponent(typeof(UnityEngine.UI.Button))
    local star= go.transform:Find('collect'):Find('img'):GetComponent(typeof(UnityEngine.UI.Image))
    local btn_collect = go.transform:Find('collect'):GetComponent(typeof(UnityEngine.UI.Button))
    if UI_Paipu_New.Inst.collect_info[gr.uuid] then
        local d_collect = UI_Paipu_New.Inst.collect_info[gr.uuid]
        local during_write = false
        if not d_collect.remarks or d_collect.remarks == '' then
            container_input.text = default_remarks
            label_remark.text = default_remarks
            d_collect.remarks = default_remarks
        else
            container_input.text = d_collect['remarks']
            label_remark.text = Tools.StrWithoutForbidden(d_collect['remarks'])
        end
        star.sprite = UI_Paipu_New.Inst.collectedStar
        label_remark.transform.gameObject:SetActive(true)
        container_input.transform.gameObject:SetActive(false)
        btn_input.transform.gameObject:SetActive(true)
        btn_input.onClick:RemoveAllListeners()
        btn_input.onClick:AddListener(function()
            container_input.transform.gameObject:SetActive(true)
            label_remark.transform.gameObject:SetActive(false)
            btn_input.transform.gameObject:SetActive(false)
        end)
        btn_collect.onClick:RemoveAllListeners()
        btn_collect.onClick:AddListener(function()
            UI_Paipu_New.Inst:RemoveCollect(gr.uuid,go,realindex)
        end)
        container_input.onValueChanged:RemoveAllListeners()
        container_input.onValueChanged:AddListener(function(str)
            container_input.text = Tools.FullWidth2HalfWidth(str)
        end)
        container_input.onEndEdit:RemoveAllListeners()
        container_input.onEndEdit:AddListener(function(str)
            local d_collect = UI_Paipu_New.Inst.collect_info[gr.uuid]
            if Tools.GetStringLength(str) > 30 then
                UIMgr.Inst:Show_ErrorInfo(Tools.StrOfLocalization(2765))
                container_input.text = d_collect.remarks
            else
                if container_input.text ~= d_collect.remarks then
                    label_remark.text = Tools.StrWithoutForbidden(container_input.text)
                    d_collect.remarks = label_remark.text
                    local request = ProtoMgr.CreateRequest('Lobby','changeCollectedGameRecordRemarks')
                    request.uuid = gr.uuid
                    request.remarks = label_remark.text
                    LobbyNetMgr.SendRequest('Lobby','changeCollectedGameRecordRemarks',request,function()end)
                    if Tools.GetStringLength(str) == 0 then
                        label_remark.text = default_remarks
                        container_input.text = default_remarks
                        d_collect.remarks = default_remarks
                    end
                else
                    container_input.text = label_remark.text
                end
                container_input.transform.gameObject:SetActive(false)
                label_remark.transform.gameObject:SetActive(true)
                btn_input.transform.gameObject:SetActive(true)
            end
            end)
    else
        container_input.text = default_remarks
        label_remark.text = default_remarks
        star.sprite = UI_Paipu_New.Inst.uncollectStar
        label_remark.transform.gameObject:SetActive(true)
        container_input.transform.gameObject:SetActive(false)
        btn_input.transform.gameObject:SetActive(false)
        btn_collect.onClick:RemoveAllListeners()
        btn_collect.onClick:AddListener(function()
            UI_Paipu_New.Inst.pop_collect:Show(gr.uuid,gr.start_time,gr.end_time,go,realindex)
        end)
    end
    local dateTx = go.transform:Find("date"):GetComponent(typeof(UnityEngine.UI.Text))
    dateTx.text =  os.date("%Y/%m/%d %H:%M",gr.end_time)

    --绑定按钮事件
    local btnWatch = go.transform:Find("check"):GetComponent(typeof(UnityEngine.UI.Button))
    btnWatch.onClick:RemoveAllListeners()
    btnWatch.onClick:AddListener(
        function()
            UI_Paipu_New.Inst:Watch(gr.uuid) 
        end)

    local btnShare = go.transform:Find("share"):GetComponent(typeof(UnityEngine.UI.Button))
    if LuaTools.GetCurrentPlatform() == 'AA32' then
        btnShare.transform.gameObject:SetActive(false)
    else
        btnShare.transform.gameObject:SetActive(true)
    end
    btnShare.onClick:RemoveAllListeners()
    btnShare.onClick:AddListener(
        function()
            UI_Paipu_New.Inst:Share(gr.uuid) 
        end)
end



function UI_Paipu_New:Encode(uuid)
    local s= ''
    local code0 = Tools.utf8ToNum('0')
    local codea = Tools.utf8ToNum('a')

    for i=1,Tools.GetStringLength(uuid) do
        local c = Tools.UTF8Sub(uuid,i,1)
        local code = Tools.utf8ToNum(c)
        local v = -1
        if code >= code0 and code < code0+10 then
            v = code - code0
        elseif code >= codea and code < codea + 26 then
            v = code - codea + 10
        end
        if v == -1 then s= s..c else
            v = (v + 16 + i)%36
            if v < 10 then
                s = s .. string.char(code0 + v)
            else
                s = s .. string.char(codea + v - 10)
            end
        end
    end
    return s
end

function UI_Paipu_New:Decode(uuid)
    local s= ''
    local code0 = Tools.utf8ToNum('0')
    local codea = Tools.utf8ToNum('a')

    for i=1,Tools.GetStringLength(uuid) do
        local c = Tools.UTF8Sub(uuid,i,1)
        local code = Tools.utf8ToNum(c)
        local v = -1
        if code >= code0 and code < code0+10 then
            v = code - code0
        elseif code >= codea and code < codea + 26 then
            v = code - codea + 10
        end
        
        if v == -1 then s= s.. c else
            v = (v + 56 - i)%36
            if v < 10 then
                s = s .. string.char(code0 + v)
            else
                s = s .. string.char(codea + v - 10)
            end
        end
    end
    return s
end

function UI_Paipu_New.IsCollect(uuid)
    if  UI_Paipu_New.Inst.collect_info[uuid] then
        return true
    end
    return false
end

function UI_Paipu_New.ReplaceUrl(url)
    local http = 'http'
    local isStartsWithHttp = string.sub(url, 1, #http) == http
    if isStartsWithHttp then
        return url
    else
        local prefix = GameMgr.Inst.prefix_url
        return prefix .. url
    end
    -- return string.gsub(url, 'https%:%/%/record%-v3%.maj%-soul%.com%:9443', 'https://record-v3.maj-soul.net')
end

return UI_Paipu_New
