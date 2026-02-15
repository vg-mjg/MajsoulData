require ("UI.UI_Activity_WSJ_Task")

function UIMgr:UI_Activity_WSJ_Task_Create(parent)
    local transform = LuaTools.LoadPrefab('prefab/ui_out/UI_Activity_GameTask', parent)
    if not transform then
        return nil
    end

    transform.gameObject:SetActive(false)
    local o = UI_Activity_GameTask:Create(transform)
    o:OnCreate()
    local inheritance = o:Inherit(UI_Activity_WSJ_Task)
    inheritance:OnCreate()
	return inheritance
end
-- ***************** UI_Activity_WSJ_Task *****************
-- ****** 变量列表
-- Component:  task_content
-- Component:  task_templete
-- Image:  img_head
-- ****** 调用列表
-- none

