require ("UI.UI.UI_Activity_Moments_Old")


function UIMgr:UI.UI_Activity_Moments_Old_Create(parent)
    local transform
    if GameMgr.Inst.prefer_language == 'chs' or GameMgr.Inst.prefer_language == 'chs_t' then
        transform = LuaTools.LoadPrefab('prefab/ui_output/UI_Activity_Moments_Old', parent)
    else
        transform = LuaTools.LoadPrefab('prefab/ui_output/UI_Activity_Moments_Old', parent)
    end
    if not transform then
        return nil
    end

    transform.gameObject:SetActive(false)
	---@class UI.UI_Activity_Moments_Old_Inst
	local o = UI.UI_Activity_Moments_Old:Create(transform)

    
    o.transform:Find("Scroll View/Viewport/Content/template/name"):GetComponent(typeof(UnityEngine.UI.Text)).font = LuaTools.LoadFont(Tools.FontOfLocalization('SimHei'))
    
    o.transform:Find("Scroll View/Viewport/Content/template/time_desc"):GetComponent(typeof(UnityEngine.UI.Text)).font = LuaTools.LoadFont(Tools.FontOfLocalization('SimHei'))
    
    o.transform:Find("Scroll View/Viewport/Content/template/content"):GetComponent(typeof(UnityEngine.UI.Text)).font = LuaTools.LoadFont(Tools.FontOfLocalization('SimHei'))
    
    o.transform:Find("Scroll View/Viewport/Content/template/interactions/header/likes_count"):GetComponent(typeof(UnityEngine.UI.Text)).font = LuaTools.LoadFont(Tools.FontOfLocalization('SimHei'))
    
    o.transform:Find("Scroll View/Viewport/Content/template/interactions/header/menu_more/like_hint"):GetComponent(typeof(UnityEngine.UI.Text)).font = LuaTools.LoadFont(Tools.FontOfLocalization('SimHei'))
    
    o.transform:Find("Scroll View/Viewport/Content/template/interactions/header/menu_more/comment_hint"):GetComponent(typeof(UnityEngine.UI.Text)).font = LuaTools.LoadFont(Tools.FontOfLocalization('SimHei'))
    
    o.transform:Find("Scroll View/Viewport/Content/template/interactions/selections/1/content"):GetComponent(typeof(UnityEngine.UI.Text)).font = LuaTools.LoadFont(Tools.FontOfLocalization('SimHei'))
    
    o.transform:Find("Scroll View/Viewport/Content/template/interactions/selections/2/content"):GetComponent(typeof(UnityEngine.UI.Text)).font = LuaTools.LoadFont(Tools.FontOfLocalization('SimHei'))
    
    o.transform:Find("Scroll View/Viewport/Content/template/interactions/selections/3/content"):GetComponent(typeof(UnityEngine.UI.Text)).font = LuaTools.LoadFont(Tools.FontOfLocalization('SimHei'))
    
    o.transform:Find("Scroll View/Viewport/Content/template/interactions/replies/template/content"):GetComponent(typeof(UnityEngine.UI.Text)).font = LuaTools.LoadFont(Tools.FontOfLocalization('SimHei'))
    
    o.transform:Find("Scroll View/Viewport/Content/template/interactions/replies/template/depthbg/contentreply"):GetComponent(typeof(UnityEngine.UI.Text)).font = LuaTools.LoadFont(Tools.FontOfLocalization('SimHei'))
    
    o.transform:Find("Scroll View/Viewport/Content/tail/tail"):GetComponent(typeof(UnityEngine.UI.Text)).font = LuaTools.LoadFont(Tools.FontOfLocalization('SimHei'))

	o:OnCreate()
	return o
end

-- ***************** UI.UI_Activity_Moments_Old *****************
-- ****** 变量列表
-- none
-- ****** 调用列表
-- none

