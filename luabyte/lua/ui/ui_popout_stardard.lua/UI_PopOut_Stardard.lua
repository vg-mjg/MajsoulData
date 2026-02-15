require "UI.UIBase"
require "UI.UIBlock"

---@class UI_PopOut_Stardard:UI_PopOut_Stardard_Inst
UI_PopOut_Stardard = UIBase:Inherit()


-- ================= funcs ==================

function UI_PopOut_Stardard:OnCreate()
    UI_PopOut_Stardard.Inst = self
end

function UI_PopOut_Stardard:OnCreate()
	---@type UI_PopOut_Stardard
    UI_PopOut_Stardard.Inst = self
    self.locking = false
    self.func_confirm = nil
    self.transform.gameObject:SetActive(false)
    -- self.txt_desc = self.root.transform:Find('text'):GetComponent(typeof(UnityEngine.UI.Text))
    -- self.root.transform:Find('btn_cancel'):GetComponent(typeof(UnityEngine.UI.Button)).onClick:AddListener(function()
    --     self:Close()
    -- end)
    -- self.transform:Find('mask'):GetComponent(typeof(UnityEngine.UI.Button)).onClick:AddListener(function()
    --     self:Close()
    -- end)
end

--- func desc
---@param info string
---@param close_by_bg boolean 是否可以直接点击背景关闭；重要弹窗需要关闭
function UI_PopOut_Stardard:Show(info, close_by_bg, func_confirm, func_cancel, desc_confirm, desc_cancel)
    if self.locking then
        return
    end
    self.locking = true
    self.desc.text = info
    self.btn_close.gameObject:SetActive(close_by_bg)
    self.bg_close.gameObject:SetActive(close_by_bg)

    local show_double_btn = func_confirm ~= nil and func_cancel ~= nil -- 是否显示两个按钮
    self.btn_confirm.gameObject:SetActive(true)
    self.btn_cancel.gameObject:SetActive(show_double_btn)

    self.func_confirm = func_confirm
    self.func_cancel = func_cancel

    if desc_confirm then
        self.desc_confirm.text = desc_confirm
    else
        self.desc_confirm.text = Tools.StrOfLocalization(2263)
    end

    if desc_cancel then
        self.desc_cancel.text = desc_cancel
    else
        self.desc_cancel.text = Tools.StrOfLocalization(2264)
    end

    self.transform.gameObject:SetActive(true)
    self.root:SetSize(1108,100) -- 强刷一下高度
    self.transform:SetAsLastSibling()
    self:AnimPopOut(self.root,function()
        self.locking = false
    end)
    ControllerMgr.RegistFunc(ControllerMgr.EButton.back, self.transform.gameObject, function ()
        self:Close()
    end)
end

-- 确定
function UI_PopOut_Stardard:Confirm()
    if self.locking then
        return
    end
    if self.func_confirm then
        self.func_confirm()
    end
    self:Close()
end

-- 取消
function UI_PopOut_Stardard:Cancel()
    if self.locking then
        return
    end
    if self.func_cancel then
        self.func_cancel()
    end
    self:Close()
end

function UI_PopOut_Stardard:Close()
    if self.locking then
        return
    end
    self.locking = true
    self:AnimPopHide(self.root,function()
        self.transform.gameObject:SetActive(false)
        self.locking = false
    end)
end


return UI_PopOut_Stardard
