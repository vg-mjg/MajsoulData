require ("UI.UI_Debug")


function UIMgr:UI_Debug_Create(parent)
    local transform
    if GameMgr.Inst.prefer_language == 'chs' or GameMgr.Inst.prefer_language == 'chs_t' then
        transform = LuaTools.LoadPrefab('prefab/ui_output/UI_Debug', parent)
    else
        transform = LuaTools.LoadPrefab('prefab/ui_output/UI_Debug', parent)
    end
    if not transform then
        return nil
    end

    transform.gameObject:SetActive(false)
	---@class UI_Debug_Inst
	local o = UI_Debug:Create(transform)

    ---@type UnityEngine.UI.Button
    o.btn_out = o.transform:Find("container/bg/btn_out"):GetComponent(typeof(UnityEngine.UI.Button))
    o.btn_out.onClick:AddListener(function() o:Switch() end)
    ---@type UnityEngine.UI.Button
    o.btn_refresh = o.transform:Find("container/bg/btn_refresh"):GetComponent(typeof(UnityEngine.UI.Button))
    o.btn_refresh.onClick:AddListener(function() o:Refresh() end)
    ---@type UnityEngine.Transform
    o.content = o.transform:Find("container/bg/container/Scroll View/Viewport/Content")
    ---@type UnityEngine.UI.Text
    o.templete = o.transform:Find("container/bg/container/Scroll View/Viewport/Content/templete"):GetComponent(typeof(UnityEngine.UI.Text))
    o.templete.font = LuaTools.LoadFont(Tools.FontOfLocalization('SimHei'))

	o:OnCreate()
	return o
end

-- ***************** UI_Debug *****************
-- ****** 变量列表
-- Button:  btn_out
-- Button:  btn_refresh
-- Component:  content
-- Text:  templete
-- ****** 调用列表
-- Refresh()
-- Switch()

