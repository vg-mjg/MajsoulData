require "UI.UIBase"
require "UI.UIBlock"
require "UI.UI_PlayerNote"
require "UI.UI_PlayerCInfo"
require("GameUtility")
local json = require('cjson')
local GameMode = GameUtility.EMjCategory
local EMjMode = GameUtility.EGameCategory
UI_OtherPlayerInfo = UIBase:Inherit()
UI_OtherPlayerInfo.Root = UIBlock:Inherit()
UI_OtherPlayerInfo.Root.Season1 = UIBlock:Inherit()
UI_OtherPlayerInfo.Root.Season2 = UIBlock:Inherit()
UI_OtherPlayerInfo.Root.Season3 = UIBlock:Inherit()
UI_OtherPlayerInfo.Root.Container_Note = UIBlock:Inherit()
UI_OtherPlayerInfo.Root.Container_Emj = UIBlock:Inherit()
UI_OtherPlayerInfo.Root.PopJubao = UIBlock:Inherit()

-- ================= funcs ==================
UI_OtherPlayerInfo.color = {{96/255,132/255,176/255},{73/255,105/255,144/255}}
function UI_OtherPlayerInfo:OnCreate()
    UI_OtherPlayerInfo.Inst = self
    self:Init()
    if GameMgr.Inst.prefer_language == 'chs'
    or GameMgr.Inst.prefer_language == 'chs_t'  then
        LuaTools.LoadSprite("pic/myres/bothui/info_tab_chosen", nil, nil, function(spr)
            self.chooseSprite = spr
        end)
        LuaTools.LoadSprite("pic/myres/bothui/info_tab_dark", nil, nil, function(spr)
            self.unchooseSprite = spr
        end)
    else
        LuaTools.LoadSprite("pic/myres/bothui/info_tabheng_chosen", nil, nil, function(spr)
            self.chooseSprite = spr
        end)
        LuaTools.LoadSprite("pic/myres/bothui/info_tabheng_dark", nil, nil, function(spr)
            self.unchooseSprite = spr
        end)
    end
   
    self.root.tab_note.transform.gameObject:SetActive(GameMgr.Inst.client_language ~= 'chs' and GameMgr.Inst.client_language ~= 'chs_t')
    self.btnInfo3Img = self.root.tab_info3.transform:GetComponent(typeof(UnityEngine.UI.Image))
    self.btnInfo3Img.sprite = self.unchooseSprite
    self.btnInfo4Img = self.root.tab_info4.transform:GetComponent(typeof(UnityEngine.UI.Image))
    self.btnInfo4Img.sprite = self.chooseSprite
    self.btnNoteImg = self.root.tab_note.transform:GetComponent(typeof(UnityEngine.UI.Image))
    self.btnNoteImg.sprite = self.unchooseSprite
    
    self.root.notescroll = self.root.container_note.transform:Find('mask'):GetComponent(typeof(UnityEngine.UI.ScrollRect))
    self.root.container_note.msgcontent = self.root.container_note.textInput.transform:GetComponent(typeof(UnityEngine.UI.InputField))
    self.root.container_note.btnSendImg = self.root.container_note.btn_send.transform:GetComponent(typeof(UnityEngine.UI.Image))
    self.note = UI_PlayerNote:Init(self.root.container_note)
    self.info = UI_PlayerCInfo:Init(self.root)

    local what = self.info.infoscroll.content.transform:Find('fengge'):Find('what')
    if GameMgr.Inst.prefer_language ~= 'en' then
        what:SetRectPos(-229,95)
    else
        what:SetRectPos(-185,95)
    end
    what:GetComponent(typeof(UnityEngine.UI.Button)).onClick:AddListener(function()
        UIMgr.Inst:Show_InfoLite(Tools.StrOfLocalization(51))
    end)

    self.root.container_name = UI_Name:Init(self.root.transform:Find('container_info'):Find('container_name'), GameUtility.ENameFilterServiceType.FRIEND)
    self.root.btn_jubao.onClick:AddListener(function()
        self.root.page_jubao:Show()
    end)
    self.root.page_jubao.transform.gameObject:SetActive(false)
    self.openedTab = self.btnInfo4Img
    self.btnInfo4Img.sprite = self.chooseSprite
    self.notePgs = {}
    self.level = {}
    self.title = {}
    self._data = {}
    self.root.container_emj.emjlist = {}
    self.root.container_emj.charlist = {}
    self.root.container_emj.emj_container = {}

    local default_char = {}
    default_char.go = self.root.container_emj.emo_char_temp.transform.gameObject
    default_char.btn = self.root.container_emj.emo_char_temp.transform:GetComponent(typeof(UnityEngine.UI.Button))
    default_char.btn.onClick:AddListener(function()
        self.root.container_emj:SwitchChar(default_char)
        self.root.container_emj:RefreshEmj()
    end)
    default_char.chosen = default_char.go.transform:Find('chosen').gameObject
    default_char.icon = default_char.go.transform:Find('icon'):GetComponent(typeof(UnityEngine.UI.Image))
    table.insert(self.root.container_emj.charlist, default_char)

    self.root.container_note.btn_cd = 0

    if GameMgr.Inst.prefer_language == 'en' then
        local rank_words = {'st','nd','rd','th'}
        for i=1,4 do
            local label = self.root.transform:Find("container_info"):Find("data"):Find("ScrollData"):Find("ViewPoint"):Find("content"):Find("zoushi"):Find("lb"..i):Find("node"):GetComponent(typeof(UnityEngine.UI.Text))
            label.text = rank_words[i]
            label.fontSize = 46
        end
    end

    if GameMgr.Inst.prefer_language =='kr' then
        local mode1 = self.root.transform:Find("container_info/data/ScrollData/ViewPoint/content/mode1/detail")
        local mode2 = self.root.transform:Find("container_info/data/ScrollData/ViewPoint/content/mode2/detail")
        for index, value in ipairs({mode1, mode2}) do
            for i = 1, 4 do
                value:Find('pos' .. i):Find('node').gameObject:SetActive(false)
                value:Find('pos' .. i):Find('node_kr').gameObject:SetActive(true)
            end
        end
    end
end


function UI_OtherPlayerInfo:Close()
    self.root:Close()
    if JoyStick and JoyStick.Inst then
        JoyStick.Inst:RemoveJoyStickFunc(nn.hid.NpadButton.L)
        JoyStick.Inst:RemoveJoyStickFunc(nn.hid.NpadButton.R)
        JoyStick.Inst:RemoveJoyStickFunc(nn.hid.NpadButton.B)
    end
end

function UI_OtherPlayerInfo:SetData(detail_data,res)
    detail_data.statistic_data = res.statistic_data
    detail_data.detail_data = res.detail_data
end

---@param typemode number 2：友人 3：试炼
function UI_OtherPlayerInfo:Show(account_id,game_mode,type_mode,name_service_type)
    if self.locking then return end
    self.name_service_type = name_service_type
    if JoyStick and JoyStick.Inst then
        JoyStick.Inst:RegistJoyStickFunc(nn.hid.NpadButton.L,function()
            self:ShowLastTag()
        end)
        JoyStick.Inst:RegistJoyStickFunc(nn.hid.NpadButton.R,function()
            self:ShowNextTag()
        end)
        JoyStick.Inst:RegistFuncByBtn(nn.hid.NpadButton.B,self.root.transform:Find("btn_close"):GetComponent(typeof(UnityEngine.UI.Button)))
    end

    local _d = Tools.getplayerprefshandler().GetString('recent_emo_' .. GameMgr.Inst.account_id)
    if _d and _d ~= '' then
        self.root.container_emj.recent_emo_list = json.decode(_d)
    else
        self.root.container_emj.recent_emo_list = {}
    end
    
    self.locking = true
    self.show_mode = game_mode or GameMode.Liqi4
    self.account_id = account_id
    self.type = 0 -- reset type
    self.root.btn_jubao.transform.gameObject:SetActive(account_id ~= GameMgr.Inst.account_id)
    self.root.container_emj.transform.gameObject:SetActive(false)
    self.root.container_emj.btncd = false
    self.info:ResetMode()
    self:GetData(account_id,type_mode, function()
        self.transform:SetAsLastSibling()
        self.transform.gameObject:SetActive(true)
        -- self.info:ResetInfoview()
        self.root.transform:SetLocalScale(1, 1, 1)
        self:AnimPopOut(self.root, function()
            self.locking = false
            if type_mode == 2 then
                self.root:OpenFriend()
            elseif type_mode == 3 then
                self.root:OpenShilian()
            elseif type_mode == 1 then
                self.root:OpenPipei()
            else
                self.root.tag_index = 1
                --typemode缺省时用默认数据不做二次打开
                self.info:SwtichMode(2)
            end
            if JoyStick and JoyStick.Inst then
                JoyStick.Inst:SetPage(self,'UI_OtherPlayerInfo',function() self:Close() end,self.transform:Find("mask"):GetComponent(typeof(UnityEngine.UI.Button)))
            end
        end)
    end)
    self.note:InitNoteData(account_id,self.root.container_note.nonote)

    self:ResetPlatformView()

    ControllerMgr.RegistFunc(ControllerMgr.EButton.back, self.transform.gameObject, function ()
        self:Close()
    end)
end

function UI_OtherPlayerInfo:ShowNextTag()
    if not self.root.tag_index then
        self.root.tag_index = 1
    end
    local index = self.root.tag_index + 1
    if index > 3 then
        index = 1
    end
    if index == 1 then
        self.root:OpenPipei()
    elseif index == 2 then
        self.root:OpenFriend()
    elseif index == 3 then
        self.root:OpenShilian()
    end
end

function UI_OtherPlayerInfo:ShowLastTag()
    if not self.root.tag_index then
        self.root.tag_index = 1
    end
    local index = self.root.tag_index - 1
    if index < 1 then
        index = 3
    end
    if index == 1 then
        self.root:OpenPipei()
    elseif index == 2 then
        self.root:OpenFriend()
    elseif index == 3 then
        self.root:OpenShilian()
    end
end

function UI_OtherPlayerInfo:GetData(account_id,type,callback)
    local request = ProtoMgr.CreateRequest('Lobby', 'fetchAccountStatisticInfo')
    request.account_id = account_id
    LobbyNetMgr.SendRequest('Lobby', 'fetchAccountStatisticInfo', request, function(err, res)
        if err or res.error.code ~=0 then
            UIMgr.Inst:Show_NetReqError('fetchAccountStatisticInfo',err,res)
        else
            self:RefreshBaseInfo(res,type,callback)
        end
    end)

    UI_OtherPlayerInfo.Inst.info.season_info = {}
    local request = ProtoMgr.CreateRequest('Lobby','fetchAccountChallengeRankInfo')
    request.account_id = UI_OtherPlayerInfo.Inst.account_id
    LobbyNetMgr.SendRequest('Lobby','fetchAccountChallengeRankInfo',request,function(err,res)
        if err or res.error.code ~= 0 then
            UIMgr.Inst:Show_NetReqError('fetchAccountChallengeRankInfo',err,res)
        else
            UI_OtherPlayerInfo.Inst.info:SetSeasonRank(res)
        end
    end)
end
function UI_OtherPlayerInfo.Root:OpenInfo3(type)
    UI_OtherPlayerInfo.Inst.info.infoscroll.verticalNormalizedPosition = 1
    type = type or 2
    self.father:SwitchTabBtn(self.father.btnInfo3Img)
    if UI_OtherPlayerInfo.Inst.game_mode ~= GameMode.Liqi3 then
        self.father.info.infoscroll.inertia = false
        self.tag_index = 1
        self.father.info:ResetInfoview()
        self:IsCloseHuoDong()
        self.father.info:SwtichMode(2)
        self.container_note.transform.gameObject:SetActive(false)
        self.container_info.transform.gameObject:SetActive(true)
        self.father.game_mode = 2
        self.father.type = type
        self.father.info:RefreshData(2,type)
        self.father.info.infoscroll.inertia = true
    end
end

function UI_OtherPlayerInfo.Root:OpenInfo4(type)
    UI_OtherPlayerInfo.Inst.info.infoscroll.verticalNormalizedPosition = 1
    type = type or 2
    self.father:SwitchTabBtn(UI_OtherPlayerInfo.Inst.btnInfo4Img)
    if UI_OtherPlayerInfo.Inst.game_mode ~= 1 then
        UI_OtherPlayerInfo.Inst.info.infoscroll.inertia = false
        self.tag_index = 1
        self.father.info:ResetInfoview()
        self:IsCloseHuoDong()
        UI_OtherPlayerInfo.Inst.info:SwtichMode(2)
        self.container_note.transform.gameObject:SetActive(false)
        self.container_info.transform.gameObject:SetActive(true)
        UI_OtherPlayerInfo.Inst.game_mode = 1
        UI_OtherPlayerInfo.Inst.type = type
        UI_OtherPlayerInfo.Inst.info:RefreshData(1,type)
        UI_OtherPlayerInfo.Inst.info.infoscroll.inertia = true
    end
end

function UI_OtherPlayerInfo.Root:ResetInfos()
    self:IsCloseHuoDong() --关闭试炼标签
    self.tag_index = 1
    UI_OtherPlayerInfo.Inst.info:SwtichMode(2) --切换回匹配
    UI_OtherPlayerInfo.Inst.type = 2
end

function UI_OtherPlayerInfo.Root:OpenNote()
    local time = Tools.GetRealTime()
    if GameMgr.in_limited_mode() then
        UIMgr.Inst:Show_ErrorInfo('功能维护中，祝大家新年快乐')
    else
        self.container_note.msgcontent.text = ''
        UI_OtherPlayerInfo.Inst:SwitchTabBtn(UI_OtherPlayerInfo.Inst.btnNoteImg)
        UI_OtherPlayerInfo.Inst.Root.Container_Note:ShowNote()
        self.container_note.curPage.text = 1
        UI_OtherPlayerInfo.Inst.game_mode = 0
        self.container_note.btn_left.transform.gameObject:SetActive(false)
        self.container_note.transform.gameObject:SetActive(true)
        self.container_info.transform.gameObject:SetActive(false)
    end
end

function UI_OtherPlayerInfo.Root:OpenFriend()
    self:IsCloseHuoDong()
    if UI_OtherPlayerInfo.Inst.type ~= 1 then
        UI_OtherPlayerInfo.Inst.info.infoscroll.verticalNormalizedPosition = 1
        UI_OtherPlayerInfo.Inst.type = 1
        self.tag_index = 2
        self.father.info:ResetInfoview()
        UI_OtherPlayerInfo.Inst.info:SwtichMode(1)
        UI_OtherPlayerInfo.Inst.info:RefreshData(UI_OtherPlayerInfo.Inst.game_mode,EMjMode.friend_room)
    end
end
function UI_OtherPlayerInfo.Root:OpenPipei()
    self:IsCloseHuoDong()
    if UI_OtherPlayerInfo.Inst.type ~= 2 then
        UI_OtherPlayerInfo.Inst.info.infoscroll.verticalNormalizedPosition = 1
        UI_OtherPlayerInfo.Inst.type = 2
        self.tag_index = 1
        self.father.info:ResetInfoview()
        UI_OtherPlayerInfo.Inst.info:SwtichMode(2)
        UI_OtherPlayerInfo.Inst.info:RefreshData(UI_OtherPlayerInfo.Inst.game_mode,EMjMode.matching)
    end
end


function UI_OtherPlayerInfo.Root:OpenShilian()
    if UI_OtherPlayerInfo.Inst.type ~= 3 then
        self:IsOpenHuodong()
        self.tag_index = 3
        UI_OtherPlayerInfo.Inst.info.infoscroll.verticalNormalizedPosition = 1
        UI_OtherPlayerInfo.Inst.type = 3
        self.father.info:ResetInfoview()
        UI_OtherPlayerInfo.Inst.info:SwtichMode(3)
        UI_OtherPlayerInfo.Inst.info:RefreshData(UI_OtherPlayerInfo.Inst.game_mode,EMjMode.matching,100)
    end
end

function UI_OtherPlayerInfo:Init()
    -- self.statistic_data={}
    self.detail_data={}
    self.words={}
    self.wordtopinyin={}
    self.shoupai_spacing = 14
    self.game_mode = 1

    self.words[1]=self.root.img_title0
    self.words[2]=self.root.img_title1
    self.words[3]=self.root.img_title2
    self.words[4]=self.root.img_title3
    self.img_title_en = self.root.img_title_en
    self.root.notelist = {}
    self.root.templete.gameObject:SetActive(false)
    self.root.container_note.templete.gameObject:SetActive(false)
    self.root.fandetail.sizeDelta=Vector2(self.root.fandetail.sizeDelta.x,self.root.fandetail.sizeDelta.y-self.root.templete.sizeDelta.y)
    self.root.illust = UI_Character_Skin:Init(self.root.illust)
    self.root.illust_spine = UI_Character_Skin:Init(self.root.illust_spine)
end

function UI_OtherPlayerInfo:RefreshBaseInfo(msg,type, callback)
    self:SetData(self.detail_data, msg)
    self.level.id = 0
    self.title.id = 0
    self.root.btn_jubao.transform:SetRectPos(78,378)
    local request = ProtoMgr.CreateRequest('Lobby','fetchAccountInfo')
    request.account_id = self.account_id
    LobbyNetMgr.SendRequest('Lobby','fetchAccountInfo',request,function(err,res)
        if err or res.error.code ~= 0 then
            UIMgr.Inst:Show_NetReqError('fetchAccountInfo',err,res)
        else
            self._data = res.account
            if not Tools.IsSameZone(GameMgr.Inst.account_id,self.account_id)
                or self.account_id == GameMgr.Inst.account_id
                or FriendMgr.Find(self.account_id) ~= nil
            then
                self.root.btn_addfriend.transform.gameObject:SetActive(false)
                self.root.btn_jubao.transform:SetRectPos(-107,378)
            else
                self.root.btn_jubao.transform:SetRectPos(78,378)
                self.root.btn_addfriend.transform.gameObject:SetActive(true)
            end
            if not  self.account_id == GameMgr.Inst.account_id then
                self.root.btn_jubao.transform.gameObject:SetActive(true)
            end
            local skin_data = ExcelMgr.GetData('item_definition', 'skin', self._data.avatar_id)
            self.root.illust_spine.image.gameObject:SetActive(false)
            self.root.illust.image.gameObject:SetActive(false)
            self.root.illust_spine:SetActive(false)
            self.root.illust:SetActive(false)
            if skin_data.spine_type and skin_data.spine_type ~= 0 and not (UI_Config.Inst.close_animskin and UI_Config.Inst.close_animskin == 1)  then
                self.root.illust_spine.image.gameObject:SetActive(true)
                self.root.illust_spine:SetSkin(self._data.avatar_id,'full',nil,nil,self.account_id)
                self.root.illust_spine:SetActive(true)
                --和FriendRoom共用一套数据
                local x, y = Tools.GetIllustOffset(self._data.avatar_id, GameUtility.EIllustLocation.waitingroom, true)
                self.root.illust_spine:AddOffset(x, y, 2)
            else
                self.root.illust.image.gameObject:SetActive(true)
                self.root.illust:SetSkin(self._data.avatar_id,'waitingroom',nil,nil,self.account_id) 
                self.root.illust:SetActive(true)
            end
            self.note:SetSign(self._data.signature)
            self.info:InitInfoData(self.detail_data,
                self.account_id,
                self._data,
                self.show_mode,
                type,
                self.name_service_type)
            if self.show_mode ~= GameMode.Liqi3 then
                self.root:OpenInfo4(type)
            else
                self.root:OpenInfo3(type)
            end
            if callback then
                callback()
            end

            self.root.label_gold.text = 0
            self.root.label_sliver.text = 0
            self.root.label_copper.text = 0
            for i =1,#self._data.achievement_count do
                local _d = self._data.achievement_count[i]
                if _d.rare == 1 then
                    self.root.label_copper.text = _d.count
                elseif _d.rare == 2 then
                    self.root.label_sliver.text = _d.count
                elseif _d.rare == 3 then
                    self.root.label_gold.text = _d.count
                end
            end
        end
    end)
end

function UI_OtherPlayerInfo.Root:AddFriend()
    self.btn_addfriend.transform.gameObject:SetActive(false)
    self.btn_jubao.transform:SetRectPos(-107,378)
    local request = ProtoMgr.CreateRequest('Lobby','applyFriend')
    request.target_id = UI_OtherPlayerInfo.Inst.account_id
    LobbyNetMgr.SendRequest('Lobby','applyFriend',request,function() end)
end

function UI_OtherPlayerInfo:SwitchTabBtn(img)
    if img ~= self.openedTab then
        self.openedTab.sprite = self.unchooseSprite
        self.openedTab = img
        img.sprite = self.chooseSprite
    end
end

function UI_OtherPlayerInfo.Root.Container_Note:ShowNote()
    UI_OtherPlayerInfo.Inst.root.notescroll.verticalNormalizedPosition=1
    UI_OtherPlayerInfo.Inst.note:Read()
    UI_OtherPlayerInfo.Inst.root.container_note.btn_right.transform.gameObject:SetActive(UI_OtherPlayerInfo.Inst.note.totalPg > 1)
end

function UI_OtherPlayerInfo.Root.Container_Note:Left()
    UI_OtherPlayerInfo.Inst.root.notescroll.verticalNormalizedPosition=1
    UI_OtherPlayerInfo.Inst.note:RenderPage(self.current_index-1)
end

function UI_OtherPlayerInfo.Root.Container_Note:Right()
    UI_OtherPlayerInfo.Inst.root.notescroll.verticalNormalizedPosition=1
    UI_OtherPlayerInfo.Inst.note:RenderPage(self.current_index+1)
end


function UI_OtherPlayerInfo.Root:IsCloseHuoDong()
    if not self.shilian then
        return
    end
    local delta = -205
    self.shilian = false
end
function UI_OtherPlayerInfo.Root:IsOpenHuodong()
    if self.shilian then
        return
    end
    local delta = 205
    self.shilian = true
end

function UI_OtherPlayerInfo:AnimOpen(trans)
    self.info:ModeChange(trans,true)
end

function UI_OtherPlayerInfo:AnimClose(trans)
    self.info:ModeChange(trans,false)
end

function UI_OtherPlayerInfo.Root:BtnMode1()
    if(not self.father.animdoing)then
        if(self.father.info.ismode1open)then
            self.father:AnimClose(self.mode1)
            self.father.info.ismode1open=false
        else
            self.father:AnimOpen(self.mode1)
            self.father.info.ismode1open=true
        end
    end
end

function UI_OtherPlayerInfo.Root:BtnMode2()
    if(not self.father.animdoing)then
        if(self.father.info.ismode2open)then
            self.father:AnimClose(self.mode2)
            self.father.info.ismode2open=false
        else
            self.father:AnimOpen(self.mode2)
            self.father.info.ismode2open=true
        end
    end
end

function UI_OtherPlayerInfo.Root:BtnFan()
    if(not self.father.animdoing)then
        if(self.father.info.isfanopen)then
            self.father:AnimClose(self.fan)
            self.father.info.isfanopen=false
        else
            self.father:AnimOpen(self.fan)
            self.father.info.isfanopen=true
        end
    end
end

function UI_OtherPlayerInfo.Root:BtnFan_Guyi()
    if(not self.father.animdoing)then
        if(self.father.info.isguyifanopen)then
            self.father:AnimClose(self.fan_guyi)
            self.father.info.isguyifanopen=false
        else
            self.father:AnimOpen(self.fan_guyi)
            self.father.info.isguyifanopen=true
        end
    end
end



function UI_OtherPlayerInfo.Root:Close()
    if JoyStick and JoyStick.Inst then
        JoyStick.Inst:ClosePage(UI_OtherPlayerInfo.Inst)
    end
    UI_OtherPlayerInfo.Inst:AnimPopHide(self.transform,function()
        ImageMgr.UnLoadSpriteTag('otherPlayerInfo')
        self.root.illust_spine:Clear()
        self.root.illust:Clear()
        UI_OtherPlayerInfo.Inst.transform.gameObject:SetActive(false)
    end)
end

function UI_OtherPlayerInfo:RefreshNotePg(count)
    self.root.container_note.btn_page.interactable = count > 1
    for i=1,10 do
        if UI_OtherPlayerInfo.Inst.notePgs[i] then
        else
            local go = UnityEngine.GameObject.Instantiate(UI_OtherPlayerInfo.Inst.root.container_note.pg_templete,UI_OtherPlayerInfo.Inst.root.container_note.content)
            go.transform.localPosition = Vector3(0,-54*(i-1)-2,0)
            go.transform:Find('page'):GetComponent(typeof(UnityEngine.UI.Text)).text = i
            table.insert(UI_OtherPlayerInfo.Inst.notePgs, go)
            local btn = go.transform:Find('btn'):GetComponent(typeof(UnityEngine.UI.Button))
            btn.onClick:AddListener(function()
                self.curPg = i
                self.root.container_note.btn_left.transform.gameObject:SetActive(i~=1)
                self.root.container_note.btn_right.transform.gameObject:SetActive(i<self.note.totalPg)
                self.note:RenderPage(i)
                self.root.container_note.curPage.text = i
                self.root.container_note.NotePages.transform.gameObject:SetActive(false)
            end)
        end
        UI_OtherPlayerInfo.Inst.notePgs[i].transform.gameObject:SetActive(i<=count)
    end
    if count < 5 then
        self.root.container_note.container_pages.transform.sizeDelta = Vector3(self.root.container_note.container_pages.transform.sizeDelta.x,54*count+2)
    else
        self.root.container_note.container_pages.transform.sizeDelta = Vector3(self.root.container_note.container_pages.transform.sizeDelta.x,54*4+2)
    end
end

function UI_OtherPlayerInfo.Root.Container_Note:SendMsg()
    if self.msgcontent.text ~= '' then
        if self.btn_cd > UnityEngine.Time.time then
            return
        end
        self.btn_cd = UnityEngine.Time.time + 3
        LuaTools.SetImgGray(self.btnSendImg,true)
        local request = ProtoMgr.CreateRequest('Lobby','leaveComment')
        request.target_id = UI_OtherPlayerInfo.Inst.account_id
        request.content = json.encode({type = 'word',text = Tools.StrWithoutForbidden(self.msgcontent.text)})
        LobbyNetMgr.SendRequest('Lobby','leaveComment',request,function(err,res)
            LuaTools.SetImgGray(self.btnSendImg,false)
            self.btn_cd = 0
            if err or res.error.code ~= 0 then
                UIMgr.Inst:Show_NetReqError('leaveComment',err,res)
                if res then
                    if res.error.code == 2004 then
                        self:ShowInfo(self.target_id, 1)
                    elseif res.error.code == 2005 then
                        self:ShowInfo(self.target_id, 2)
                    end
                end
            else
                self.msgcontent.text = ''
                UI_OtherPlayerInfo.Inst.note:Refresh()
            end
        end)
    end
end

function UI_OtherPlayerInfo.Root.Container_Note:ShowInfo(target_id,comment_allow)
    self.comment_allow = comment_allow
    self.noteinfo.transform.gameObject:SetActive(false)
    self.container_input.transform.gameObject:SetActive(false)
    LuaTools.SetImgGray(self.btn_send,false)
    self.btn_send.interactable = false
    local allowed = false
    if target_id == GameMgr.Inst.account_id then
        self.noteinfo.transform.gameObject:SetActive(true)
        self.noteinfo.text = Tools.StrOfLocalization(2155)
    else
        if GameMgr.Inst.ingame then
            self.noteinfo.transform.gameObject:SetActive(true)
            self.noteinfo.text = Tools.StrOfLocalization(20)
        elseif comment_allow == 2 then
            self.noteinfo.transform.gameObject:SetActive(true)
            self.noteinfo.text = Tools.StrOfLocalization(17)
        elseif comment_allow == 1 then
            if FriendMgr.Find(target_id) then
                allowed = true
            else
                self.noteinfo.transform.gameObject:SetActive(true)
                self.noteinfo.text = Tools.StrOfLocalization(18)
            end
        else
            allowed = true
        end
    end

    if allowed then
        self.container_input.transform.gameObject:SetActive(true)
    end
end

function UI_OtherPlayerInfo.Root.Container_Note:OpenEmj()
    UI_OtherPlayerInfo.Inst.root.container_emj:LoadEmj()
    UI_OtherPlayerInfo.Inst.root.container_emj.transform.gameObject:SetActive(true)
end

function UI_OtherPlayerInfo.Root.Container_Emj:LoadEmj()
    UI_OtherPlayerInfo.Inst:AnimPopOut(self.root,function()
    end)
    self._emjs = {}
    self._sort = {}
    local _charlst = {} 
    for i=1,#GameMgr.Inst.characterInfo.characters do
        local _d = GameMgr.Inst.characterInfo.characters[i]
        if _d.charid == GameMgr.Inst.characterInfo.main_character_id then
            table.insert(_charlst, 1, _d)
        else
            table.insert(_charlst,_d)
        end
    end

    for i=1,#_charlst do
        local chara_info = _charlst[i]
        local d = ExcelMgr.GetData('item_definition','character',chara_info.charid)
        if d then
            local emojis,unlock = Tools.GetUnlockEmjs(chara_info)
            local char_emj = {}
            for index = 1,#emojis do
                if unlock[emojis[index].sub_id] == 1 then
                    table.insert(char_emj,{path = 'pic/' .. d.emo..'/'.. emojis[index].sub_id,chara = chara_info.charid,index = emojis[index].sub_id})
                end
            end
            self._emjs[chara_info.charid] = char_emj
            self._sort[i] = chara_info.charid
        end
        if not self.charlist[i+1] then
            local _d = {}
            local _t = UnityEngine.GameObject.Instantiate(self.charlist[1].go,self.emo_charcontent.transform)
            _d.go = _t.gameObject
            _d.btn = _t:GetComponent(typeof(UnityEngine.UI.Button))
            _d.btn.onClick:RemoveAllListeners()
            _d.default = _t.transform:Find('default').gameObject
            _d.img = _t.transform:Find('icon').gameObject
            _d.icon = _t.transform:Find('icon'):Find('Image'):GetComponent(typeof(UnityEngine.UI.Image))
            _d.chosen = _t.transform:Find('chosen').gameObject
            self.charlist[i+1] = _d
            _d.go:SetActive(true)
        end
        local item = self.charlist[i+1]
        Tools.SetHeadImg(item.icon, chara_info.skin, 'smallhead', 'otherPlayerInfo')
        item.default:SetActive(false)
        item.img:SetActive(true)
        item.go:SetActive(true)
        item.btn.onClick:AddListener(function()
            self:SwitchChar(item)
            self:RefreshEmj(chara_info.charid)
        end)
    end

    
    -- for key,value in pairs(self._emjs) do
    for i =1,#self._sort do
        local key = self._sort[i]
        local value = self._emjs[key]
        if not self.emj_container[key] then self.emj_container[key] = {} end
        for i=1,#value do
            if not self.emj_container[key][i] then
                local _d = UnityEngine.GameObject.Instantiate(self.emoji_temp,self.emo_content.transform)
                local item = {}
                item.go = _d.transform.gameObject
                item.btn = _d.transform:GetComponent(typeof(UnityEngine.UI.Button))
                item.icon = _d.transform:Find('default'):GetComponent(typeof(UnityEngine.UI.Image))
                Tools.ImgOfLocalization(value[i].path,item.icon,true)
                self.emj_container[key][i] = item
                item.btn.onClick:RemoveAllListeners()
                item.btn.onClick:AddListener(function()
                    local request = ProtoMgr.CreateRequest('Lobby','leaveComment')
                    request.target_id = UI_OtherPlayerInfo.Inst.account_id
                    request.content = json.encode({type = 'emo',chara = value[i].chara,index = value[i].index})
                    LobbyNetMgr.SendRequest('Lobby','leaveComment',request,function(err,res)
                        if err or res.error.code ~= 0 then
                            UIMgr.Inst:Show_NetReqError('leaveComment',err,res)
                            if res then
                                if res.error.code == 2004 then
                                    UI_OtherPlayerInfo.Inst:Show(UI_OtherPlayerInfo.Inst.account_id,1)
                                elseif res.error.code == 2005 then
                                    UI_OtherPlayerInfo.Inst:Show(UI_OtherPlayerInfo.Inst.account_id,2)
                                end
                            end
                        else
                            for p = 1,#self.recent_emo_list do
                                if self.recent_emo_list[p] == value[i] then
                                    table.remove(self.recent_emo_list,p)
                                end
                            end
                            table.insert(self.recent_emo_list,1,value[i])
                            if #self.recent_emo_list >= 5 then
                                table.remove(self.recent_emo_list,5)
                            end
                            Tools.getplayerprefshandler().SetString('recent_emo_' .. GameMgr.Inst.account_id,json.encode(self.recent_emo_list))

                            UI_OtherPlayerInfo.Inst.root.container_note.msgcontent.text = ''
                            UI_OtherPlayerInfo.Inst.note:Refresh()
                        end
                        UI_OtherPlayerInfo.Inst.root.container_emj:Close()
                    end)
                end)
            end
        end
    end

    
    for i=1,4 do
        self['btn_emo' .. i].transform.gameObject:SetActive(false)
    end
    for i=1,#self.recent_emo_list do
        self['btn_emo' .. i].transform.gameObject:SetActive(true)
        Tools.ImgOfLocalization(self.recent_emo_list[i].path,self['recentemo' .. i],true)
        -- self['recentemo' .. i]:SetTexture(self.recent_emo_list[i].path)
        self['btn_emo' .. i].onClick:RemoveAllListeners()
        self['btn_emo' .. i].onClick:AddListener(function()
            local request = ProtoMgr.CreateRequest('Lobby','leaveComment')
            request.target_id = UI_OtherPlayerInfo.Inst.account_id
            request.content = json.encode({type = 'emo',chara = self.recent_emo_list[i].chara,index = self.recent_emo_list[i].index})
            LobbyNetMgr.SendRequest('Lobby','leaveComment',request,function(err,res)
                if err or res.error.code ~= 0 then
                    UIMgr.Inst:Show_NetReqError('leaveComment',err,res)
                    if res then
                        if res.error.code == 2004 then
                            UI_OtherPlayerInfo.Inst:Show(UI_OtherPlayerInfo.Inst.account_id,1)
                        elseif res.error.code == 2005 then
                            UI_OtherPlayerInfo.Inst:Show(UI_OtherPlayerInfo.Inst.account_id,2)
                        end
                    end
                else
                    UI_OtherPlayerInfo.Inst.root.container_note.msgcontent.text = ''
                    UI_OtherPlayerInfo.Inst.note:Refresh()
                end
                UI_OtherPlayerInfo.Inst.root.container_emj:Close()
            end)
        end)
    end
    self.recentcontainer.transform.gameObject:SetActive(#self.recent_emo_list ~= 0)
    self:SwitchChar(self.charlist[1])
    self:RefreshEmj()
end

function UI_OtherPlayerInfo.Root.Container_Emj:RefreshEmj(charid)
    local _emjs = {}
    local count = 0
    for key,value in pairs(self.emj_container) do
        for i=1,#value do
            value[i].go:SetActive(not charid or key == charid)
            if not charid or key == charid then
                count = count + 1
            end
        end
    end
    local line = math.ceil(count/4)
    self.emo_content.transform:SetSize(self.emo_content.transform.rect.width,140*line)
    self.emocontainer.transform:SetSize(self.emocontainer.transform.rect.width,140*line + 38)

    LuaTools.RefreshLayoutCroup(self.container.transform)
end

function UI_OtherPlayerInfo.Root.Container_Emj:SwitchChar(char_btn)
    if self.now_use_char then
        self.now_use_char.chosen:SetActive(false)
    end
    self.now_use_char = char_btn
    self.now_use_char.chosen:SetActive(true)
end

function UI_OtherPlayerInfo.Root.Container_Emj:ClearRepeatEmjs(tb)
    
end
function UI_OtherPlayerInfo.Root.Container_Emj:Close()
    if self.btncd == nil then
        self.btncd = false
    end
    if self.btncd == false then
        self.btncd = true
        UI_OtherPlayerInfo.Inst:AnimPopHide(self.root,function()
            self.btncd = false
            self.transform.gameObject:SetActive(false)
        end)
    end
end

function UI_OtherPlayerInfo.Root.PopJubao:Show()
    self.btn_ok.transform.gameObject:SetActive(false)
    self.title.text =  Tools.StrOfLocalization(3111)
    self.info2.transform.gameObject:SetActive(false)
    self.info.transform.gameObject:SetActive(true)
    self.btn_confirm.transform.gameObject:SetActive(true)
    self.btn_cancel.transform.gameObject:SetActive(true)
    if self.anim then return end
    self.anim = true
    self.transform.gameObject:SetActive(true)
    self:AnimPopOut(self.root.transform,function()
        self.anim = false
    end)
    ControllerMgr.RegistFunc(ControllerMgr.EButton.back, self.transform.gameObject, function ()
        self:Close()
    end)
end

function UI_OtherPlayerInfo.Root.PopJubao:Confirm()
    local request = ProtoMgr.CreateRequest('Lobby','userComplain')
    request.target_id = UI_OtherPlayerInfo.Inst.account_id
    request.type = 1
    LobbyNetMgr.SendRequest('Lobby','userComplain',request,function(err,res)
        if err or res.error.code ~= 0 then
            UIMgr.Inst:Show_NetReqError('userComplain',err,res)
        else
            self.btn_ok.transform.gameObject:SetActive(true)
            self.btn_cancel.transform.gameObject:SetActive(false)
            self.btn_confirm.transform.gameObject:SetActive(false)
            self.info2.transform.gameObject:SetActive(true)
            self.info.transform.gameObject:SetActive(false)
            self.title.text =  Tools.StrOfLocalization(3113)
            -- self:Close()
        end
    end)
end

function UI_OtherPlayerInfo.Root.PopJubao:Close()
    if self.anim then return end
    self.anim = true
    self:AnimPopHide(self.root.transform,function()
        self.anim = false
        self.transform.gameObject:SetActive(false)
    end)
end

function UI_OtherPlayerInfo.Render(res,index)
    local o = UI_OtherPlayerInfo.Inst.root.notelist[index]
    o.go.transform.gameObject:SetActive(res~=nil)
    if res then
        o.id = res.id
        o.container_name:SetName(res.commenter.nickname, res.commenter.account_id,res.commenter.verified)
        o.head:SetId(res.commenter.avatar_id,res.commenter.account_id)
        o.head:SetHeadFrame(res.commenter.avatar_frame,res.commenter.account_id)
        local content = json.decode(res.content)
        if content.type == 'emo' then
            local data = json.decode(res.content)
            local d= ExcelMgr.GetData('item_definition','character',data.chara)
            if Tools.CountryLock(res.commenter.account_id, d) then
                d = ExcelMgr.GetData('item_definition','character',200001)
            end
            local emo_path = 'pic/'.. d.emo ..'/' .. data.index
            local sprite = LuaTools.LoadSprite(emo_path)
            if not sprite then
                emo_path = 'pic/'.. d.emo ..'/0'
            end
            Tools.ImgOfLocalization(emo_path,o.emo,true)
            o.emo.transform.gameObject:SetActive(true)
            o.word.transform.gameObject:SetActive(false)
        else
            o.emo.transform.gameObject:SetActive(false)
            o.word.transform.gameObject:SetActive(true)
            o.word.text = content.text
        end
        o.date.text = os.date("%Y/%m/%d",res.timestamp)
        o.time.text = os.date("%H:%M",res.timestamp)
        local d_level = ExcelMgr.GetData('level_definition','level_definition', res.commenter.level.id)
        if d_level then
            o.level.text = d_level['full_name_'..GameMgr.Inst.prefer_language]
        end
        o.btn_del.onClick:RemoveAllListeners()
        o.btn_del.onClick:AddListener(function()
            UI_OtherPlayerInfo.Inst.note:DelItem(o.id)
        end)
        o.btn_del.transform.gameObject:SetActive(res.commenter.account_id == GameMgr.Inst.account_id)
        local cachedposx = UI_OtherPlayerInfo.Inst.root.container_note.note_content.sizeDelta.x
        UI_OtherPlayerInfo.Inst.root.container_note.note_content:SetSize(
            cachedposx,
            UI_OtherPlayerInfo.Inst.root.notelist[index].go.sizeDelta.y*index - UI_OtherPlayerInfo.Inst.root.notelist[1].go.localPosition.y)
    end
end

function UI_OtherPlayerInfo:ResetPlatformView()
    if LuaTools.GetCurrentPlatform() == 'AA32' then
        self.root.btn_shilian.transform:Find('nstip').gameObject:SetActive(true)
        self.root.btn_pipei.transform:Find('nstip').gameObject:SetActive(true)
    else
        self.root.btn_shilian.transform:Find('nstip').gameObject:SetActive(false)
        self.root.btn_pipei.transform:Find('nstip').gameObject:SetActive(false)
    end
end

return UI_OtherPlayerInfo
