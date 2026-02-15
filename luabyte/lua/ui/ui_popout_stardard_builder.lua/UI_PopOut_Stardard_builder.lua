require ("UI.UI_PopOut_Stardard")


function UIMgr:UI_PopOut_Stardard_Create(parent)
    local transform
    if GameMgr.Inst.prefer_language == 'chs' or GameMgr.Inst.prefer_language == 'chs_t' then
        transform = LuaTools.LoadPrefab('prefab/ui_output/UI_PopOut_Stardard', parent)
    else
        transform = LuaTools.LoadPrefab('prefab/ui_output/UI_PopOut_Stardard', parent)
    end
    if not transform then
        return nil
    end

    transform.gameObject:SetActive(false)
	---@class UI_PopOut_Stardard_Inst
	local o = UI_PopOut_Stardard:Create(transform)

    ---@type UnityEngine.UI.Button
    o.bg_close = o.transform:Find("bg_close"):GetComponent(typeof(UnityEngine.UI.Button))
    o.bg_close.onClick:AddListener(function() o:Close() end)
    ---@type UnityEngine.Transform
    o.root = o.transform:Find("bg")
    ---@type UnityEngine.UI.Button
    o.btn_cancel_old = o.transform:Find("bg/btn_cancel"):GetComponent(typeof(UnityEngine.UI.Button))
    o.btn_cancel_old.onClick:AddListener(function() o:Close() end)
    o.transform:Find("bg/btn_cancel/node"):GetComponent(typeof(UnityEngine.UI.Text)).text = Tools.StrOfLocalization(2129)
    o.transform:Find("bg/btn_cancel/node"):GetComponent(typeof(UnityEngine.UI.Text)).font = LuaTools.LoadFont(Tools.FontOfLocalization('fengyucumaokai'))
    ---@type UnityEngine.UI.Button
    o.btn_close = o.transform:Find("bg/btn_close"):GetComponent(typeof(UnityEngine.UI.Button))
    o.btn_close.onClick:AddListener(function() o:Close() end)
    ---@type UnityEngine.UI.Text
    o.desc = o.transform:Find("bg/desc"):GetComponent(typeof(UnityEngine.UI.Text))
    o.desc.font = LuaTools.LoadFont(Tools.FontOfLocalization('HYWenHei-75W'))
    ---@type UnityEngine.Transform
    o.root_bottom_btns = o.transform:Find("bg/root_bottom_btns")
    ---@type UnityEngine.UI.Button
    o.btn_confirm = o.transform:Find("bg/root_bottom_btns/btns/btn_confirm"):GetComponent(typeof(UnityEngine.UI.Button))
    o.btn_confirm.onClick:AddListener(function() o:Confirm() end)
    ---@type UnityEngine.UI.Text
    o.desc_confirm = o.transform:Find("bg/root_bottom_btns/btns/btn_confirm/node"):GetComponent(typeof(UnityEngine.UI.Text))
    o.desc_confirm.text = Tools.StrOfLocalization(2263)
    o.desc_confirm.font = LuaTools.LoadFont(Tools.FontOfLocalization('fengyucumaokai'))
    ---@type UnityEngine.UI.Button
    o.btn_cancel = o.transform:Find("bg/root_bottom_btns/btns/btn_cancel"):GetComponent(typeof(UnityEngine.UI.Button))
    o.btn_cancel.onClick:AddListener(function() o:Cancel() end)
    ---@type UnityEngine.UI.Text
    o.desc_cancel = o.transform:Find("bg/root_bottom_btns/btns/btn_cancel/node"):GetComponent(typeof(UnityEngine.UI.Text))
    o.desc_cancel.text = Tools.StrOfLocalization(2264)
    o.desc_cancel.font = LuaTools.LoadFont(Tools.FontOfLocalization('fengyucumaokai'))

	o:OnCreate()
	return o
end

-- ***************** UI_PopOut_Stardard *****************
-- ****** 变量列表
-- Button:  bg_close
-- Button:  btn_cancel
-- Button:  btn_cancel_old
-- Button:  btn_close
-- Button:  btn_confirm
-- Component:  root
-- Component:  root_bottom_btns
-- Text:  desc
-- Text:  desc_cancel
-- Text:  desc_confirm
-- ****** 调用列表
-- Cancel()
-- Close()
-- Close()
-- Close()
-- Confirm()

