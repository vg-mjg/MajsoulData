require "UI.UIBase"
require "UI.UIBlock"
require "UI.UI_Activity_Exchange"

UI_Activity_WSJ_Reward = UIBase:Inherit()
-- exchange activity
UI_Activity_WSJ_Reward.activity_id = 240503 -- 240402 -- 230603

local reward_items = {id = {30900025, 30900026, 30900027}, pos_x = {250, 335, 417}, en_pos_x = {250, 335, 417}, pos_y = -28, color = Tools.HexToColor('ffffff')}
if not LangMgr.is_cn_lang then
    reward_items.pos_y = -30.6
end
local max_item_num = 3

function UI_Activity_WSJ_Reward:OnCreate()
    self.Inheritance = getmetatable(self)
    self.Inheritance:OnCreate()
    self.activity_name = ExcelMgr.GetData('activity', 'activity', UI_Activity_WSJ_Reward.activity_id)['name_'..GameMgr.Inst.prefer_language]
    self.activity_name = string.gsub(self.activity_name, '\\n', '\n')
    self.txt_count1 = self.img_head.transform:Find('count0'):GetComponent(typeof(UnityEngine.UI.Text))
    self.txt_count2 = self.img_head.transform:Find('count1'):GetComponent(typeof(UnityEngine.UI.Text))
    self.txt_count3 = self.img_head.transform:Find('count2'):GetComponent(typeof(UnityEngine.UI.Text))
    -- self.txt_count1.font = LuaTools.LoadFont(Tools.FontOfLocalization('SimHei'))
    -- self.txt_count2.font = LuaTools.LoadFont(Tools.FontOfLocalization('SimHei'))
    -- self.txt_count3.font = LuaTools.LoadFont(Tools.FontOfLocalization('SimHei'))
    -- self.txt_count2.transform.gameObject:SetActive(false)
    self.btn_exchange_qingku = self.img_head.transform:Find('btn_qingku'):GetComponent(typeof(UnityEngine.UI.Button))
    self.img_exchange_qingku = self.btn_exchange_qingku.transform:Find('exchange_desc'):GetComponent(typeof(UnityEngine.UI.Image))
    self.btn_exchange_qingku_xiari = self.img_head.transform:Find('btn_qingku_xiari'):GetComponent(typeof(UnityEngine.UI.Button))
    self.img_exchange_qingku_xiari = self.btn_exchange_qingku_xiari.transform:Find('exchange_desc'):GetComponent(typeof(UnityEngine.UI.Image))
    Tools.ImgOfLocalization('myres2/xiariji_qingku/btn_qingku.png',self.img_exchange_qingku)
    Tools.ImgOfLocalization('myres2/xiariji_qingku/btn_qingkuxiari.png',self.img_exchange_qingku_xiari)
    Tools.ImgOfLocalization('myres2/xiariji_qingku/btn_tip.png',self.img_head.transform:Find('btn_tips'):GetComponent(typeof(UnityEngine.UI.Image)))
    self.btn_tips = self.img_head.transform:Find('btn_tips'):GetComponent(typeof(UnityEngine.UI.Button))
    self.btn_tips.onClick:AddListener(function()
        self:Btn_Tips()
    end)

    for i = 1, max_item_num do
        if i > #reward_items.id then
            self['txt_count'..i].transform.gameObject:SetActive(false)
        else
            self['txt_count'..i].transform.gameObject:SetActive(true)
            if GameMgr.Inst.prefer_language == 'en' then
                self['txt_count'..i].transform:SetPos(reward_items.en_pos_x[i], reward_items.pos_y)
            else
                self['txt_count'..i].transform:SetPos(reward_items.pos_x[i], reward_items.pos_y)
            end
            -- self['txt_count'..i].color = reward_items.color
        end
    end
end

function UI_Activity_WSJ_Reward:isopen()
    return UI_Activity.ActivityIsRunning(UI_Activity_WSJ_Reward.activity_id)
end

function UI_Activity_WSJ_Reward:need_popout()
    return ExcelMgr.GetData('activity', 'activity', UI_Activity_WSJ_Reward.activity_id).need_popout == 1
end

function UI_Activity_WSJ_Reward:RefreshCurrencyCount()
    for i = 1, #reward_items.id do
        self['txt_count'..i].text = tostring(UI_Bag.GetCount(reward_items.id[i]))
    end
end

function UI_Activity_WSJ_Reward:Show()
    self.transform.gameObject:SetActive(true)
    self.transform:GetComponent(typeof(UnityEngine.UI.ScrollRect)).verticalNormalizedPosition = 1
    Tools.ImgOfLocalization('pic/myres/activity_21guoqing/banner_huahuo',self.img_head,true)

    local lst = UI_Activity.GetExchangeList(UI_Activity_WSJ_Reward.activity_id)
    local temp = {}
    for i = 1, #lst do
        if lst[i].exchange_id ~= 1097001 
        and lst[i].exchange_id ~= 1097002 then
            table.insert(temp, lst[i])
        else
            local img_exchange = self.img_exchange_qingku
            local btn_exchange = self.btn_exchange_qingku
            if lst[i].exchange_id == 1097002 then
                img_exchange = self.img_exchange_qingku_xiari
                btn_exchange = self.btn_exchange_qingku_xiari
            end
            local d_activity_exchange = ExcelMgr.GetData('activity', 'exchange', lst[i].exchange_id)
            local have_reward = false
            if lst[i].exchange_id == 1097001 then
                for i = 1, #GameMgr.Inst.characterInfo.characters do
                    if GameMgr.Inst.characterInfo.characters[i].charid == d_activity_exchange.reward_id then
                        have_reward = true
                    end
                end
            elseif lst[i].exchange_id == 1097002 then
                if GameMgr.Inst.skin_map[401503] then
                    have_reward = true
                end
            end
            if not have_reward then
                btn_exchange.onClick:RemoveAllListeners()
                if UI_Bag.GetCount(309029) < d_activity_exchange.consume_count then
                    btn_exchange.onClick:AddListener(function()
                        UIMgr.Inst:Show_ErrorInfo(Tools.StrOfLocalization(3217))
                    end)
                else
                    if lst[i].exchange_id == 1097001 then
                        btn_exchange.onClick:AddListener(function()
                            self:ExchangeQingku()
                        end)
                    elseif lst[i].exchange_id == 1097002 then
                        btn_exchange.onClick:AddListener(function()
                            self:ExchangeQingkuXiari()
                        end)
                    end
                end
            else
                btn_exchange.interactable = false
                Tools.ImgOfLocalization('pic/myres2/xiariji_qingku/getted', img_exchange, true)
            end
        end
    end
    self:RefreshView(temp)
end

function UI_Activity_WSJ_Reward:Btn_Tips()
    local index = UI_Activity.Inst.root.page_huodong:GetTaskIndex(1094)
    UI_Activity.Inst.root.page_huodong:OpenTask(index)
    UI_Activity.Inst.tasks[UI_Activity.Inst.root.page_huodong.opening_tasks[index]]:Show_Info()
end

function UI_Activity_WSJ_Reward:ExchangeQingku()
    local d_activity_exchange = ExcelMgr.GetData('activity', 'exchange', 1097001)

    --先禁止按钮等待服务器回传
    self.btn_exchange_qingku.interactable = false
    local request = ProtoMgr.CreateRequest('Lobby', 'exchangeActivityItem')
    request.exchange_id = 1097001
    LobbyNetMgr.SendRequest('Lobby', 'exchangeActivityItem', request, function(err, res)
        self.btn_exchange_qingku.interactable = true
        if err or (res and res.error and res.error.code ~= 0) then
            UIMgr.Inst:Show_NetReqError('exchangeActivityItem', err, res)
        else
            self:RefreshCurrencyCount()
            TimeMgr.Delay(0.5, function()
                self:RefreshCurrencyCount()
            end)
            UI_Activity.OnExchange(1097001)
            UIMgr.Inst:Show_GetChar(d_activity_exchange.reward_id, true)
            self.btn_exchange_qingku.interactable = false
            Tools.ImgOfLocalization('pic/myres2/xiariji_qingku/getted',self.img_exchange_qingku, true)
            -- self.img_exchange_qingku:SetTexture('pic/myres2/xiariji_qingku/getted')
            TimeMgr.Delay(0.1,function ()
                self:RefreshAll()
                self:Show()
            end)
        end
    end)
end

function UI_Activity_WSJ_Reward:ExchangeQingkuXiari()
    local d_activity_exchange = ExcelMgr.GetData('activity', 'exchange', 1097002)
    local d_data = ExcelMgr.GetData('item_definition', 'skin', 401503)
    --先禁止按钮等待服务器回传
    self.btn_exchange_qingku_xiari.interactable = false
    local request = ProtoMgr.CreateRequest('Lobby', 'exchangeActivityItem')
    request.exchange_id = 1097002
    LobbyNetMgr.SendRequest('Lobby', 'exchangeActivityItem', request, function(err, res)
        self.btn_exchange_qingku_xiari.interactable = true
        if err or (res and res.error and res.error.code ~= 0) then
            UIMgr.Inst:Show_NetReqError('exchangeActivityItem', err, res)
        else
            self:RefreshCurrencyCount()
            TimeMgr.Delay(0.5, function()
                self:RefreshCurrencyCount()
            end)
            UI_Activity.OnExchange(1097002)
            UIMgr.Inst:Show_LightTip(Tools.StrOfLocalization(2231, d_data['name_'..GameMgr.Inst.prefer_language]..'  '..'x'..d_activity_exchange.reward_count))
            self.btn_exchange_qingku_xiari.interactable = false
            -- self.img_exchange_qingku_xiari:SetTexture('pic/myres2/xiariji_qingku/getted')
            Tools.ImgOfLocalization('pic/myres2/xiariji_qingku/getted',self.img_exchange_qingku_xiari, true)
            TimeMgr.Delay(0.1,function ()
                self:RefreshAll()
                self:Show()
            end)
        end
    end)
end

function UI_Activity_WSJ_Reward:Hide()
    self.transform.gameObject:SetActive(false)
end