require ("UI.UI_Paipu_New")
--[[
---@class UI_Paipu_New.PopOtherpaipu: UI_Paipu_New.PopOtherpaipu_Inst
UI_Paipu_New.PopOtherpaipu = UIBlock:Inherit()
---@class UI_Paipu_New.PopCollect: UI_Paipu_New.PopCollect_Inst
UI_Paipu_New.PopCollect = UIBlock:Inherit()
--]]

function UIMgr:UI_Paipu_New_Create(parent)
    local transform
    if GameMgr.Inst.prefer_language == 'chs' or GameMgr.Inst.prefer_language == 'chs_t' then
        transform = LuaTools.LoadPrefab('prefab/ui_output/UI_Paipu_New', parent)
    else
        transform = LuaTools.LoadPrefab('prefab/ui_output/UI_Paipu_New', parent)
    end
    if not transform then
        return nil
    end

    transform.gameObject:SetActive(false)
	---@class UI_Paipu_New_Inst
	local o = UI_Paipu_New:Create(transform)

    ---@type UnityEngine.Transform
    o.container_top = o.transform:Find("top")
    o.transform:Find("top/container_btn/top/node"):GetComponent(typeof(UnityEngine.UI.Text)).text = Tools.StrOfLocalization(2523)
    o.transform:Find("top/container_btn/top/node"):GetComponent(typeof(UnityEngine.UI.Text)).font = LuaTools.LoadFont(Tools.FontOfLocalization('fengyucumaokai'))
    o.transform:Find("top/container_btn/btn_back"):GetComponent(typeof(UnityEngine.UI.Button)).onClick:AddListener(function() o:Hide() end)
    ---@type UnityEngine.Transform
    o.root = o.transform:Find("content")
    o.transform:Find("content/checkother"):GetComponent(typeof(UnityEngine.UI.Button)).onClick:AddListener(function() o:OpenOther() end)
    o.transform:Find("content/checkother/node"):GetComponent(typeof(UnityEngine.UI.Text)).text = Tools.StrOfLocalization(2506)
    o.transform:Find("content/checkother/node"):GetComponent(typeof(UnityEngine.UI.Text)).font = LuaTools.LoadFont(Tools.FontOfLocalization('fengyucumaokai'))
    o.transform:Find("content/collect_limit"):GetComponent(typeof(UnityEngine.UI.Text)).text = Tools.StrOfLocalization(2758)
    o.transform:Find("content/collect_limit"):GetComponent(typeof(UnityEngine.UI.Text)).font = LuaTools.LoadFont(Tools.FontOfLocalization('fengyucumaokai'))
    ---@type UnityEngine.UI.Text
    o.label_collectlimit = o.transform:Find("content/collect_limit/value"):GetComponent(typeof(UnityEngine.UI.Text))
    o.label_collectlimit.font = LuaTools.LoadFont(Tools.FontOfLocalization('haolong_0'))
    ---@type UnityEngine.Transform
    o.scrollbar = o.transform:Find("content/bg/Mask/scrollbar")
    ---@type UnityEngine.Transform
    o.content = o.transform:Find("content/bg/Mask/content")
    
    o.transform:Find("content/bg/Mask/content/templete/p0/rank"):GetComponent(typeof(UnityEngine.UI.Text)).font = LuaTools.LoadFont(Tools.FontOfLocalization('haolong_0'))
    
    o.transform:Find("content/bg/Mask/content/templete/p0/container_name/label_name"):GetComponent(typeof(UnityEngine.UI.Text)).font = LuaTools.LoadFont(Tools.FontOfLocalization('SimHei'))
    
    o.transform:Find("content/bg/Mask/content/templete/p0/score"):GetComponent(typeof(UnityEngine.UI.Text)).font = LuaTools.LoadFont(Tools.FontOfLocalization('SimHei'))
    
    o.transform:Find("content/bg/Mask/content/templete/p0/rank_word"):GetComponent(typeof(UnityEngine.UI.Text)).font = LuaTools.LoadFont(Tools.FontOfLocalization('fengyucumaokai'))
    
    o.transform:Find("content/bg/Mask/content/templete/p1/rank"):GetComponent(typeof(UnityEngine.UI.Text)).font = LuaTools.LoadFont(Tools.FontOfLocalization('haolong_0'))
    
    o.transform:Find("content/bg/Mask/content/templete/p1/container_name/label_name"):GetComponent(typeof(UnityEngine.UI.Text)).font = LuaTools.LoadFont(Tools.FontOfLocalization('SimHei'))
    
    o.transform:Find("content/bg/Mask/content/templete/p1/score"):GetComponent(typeof(UnityEngine.UI.Text)).font = LuaTools.LoadFont(Tools.FontOfLocalization('SimHei'))
    
    o.transform:Find("content/bg/Mask/content/templete/p1/rank_word"):GetComponent(typeof(UnityEngine.UI.Text)).font = LuaTools.LoadFont(Tools.FontOfLocalization('fengyucumaokai'))
    
    o.transform:Find("content/bg/Mask/content/templete/p2/rank"):GetComponent(typeof(UnityEngine.UI.Text)).font = LuaTools.LoadFont(Tools.FontOfLocalization('haolong_0'))
    
    o.transform:Find("content/bg/Mask/content/templete/p2/container_name/label_name"):GetComponent(typeof(UnityEngine.UI.Text)).font = LuaTools.LoadFont(Tools.FontOfLocalization('SimHei'))
    
    o.transform:Find("content/bg/Mask/content/templete/p2/score"):GetComponent(typeof(UnityEngine.UI.Text)).font = LuaTools.LoadFont(Tools.FontOfLocalization('SimHei'))
    
    o.transform:Find("content/bg/Mask/content/templete/p2/rank_word"):GetComponent(typeof(UnityEngine.UI.Text)).font = LuaTools.LoadFont(Tools.FontOfLocalization('fengyucumaokai'))
    
    o.transform:Find("content/bg/Mask/content/templete/p3/rank"):GetComponent(typeof(UnityEngine.UI.Text)).font = LuaTools.LoadFont(Tools.FontOfLocalization('haolong_0'))
    
    o.transform:Find("content/bg/Mask/content/templete/p3/container_name/label_name"):GetComponent(typeof(UnityEngine.UI.Text)).font = LuaTools.LoadFont(Tools.FontOfLocalization('SimHei'))
    
    o.transform:Find("content/bg/Mask/content/templete/p3/score"):GetComponent(typeof(UnityEngine.UI.Text)).font = LuaTools.LoadFont(Tools.FontOfLocalization('SimHei'))
    
    o.transform:Find("content/bg/Mask/content/templete/p3/rank_word"):GetComponent(typeof(UnityEngine.UI.Text)).font = LuaTools.LoadFont(Tools.FontOfLocalization('fengyucumaokai'))
    
    o.transform:Find("content/bg/Mask/content/templete/date"):GetComponent(typeof(UnityEngine.UI.Text)).font = LuaTools.LoadFont(Tools.FontOfLocalization('haolong_0'))
    
    o.transform:Find("content/bg/Mask/content/templete/room"):GetComponent(typeof(UnityEngine.UI.Text)).font = LuaTools.LoadFont(Tools.FontOfLocalization('fengyucumaokai'))
    o.transform:Find("content/bg/Mask/content/templete/check/node"):GetComponent(typeof(UnityEngine.UI.Text)).text = Tools.StrOfLocalization(2451)
    o.transform:Find("content/bg/Mask/content/templete/check/node"):GetComponent(typeof(UnityEngine.UI.Text)).font = LuaTools.LoadFont(Tools.FontOfLocalization('fengyucumaokai'))
    o.transform:Find("content/bg/Mask/content/templete/share/node"):GetComponent(typeof(UnityEngine.UI.Text)).text = Tools.StrOfLocalization(2505)
    o.transform:Find("content/bg/Mask/content/templete/share/node"):GetComponent(typeof(UnityEngine.UI.Text)).font = LuaTools.LoadFont(Tools.FontOfLocalization('fengyucumaokai'))
    
    o.transform:Find("content/bg/Mask/content/templete/input/Placeholder"):GetComponent(typeof(UnityEngine.UI.Text)).font = LuaTools.LoadFont(Tools.FontOfLocalization('Arial'))
    
    o.transform:Find("content/bg/Mask/content/templete/input/Text"):GetComponent(typeof(UnityEngine.UI.Text)).font = LuaTools.LoadFont(Tools.FontOfLocalization('Arial'))
    
    o.transform:Find("content/bg/Mask/content/templete/remarks_info"):GetComponent(typeof(UnityEngine.UI.Text)).font = LuaTools.LoadFont(Tools.FontOfLocalization('SimHei'))
    o.transform:Find("content/tabs/All"):GetComponent(typeof(UnityEngine.UI.Button)).onClick:AddListener(function() o:ShowAll() end)
    ---@type UnityEngine.UI.Image
    o.allImg = o.transform:Find("content/tabs/All/img"):GetComponent(typeof(UnityEngine.UI.Image))
    o.transform:Find("content/tabs/All/img/label_name"):GetComponent(typeof(UnityEngine.UI.Text)).text = Tools.StrOfLocalization(2753)
    o.transform:Find("content/tabs/All/img/label_name"):GetComponent(typeof(UnityEngine.UI.Text)).font = LuaTools.LoadFont(Tools.FontOfLocalization('fengyucumaokai'))
    o.transform:Find("content/tabs/Rank"):GetComponent(typeof(UnityEngine.UI.Button)).onClick:AddListener(function() o:ShowRank() end)
    ---@type UnityEngine.UI.Image
    o.rankImg = o.transform:Find("content/tabs/Rank/img"):GetComponent(typeof(UnityEngine.UI.Image))
    o.transform:Find("content/tabs/Rank/img/label_name"):GetComponent(typeof(UnityEngine.UI.Text)).text = Tools.StrOfLocalization(2754)
    o.transform:Find("content/tabs/Rank/img/label_name"):GetComponent(typeof(UnityEngine.UI.Text)).font = LuaTools.LoadFont(Tools.FontOfLocalization('fengyucumaokai'))
    o.transform:Find("content/tabs/Friend"):GetComponent(typeof(UnityEngine.UI.Button)).onClick:AddListener(function() o:ShowFriend() end)
    ---@type UnityEngine.UI.Image
    o.friendImg = o.transform:Find("content/tabs/Friend/img"):GetComponent(typeof(UnityEngine.UI.Image))
    o.transform:Find("content/tabs/Friend/img/label_name"):GetComponent(typeof(UnityEngine.UI.Text)).text = Tools.StrOfLocalization(2756)
    o.transform:Find("content/tabs/Friend/img/label_name"):GetComponent(typeof(UnityEngine.UI.Text)).font = LuaTools.LoadFont(Tools.FontOfLocalization('fengyucumaokai'))
    o.transform:Find("content/tabs/Match"):GetComponent(typeof(UnityEngine.UI.Button)).onClick:AddListener(function() o:ShowMatch() end)
    ---@type UnityEngine.UI.Image
    o.matchImg = o.transform:Find("content/tabs/Match/img"):GetComponent(typeof(UnityEngine.UI.Image))
    o.transform:Find("content/tabs/Match/img/label_name"):GetComponent(typeof(UnityEngine.UI.Text)).text = Tools.StrOfLocalization(2755)
    o.transform:Find("content/tabs/Match/img/label_name"):GetComponent(typeof(UnityEngine.UI.Text)).font = LuaTools.LoadFont(Tools.FontOfLocalization('fengyucumaokai'))
    o.transform:Find("content/tabs/Collect"):GetComponent(typeof(UnityEngine.UI.Button)).onClick:AddListener(function() o:ShowCollect() end)
    ---@type UnityEngine.UI.Image
    o.collectImg = o.transform:Find("content/tabs/Collect/img"):GetComponent(typeof(UnityEngine.UI.Image))
    o.transform:Find("content/tabs/Collect/img/label_name"):GetComponent(typeof(UnityEngine.UI.Text)).text = Tools.StrOfLocalization(2757)
    o.transform:Find("content/tabs/Collect/img/label_name"):GetComponent(typeof(UnityEngine.UI.Text)).font = LuaTools.LoadFont(Tools.FontOfLocalization('fengyucumaokai'))
    ---@type UnityEngine.UI.Text
    o.noinfo = o.transform:Find("content/noinfo"):GetComponent(typeof(UnityEngine.UI.Text))
    o.noinfo.text = Tools.StrOfLocalization(3682)
    o.noinfo.font = LuaTools.LoadFont(Tools.FontOfLocalization('SimHei'))
    ---@class UI_Paipu_New.PopOtherpaipu_Inst : UI_Paipu_New.PopOtherpaipu
    o.pop_otherpaipu = UI_Paipu_New.PopOtherpaipu:Create(o.transform:Find("pop_otherpaipu"), o)
    o.pop_otherpaipu.transform:Find("Curtain"):GetComponent(typeof(UnityEngine.UI.Button)).onClick:AddListener(function() o.pop_otherpaipu:Close() end)
    ---@type UnityEngine.UI.Text
    o.pop_otherpaipu.title = o.pop_otherpaipu.transform:Find("title"):GetComponent(typeof(UnityEngine.UI.Text))
    o.pop_otherpaipu.title.text = Tools.StrOfLocalization(2126)
    o.pop_otherpaipu.title.font = LuaTools.LoadFont(Tools.FontOfLocalization('fengyucumaokai'))
    ---@type UnityEngine.UI.Button
    o.pop_otherpaipu.btn_confirm = o.pop_otherpaipu.transform:Find("btn_confirm"):GetComponent(typeof(UnityEngine.UI.Button))
    o.pop_otherpaipu.btn_confirm.onClick:AddListener(function() o.pop_otherpaipu:ConfirmCheck() end)
    o.pop_otherpaipu.transform:Find("btn_confirm/node"):GetComponent(typeof(UnityEngine.UI.Text)).text = Tools.StrOfLocalization(2129)
    o.pop_otherpaipu.transform:Find("btn_confirm/node"):GetComponent(typeof(UnityEngine.UI.Text)).font = LuaTools.LoadFont(Tools.FontOfLocalization('fengyucumaokai'))
    ---@type UnityEngine.Transform
    o.pop_otherpaipu.ui_popInput = o.pop_otherpaipu.transform:Find("input")
    
    o.pop_otherpaipu.transform:Find("input/txtinput"):GetComponent(typeof(UnityEngine.UI.Text)).font = LuaTools.LoadFont(Tools.FontOfLocalization('Arial'))
    o.pop_otherpaipu.transform:Find("input/placeholder"):GetComponent(typeof(UnityEngine.UI.Text)).text = Tools.StrOfLocalization(3690)
    o.pop_otherpaipu.transform:Find("input/placeholder"):GetComponent(typeof(UnityEngine.UI.Text)).font = LuaTools.LoadFont(Tools.FontOfLocalization('Arial'))
    o.pop_otherpaipu.transform:Find("btn_cancel"):GetComponent(typeof(UnityEngine.UI.Button)).onClick:AddListener(function() o.pop_otherpaipu:Close() end)
    ---@type UnityEngine.UI.Button
    o.pop_otherpaipu.btn_copy = o.pop_otherpaipu.transform:Find("btn_copy"):GetComponent(typeof(UnityEngine.UI.Button))
    o.pop_otherpaipu.btn_copy.onClick:AddListener(function() o.pop_otherpaipu:CopyLink() end)
    o.pop_otherpaipu.transform:Find("btn_copy/node"):GetComponent(typeof(UnityEngine.UI.Text)).text = Tools.StrOfLocalization(2127)
    o.pop_otherpaipu.transform:Find("btn_copy/node"):GetComponent(typeof(UnityEngine.UI.Text)).font = LuaTools.LoadFont(Tools.FontOfLocalization('fengyucumaokai'))
    o.pop_otherpaipu.btn_hide = o.pop_otherpaipu.transform:Find("Toggle"):GetComponent(typeof(UnityEngine.UI.Toggle))
    o.pop_otherpaipu.btn_hide.onValueChanged:AddListener(function(v) if (v) then o.pop_otherpaipu:SetAnonymous(1) end if (not(v)) then o.pop_otherpaipu:SetAnonymous(0) end end)
    o.pop_otherpaipu.transform:Find("Toggle/Label"):GetComponent(typeof(UnityEngine.UI.Text)).text = Tools.StrOfLocalization(3077)
    o.pop_otherpaipu.transform:Find("Toggle/Label"):GetComponent(typeof(UnityEngine.UI.Text)).font = LuaTools.LoadFont(Tools.FontOfLocalization('HYWenHei-75W'))
    o.pop_otherpaipu.transform:Find("Toggle/Label/Label2"):GetComponent(typeof(UnityEngine.UI.Text)).text = Tools.StrOfLocalization(3078)
    o.pop_otherpaipu.transform:Find("Toggle/Label/Label2"):GetComponent(typeof(UnityEngine.UI.Text)).font = LuaTools.LoadFont(Tools.FontOfLocalization('HYWenHei-75W'))
    ---@class UI_Paipu_New.PopCollect_Inst : UI_Paipu_New.PopCollect
    o.pop_collect = UI_Paipu_New.PopCollect:Create(o.transform:Find("pop_collect"), o)
    ---@type UnityEngine.UI.Image
    o.pop_collect.blackbg = o.pop_collect.transform:Find("blackbg"):GetComponent(typeof(UnityEngine.UI.Image))
    o.pop_collect.transform:Find("blackbg"):GetComponent(typeof(UnityEngine.UI.Button)).onClick:AddListener(function() o.pop_collect:Close() end)
    ---@type UnityEngine.Transform
    o.pop_collect.root = o.pop_collect.transform:Find("root")
    o.pop_collect.transform:Find("root/btn_close"):GetComponent(typeof(UnityEngine.UI.Button)).onClick:AddListener(function() o.pop_collect:Close() end)
    o.pop_collect.transform:Find("root/node"):GetComponent(typeof(UnityEngine.UI.Text)).text = Tools.StrOfLocalization(2766)
    o.pop_collect.transform:Find("root/node"):GetComponent(typeof(UnityEngine.UI.Text)).font = LuaTools.LoadFont(Tools.FontOfLocalization('fengyucumaokai'))
    o.pop_collect.transform:Find("root/btn_confirm"):GetComponent(typeof(UnityEngine.UI.Button)).onClick:AddListener(function() o.pop_collect:ConfirmCollect() end)
    o.pop_collect.transform:Find("root/btn_confirm/word"):GetComponent(typeof(UnityEngine.UI.Text)).text = Tools.StrOfLocalization(2771)
    o.pop_collect.transform:Find("root/btn_confirm/word"):GetComponent(typeof(UnityEngine.UI.Text)).font = LuaTools.LoadFont(Tools.FontOfLocalization('fengyucumaokai'))
    ---@type UnityEngine.Transform
    o.pop_collect.input = o.pop_collect.transform:Find("root/input")
    
    o.pop_collect.transform:Find("root/input/txtinput"):GetComponent(typeof(UnityEngine.UI.Text)).font = LuaTools.LoadFont(Tools.FontOfLocalization('Arial'))
    ---@type UnityEngine.UI.Text
    o.pop_collect.toolong = o.pop_collect.transform:Find("root/toolong"):GetComponent(typeof(UnityEngine.UI.Text))
    o.pop_collect.toolong.text = Tools.StrOfLocalization(2765)
    o.pop_collect.toolong.font = LuaTools.LoadFont(Tools.FontOfLocalization('HYWenHei-75W'))
    o.pop_collect.transform:Find("root/node (1)"):GetComponent(typeof(UnityEngine.UI.Text)).text = Tools.StrOfLocalization(3305)
    o.pop_collect.transform:Find("root/node (1)"):GetComponent(typeof(UnityEngine.UI.Text)).font = LuaTools.LoadFont(Tools.FontOfLocalization('HYWenHei-75W'))

	o:OnCreate()
	return o
end

-- ***************** UI_Paipu_New *****************
-- ****** 变量列表
-- Component:  container_top
-- Component:  content
-- Component:  root
-- Component:  scrollbar
-- Image:  allImg
-- Image:  collectImg
-- Image:  friendImg
-- Image:  matchImg
-- Image:  rankImg
-- Text:  label_collectlimit
-- Text:  noinfo
-- UI_Paipu_New.PopCollect:  pop_collect
-- UI_Paipu_New.PopOtherpaipu:  pop_otherpaipu
-- ****** 调用列表
-- Hide()
-- OpenOther()
-- ShowAll()
-- ShowCollect()
-- ShowFriend()
-- ShowMatch()
-- ShowRank()


-- ***************** block:UI_Paipu_New.PopOtherpaipu *****************
-- ****** 变量列表
-- Button:  btn_confirm
-- Button:  btn_copy
-- Component:  ui_popInput
-- Text:  title
-- Toggle:  btn_hide
-- ****** 调用列表
-- Close()
-- Close()
-- ConfirmCheck()
-- CopyLink()
-- SetAnonymous(1)
-- SetAnonymous(0)


-- ***************** block:UI_Paipu_New.PopCollect *****************
-- ****** 变量列表
-- Component:  input
-- Component:  root
-- Image:  blackbg
-- Text:  toolong
-- ****** 调用列表
-- Close()
-- Close()
-- ConfirmCollect()

