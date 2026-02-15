require "UI.UIBase"
require "UI.UIBlock"
require "UI.UI_PlayerNote"
require "UI.UI_PlayerCInfo"
require "UI.UI_Name"
require "GameUtility"
-- require "UI_PlayerNote"
local json = require('cjson')
local pt = require('PrintTable')
local GameMode = GameUtility.EMjCategory
local EMjMode = GameUtility.EGameCategory
UI_SelfPlayerinfo = UIBase:Inherit()
UI_SelfPlayerinfo.Root = UIBlock:Inherit()
UI_SelfPlayerinfo.Root.Season1 = UIBlock:Inherit()
UI_SelfPlayerinfo.Root.Season2 = UIBlock:Inherit()
UI_SelfPlayerinfo.Root.Season3 = UIBlock:Inherit()
UI_SelfPlayerinfo.Root.Container_Note = UIBlock:Inherit()
UI_SelfPlayerinfo.Container_SignInput = UIBlock:Inherit()
-- ================= funcs ==================
UI_SelfPlayerinfo.color = {{96/255,132/255,176/255},{73/255,105/255,144/255}}
function UI_SelfPlayerinfo:OnCreate()
    UI_SelfPlayerinfo.Inst = self
    self:Init()
    if GameMgr.Inst.prefer_language == 'chs'
    or GameMgr.Inst.prefer_language == 'chs_t' then
        self.chooseSprite = Tools.GetLocalizedImgPath("pic/myres/bothui/info_tab_chosen.png")
        self.unchooseSprite = Tools.GetLocalizedImgPath("pic/myres/bothui/info_tab_dark.png")
    else
        self.chooseSprite = Tools.GetLocalizedImgPath("pic/myres/bothui/info_tabheng_chosen.png")
        self.unchooseSprite = Tools.GetLocalizedImgPath("pic/myres/bothui/info_tabheng_dark.png")
    end

    self.root.tab_note.transform.gameObject:SetActive(GameMgr.Inst.client_language ~= 'chs' and GameMgr.Inst.client_language ~= 'chs_t')

    self.root.what.transform:SetRectPos(self.root.label_shuxing.transform.anchoredPosition.x+LuaTools.GetStringWidth(self.root.label_shuxing,self.root.label_shuxing.text)-10,self.root.what.transform.anchoredPosition.y)

    self.btnInfo3Img = self.root.tab_info3.transform:GetComponent(typeof(UnityEngine.UI.Image))
    self.btnInfo4Img = self.root.tab_info4.transform:GetComponent(typeof(UnityEngine.UI.Image))
    self.btnNoteImg = self.root.tab_note.transform:GetComponent(typeof(UnityEngine.UI.Image))
    self.btnInfo3Img:SetTexture(self.unchooseSprite)
    self.btnInfo4Img:SetTexture(self.chooseSprite)
    self.btnNoteImg:SetTexture(self.unchooseSprite)

    self.openedTab = self.btnInfo4Img
    self.container_sign_input.inputfield = self.container_sign_input.transform:Find('input')
    self.signinput = self.container_sign_input.inputfield.transform:GetComponent(typeof(UnityEngine.UI.InputField))
    self.btnInfo4Img:SetTexture(self.chooseSprite)
    self.bar = self.root.container_note.scrollbar

    self.root.infoscroll = self.root.transform:Find("container_info"):Find("data"):Find("ScrollData"):GetComponent(typeof(UnityEngine.UI.ScrollRect))
    self.root.notescroll = self.root.container_note.transform:Find("mask"):GetComponent(typeof(UnityEngine.UI.ScrollRect))
    self.root.what:GetComponent(typeof(UnityEngine.UI.Button)).onClick:AddListener(function()
        UIMgr.Inst:Show_InfoLite(Tools.StrOfLocalization(51))
    end)
    self.container_sign_input.transform.gameObject:SetActive(false)
    self.note = UI_PlayerNote:Init(self.root.container_note)
    self.info = UI_PlayerCInfo:Init(self.root)
    self.note:InitNoteData(GameMgr.Inst.account_id,self.root.container_note.nonote,self.root.redpoint)
    self.notePgs = {}
    if GameMgr.Inst.prefer_language == 'en' then
        local rank_words = {'st','nd','rd','th'}
        for i=1,4 do
            local label = self.root.transform:Find("container_info"):Find("data"):Find("ScrollData"):Find("ViewPoint"):Find("content"):Find("zoushi"):Find("lb"..i):Find("node"):GetComponent(typeof(UnityEngine.UI.Text))
            label.text= rank_words[i]
            label.fontSize = 46
        end
    end

    self.root.container_name = UI_Name:Init(self.root.transform:Find('container_info'):Find('container_name'), GameUtility.ENameFilterServiceType.MYSELF)
    self:GetData()

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

function UI_SelfPlayerinfo:Close()
    self.root:Close()
    LogTool.Info("UIMgr", "关闭个人信息UI")
end

function UI_SelfPlayerinfo.Root:OpenInfo3()
    if UI_SelfPlayerinfo.Inst.game_mode ~= 2 then
        self.infoscroll.inertia = false
        self.tag_index = 1
        UI_SelfPlayerinfo.Inst.info:ResetInfoview()
        self:IsCloseHuoDong()
        UI_SelfPlayerinfo.Inst.info:SwtichMode(2)
        self.container_note.transform.gameObject:SetActive(false)
        self.container_info.transform.gameObject:SetActive(true)
        UI_SelfPlayerinfo.Inst:SwitchTabBtn(UI_SelfPlayerinfo.Inst.btnInfo3Img)
        UI_SelfPlayerinfo.Inst.game_mode = 2
        UI_SelfPlayerinfo.Inst.type = 2
        UI_SelfPlayerinfo.Inst.info:RefreshData(2,2)
        self.infoscroll.inertia = true
    end
end

function UI_SelfPlayerinfo.Root:OpenInfo4()
    if UI_SelfPlayerinfo.Inst.game_mode ~= 1 then
        self.infoscroll.inertia = false
        self.tag_index = 1
        UI_SelfPlayerinfo.Inst.info:ResetInfoview()
        -- self.btn_shilian.btn.transform.gameObject:SetActive(true)
        self:IsCloseHuoDong()
        UI_SelfPlayerinfo.Inst.info:SwtichMode(2)
        self.container_note.transform.gameObject:SetActive(false)
        self.container_info.transform.gameObject:SetActive(true)
        UI_SelfPlayerinfo.Inst:SwitchTabBtn(UI_SelfPlayerinfo.Inst.btnInfo4Img)
        UI_SelfPlayerinfo.Inst.game_mode = 1
        UI_SelfPlayerinfo.Inst.type = 2
        UI_SelfPlayerinfo.Inst.info:RefreshData(1,2)
        self.infoscroll.inertia = true
    end
end

function UI_SelfPlayerinfo.Root:OpenIntroduce()
    if UI_SelfPlayerinfo.Inst.game_mode == 1 then
        UIMgr.Inst:Show_Introduce(4)
    else
        UIMgr.Inst:Show_Introduce(3)
    end
end

function UI_SelfPlayerinfo.Root:OpenNote()
    local time = Tools.GetRealTime()
    if GameMgr.in_limited_mode() then
        UIMgr.Inst:Show_ErrorInfo('功能维护中，祝大家新年快乐')
    else
        self.container_note:ShowNote()
        UI_SelfPlayerinfo.Inst.note:Show()
        UI_SelfPlayerinfo.Inst:SwitchTabBtn(UI_SelfPlayerinfo.Inst.btnNoteImg)
        self.container_note.curPage.text = 1
        UI_SelfPlayerinfo.Inst.game_mode = 0
        self.container_note.btn_left.transform.gameObject:SetActive(false)
        self.container_note.transform.gameObject:SetActive(true)
        self.container_info.transform.gameObject:SetActive(false)
    end
end

function UI_SelfPlayerinfo.Root:OpenFriend()
    self.tag_index = 2
    if UI_SelfPlayerinfo.Inst.type ~= 1 then
        self:IsCloseHuoDong()
        UI_SelfPlayerinfo.Inst.info:ResetInfoview()
        UI_SelfPlayerinfo.Inst.info:SwtichMode(1)
        UI_SelfPlayerinfo.Inst.type = 1
        UI_SelfPlayerinfo.Inst.info:RefreshData(UI_SelfPlayerinfo.Inst.game_mode,EMjMode.friend_room)
    end
end

function UI_SelfPlayerinfo.Root:OpenPipei()
    self.tag_index = 1
    if UI_SelfPlayerinfo.Inst.type ~= 2 then
        self:IsCloseHuoDong()
        UI_SelfPlayerinfo.Inst.info:ResetInfoview()
        UI_SelfPlayerinfo.Inst.info:SwtichMode(2)
        UI_SelfPlayerinfo.Inst.type = 2
        UI_SelfPlayerinfo.Inst.info:RefreshData(UI_SelfPlayerinfo.Inst.game_mode,EMjMode.matching)
    end
end

function UI_SelfPlayerinfo.Root:OpenShilian()
    self.tag_index = 3
    if UI_SelfPlayerinfo.Inst.type ~= 3 then
        self:IsOpenHuodong()
        UI_SelfPlayerinfo.Inst.info:ResetInfoview()
        UI_SelfPlayerinfo.Inst.info:SwtichMode(3)
        UI_SelfPlayerinfo.Inst.type = 3
        UI_SelfPlayerinfo.Inst.info:RefreshData(UI_SelfPlayerinfo.Inst.game_mode,EMjMode.matching,100)
    end
end

function UI_SelfPlayerinfo.Root:OpenAchievement()
    self:Close()
    UIMgr:Hide_Lobby(function()
        LobbyBackground.Inst:ShowBack(2)
        UIMgr.Inst:Show_Trophy()
    end)
end

function UI_SelfPlayerinfo:GetData(callback)
    local request = ProtoMgr.CreateRequest('Lobby', 'fetchAccountStatisticInfo')
    request.account_id=GameMgr.Inst.account_id
    self:RefreshBaseInfo()
    LobbyNetMgr.SendRequest('Lobby', 'fetchAccountStatisticInfo', request, function(err, res)   
        if err or (res.error and res.error.code ~= 0) then
            UIMgr.Inst:Show_NetReqError('fetchAccountStatisticInfo', err, res)
        else
            self.statistic_data=res.statistic_data
            self.detail_data=res.detail_data
            self.info:InitInfoData(res,GameMgr.Inst.account_id)
            if callback then
                callback()
            end
        end
    end)

    local request = ProtoMgr.CreateRequest('Lobby','fetchAccountChallengeRankInfo')
    request.account_id = GameMgr.Inst.account_id
    LobbyNetMgr.SendRequest('Lobby','fetchAccountChallengeRankInfo',request,function(err,res)
        if err or res.error.code ~= 0 then
            UIMgr.Inst:Show_NetReqError('fetchAccountChallengeRankInfo',err,res)
        else
            UI_SelfPlayerinfo.Inst.info:SetSeasonRank(res)
        end
    end)
end

function UI_SelfPlayerinfo:Init()
    self.statistic_data={}
    self.detail_data={}
    self.words={}
    self.wordtopinyin={}
    self.shoupai_spacing = 14
    self.fanmaxindex=50
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

    
end


function UI_SelfPlayerinfo.Root:ShowTitle()
    if UI_PiPeiYuYue.Inst.transform.gameObject.activeSelf then 
        UIMgr.Inst:Show_PopOutNoTitle(Tools.StrOfLocalization(204), function() end)
        return
    end
    UI_TitleBook.Inst:Show()
end

function UI_SelfPlayerinfo.Root:ChangeName()
    -- 禁止玩家匹配中改名
    if UI_PiPeiYuYue.Inst.transform.gameObject.activeSelf then -- 匹配的情況下不能進入
        UIMgr.Inst:Show_PopOutNoTitle(Tools.StrOfLocalization(204))
        return
    end
    UIMgr.Inst:Show_ChangeName()
end

function UI_SelfPlayerinfo.Root:IsCloseHuoDong()
    if not self.shilian then
        return
    end
    local delta = -205
    self.shilian = false
end
function UI_SelfPlayerinfo.Root:IsOpenHuodong()
    if self.shilian then
        return
    end
    local delta = 205
    self.shilian = true
end


function UI_SelfPlayerinfo:AnimOpen(trans)
    self.info:ModeChange(trans,true)
end

function UI_SelfPlayerinfo:AnimClose(trans)
    self.info:ModeChange(trans,false)
end

function UI_SelfPlayerinfo:Show()
    self.enable = true
    if self.locking then return end
    self.locking = true
    self.root.tag_index = 1
    self.root:OpenInfo4()
    self.info:ResetMode()
    self:GetData(function()
        self.root.container_note.transform.gameObject:SetActive(false)
        self.root.container_info.transform.gameObject:SetActive(true)
        self.note:Refresh()
        self.transform.gameObject:SetActive(true)
        self:AnimAlphaIn(self.root,{x=0,y=-30},0.25,0,function()
            self.locking = false
        end)
    end)
    local count =  Tools.GetTrophyCount()
    self.root.label_gold.text = count[3]
    self.root.label_sliver.text = count[2]
    self.root.label_copper.text = count[1]

    if JoyStick and JoyStick.Inst then
        JoyStick.Inst:RegistJoyStickFunc(nn.hid.NpadButton.L,function()
            self:ShowLastTag()
        end)
        JoyStick.Inst:RegistJoyStickFunc(nn.hid.NpadButton.R,function()
            self:ShowNextTag()
        end)
        JoyStick.Inst:RegistFuncByBtn(nn.hid.NpadButton.B,self.transform:Find("mask"):GetComponent(typeof(UnityEngine.UI.Button)))
    end

    self:ResetPlatformView()

    ControllerMgr.RegistFunc(ControllerMgr.EButton.back, self.transform.gameObject, function ()
        self:Close()
    end)
end

function UI_SelfPlayerinfo:ShowNextTag()
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

function UI_SelfPlayerinfo:ShowLastTag()
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


function UI_SelfPlayerinfo.Root:Close()
    if self.father.locking then return end
    self.father.locking = true
    UI_SelfPlayerinfo.Inst:AnimAlphaOut(self.transform,{x=0,y=-30},0.25,0,
    function()
        self.enable = false
        self.father.locking = false
        ImageMgr.UnLoadSpriteTag('selfPlayerInfo')
        UI_SelfPlayerinfo.Inst.transform.gameObject:SetActive(false)
        UI_SelfPlayerinfo.Inst:SwitchTabBtn(UI_SelfPlayerinfo.Inst.btnInfo4Img)
        self:OpenPipei()
        self:OpenInfo4()
    end)

    if JoyStick and JoyStick.Inst then
        JoyStick.Inst:RemoveJoyStickFunc(nn.hid.NpadButton.L)
        JoyStick.Inst:RemoveJoyStickFunc(nn.hid.NpadButton.R)
        JoyStick.Inst:RemoveJoyStickFunc(nn.hid.NpadButton.B)
    end
end
function UI_SelfPlayerinfo:SwitchTabBtn(img)
    if img ~= self.openedTab then
        img:SetTexture(self.chooseSprite)
        self.openedTab:SetTexture(self.unchooseSprite)
        self.openedTab = img
    end
end

function UI_SelfPlayerinfo.Root:BtnMode1()
    if(not self.father.info.animdoing)then
        if(self.father.info.ismode1open)then
            self.father:AnimClose(self.mode1)
            self.father.info.ismode1open=false
        else
            self.father:AnimOpen(self.mode1)
            self.father.info.ismode1open=true
        end
    end
end

function UI_SelfPlayerinfo.Root:BtnMode2()
    if(not self.father.info.animdoing)then
        if(self.father.info.ismode2open)then
            self.father:AnimClose(self.mode2)
            self.father.info.ismode2open=false
        else
            self.father:AnimOpen(self.mode2)
            self.father.info.ismode2open=true
        end
    end
end

function UI_SelfPlayerinfo.Root:BtnFan()
    if(not self.father.info.animdoing)then
        if(self.father.info.isfanopen)then
            self.father:AnimClose(self.fan)
            self.father.info.isfanopen=false
        else
            self.father:AnimOpen(self.fan)
            self.father.info.isfanopen=true
        end
    end
end

function UI_SelfPlayerinfo.Root:BtnFan_Guyi()
    if(not self.father.info.animdoing)then
        if(self.father.info.isguyifanopen)then
            self.father:AnimClose(self.fan_guyi)
            self.father.info.isguyifanopen=false
        else
            self.father:AnimOpen(self.fan_guyi)
            self.father.info.isguyifanopen=true
        end
    end
end

function UI_SelfPlayerinfo:RefreshBaseInfo()
    local _data = GameMgr.Inst.account_data
    self.root.container_name:SetName(_data.nickname,_data.account_id,_data.verified)
    self.note:SetSign(_data.signature)
end


function UI_SelfPlayerinfo:ConfirmChange()
    local txt = UI_SelfPlayerinfo.Inst.signinput.text
    if txt == GameMgr.Inst.account_data.signature then
    else
        GameMgr.Inst.account_data.signature = txt
        local request = ProtoMgr.CreateRequest('Lobby','modifySignature')
        request.signature = txt
        LobbyNetMgr.SendRequest('Lobby','modifySignature',request,function(err,res) end)
        self.note:SetSign(txt)
    end
    UI_SelfPlayerinfo.Inst.container_sign_input.transform.gameObject:SetActive(false)
end

function UI_SelfPlayerinfo:RefreshNotePg(count)
    self.root.container_note.btn_page.interactable = count > 1
    for i=1,10 do
        if UI_SelfPlayerinfo.Inst.notePgs[i] then
        else
            local go = UnityEngine.GameObject.Instantiate(UI_SelfPlayerinfo.Inst.root.container_note.pg_templete,UI_SelfPlayerinfo.Inst.root.container_note.content)
            go.transform.localPosition = Vector3(0,-54*(i-1)-2,0)
            go.transform:Find('page'):GetComponent(typeof(UnityEngine.UI.Text)).text = i
            table.insert(UI_SelfPlayerinfo.Inst.notePgs, go)
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
        UI_SelfPlayerinfo.Inst.notePgs[i].transform.gameObject:SetActive(i<=count)
    end
    if count < 5 then
        self.root.container_note.container_pages.transform.sizeDelta = Vector3(self.root.container_note.container_pages.transform.sizeDelta.x,54*count+2)
    else
        self.root.container_note.container_pages.transform.sizeDelta = Vector3(self.root.container_note.container_pages.transform.sizeDelta.x,54*4+2)
    end
end
function UI_SelfPlayerinfo.Render(res,index)
    UI_SelfPlayerinfo.Inst.bar.transform.gameObject:SetActive(false)
    local o = UI_SelfPlayerinfo.Inst.root.notelist[index]
    o.go.transform.gameObject:SetActive(res~=nil)
    if res then
        o.id = res.id
        o.container_name:SetName(res.commenter.nickname, res.commenter.account_id,res.commenter.verified)
        o.head:SetId(res.commenter.avatar_id)
        o.head:SetHeadFrame(res.commenter.avatar_frame,res.commenter.account_id)
        o.btn_del.onClick:RemoveAllListeners()
        o.btn_del.onClick:AddListener(function() UI_SelfPlayerinfo.Inst.note:DelItem(o.id) end)
        o.btn_checkinfo.onClick:RemoveAllListeners()
        o.btn_checkinfo.onClick:AddListener(function()
            UIMgr.Inst:Show_OtherPlayerInfo(res.commenter.account_id,nil,nil,GameUtility.ENameFilterServiceType.FRIEND)
        end)
        local content = json.decode(res.content)
        if content.type == 'emo' then
            local data = json.decode(res.content)
            local d = ExcelMgr.GetData('item_definition','character',data.chara)
            if Tools.CountryLock(res.commenter.account_id, d) then
                d = ExcelMgr.GetData('item_definition','character',200001)
            end
            local emo_path = 'pic/'.. d.emo ..'/' .. data.index
            Tools.ImgOfLocalization(emo_path,o.emo,true,'pic/'.. d.emo ..'/0', 'selfPlayerInfo')
            o.emo.transform.gameObject:SetActive(true)
            o.word.transform.gameObject:SetActive(false)
        else
            o.emo.transform.gameObject:SetActive(false)
            o.word.transform.gameObject:SetActive(true)
            o.word.text = Tools.StrWithoutForbidden(content.text)
        end
        o.date.text = os.date("%Y/%m/%d",res.timestamp)
        o.time.text = os.date("%H:%M",res.timestamp)
        local d_level = ExcelMgr.GetData('level_definition','level_definition',res.commenter.level.id)
        if d_level then
            o.level.text = d_level['full_name_'..GameMgr.Inst.prefer_language]
        end
        UI_SelfPlayerinfo.Inst.root.container_note.note_content.sizeDelta =
            Vector2(UI_SelfPlayerinfo.Inst.root.container_note.note_content.sizeDelta.x,
            UI_SelfPlayerinfo.Inst.root.notelist[index].go.sizeDelta.y*index)
        if index > 3 then
            UI_SelfPlayerinfo.Inst.bar.transform.gameObject:SetActive(true)
        end
    end
end
-----------------------------------------------------------------------------------------
function UI_SelfPlayerinfo.Root.Container_Note:ChangeSign()
    UI_SelfPlayerinfo.Inst.container_sign_input.transform.gameObject:SetActive(true)
    ControllerMgr.RegistBtnBack(UI_SelfPlayerinfo.Inst.container_sign_input.transform:GetComponent(typeof(UnityEngine.UI.Button)))
    if GameMgr.Inst.account_data.signature and GameMgr.Inst.account_data.signature~= '' then
        UI_SelfPlayerinfo.Inst.signinput.text = GameMgr.Inst.account_data.signature
    end
end

function UI_SelfPlayerinfo.Root.Container_Note:ShowNote()
    if UI_SelfPlayerinfo.Inst.note.target_id == GameMgr.Inst.account_id then
        UI_SelfPlayerinfo.Inst.note:Read()
        UI_SelfPlayerinfo.Inst.root.notescroll.verticalNormalizedPosition=1
        UI_SelfPlayerinfo.Inst.root.redpoint.transform.gameObject:SetActive(false)
        UI_SelfPlayerinfo.Inst.root.container_note.btn_right.transform.gameObject:SetActive(UI_SelfPlayerinfo.Inst.note.totalPg > 1)
    end
end

function UI_SelfPlayerinfo.Root.Container_Note:Left()
    UI_SelfPlayerinfo.Inst.root.notescroll.verticalNormalizedPosition=1
    UI_SelfPlayerinfo.Inst.note:RenderPage(tonumber(self.curPage.text)-1)
end

function UI_SelfPlayerinfo.Root.Container_Note:Right()
    UI_SelfPlayerinfo.Inst.root.notescroll.verticalNormalizedPosition=1
    UI_SelfPlayerinfo.Inst.note:RenderPage(tonumber(self.curPage.text)+1)
end

function UI_SelfPlayerinfo:ResetPlatformView()
    if LuaTools.GetCurrentPlatform() == 'AA32' then
        self.root.btn_shilian.transform:Find('nstip').gameObject:SetActive(true)
        self.root.btn_pipei.transform:Find('nstip').gameObject:SetActive(true)
    else
        self.root.btn_shilian.transform:Find('nstip').gameObject:SetActive(false)
        self.root.btn_pipei.transform:Find('nstip').gameObject:SetActive(false)
    end
end


return UI_SelfPlayerinfo
