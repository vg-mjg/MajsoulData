require "UI.UI_Activity_WSJ_Reward"

function UIMgr:UI_Activity_WSJ_Reward_Create(parent)
    local transform = LuaTools.LoadPrefab('prefab/ui_out/UI_Activity_Exchange', parent)
    if not transform then
        return nil
    end

    transform.gameObject:SetActive(false)
    local o = UI_Activity_Exchange:Create(transform)
    o:OnCreate()
    local inheritance = o:Inherit(UI_Activity_WSJ_Reward)
    inheritance.transform:Find("root"):Find("content"):Find("cells"):Find("task_templete"):Find("info"):Find("btn_exchange"):Find("node"):Find("node"):GetComponent(typeof(UnityEngine.UI.Text)).text = Tools.StrOfLocalization(2386)
    inheritance.transform:Find("root"):Find("content"):Find("cells"):Find("task_templete"):Find("info"):Find("btn_mulexchange"):Find("node"):Find("node"):GetComponent(typeof(UnityEngine.UI.Text)).text = Tools.StrOfLocalization(2386)
    inheritance.transform:Find("root"):Find("content"):Find("cells"):Find("task_templete"):Find("info"):Find("getted"):GetComponent(typeof(UnityEngine.UI.Text)).text = Tools.StrOfLocalization(2385)
    inheritance:OnCreate()
	return inheritance
end