require "UI.UIBase"
require "UI.UIBlock"
require "UI.UI_Activity_GameTask"

UI_Activity_WSJ_Task = UIBase:Inherit()
UI_Activity_WSJ_Task.activity_id = 240501-- 230602

-- ================= funcs ==================

function UI_Activity_WSJ_Task:OnCreate()
    self.Inheritance = getmetatable(self)
    -- self.Inheritance:OnCreate() --builder里会调用inheritance:OnCreate() 不需要重复调用
    self.Inheritance.color = '#BFD543'
    self.activity_name = ExcelMgr.GetData('activity', 'activity', UI_Activity_WSJ_Task.activity_id)['name_'..GameMgr.Inst.prefer_language]
    self.activity_name = string.gsub(self.activity_name, '\\n', '\n')
    self.lst = {}
    self.items = {}
    local d_table = ExcelMgr.GetTable('activity','game_task')
    for key, value in pairs(d_table) do
        if value.activity_id == UI_Activity_WSJ_Task.activity_id then
            self.source_limit = value.limit_id
            local need_insert = true
            for i = 1, #self.items do
                if self.items[i] == value.reward_id then
                    need_insert = false
                    break
                end
            end
            if need_insert then
                table.insert(self.items, value.reward_id)
            end
        end
    end
    table.sort(self.items, function (a, b)
        return a < b
    end)
    
    for i=1,#self.items do
        for key,value in pairs(d_table) do
            if value.activity_id == UI_Activity_WSJ_Task.activity_id and self.items[i] == value.reward_id then
                if not self.lst[i] then
                    self.lst[i] = {}
                    self.lst[i].item_id = self.items[i]
                    self.lst[i].datas = {}
                end
                table.insert(self.lst[i].datas,value)
            end
        end
        table.sort(self.lst[i].datas, function (a, b)
            return a.id < b.id
        end)
    end
    
    Tools.ImgOfLocalization('pic/myres/activity_21guoqing/banner', self.img_head, true)
end



function UI_Activity_WSJ_Task:Show()
    self.transform.gameObject:SetActive(true)
    self:RefreshView(self.lst, self.source_limit)
end

function UI_Activity_WSJ_Task:Hide()
    self.transform.gameObject:SetActive(false)
end

function UI_Activity_WSJ_Task:isopen()
    return UI_Activity.ActivityIsRunning(UI_Activity_WSJ_Task.activity_id)
end

function UI_Activity_WSJ_Task:need_popout()
    return ExcelMgr.GetData('activity', 'activity', UI_Activity_WSJ_Task.activity_id).need_popout == 1
end

function UI_Activity_WSJ_Task:haveRedPoint()
    local lst = UI_Activity.GetGameTaskList(UI_Activity_WSJ_Task.activity_id)
    if lst and #lst > 0 then
        for i = 1,#lst do
            if not lst[i].rewarded and lst[i].achieved then
                return true
            end
        end
    end
    return false
end

return UI_Activity_WSJ_Task
