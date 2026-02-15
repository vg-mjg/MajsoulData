require ("UI.UI_SelfPlayerinfo")
--[[
---@class UI_SelfPlayerinfo.Root: UI_SelfPlayerinfo.Root_Inst
UI_SelfPlayerinfo.Root = UIBlock:Inherit()
---@class UI_SelfPlayerinfo.Root.Container_Note: UI_SelfPlayerinfo.Root.Container_Note_Inst
UI_SelfPlayerinfo.Root.Container_Note = UIBlock:Inherit()
---@class UI_SelfPlayerinfo.Root.Season1: UI_SelfPlayerinfo.Root.Season1_Inst
UI_SelfPlayerinfo.Root.Season1 = UIBlock:Inherit()
---@class UI_SelfPlayerinfo.Root.Season2: UI_SelfPlayerinfo.Root.Season2_Inst
UI_SelfPlayerinfo.Root.Season2 = UIBlock:Inherit()
---@class UI_SelfPlayerinfo.Root.Season3: UI_SelfPlayerinfo.Root.Season3_Inst
UI_SelfPlayerinfo.Root.Season3 = UIBlock:Inherit()
---@class UI_SelfPlayerinfo.Container_SignInput: UI_SelfPlayerinfo.Container_SignInput_Inst
UI_SelfPlayerinfo.Container_SignInput = UIBlock:Inherit()
--]]

function UIMgr:UI_SelfPlayerinfo_Create(parent)
    local transform
    if GameMgr.Inst.prefer_language == 'chs' or GameMgr.Inst.prefer_language == 'chs_t' then
        transform = LuaTools.LoadPrefab('prefab/ui_output/UI_SelfPlayerinfo', parent)
    else
        transform = LuaTools.LoadPrefab('prefab/ui_output/UI_SelfPlayerinfo_JP', parent)
    end
    if not transform then
        return nil
    end

    transform.gameObject:SetActive(false)
	---@class UI_SelfPlayerinfo_Inst
	local o = UI_SelfPlayerinfo:Create(transform)

    o.transform:Find("mask"):GetComponent(typeof(UnityEngine.UI.Button)).onClick:AddListener(function() o:Close() end)
    ---@class UI_SelfPlayerinfo.Root_Inst : UI_SelfPlayerinfo.Root
    o.root = UI_SelfPlayerinfo.Root:Create(o.transform:Find("content"):Find("root"), o)
    ---@type UnityEngine.UI.Button
    o.root.tab_info4 = o.root.transform:Find("tab_info4"):GetComponent(typeof(UnityEngine.UI.Button))
    o.root.tab_info4.onClick:AddListener(function() o.root:OpenInfo4() end)
    o.root.transform:Find("tab_info4/node"):GetComponent(typeof(UnityEngine.UI.Text)).text = Tools.StrOfLocalization(2310)
    o.root.transform:Find("tab_info4/node"):GetComponent(typeof(UnityEngine.UI.Text)).font = LuaTools.LoadFont(Tools.FontOfLocalization('fengyucumaokai'))
    ---@type UnityEngine.UI.Button
    o.root.tab_info3 = o.root.transform:Find("tab_info3"):GetComponent(typeof(UnityEngine.UI.Button))
    o.root.tab_info3.onClick:AddListener(function() o.root:OpenInfo3() end)
    o.root.transform:Find("tab_info3/node"):GetComponent(typeof(UnityEngine.UI.Text)).text = Tools.StrOfLocalization(2311)
    o.root.transform:Find("tab_info3/node"):GetComponent(typeof(UnityEngine.UI.Text)).font = LuaTools.LoadFont(Tools.FontOfLocalization('fengyucumaokai'))
    ---@type UnityEngine.UI.Button
    o.root.tab_note = o.root.transform:Find("tab_note"):GetComponent(typeof(UnityEngine.UI.Button))
    o.root.tab_note.onClick:AddListener(function() o.root:OpenNote() end)
    o.root.transform:Find("tab_note/node"):GetComponent(typeof(UnityEngine.UI.Text)).text = Tools.StrOfLocalization(2312)
    o.root.transform:Find("tab_note/node"):GetComponent(typeof(UnityEngine.UI.Text)).font = LuaTools.LoadFont(Tools.FontOfLocalization('fengyucumaokai'))
    ---@type UnityEngine.UI.Image
    o.root.redpoint = o.root.transform:Find("tab_note/redpoint"):GetComponent(typeof(UnityEngine.UI.Image))
    ---@class UI_SelfPlayerinfo.Root.Container_Note_Inst : UI_SelfPlayerinfo.Root.Container_Note
    o.root.container_note = UI_SelfPlayerinfo.Root.Container_Note:Create(o.root.transform:Find("container_note"), o)
    ---@type UnityEngine.UI.Text
    o.root.container_note.nonote = o.root.container_note.transform:Find("nonote"):GetComponent(typeof(UnityEngine.UI.Text))
    o.root.container_note.nonote.text = Tools.StrOfLocalization(2305)
    o.root.container_note.nonote.font = LuaTools.LoadFont(Tools.FontOfLocalization('SimHei'))
    ---@type UnityEngine.Transform
    o.root.container_note.note_content = o.root.container_note.transform:Find("mask/content")
    ---@type UnityEngine.Transform
    o.root.container_note.templete = o.root.container_note.transform:Find("mask/content/templete")
    
    o.root.container_note.transform:Find("mask/content/templete/date"):GetComponent(typeof(UnityEngine.UI.Text)).font = LuaTools.LoadFont(Tools.FontOfLocalization('SimHei'))
    
    o.root.container_note.transform:Find("mask/content/templete/time"):GetComponent(typeof(UnityEngine.UI.Text)).font = LuaTools.LoadFont(Tools.FontOfLocalization('SimHei'))
    
    o.root.container_note.transform:Find("mask/content/templete/word"):GetComponent(typeof(UnityEngine.UI.Text)).font = LuaTools.LoadFont(Tools.FontOfLocalization('SimHei'))
    o.root.container_note.transform:Find("mask/content/templete/btn_checkinfo/info/send"):GetComponent(typeof(UnityEngine.UI.Text)).text = Tools.StrOfLocalization(2526)
    o.root.container_note.transform:Find("mask/content/templete/btn_checkinfo/info/send"):GetComponent(typeof(UnityEngine.UI.Text)).font = LuaTools.LoadFont(Tools.FontOfLocalization('fengyucumaokai'))
    
    o.root.container_note.transform:Find("mask/content/templete/container_name/label_name"):GetComponent(typeof(UnityEngine.UI.Text)).font = LuaTools.LoadFont(Tools.FontOfLocalization('SimHei'))
    
    o.root.container_note.transform:Find("mask/content/templete/level"):GetComponent(typeof(UnityEngine.UI.Text)).font = LuaTools.LoadFont(Tools.FontOfLocalization('fengyucumaokai'))
    ---@type UnityEngine.Transform
    o.root.container_note.scrollbar = o.root.container_note.transform:Find("mask/Scrollbar")
    ---@type UnityEngine.Transform
    o.root.container_note.page_controller = o.root.container_note.transform:Find("page_controller")
    ---@type UnityEngine.UI.Text
    o.root.container_note.curPage = o.root.container_note.transform:Find("page_controller/curr_page"):GetComponent(typeof(UnityEngine.UI.Text))
    o.root.container_note.curPage.font = LuaTools.LoadFont(Tools.FontOfLocalization('SimHei'))
    ---@type UnityEngine.UI.Button
    o.root.container_note.btn_page = o.root.container_note.transform:Find("page_controller/btn_page"):GetComponent(typeof(UnityEngine.UI.Button))
    ---@type UnityEngine.UI.Button
    o.root.container_note.btn_right = o.root.container_note.transform:Find("page_controller/btn_right"):GetComponent(typeof(UnityEngine.UI.Button))
    o.root.container_note.btn_right.onClick:AddListener(function() o.root.container_note:Right() end)
    ---@type UnityEngine.UI.Button
    o.root.container_note.btn_left = o.root.container_note.transform:Find("page_controller/btn_left"):GetComponent(typeof(UnityEngine.UI.Button))
    o.root.container_note.btn_left.onClick:AddListener(function() o.root.container_note:Left() end)
    ---@type UnityEngine.Transform
    o.root.container_note.NotePages = o.root.container_note.transform:Find("page_controller/NotePages")
    ---@type UnityEngine.Transform
    o.root.container_note.container_pages = o.root.container_note.transform:Find("page_controller/NotePages/container_pages")
    ---@type UnityEngine.Transform
    o.root.container_note.content = o.root.container_note.transform:Find("page_controller/NotePages/container_pages/bg/content")
    ---@type UnityEngine.Transform
    o.root.container_note.pg_templete = o.root.container_note.transform:Find("page_controller/NotePages/container_pages/bg/content/templete")
    
    o.root.container_note.transform:Find("page_controller/NotePages/container_pages/bg/content/templete/page"):GetComponent(typeof(UnityEngine.UI.Text)).font = LuaTools.LoadFont(Tools.FontOfLocalization('SimHei'))
    ---@type UnityEngine.UI.Button
    o.root.container_note.btn_edit = o.root.container_note.transform:Find("sign/btn_edit"):GetComponent(typeof(UnityEngine.UI.Button))
    o.root.container_note.btn_edit.onClick:AddListener(function() o.root.container_note:ChangeSign() end)
    ---@type UnityEngine.UI.Text
    o.root.container_note.noinfo = o.root.container_note.transform:Find("sign/noinfo"):GetComponent(typeof(UnityEngine.UI.Text))
    o.root.container_note.noinfo.text = Tools.StrOfLocalization(2308)
    o.root.container_note.noinfo.font = LuaTools.LoadFont(Tools.FontOfLocalization('SimHei'))
    o.root.container_note.transform:Find("sign/node"):GetComponent(typeof(UnityEngine.UI.Text)).text = Tools.StrOfLocalization(2309)
    o.root.container_note.transform:Find("sign/node"):GetComponent(typeof(UnityEngine.UI.Text)).font = LuaTools.LoadFont(Tools.FontOfLocalization('fengyucumaokai'))
    ---@type UnityEngine.UI.Text
    o.root.container_note.sign_content = o.root.container_note.transform:Find("sign/content"):GetComponent(typeof(UnityEngine.UI.Text))
    o.root.container_note.sign_content.font = LuaTools.LoadFont(Tools.FontOfLocalization('SimHei'))
    o.root.container_note.transform:Find("sign/btn_change"):GetComponent(typeof(UnityEngine.UI.Button)).onClick:AddListener(function() o.root.container_note:ChangeSign() end)
    ---@type UnityEngine.Transform
    o.root.container_info = o.root.transform:Find("container_info")
    ---@type UnityEngine.Transform
    o.root.rank = o.root.transform:Find("container_info/rank")
    ---@type UnityEngine.UI.Button
    o.root.btn_rank = o.root.transform:Find("container_info/rank"):GetComponent(typeof(UnityEngine.UI.Button))
    o.root.btn_rank.onClick:AddListener(function() o.root:OpenIntroduce() end)
    ---@type UnityEngine.Transform
    o.root.exp = o.root.transform:Find("container_info/rank/exp")
    ---@type UnityEngine.UI.Text
    o.root.txt_expvalue = o.root.transform:Find("container_info/rank/exp/value"):GetComponent(typeof(UnityEngine.UI.Text))
    o.root.txt_expvalue.font = LuaTools.LoadFont(Tools.FontOfLocalization('hanyi_0'))
    ---@type UnityEngine.UI.Text
    o.root.txt_expmax = o.root.transform:Find("container_info/rank/exp/max"):GetComponent(typeof(UnityEngine.UI.Text))
    o.root.txt_expmax.font = LuaTools.LoadFont(Tools.FontOfLocalization('hanyi_0'))
    
    o.root.transform:Find("container_info/rank/exp/node"):GetComponent(typeof(UnityEngine.UI.Text)).font = LuaTools.LoadFont(Tools.FontOfLocalization('hanyi_0'))
    ---@type UnityEngine.UI.Image
    o.root.expbar = o.root.transform:Find("container_info/rank/exp/bar/v"):GetComponent(typeof(UnityEngine.UI.Image))
    
    o.root.transform:Find("container_info/rank/huntian/value"):GetComponent(typeof(UnityEngine.UI.Text)).font = LuaTools.LoadFont(Tools.FontOfLocalization('hanyi_0'))
    ---@type UnityEngine.UI.Image
    o.root.title = o.root.transform:Find("container_info/title"):GetComponent(typeof(UnityEngine.UI.Image))
    ---@type UnityEngine.UI.Button
    o.root.btn_title = o.root.transform:Find("container_info/btn_title"):GetComponent(typeof(UnityEngine.UI.Button))
    o.root.btn_title.onClick:AddListener(function() o.root:ShowTitle() end)
    o.root.transform:Find("container_info/btn_title/node"):GetComponent(typeof(UnityEngine.UI.Text)).text = Tools.StrOfLocalization(2527)
    o.root.transform:Find("container_info/btn_title/node"):GetComponent(typeof(UnityEngine.UI.Text)).font = LuaTools.LoadFont(Tools.FontOfLocalization('fengyucumaokai'))
    ---@type UnityEngine.UI.Button
    o.root.btn_changenickname = o.root.transform:Find("container_info/btn_changenickname"):GetComponent(typeof(UnityEngine.UI.Button))
    o.root.btn_changenickname.onClick:AddListener(function() o.root:ChangeName() end)
    o.root.transform:Find("container_info/btn_changenickname/node"):GetComponent(typeof(UnityEngine.UI.Text)).text = Tools.StrOfLocalization(2528)
    o.root.transform:Find("container_info/btn_changenickname/node"):GetComponent(typeof(UnityEngine.UI.Text)).font = LuaTools.LoadFont(Tools.FontOfLocalization('fengyucumaokai'))
    
    o.root.transform:Find("container_info/container_name/label_name"):GetComponent(typeof(UnityEngine.UI.Text)).font = LuaTools.LoadFont(Tools.FontOfLocalization('SimHei'))
    ---@type UnityEngine.Transform
    o.root.bg = o.root.transform:Find("container_info/data/ScrollData/bg")
    ---@type UnityEngine.Transform
    o.root.content = o.root.transform:Find("container_info/data/ScrollData/ViewPoint/content")
    ---@type UnityEngine.Transform
    o.root.rank_container = o.root.transform:Find("container_info/data/ScrollData/ViewPoint/content/rank")
    ---@class UI_SelfPlayerinfo.Root.Season1_Inst : UI_SelfPlayerinfo.Root.Season1
    o.root.season1 = UI_SelfPlayerinfo.Root.Season1:Create(o.root.transform:Find("container_info"):Find("data"):Find("ScrollData"):Find("ViewPoint"):Find("content"):Find("rank"):Find("season1"), o)
    ---@type UnityEngine.Transform
    o.root.season1.rank = o.root.season1.transform:Find("rankcontainer")
    ---@type UnityEngine.Transform
    o.root.season1.level_container = o.root.season1.transform:Find("rankcontainer/level")
    ---@type UnityEngine.UI.Image
    o.root.season1.exp1 = o.root.season1.transform:Find("rankcontainer/level/exp1"):GetComponent(typeof(UnityEngine.UI.Image))
    ---@type UnityEngine.UI.Image
    o.root.season1.exp2 = o.root.season1.transform:Find("rankcontainer/level/exp2"):GetComponent(typeof(UnityEngine.UI.Image))
    ---@type UnityEngine.UI.Image
    o.root.season1.exp3 = o.root.season1.transform:Find("rankcontainer/level/exp3"):GetComponent(typeof(UnityEngine.UI.Image))
    ---@type UnityEngine.UI.Text
    o.root.season1.label_level = o.root.season1.transform:Find("rankcontainer/label_rank"):GetComponent(typeof(UnityEngine.UI.Text))
    o.root.season1.label_level.font = LuaTools.LoadFont(Tools.FontOfLocalization('SimHei'))
    ---@type UnityEngine.UI.Image
    o.root.season1.rankimg = o.root.season1.transform:Find("rankcontainer/rankimg"):GetComponent(typeof(UnityEngine.UI.Image))
    ---@type UnityEngine.UI.Text
    o.root.season1.label_rank = o.root.season1.transform:Find("bg/Text"):GetComponent(typeof(UnityEngine.UI.Text))
    o.root.season1.label_rank.font = LuaTools.LoadFont(Tools.FontOfLocalization('fengyucumaokai'))
    ---@type UnityEngine.UI.Text
    o.root.season1.label_season = o.root.season1.transform:Find("Text"):GetComponent(typeof(UnityEngine.UI.Text))
    o.root.season1.label_season.font = LuaTools.LoadFont(Tools.FontOfLocalization('fengyucumaokai'))
    o.root.transform:Find("container_info/data/ScrollData/ViewPoint/content/rank/node/node"):GetComponent(typeof(UnityEngine.UI.Text)).text = Tools.StrOfLocalization(3250)
    o.root.transform:Find("container_info/data/ScrollData/ViewPoint/content/rank/node/node"):GetComponent(typeof(UnityEngine.UI.Text)).font = LuaTools.LoadFont(Tools.FontOfLocalization('fengyucumaokai'))
    ---@class UI_SelfPlayerinfo.Root.Season2_Inst : UI_SelfPlayerinfo.Root.Season2
    o.root.season2 = UI_SelfPlayerinfo.Root.Season2:Create(o.root.transform:Find("container_info"):Find("data"):Find("ScrollData"):Find("ViewPoint"):Find("content"):Find("rank"):Find("season2"), o)
    ---@type UnityEngine.Transform
    o.root.season2.rank = o.root.season2.transform:Find("rankcontainer")
    ---@type UnityEngine.Transform
    o.root.season2.level_container = o.root.season2.transform:Find("rankcontainer/level")
    ---@type UnityEngine.UI.Image
    o.root.season2.exp1 = o.root.season2.transform:Find("rankcontainer/level/exp1"):GetComponent(typeof(UnityEngine.UI.Image))
    ---@type UnityEngine.UI.Image
    o.root.season2.exp2 = o.root.season2.transform:Find("rankcontainer/level/exp2"):GetComponent(typeof(UnityEngine.UI.Image))
    ---@type UnityEngine.UI.Image
    o.root.season2.exp3 = o.root.season2.transform:Find("rankcontainer/level/exp3"):GetComponent(typeof(UnityEngine.UI.Image))
    ---@type UnityEngine.UI.Text
    o.root.season2.label_level = o.root.season2.transform:Find("rankcontainer/label_rank"):GetComponent(typeof(UnityEngine.UI.Text))
    o.root.season2.label_level.font = LuaTools.LoadFont(Tools.FontOfLocalization('SimHei'))
    ---@type UnityEngine.UI.Image
    o.root.season2.rankimg = o.root.season2.transform:Find("rankcontainer/rankimg"):GetComponent(typeof(UnityEngine.UI.Image))
    ---@type UnityEngine.UI.Text
    o.root.season2.label_rank = o.root.season2.transform:Find("bg/Text"):GetComponent(typeof(UnityEngine.UI.Text))
    o.root.season2.label_rank.font = LuaTools.LoadFont(Tools.FontOfLocalization('fengyucumaokai'))
    ---@type UnityEngine.UI.Text
    o.root.season2.label_season = o.root.season2.transform:Find("Text"):GetComponent(typeof(UnityEngine.UI.Text))
    o.root.season2.label_season.font = LuaTools.LoadFont(Tools.FontOfLocalization('fengyucumaokai'))
    ---@class UI_SelfPlayerinfo.Root.Season3_Inst : UI_SelfPlayerinfo.Root.Season3
    o.root.season3 = UI_SelfPlayerinfo.Root.Season3:Create(o.root.transform:Find("container_info"):Find("data"):Find("ScrollData"):Find("ViewPoint"):Find("content"):Find("rank"):Find("season3"), o)
    ---@type UnityEngine.Transform
    o.root.season3.rank = o.root.season3.transform:Find("rankcontainer")
    ---@type UnityEngine.Transform
    o.root.season3.level_container = o.root.season3.transform:Find("rankcontainer/level")
    ---@type UnityEngine.UI.Image
    o.root.season3.exp1 = o.root.season3.transform:Find("rankcontainer/level/exp1"):GetComponent(typeof(UnityEngine.UI.Image))
    ---@type UnityEngine.UI.Image
    o.root.season3.exp2 = o.root.season3.transform:Find("rankcontainer/level/exp2"):GetComponent(typeof(UnityEngine.UI.Image))
    ---@type UnityEngine.UI.Image
    o.root.season3.exp3 = o.root.season3.transform:Find("rankcontainer/level/exp3"):GetComponent(typeof(UnityEngine.UI.Image))
    ---@type UnityEngine.UI.Text
    o.root.season3.label_level = o.root.season3.transform:Find("rankcontainer/label_rank"):GetComponent(typeof(UnityEngine.UI.Text))
    o.root.season3.label_level.font = LuaTools.LoadFont(Tools.FontOfLocalization('SimHei'))
    ---@type UnityEngine.UI.Image
    o.root.season3.rankimg = o.root.season3.transform:Find("rankcontainer/rankimg"):GetComponent(typeof(UnityEngine.UI.Image))
    ---@type UnityEngine.UI.Text
    o.root.season3.label_rank = o.root.season3.transform:Find("bg/Text"):GetComponent(typeof(UnityEngine.UI.Text))
    o.root.season3.label_rank.font = LuaTools.LoadFont(Tools.FontOfLocalization('fengyucumaokai'))
    ---@type UnityEngine.UI.Text
    o.root.season3.label_season = o.root.season3.transform:Find("Text"):GetComponent(typeof(UnityEngine.UI.Text))
    o.root.season3.label_season.font = LuaTools.LoadFont(Tools.FontOfLocalization('fengyucumaokai'))
    ---@type UnityEngine.UI.Text
    o.root.label_norank = o.root.transform:Find("container_info/data/ScrollData/ViewPoint/content/rank/label_noinfo"):GetComponent(typeof(UnityEngine.UI.Text))
    o.root.label_norank.text = Tools.StrOfLocalization(2273)
    o.root.label_norank.font = LuaTools.LoadFont(Tools.FontOfLocalization('HYWenHei-75W'))
    ---@type UnityEngine.Transform
    o.root.dahe_container = o.root.transform:Find("container_info/data/ScrollData/ViewPoint/content/dahe")
    o.root.transform:Find("container_info/data/ScrollData/ViewPoint/content/dahe/node/node"):GetComponent(typeof(UnityEngine.UI.Text)).text = Tools.StrOfLocalization(2272)
    o.root.transform:Find("container_info/data/ScrollData/ViewPoint/content/dahe/node/node"):GetComponent(typeof(UnityEngine.UI.Text)).font = LuaTools.LoadFont(Tools.FontOfLocalization('fengyucumaokai'))
    ---@type UnityEngine.Transform
    o.root.container_hand = o.root.transform:Find("container_info/data/ScrollData/ViewPoint/content/dahe/container_hand")
    ---@type UnityEngine.Transform
    o.root.container_title_en = o.root.transform:Find("container_info/data/ScrollData/ViewPoint/content/dahe/container_title_en")
    ---@type UnityEngine.UI.Image
    o.root.img_title_en = o.root.transform:Find("container_info/data/ScrollData/ViewPoint/content/dahe/container_title_en/0"):GetComponent(typeof(UnityEngine.UI.Image))
    ---@type UnityEngine.Transform
    o.root.container_title = o.root.transform:Find("container_info/data/ScrollData/ViewPoint/content/dahe/container_title")
    ---@type UnityEngine.UI.Image
    o.root.img_title0 = o.root.transform:Find("container_info/data/ScrollData/ViewPoint/content/dahe/container_title/0"):GetComponent(typeof(UnityEngine.UI.Image))
    ---@type UnityEngine.UI.Image
    o.root.img_title1 = o.root.transform:Find("container_info/data/ScrollData/ViewPoint/content/dahe/container_title/1"):GetComponent(typeof(UnityEngine.UI.Image))
    ---@type UnityEngine.UI.Image
    o.root.img_title2 = o.root.transform:Find("container_info/data/ScrollData/ViewPoint/content/dahe/container_title/2"):GetComponent(typeof(UnityEngine.UI.Image))
    ---@type UnityEngine.UI.Image
    o.root.img_title3 = o.root.transform:Find("container_info/data/ScrollData/ViewPoint/content/dahe/container_title/3"):GetComponent(typeof(UnityEngine.UI.Image))
    ---@type UnityEngine.UI.Text
    o.root.label_noinfo = o.root.transform:Find("container_info/data/ScrollData/ViewPoint/content/dahe/label_noinfo"):GetComponent(typeof(UnityEngine.UI.Text))
    o.root.label_noinfo.text = Tools.StrOfLocalization(2273)
    o.root.label_noinfo.font = LuaTools.LoadFont(Tools.FontOfLocalization('HYWenHei-75W'))
    ---@type UnityEngine.Transform
    o.root.fengge_container = o.root.transform:Find("container_info/data/ScrollData/ViewPoint/content/fengge")
    o.root.transform:Find("container_info/data/ScrollData/ViewPoint/content/fengge/label_gong"):GetComponent(typeof(UnityEngine.UI.Text)).text = Tools.StrOfLocalization(2274)
    o.root.transform:Find("container_info/data/ScrollData/ViewPoint/content/fengge/label_gong"):GetComponent(typeof(UnityEngine.UI.Text)).font = LuaTools.LoadFont(Tools.FontOfLocalization('fengyucumaokai'))
    ---@type UnityEngine.UI.Text
    o.root.txt_gong = o.root.transform:Find("container_info/data/ScrollData/ViewPoint/content/fengge/gong"):GetComponent(typeof(UnityEngine.UI.Text))
    o.root.txt_gong.font = LuaTools.LoadFont(Tools.FontOfLocalization('haolong_0'))
    o.root.transform:Find("container_info/data/ScrollData/ViewPoint/content/fengge/labe_fang"):GetComponent(typeof(UnityEngine.UI.Text)).text = Tools.StrOfLocalization(2275)
    o.root.transform:Find("container_info/data/ScrollData/ViewPoint/content/fengge/labe_fang"):GetComponent(typeof(UnityEngine.UI.Text)).font = LuaTools.LoadFont(Tools.FontOfLocalization('fengyucumaokai'))
    ---@type UnityEngine.UI.Text
    o.root.txt_fang = o.root.transform:Find("container_info/data/ScrollData/ViewPoint/content/fengge/fang"):GetComponent(typeof(UnityEngine.UI.Text))
    o.root.txt_fang.font = LuaTools.LoadFont(Tools.FontOfLocalization('haolong_0'))
    o.root.transform:Find("container_info/data/ScrollData/ViewPoint/content/fengge/label_su"):GetComponent(typeof(UnityEngine.UI.Text)).text = Tools.StrOfLocalization(2276)
    o.root.transform:Find("container_info/data/ScrollData/ViewPoint/content/fengge/label_su"):GetComponent(typeof(UnityEngine.UI.Text)).font = LuaTools.LoadFont(Tools.FontOfLocalization('fengyucumaokai'))
    ---@type UnityEngine.UI.Text
    o.root.txt_su = o.root.transform:Find("container_info/data/ScrollData/ViewPoint/content/fengge/su"):GetComponent(typeof(UnityEngine.UI.Text))
    o.root.txt_su.font = LuaTools.LoadFont(Tools.FontOfLocalization('haolong_0'))
    o.root.transform:Find("container_info/data/ScrollData/ViewPoint/content/fengge/label_yun"):GetComponent(typeof(UnityEngine.UI.Text)).text = Tools.StrOfLocalization(2277)
    o.root.transform:Find("container_info/data/ScrollData/ViewPoint/content/fengge/label_yun"):GetComponent(typeof(UnityEngine.UI.Text)).font = LuaTools.LoadFont(Tools.FontOfLocalization('fengyucumaokai'))
    ---@type UnityEngine.UI.Text
    o.root.txt_yun = o.root.transform:Find("container_info/data/ScrollData/ViewPoint/content/fengge/yun"):GetComponent(typeof(UnityEngine.UI.Text))
    o.root.txt_yun.font = LuaTools.LoadFont(Tools.FontOfLocalization('haolong_0'))
    ---@type UnityEngine.Transform
    o.root.radarpos = o.root.transform:Find("container_info/data/ScrollData/ViewPoint/content/fengge/radar")
    o.root.transform:Find("container_info/data/ScrollData/ViewPoint/content/fengge/radar/gong"):GetComponent(typeof(UnityEngine.UI.Text)).text = Tools.StrOfLocalization(2274)
    o.root.transform:Find("container_info/data/ScrollData/ViewPoint/content/fengge/radar/gong"):GetComponent(typeof(UnityEngine.UI.Text)).font = LuaTools.LoadFont(Tools.FontOfLocalization('fengyucumaokai'))
    o.root.transform:Find("container_info/data/ScrollData/ViewPoint/content/fengge/radar/fang"):GetComponent(typeof(UnityEngine.UI.Text)).text = Tools.StrOfLocalization(2275)
    o.root.transform:Find("container_info/data/ScrollData/ViewPoint/content/fengge/radar/fang"):GetComponent(typeof(UnityEngine.UI.Text)).font = LuaTools.LoadFont(Tools.FontOfLocalization('fengyucumaokai'))
    o.root.transform:Find("container_info/data/ScrollData/ViewPoint/content/fengge/radar/su"):GetComponent(typeof(UnityEngine.UI.Text)).text = Tools.StrOfLocalization(2276)
    o.root.transform:Find("container_info/data/ScrollData/ViewPoint/content/fengge/radar/su"):GetComponent(typeof(UnityEngine.UI.Text)).font = LuaTools.LoadFont(Tools.FontOfLocalization('fengyucumaokai'))
    o.root.transform:Find("container_info/data/ScrollData/ViewPoint/content/fengge/radar/yun"):GetComponent(typeof(UnityEngine.UI.Text)).text = Tools.StrOfLocalization(2277)
    o.root.transform:Find("container_info/data/ScrollData/ViewPoint/content/fengge/radar/yun"):GetComponent(typeof(UnityEngine.UI.Text)).font = LuaTools.LoadFont(Tools.FontOfLocalization('fengyucumaokai'))
    ---@type UnityEngine.UI.Text
    o.root.label_shuxing = o.root.transform:Find("container_info/data/ScrollData/ViewPoint/content/fengge/fenggeshuxing/node"):GetComponent(typeof(UnityEngine.UI.Text))
    o.root.label_shuxing.text = Tools.StrOfLocalization(2278)
    o.root.label_shuxing.font = LuaTools.LoadFont(Tools.FontOfLocalization('fengyucumaokai'))
    ---@type UnityEngine.Transform
    o.root.what = o.root.transform:Find("container_info/data/ScrollData/ViewPoint/content/fengge/fenggeshuxing/what")
    ---@type UnityEngine.Transform
    o.root.zoushi_container = o.root.transform:Find("container_info/data/ScrollData/ViewPoint/content/zoushi")
    ---@type UnityEngine.Transform
    o.root.line4 = o.root.transform:Find("container_info/data/ScrollData/ViewPoint/content/zoushi/line4")
    ---@type UnityEngine.Transform
    o.root.lines = o.root.transform:Find("container_info/data/ScrollData/ViewPoint/content/zoushi/lines")
    ---@type UnityEngine.Transform
    o.root.points = o.root.transform:Find("container_info/data/ScrollData/ViewPoint/content/zoushi/points")
    o.root.transform:Find("container_info/data/ScrollData/ViewPoint/content/zoushi/zuijinzoushi/node"):GetComponent(typeof(UnityEngine.UI.Text)).text = Tools.StrOfLocalization(2284)
    o.root.transform:Find("container_info/data/ScrollData/ViewPoint/content/zoushi/zuijinzoushi/node"):GetComponent(typeof(UnityEngine.UI.Text)).font = LuaTools.LoadFont(Tools.FontOfLocalization('fengyucumaokai'))
    
    o.root.transform:Find("container_info/data/ScrollData/ViewPoint/content/zoushi/lb1"):GetComponent(typeof(UnityEngine.UI.Text)).font = LuaTools.LoadFont(Tools.FontOfLocalization('haolong_0'))
    o.root.transform:Find("container_info/data/ScrollData/ViewPoint/content/zoushi/lb1/node"):GetComponent(typeof(UnityEngine.UI.Text)).text = Tools.StrOfLocalization(2283)
    o.root.transform:Find("container_info/data/ScrollData/ViewPoint/content/zoushi/lb1/node"):GetComponent(typeof(UnityEngine.UI.Text)).font = LuaTools.LoadFont(Tools.FontOfLocalization('fengyucumaokai'))
    
    o.root.transform:Find("container_info/data/ScrollData/ViewPoint/content/zoushi/lb2"):GetComponent(typeof(UnityEngine.UI.Text)).font = LuaTools.LoadFont(Tools.FontOfLocalization('haolong_0'))
    o.root.transform:Find("container_info/data/ScrollData/ViewPoint/content/zoushi/lb2/node"):GetComponent(typeof(UnityEngine.UI.Text)).text = Tools.StrOfLocalization(2283)
    o.root.transform:Find("container_info/data/ScrollData/ViewPoint/content/zoushi/lb2/node"):GetComponent(typeof(UnityEngine.UI.Text)).font = LuaTools.LoadFont(Tools.FontOfLocalization('fengyucumaokai'))
    
    o.root.transform:Find("container_info/data/ScrollData/ViewPoint/content/zoushi/lb3"):GetComponent(typeof(UnityEngine.UI.Text)).font = LuaTools.LoadFont(Tools.FontOfLocalization('haolong_0'))
    o.root.transform:Find("container_info/data/ScrollData/ViewPoint/content/zoushi/lb3/node"):GetComponent(typeof(UnityEngine.UI.Text)).text = Tools.StrOfLocalization(2283)
    o.root.transform:Find("container_info/data/ScrollData/ViewPoint/content/zoushi/lb3/node"):GetComponent(typeof(UnityEngine.UI.Text)).font = LuaTools.LoadFont(Tools.FontOfLocalization('fengyucumaokai'))
    ---@type UnityEngine.Transform
    o.root.lb4 = o.root.transform:Find("container_info/data/ScrollData/ViewPoint/content/zoushi/lb4")
    
    o.root.transform:Find("container_info/data/ScrollData/ViewPoint/content/zoushi/lb4"):GetComponent(typeof(UnityEngine.UI.Text)).font = LuaTools.LoadFont(Tools.FontOfLocalization('haolong_0'))
    o.root.transform:Find("container_info/data/ScrollData/ViewPoint/content/zoushi/lb4/node"):GetComponent(typeof(UnityEngine.UI.Text)).text = Tools.StrOfLocalization(2283)
    o.root.transform:Find("container_info/data/ScrollData/ViewPoint/content/zoushi/lb4/node"):GetComponent(typeof(UnityEngine.UI.Text)).font = LuaTools.LoadFont(Tools.FontOfLocalization('fengyucumaokai'))
    ---@type UnityEngine.Transform
    o.root.blank0 = o.root.transform:Find("container_info/data/ScrollData/ViewPoint/content/blank0")
    o.root.transform:Find("container_info/data/ScrollData/ViewPoint/content/blank0/xiangxixinxi/node"):GetComponent(typeof(UnityEngine.UI.Text)).text = Tools.StrOfLocalization(2285)
    o.root.transform:Find("container_info/data/ScrollData/ViewPoint/content/blank0/xiangxixinxi/node"):GetComponent(typeof(UnityEngine.UI.Text)).font = LuaTools.LoadFont(Tools.FontOfLocalization('fengyucumaokai'))
    ---@type UnityEngine.Transform
    o.root.mode1 = o.root.transform:Find("container_info/data/ScrollData/ViewPoint/content/mode1")
    ---@type UnityEngine.UI.Button
    o.root.btn_mode1 = o.root.transform:Find("container_info/data/ScrollData/ViewPoint/content/mode1/btn"):GetComponent(typeof(UnityEngine.UI.Button))
    o.root.btn_mode1.onClick:AddListener(function() o.root:BtnMode1() end)
    o.root.transform:Find("container_info/data/ScrollData/ViewPoint/content/mode1/btn/mode"):GetComponent(typeof(UnityEngine.UI.Text)).text = Tools.StrOfLocalization(2286)
    o.root.transform:Find("container_info/data/ScrollData/ViewPoint/content/mode1/btn/mode"):GetComponent(typeof(UnityEngine.UI.Text)).font = LuaTools.LoadFont(Tools.FontOfLocalization('fengyucumaokai'))
    
    o.root.transform:Find("container_info/data/ScrollData/ViewPoint/content/mode1/detail/pos1"):GetComponent(typeof(UnityEngine.UI.Text)).font = LuaTools.LoadFont(Tools.FontOfLocalization('SimHei'))
    o.root.transform:Find("container_info/data/ScrollData/ViewPoint/content/mode1/detail/pos1/node"):GetComponent(typeof(UnityEngine.UI.Text)).text = Tools.StrOfLocalization(2287)
    o.root.transform:Find("container_info/data/ScrollData/ViewPoint/content/mode1/detail/pos1/node"):GetComponent(typeof(UnityEngine.UI.Text)).font = LuaTools.LoadFont(Tools.FontOfLocalization('youyuan_f'))
    
    o.root.transform:Find("container_info/data/ScrollData/ViewPoint/content/mode1/detail/pos2"):GetComponent(typeof(UnityEngine.UI.Text)).font = LuaTools.LoadFont(Tools.FontOfLocalization('SimHei'))
    o.root.transform:Find("container_info/data/ScrollData/ViewPoint/content/mode1/detail/pos2/node"):GetComponent(typeof(UnityEngine.UI.Text)).text = Tools.StrOfLocalization(2288)
    o.root.transform:Find("container_info/data/ScrollData/ViewPoint/content/mode1/detail/pos2/node"):GetComponent(typeof(UnityEngine.UI.Text)).font = LuaTools.LoadFont(Tools.FontOfLocalization('youyuan_f'))
    
    o.root.transform:Find("container_info/data/ScrollData/ViewPoint/content/mode1/detail/pos3"):GetComponent(typeof(UnityEngine.UI.Text)).font = LuaTools.LoadFont(Tools.FontOfLocalization('SimHei'))
    o.root.transform:Find("container_info/data/ScrollData/ViewPoint/content/mode1/detail/pos3/node"):GetComponent(typeof(UnityEngine.UI.Text)).text = Tools.StrOfLocalization(2289)
    o.root.transform:Find("container_info/data/ScrollData/ViewPoint/content/mode1/detail/pos3/node"):GetComponent(typeof(UnityEngine.UI.Text)).font = LuaTools.LoadFont(Tools.FontOfLocalization('youyuan_f'))
    
    o.root.transform:Find("container_info/data/ScrollData/ViewPoint/content/mode1/detail/pos4"):GetComponent(typeof(UnityEngine.UI.Text)).font = LuaTools.LoadFont(Tools.FontOfLocalization('SimHei'))
    o.root.transform:Find("container_info/data/ScrollData/ViewPoint/content/mode1/detail/pos4/node"):GetComponent(typeof(UnityEngine.UI.Text)).text = Tools.StrOfLocalization(2290)
    o.root.transform:Find("container_info/data/ScrollData/ViewPoint/content/mode1/detail/pos4/node"):GetComponent(typeof(UnityEngine.UI.Text)).font = LuaTools.LoadFont(Tools.FontOfLocalization('youyuan_f'))
    
    o.root.transform:Find("container_info/data/ScrollData/ViewPoint/content/mode1/detail/knockout"):GetComponent(typeof(UnityEngine.UI.Text)).font = LuaTools.LoadFont(Tools.FontOfLocalization('SimHei'))
    o.root.transform:Find("container_info/data/ScrollData/ViewPoint/content/mode1/detail/knockout/node"):GetComponent(typeof(UnityEngine.UI.Text)).text = Tools.StrOfLocalization(2291)
    o.root.transform:Find("container_info/data/ScrollData/ViewPoint/content/mode1/detail/knockout/node"):GetComponent(typeof(UnityEngine.UI.Text)).font = LuaTools.LoadFont(Tools.FontOfLocalization('youyuan_f'))
    o.root.transform:Find("container_info/data/ScrollData/ViewPoint/content/mode1/detail/zongduiju"):GetComponent(typeof(UnityEngine.UI.Text)).text = Tools.StrOfLocalization(2292)
    o.root.transform:Find("container_info/data/ScrollData/ViewPoint/content/mode1/detail/zongduiju"):GetComponent(typeof(UnityEngine.UI.Text)).font = LuaTools.LoadFont(Tools.FontOfLocalization('youyuan_f'))
    
    o.root.transform:Find("container_info/data/ScrollData/ViewPoint/content/mode1/detail/changci"):GetComponent(typeof(UnityEngine.UI.Text)).font = LuaTools.LoadFont(Tools.FontOfLocalization('SimHei'))
    o.root.transform:Find("container_info/data/ScrollData/ViewPoint/content/mode1/detail/pingjundadian"):GetComponent(typeof(UnityEngine.UI.Text)).text = Tools.StrOfLocalization(2293)
    o.root.transform:Find("container_info/data/ScrollData/ViewPoint/content/mode1/detail/pingjundadian"):GetComponent(typeof(UnityEngine.UI.Text)).font = LuaTools.LoadFont(Tools.FontOfLocalization('youyuan_f'))
    
    o.root.transform:Find("container_info/data/ScrollData/ViewPoint/content/mode1/detail/dadian"):GetComponent(typeof(UnityEngine.UI.Text)).font = LuaTools.LoadFont(Tools.FontOfLocalization('SimHei'))
    o.root.transform:Find("container_info/data/ScrollData/ViewPoint/content/mode1/detail/pingjunshunwei"):GetComponent(typeof(UnityEngine.UI.Text)).text = Tools.StrOfLocalization(2294)
    o.root.transform:Find("container_info/data/ScrollData/ViewPoint/content/mode1/detail/pingjunshunwei"):GetComponent(typeof(UnityEngine.UI.Text)).font = LuaTools.LoadFont(Tools.FontOfLocalization('youyuan_f'))
    
    o.root.transform:Find("container_info/data/ScrollData/ViewPoint/content/mode1/detail/shunwei"):GetComponent(typeof(UnityEngine.UI.Text)).font = LuaTools.LoadFont(Tools.FontOfLocalization('SimHei'))
    o.root.transform:Find("container_info/data/ScrollData/ViewPoint/content/mode1/detail/zuidalianzhuang"):GetComponent(typeof(UnityEngine.UI.Text)).text = Tools.StrOfLocalization(2295)
    o.root.transform:Find("container_info/data/ScrollData/ViewPoint/content/mode1/detail/zuidalianzhuang"):GetComponent(typeof(UnityEngine.UI.Text)).font = LuaTools.LoadFont(Tools.FontOfLocalization('youyuan_f'))
    
    o.root.transform:Find("container_info/data/ScrollData/ViewPoint/content/mode1/detail/lianzhuang"):GetComponent(typeof(UnityEngine.UI.Text)).font = LuaTools.LoadFont(Tools.FontOfLocalization('SimHei'))
    o.root.transform:Find("container_info/data/ScrollData/ViewPoint/content/mode1/detail/hulexunshu"):GetComponent(typeof(UnityEngine.UI.Text)).text = Tools.StrOfLocalization(2296)
    o.root.transform:Find("container_info/data/ScrollData/ViewPoint/content/mode1/detail/hulexunshu"):GetComponent(typeof(UnityEngine.UI.Text)).font = LuaTools.LoadFont(Tools.FontOfLocalization('youyuan_f'))
    
    o.root.transform:Find("container_info/data/ScrollData/ViewPoint/content/mode1/detail/hule"):GetComponent(typeof(UnityEngine.UI.Text)).font = LuaTools.LoadFont(Tools.FontOfLocalization('SimHei'))
    o.root.transform:Find("container_info/data/ScrollData/ViewPoint/content/mode1/detail/hupailv"):GetComponent(typeof(UnityEngine.UI.Text)).text = Tools.StrOfLocalization(2297)
    o.root.transform:Find("container_info/data/ScrollData/ViewPoint/content/mode1/detail/hupailv"):GetComponent(typeof(UnityEngine.UI.Text)).font = LuaTools.LoadFont(Tools.FontOfLocalization('youyuan_f'))
    
    o.root.transform:Find("container_info/data/ScrollData/ViewPoint/content/mode1/detail/hupai"):GetComponent(typeof(UnityEngine.UI.Text)).font = LuaTools.LoadFont(Tools.FontOfLocalization('SimHei'))
    o.root.transform:Find("container_info/data/ScrollData/ViewPoint/content/mode1/detail/zimolv"):GetComponent(typeof(UnityEngine.UI.Text)).text = Tools.StrOfLocalization(2298)
    o.root.transform:Find("container_info/data/ScrollData/ViewPoint/content/mode1/detail/zimolv"):GetComponent(typeof(UnityEngine.UI.Text)).font = LuaTools.LoadFont(Tools.FontOfLocalization('youyuan_f'))
    
    o.root.transform:Find("container_info/data/ScrollData/ViewPoint/content/mode1/detail/zimo"):GetComponent(typeof(UnityEngine.UI.Text)).font = LuaTools.LoadFont(Tools.FontOfLocalization('SimHei'))
    o.root.transform:Find("container_info/data/ScrollData/ViewPoint/content/mode1/detail/fangchonglv"):GetComponent(typeof(UnityEngine.UI.Text)).text = Tools.StrOfLocalization(2299)
    o.root.transform:Find("container_info/data/ScrollData/ViewPoint/content/mode1/detail/fangchonglv"):GetComponent(typeof(UnityEngine.UI.Text)).font = LuaTools.LoadFont(Tools.FontOfLocalization('youyuan_f'))
    
    o.root.transform:Find("container_info/data/ScrollData/ViewPoint/content/mode1/detail/fangchong"):GetComponent(typeof(UnityEngine.UI.Text)).font = LuaTools.LoadFont(Tools.FontOfLocalization('SimHei'))
    o.root.transform:Find("container_info/data/ScrollData/ViewPoint/content/mode1/detail/fululv"):GetComponent(typeof(UnityEngine.UI.Text)).text = Tools.StrOfLocalization(2300)
    o.root.transform:Find("container_info/data/ScrollData/ViewPoint/content/mode1/detail/fululv"):GetComponent(typeof(UnityEngine.UI.Text)).font = LuaTools.LoadFont(Tools.FontOfLocalization('youyuan_f'))
    
    o.root.transform:Find("container_info/data/ScrollData/ViewPoint/content/mode1/detail/fulu"):GetComponent(typeof(UnityEngine.UI.Text)).font = LuaTools.LoadFont(Tools.FontOfLocalization('SimHei'))
    o.root.transform:Find("container_info/data/ScrollData/ViewPoint/content/mode1/detail/node"):GetComponent(typeof(UnityEngine.UI.Text)).text = Tools.StrOfLocalization(2301)
    o.root.transform:Find("container_info/data/ScrollData/ViewPoint/content/mode1/detail/node"):GetComponent(typeof(UnityEngine.UI.Text)).font = LuaTools.LoadFont(Tools.FontOfLocalization('youyuan_f'))
    
    o.root.transform:Find("container_info/data/ScrollData/ViewPoint/content/mode1/detail/liqi"):GetComponent(typeof(UnityEngine.UI.Text)).font = LuaTools.LoadFont(Tools.FontOfLocalization('SimHei'))
    ---@type UnityEngine.Transform
    o.root.mode2 = o.root.transform:Find("container_info/data/ScrollData/ViewPoint/content/mode2")
    ---@type UnityEngine.UI.Button
    o.root.btn_mode2 = o.root.transform:Find("container_info/data/ScrollData/ViewPoint/content/mode2/btn"):GetComponent(typeof(UnityEngine.UI.Button))
    o.root.btn_mode2.onClick:AddListener(function() o.root:BtnMode2() end)
    o.root.transform:Find("container_info/data/ScrollData/ViewPoint/content/mode2/btn/mode"):GetComponent(typeof(UnityEngine.UI.Text)).text = Tools.StrOfLocalization(2302)
    o.root.transform:Find("container_info/data/ScrollData/ViewPoint/content/mode2/btn/mode"):GetComponent(typeof(UnityEngine.UI.Text)).font = LuaTools.LoadFont(Tools.FontOfLocalization('fengyucumaokai'))
    
    o.root.transform:Find("container_info/data/ScrollData/ViewPoint/content/mode2/detail/pos1"):GetComponent(typeof(UnityEngine.UI.Text)).font = LuaTools.LoadFont(Tools.FontOfLocalization('SimHei'))
    o.root.transform:Find("container_info/data/ScrollData/ViewPoint/content/mode2/detail/pos1/node"):GetComponent(typeof(UnityEngine.UI.Text)).text = Tools.StrOfLocalization(2287)
    o.root.transform:Find("container_info/data/ScrollData/ViewPoint/content/mode2/detail/pos1/node"):GetComponent(typeof(UnityEngine.UI.Text)).font = LuaTools.LoadFont(Tools.FontOfLocalization('youyuan_f'))
    
    o.root.transform:Find("container_info/data/ScrollData/ViewPoint/content/mode2/detail/pos2"):GetComponent(typeof(UnityEngine.UI.Text)).font = LuaTools.LoadFont(Tools.FontOfLocalization('SimHei'))
    o.root.transform:Find("container_info/data/ScrollData/ViewPoint/content/mode2/detail/pos2/node"):GetComponent(typeof(UnityEngine.UI.Text)).text = Tools.StrOfLocalization(2288)
    o.root.transform:Find("container_info/data/ScrollData/ViewPoint/content/mode2/detail/pos2/node"):GetComponent(typeof(UnityEngine.UI.Text)).font = LuaTools.LoadFont(Tools.FontOfLocalization('youyuan_f'))
    
    o.root.transform:Find("container_info/data/ScrollData/ViewPoint/content/mode2/detail/pos3"):GetComponent(typeof(UnityEngine.UI.Text)).font = LuaTools.LoadFont(Tools.FontOfLocalization('SimHei'))
    o.root.transform:Find("container_info/data/ScrollData/ViewPoint/content/mode2/detail/pos3/node"):GetComponent(typeof(UnityEngine.UI.Text)).text = Tools.StrOfLocalization(2289)
    o.root.transform:Find("container_info/data/ScrollData/ViewPoint/content/mode2/detail/pos3/node"):GetComponent(typeof(UnityEngine.UI.Text)).font = LuaTools.LoadFont(Tools.FontOfLocalization('youyuan_f'))
    
    o.root.transform:Find("container_info/data/ScrollData/ViewPoint/content/mode2/detail/pos4"):GetComponent(typeof(UnityEngine.UI.Text)).font = LuaTools.LoadFont(Tools.FontOfLocalization('SimHei'))
    o.root.transform:Find("container_info/data/ScrollData/ViewPoint/content/mode2/detail/pos4/node"):GetComponent(typeof(UnityEngine.UI.Text)).text = Tools.StrOfLocalization(2290)
    o.root.transform:Find("container_info/data/ScrollData/ViewPoint/content/mode2/detail/pos4/node"):GetComponent(typeof(UnityEngine.UI.Text)).font = LuaTools.LoadFont(Tools.FontOfLocalization('youyuan_f'))
    
    o.root.transform:Find("container_info/data/ScrollData/ViewPoint/content/mode2/detail/knockout"):GetComponent(typeof(UnityEngine.UI.Text)).font = LuaTools.LoadFont(Tools.FontOfLocalization('SimHei'))
    o.root.transform:Find("container_info/data/ScrollData/ViewPoint/content/mode2/detail/knockout/node"):GetComponent(typeof(UnityEngine.UI.Text)).text = Tools.StrOfLocalization(2291)
    o.root.transform:Find("container_info/data/ScrollData/ViewPoint/content/mode2/detail/knockout/node"):GetComponent(typeof(UnityEngine.UI.Text)).font = LuaTools.LoadFont(Tools.FontOfLocalization('youyuan_f'))
    o.root.transform:Find("container_info/data/ScrollData/ViewPoint/content/mode2/detail/zongduiju"):GetComponent(typeof(UnityEngine.UI.Text)).text = Tools.StrOfLocalization(2292)
    o.root.transform:Find("container_info/data/ScrollData/ViewPoint/content/mode2/detail/zongduiju"):GetComponent(typeof(UnityEngine.UI.Text)).font = LuaTools.LoadFont(Tools.FontOfLocalization('youyuan_f'))
    
    o.root.transform:Find("container_info/data/ScrollData/ViewPoint/content/mode2/detail/changci"):GetComponent(typeof(UnityEngine.UI.Text)).font = LuaTools.LoadFont(Tools.FontOfLocalization('SimHei'))
    o.root.transform:Find("container_info/data/ScrollData/ViewPoint/content/mode2/detail/pingjundadian"):GetComponent(typeof(UnityEngine.UI.Text)).text = Tools.StrOfLocalization(2293)
    o.root.transform:Find("container_info/data/ScrollData/ViewPoint/content/mode2/detail/pingjundadian"):GetComponent(typeof(UnityEngine.UI.Text)).font = LuaTools.LoadFont(Tools.FontOfLocalization('youyuan_f'))
    
    o.root.transform:Find("container_info/data/ScrollData/ViewPoint/content/mode2/detail/dadian"):GetComponent(typeof(UnityEngine.UI.Text)).font = LuaTools.LoadFont(Tools.FontOfLocalization('SimHei'))
    o.root.transform:Find("container_info/data/ScrollData/ViewPoint/content/mode2/detail/pingjunshunwei"):GetComponent(typeof(UnityEngine.UI.Text)).text = Tools.StrOfLocalization(2294)
    o.root.transform:Find("container_info/data/ScrollData/ViewPoint/content/mode2/detail/pingjunshunwei"):GetComponent(typeof(UnityEngine.UI.Text)).font = LuaTools.LoadFont(Tools.FontOfLocalization('youyuan_f'))
    
    o.root.transform:Find("container_info/data/ScrollData/ViewPoint/content/mode2/detail/shunwei"):GetComponent(typeof(UnityEngine.UI.Text)).font = LuaTools.LoadFont(Tools.FontOfLocalization('SimHei'))
    o.root.transform:Find("container_info/data/ScrollData/ViewPoint/content/mode2/detail/zuidalianzhuang"):GetComponent(typeof(UnityEngine.UI.Text)).text = Tools.StrOfLocalization(2295)
    o.root.transform:Find("container_info/data/ScrollData/ViewPoint/content/mode2/detail/zuidalianzhuang"):GetComponent(typeof(UnityEngine.UI.Text)).font = LuaTools.LoadFont(Tools.FontOfLocalization('youyuan_f'))
    
    o.root.transform:Find("container_info/data/ScrollData/ViewPoint/content/mode2/detail/lianzhuang"):GetComponent(typeof(UnityEngine.UI.Text)).font = LuaTools.LoadFont(Tools.FontOfLocalization('SimHei'))
    o.root.transform:Find("container_info/data/ScrollData/ViewPoint/content/mode2/detail/hulexunshu"):GetComponent(typeof(UnityEngine.UI.Text)).text = Tools.StrOfLocalization(2296)
    o.root.transform:Find("container_info/data/ScrollData/ViewPoint/content/mode2/detail/hulexunshu"):GetComponent(typeof(UnityEngine.UI.Text)).font = LuaTools.LoadFont(Tools.FontOfLocalization('youyuan_f'))
    
    o.root.transform:Find("container_info/data/ScrollData/ViewPoint/content/mode2/detail/hule"):GetComponent(typeof(UnityEngine.UI.Text)).font = LuaTools.LoadFont(Tools.FontOfLocalization('SimHei'))
    o.root.transform:Find("container_info/data/ScrollData/ViewPoint/content/mode2/detail/hupailv"):GetComponent(typeof(UnityEngine.UI.Text)).text = Tools.StrOfLocalization(2297)
    o.root.transform:Find("container_info/data/ScrollData/ViewPoint/content/mode2/detail/hupailv"):GetComponent(typeof(UnityEngine.UI.Text)).font = LuaTools.LoadFont(Tools.FontOfLocalization('youyuan_f'))
    
    o.root.transform:Find("container_info/data/ScrollData/ViewPoint/content/mode2/detail/hupai"):GetComponent(typeof(UnityEngine.UI.Text)).font = LuaTools.LoadFont(Tools.FontOfLocalization('SimHei'))
    o.root.transform:Find("container_info/data/ScrollData/ViewPoint/content/mode2/detail/zimolv"):GetComponent(typeof(UnityEngine.UI.Text)).text = Tools.StrOfLocalization(2298)
    o.root.transform:Find("container_info/data/ScrollData/ViewPoint/content/mode2/detail/zimolv"):GetComponent(typeof(UnityEngine.UI.Text)).font = LuaTools.LoadFont(Tools.FontOfLocalization('youyuan_f'))
    
    o.root.transform:Find("container_info/data/ScrollData/ViewPoint/content/mode2/detail/zimo"):GetComponent(typeof(UnityEngine.UI.Text)).font = LuaTools.LoadFont(Tools.FontOfLocalization('SimHei'))
    o.root.transform:Find("container_info/data/ScrollData/ViewPoint/content/mode2/detail/fangchonglv"):GetComponent(typeof(UnityEngine.UI.Text)).text = Tools.StrOfLocalization(2299)
    o.root.transform:Find("container_info/data/ScrollData/ViewPoint/content/mode2/detail/fangchonglv"):GetComponent(typeof(UnityEngine.UI.Text)).font = LuaTools.LoadFont(Tools.FontOfLocalization('youyuan_f'))
    
    o.root.transform:Find("container_info/data/ScrollData/ViewPoint/content/mode2/detail/fangchong"):GetComponent(typeof(UnityEngine.UI.Text)).font = LuaTools.LoadFont(Tools.FontOfLocalization('SimHei'))
    o.root.transform:Find("container_info/data/ScrollData/ViewPoint/content/mode2/detail/fululv"):GetComponent(typeof(UnityEngine.UI.Text)).text = Tools.StrOfLocalization(2300)
    o.root.transform:Find("container_info/data/ScrollData/ViewPoint/content/mode2/detail/fululv"):GetComponent(typeof(UnityEngine.UI.Text)).font = LuaTools.LoadFont(Tools.FontOfLocalization('youyuan_f'))
    
    o.root.transform:Find("container_info/data/ScrollData/ViewPoint/content/mode2/detail/fulu"):GetComponent(typeof(UnityEngine.UI.Text)).font = LuaTools.LoadFont(Tools.FontOfLocalization('SimHei'))
    o.root.transform:Find("container_info/data/ScrollData/ViewPoint/content/mode2/detail/node"):GetComponent(typeof(UnityEngine.UI.Text)).text = Tools.StrOfLocalization(2301)
    o.root.transform:Find("container_info/data/ScrollData/ViewPoint/content/mode2/detail/node"):GetComponent(typeof(UnityEngine.UI.Text)).font = LuaTools.LoadFont(Tools.FontOfLocalization('youyuan_f'))
    
    o.root.transform:Find("container_info/data/ScrollData/ViewPoint/content/mode2/detail/liqi"):GetComponent(typeof(UnityEngine.UI.Text)).font = LuaTools.LoadFont(Tools.FontOfLocalization('SimHei'))
    ---@type UnityEngine.Transform
    o.root.fan = o.root.transform:Find("container_info/data/ScrollData/ViewPoint/content/fan")
    ---@type UnityEngine.UI.Button
    o.root.btn_fan = o.root.transform:Find("container_info/data/ScrollData/ViewPoint/content/fan/btn"):GetComponent(typeof(UnityEngine.UI.Button))
    o.root.btn_fan.onClick:AddListener(function() o.root:BtnFan() end)
    o.root.transform:Find("container_info/data/ScrollData/ViewPoint/content/fan/btn/mode"):GetComponent(typeof(UnityEngine.UI.Text)).text = Tools.StrOfLocalization(2303)
    o.root.transform:Find("container_info/data/ScrollData/ViewPoint/content/fan/btn/mode"):GetComponent(typeof(UnityEngine.UI.Text)).font = LuaTools.LoadFont(Tools.FontOfLocalization('fengyucumaokai'))
    ---@type UnityEngine.Transform
    o.root.fandetail = o.root.transform:Find("container_info/data/ScrollData/ViewPoint/content/fan/detail")
    ---@type UnityEngine.Transform
    o.root.templete = o.root.transform:Find("container_info/data/ScrollData/ViewPoint/content/fan/detail/templete")
    
    o.root.transform:Find("container_info/data/ScrollData/ViewPoint/content/fan/detail/templete/fan"):GetComponent(typeof(UnityEngine.UI.Text)).font = LuaTools.LoadFont(Tools.FontOfLocalization('youyuan_f'))
    
    o.root.transform:Find("container_info/data/ScrollData/ViewPoint/content/fan/detail/templete/count"):GetComponent(typeof(UnityEngine.UI.Text)).font = LuaTools.LoadFont(Tools.FontOfLocalization('youyuan_f'))
    
    o.root.transform:Find("container_info/data/ScrollData/ViewPoint/content/fan/detail/templete/node"):GetComponent(typeof(UnityEngine.UI.Text)).font = LuaTools.LoadFont(Tools.FontOfLocalization('youyuan_f'))
    ---@type UnityEngine.Transform
    o.root.fan_guyi = o.root.transform:Find("container_info/data/ScrollData/ViewPoint/content/fan_guyi")
    ---@type UnityEngine.UI.Button
    o.root.btn_fan_guyi = o.root.transform:Find("container_info/data/ScrollData/ViewPoint/content/fan_guyi/btn"):GetComponent(typeof(UnityEngine.UI.Button))
    o.root.btn_fan_guyi.onClick:AddListener(function() o.root:BtnFan_Guyi() end)
    o.root.transform:Find("container_info/data/ScrollData/ViewPoint/content/fan_guyi/btn/mode"):GetComponent(typeof(UnityEngine.UI.Text)).text = Tools.StrOfLocalization(2772)
    o.root.transform:Find("container_info/data/ScrollData/ViewPoint/content/fan_guyi/btn/mode"):GetComponent(typeof(UnityEngine.UI.Text)).font = LuaTools.LoadFont(Tools.FontOfLocalization('fengyucumaokai'))
    ---@type UnityEngine.Transform
    o.root.fandetail_guyi = o.root.transform:Find("container_info/data/ScrollData/ViewPoint/content/fan_guyi/detail")
    
    o.root.transform:Find("container_info/data/ScrollData/ViewPoint/content/fan_guyi/detail/templete/fan"):GetComponent(typeof(UnityEngine.UI.Text)).font = LuaTools.LoadFont(Tools.FontOfLocalization('youyuan_f'))
    
    o.root.transform:Find("container_info/data/ScrollData/ViewPoint/content/fan_guyi/detail/templete/count"):GetComponent(typeof(UnityEngine.UI.Text)).font = LuaTools.LoadFont(Tools.FontOfLocalization('youyuan_f'))
    
    o.root.transform:Find("container_info/data/ScrollData/ViewPoint/content/fan_guyi/detail/templete/node"):GetComponent(typeof(UnityEngine.UI.Text)).font = LuaTools.LoadFont(Tools.FontOfLocalization('youyuan_f'))
    ---@type UnityEngine.Transform
    o.root.blank = o.root.transform:Find("container_info/data/ScrollData/ViewPoint/content/blank")
    ---@type UnityEngine.Transform
    o.root.scrollbar = o.root.transform:Find("container_info/data/Scrollbar")
    ---@type UnityEngine.UI.Button
    o.root.btn_shilian = o.root.transform:Find("container_info/tabs/btn_shilian"):GetComponent(typeof(UnityEngine.UI.Button))
    o.root.btn_shilian.onClick:AddListener(function() o.root:OpenShilian() end)
    o.root.transform:Find("container_info/tabs/btn_shilian/node"):GetComponent(typeof(UnityEngine.UI.Text)).text = Tools.StrOfLocalization(3363)
    o.root.transform:Find("container_info/tabs/btn_shilian/node"):GetComponent(typeof(UnityEngine.UI.Text)).font = LuaTools.LoadFont(Tools.FontOfLocalization('fengyucumaokai'))
    ---@type UnityEngine.UI.Button
    o.root.btn_friend = o.root.transform:Find("container_info/tabs/btn_friend"):GetComponent(typeof(UnityEngine.UI.Button))
    o.root.btn_friend.onClick:AddListener(function() o.root:OpenFriend() end)
    o.root.transform:Find("container_info/tabs/btn_friend/node"):GetComponent(typeof(UnityEngine.UI.Text)).text = Tools.StrOfLocalization(2023)
    o.root.transform:Find("container_info/tabs/btn_friend/node"):GetComponent(typeof(UnityEngine.UI.Text)).font = LuaTools.LoadFont(Tools.FontOfLocalization('fengyucumaokai'))
    ---@type UnityEngine.UI.Button
    o.root.btn_pipei = o.root.transform:Find("container_info/tabs/btn_pipei"):GetComponent(typeof(UnityEngine.UI.Button))
    o.root.btn_pipei.onClick:AddListener(function() o.root:OpenPipei() end)
    o.root.transform:Find("container_info/tabs/btn_pipei/node"):GetComponent(typeof(UnityEngine.UI.Text)).text = Tools.StrOfLocalization(2271)
    o.root.transform:Find("container_info/tabs/btn_pipei/node"):GetComponent(typeof(UnityEngine.UI.Text)).font = LuaTools.LoadFont(Tools.FontOfLocalization('fengyucumaokai'))
    ---@type UnityEngine.Transform
    o.root.bg = o.root.transform:Find("container_info/achievement")
    ---@type UnityEngine.UI.Text
    o.root.label_gold = o.root.transform:Find("container_info/achievement/container_gold/label_gold"):GetComponent(typeof(UnityEngine.UI.Text))
    o.root.label_gold.font = LuaTools.LoadFont(Tools.FontOfLocalization('SimHei'))
    ---@type UnityEngine.UI.Text
    o.root.label_sliver = o.root.transform:Find("container_info/achievement/container_sliver/label_gold"):GetComponent(typeof(UnityEngine.UI.Text))
    o.root.label_sliver.font = LuaTools.LoadFont(Tools.FontOfLocalization('SimHei'))
    ---@type UnityEngine.UI.Text
    o.root.label_copper = o.root.transform:Find("container_info/achievement/container_copper/label_gold"):GetComponent(typeof(UnityEngine.UI.Text))
    o.root.label_copper.font = LuaTools.LoadFont(Tools.FontOfLocalization('SimHei'))
    o.root.transform:Find("container_info/achievement/node"):GetComponent(typeof(UnityEngine.UI.Text)).text = Tools.StrOfLocalization(3336)
    o.root.transform:Find("container_info/achievement/node"):GetComponent(typeof(UnityEngine.UI.Text)).font = LuaTools.LoadFont(Tools.FontOfLocalization('fengyucumaokai'))
    o.root.transform:Find("container_info/achievement/btn_trans"):GetComponent(typeof(UnityEngine.UI.Button)).onClick:AddListener(function() o.root:OpenAchievement() end)
    o.root.transform:Find("btn_close"):GetComponent(typeof(UnityEngine.UI.Button)).onClick:AddListener(function() o.root:Close() end)
    o.transform:Find("container_sign_input"):GetComponent(typeof(UnityEngine.UI.Button)).onClick:AddListener(function() o:ConfirmChange() end)
    ---@class UI_SelfPlayerinfo.Container_SignInput_Inst : UI_SelfPlayerinfo.Container_SignInput
    o.container_sign_input = UI_SelfPlayerinfo.Container_SignInput:Create(o.transform:Find("container_sign_input"), o)
    o.container_sign_input.transform:Find("input/Placeholder"):GetComponent(typeof(UnityEngine.UI.Text)).text = Tools.StrOfLocalization(3694)
    o.container_sign_input.transform:Find("input/Placeholder"):GetComponent(typeof(UnityEngine.UI.Text)).font = LuaTools.LoadFont(Tools.FontOfLocalization('SimHei'))
    
    o.container_sign_input.transform:Find("input/Text"):GetComponent(typeof(UnityEngine.UI.Text)).font = LuaTools.LoadFont(Tools.FontOfLocalization('Arial'))

	o:OnCreate()
	return o
end

-- ***************** UI_SelfPlayerinfo *****************
-- ****** 变量列表
-- UI_SelfPlayerinfo.Container_SignInput:  container_sign_input
-- UI_SelfPlayerinfo.Root:  root
-- ****** 调用列表
-- Close()
-- ConfirmChange()


-- ***************** block:UI_SelfPlayerinfo.Root *****************
-- ****** 变量列表
-- UI_SelfPlayerinfo.Root.Container_Note:  container_note
-- UI_SelfPlayerinfo.Root.Season1:  season1
-- UI_SelfPlayerinfo.Root.Season2:  season2
-- UI_SelfPlayerinfo.Root.Season3:  season3
-- Button:  btn_changenickname
-- Button:  btn_fan
-- Button:  btn_fan_guyi
-- Button:  btn_friend
-- Button:  btn_mode1
-- Button:  btn_mode2
-- Button:  btn_pipei
-- Button:  btn_rank
-- Button:  btn_shilian
-- Button:  btn_title
-- Button:  tab_info3
-- Button:  tab_info4
-- Button:  tab_note
-- Component:  bg
-- Component:  blank
-- Component:  blank0
-- Component:  container_hand
-- Component:  container_info
-- Component:  container_title
-- Component:  container_title_en
-- Component:  content
-- Component:  dahe_container
-- Component:  exp
-- Component:  fan
-- Component:  fan_guyi
-- Component:  fandetail
-- Component:  fandetail_guyi
-- Component:  fengge_container
-- Component:  lb4
-- Component:  line4
-- Component:  lines
-- Component:  mode1
-- Component:  mode2
-- Component:  points
-- Component:  radarpos
-- Component:  rank
-- Component:  rank_container
-- Component:  scrollbar
-- Component:  templete
-- Component:  what
-- Component:  zoushi_container
-- Image:  expbar
-- Image:  img_title_en
-- Image:  img_title0
-- Image:  img_title1
-- Image:  img_title2
-- Image:  img_title3
-- Image:  redpoint
-- Image:  title
-- Text:  label_copper
-- Text:  label_gold
-- Text:  label_noinfo
-- Text:  label_norank
-- Text:  label_shuxing
-- Text:  label_sliver
-- Text:  txt_expmax
-- Text:  txt_expvalue
-- Text:  txt_fang
-- Text:  txt_gong
-- Text:  txt_su
-- Text:  txt_yun
-- ****** 调用列表
-- BtnFan()
-- BtnFan_Guyi()
-- BtnMode1()
-- BtnMode2()
-- ChangeName()
-- Close()
-- OpenAchievement()
-- OpenFriend()
-- OpenInfo3()
-- OpenInfo4()
-- OpenIntroduce()
-- OpenNote()
-- OpenPipei()
-- OpenShilian()
-- ShowTitle()


-- ***************** block:UI_SelfPlayerinfo.Root.Container_Note *****************
-- ****** 变量列表
-- Button:  btn_edit
-- Button:  btn_left
-- Button:  btn_page
-- Button:  btn_right
-- Component:  container_pages
-- Component:  content
-- Component:  note_content
-- Component:  NotePages
-- Component:  page_controller
-- Component:  pg_templete
-- Component:  scrollbar
-- Component:  templete
-- Text:  curPage
-- Text:  noinfo
-- Text:  nonote
-- Text:  sign_content
-- ****** 调用列表
-- ChangeSign()
-- ChangeSign()
-- Left()
-- Right()


-- ***************** block:UI_SelfPlayerinfo.Root.Season1 *****************
-- ****** 变量列表
-- Component:  level_container
-- Component:  rank
-- Image:  exp1
-- Image:  exp2
-- Image:  exp3
-- Image:  rankimg
-- Text:  label_level
-- Text:  label_rank
-- Text:  label_season
-- ****** 调用列表
-- none


-- ***************** block:UI_SelfPlayerinfo.Root.Season2 *****************
-- ****** 变量列表
-- Component:  level_container
-- Component:  rank
-- Image:  exp1
-- Image:  exp2
-- Image:  exp3
-- Image:  rankimg
-- Text:  label_level
-- Text:  label_rank
-- Text:  label_season
-- ****** 调用列表
-- none


-- ***************** block:UI_SelfPlayerinfo.Root.Season3 *****************
-- ****** 变量列表
-- Component:  level_container
-- Component:  rank
-- Image:  exp1
-- Image:  exp2
-- Image:  exp3
-- Image:  rankimg
-- Text:  label_level
-- Text:  label_rank
-- Text:  label_season
-- ****** 调用列表
-- none


-- ***************** block:UI_SelfPlayerinfo.Container_SignInput *****************
-- ****** 变量列表
-- none
-- ****** 调用列表
-- none

