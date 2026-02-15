ControllerMgr = {}

ControllerMgr.EButton = {none = 0, back = 1}

ControllerMgr.AvailableBtns = {}
ControllerMgr.BtnListners = {}
ControllerMgr.ObjFuncMap = {}
ControllerMgr.KeyCodeMap = {}

function ControllerMgr.Init()
    --初始化当前平台可用按键
    if LuaTools.GetCurrentPlatform() == "Android" or LuaTools.GetCurrentPlatform() == "iOS" then
        table.insert(ControllerMgr.AvailableBtns, ControllerMgr.EButton.back)
        ControllerMgr.KeyCodeMap[ControllerMgr.EButton.back] = UnityEngine.KeyCode.IntToEnum(27)
    elseif UnityEngine.Application.isEditor then
        table.insert(ControllerMgr.AvailableBtns, ControllerMgr.EButton.back)
        ControllerMgr.KeyCodeMap[ControllerMgr.EButton.back] = UnityEngine.KeyCode.B
    end
    for i = 1, #ControllerMgr.AvailableBtns do
        ControllerMgr.BtnListners[ControllerMgr.AvailableBtns[i]] = {}
    end

    ControllerMgr.timer = TimerMgr:Init()
    ControllerMgr.timer:LoopFrame(1, -1, ControllerMgr.Update)
end

---注册按钮监听 按先入后出顺序拦截并调用最新一个active的display_obj的func 调用时移除非active的dispaly_obj
---@param btn integer  ControllerMgr.EButton
---@param display_obj any  GameObject 当前页面
---@param func function | nil listener
function ControllerMgr.RegistFunc(btn, display_obj, func)
    local available = false
    for i = 1, #ControllerMgr.AvailableBtns do
        if ControllerMgr.AvailableBtns[i] == btn then
            available = true
            break
        end
    end
    if not available then
        return
    end

    for i = #ControllerMgr.BtnListners[btn], 1, -1 do
        if ControllerMgr.BtnListners[btn][i] == display_obj then
            --保证入栈时display_obj唯一
            table.remove(ControllerMgr.BtnListners[btn], i)
            break
        end
    end
    table.insert(ControllerMgr.BtnListners[btn], display_obj)

    ControllerMgr.ObjFuncMap[display_obj] = func
end

---拦截按钮 提示按钮不可用
---@param btn any
---@param display_obj any
---@param disable_hint boolean | nil
function ControllerMgr.ForbidBtn(btn, display_obj, disable_hint)
    if not disable_hint then
        ControllerMgr.RegistFunc(btn, display_obj, ControllerMgr.ShowUnavailableHint)
    else
        ControllerMgr.RegistFunc(btn, display_obj, ControllerMgr.Empty)
    end
end

function ControllerMgr.ShowUnavailableHint()
    UIMgr.Inst:Show_PopOutNoTitle(Tools.StrOfLocalization(3695))
end

function ControllerMgr.Empty()
end

function ControllerMgr.Update()
    for i = 1, #ControllerMgr.AvailableBtns do
        local btn = ControllerMgr.AvailableBtns[i]
        if UnityEngine.Input.GetKeyDown(ControllerMgr.KeyCodeMap[btn]) then
            if UI_Loading and UI_Loading.Inst and UI_Loading.Inst.transform.gameObject.activeInHierarchy then
                return
            end
            local invoked = false
            for j = #ControllerMgr.BtnListners[btn], 1, -1 do
                if invoked then
                    break
                end
                local display_obj = ControllerMgr.BtnListners[btn][j]
                xpcall(function ()
                    if display_obj and ControllerMgr.ObjFuncMap[display_obj] and display_obj.activeInHierarchy then
                        local func = ControllerMgr.ObjFuncMap[display_obj]
                        if func then
                            func()
                        end
                        invoked = true
                    else
                        ControllerMgr.BtnListners[btn][j] = nil
                    end
                end, function ()
                    ControllerMgr.BtnListners[btn][j] = nil
                end)
            end
        end
    end
end

---注册UI按钮到按键
---@param controller_btn integer controller按键
---@param ui_btn any UI.Button 按键触发的按钮 同时也作为display_obj
---@param force_click boolean | nil 忽略UI按钮是否可点击 直接触发UI按钮
function ControllerMgr.RegistBtn(controller_btn, ui_btn, force_click)
    ControllerMgr.RegistFunc(controller_btn, ui_btn.gameObject, function ()
        if force_click or (ui_btn.interactable and ui_btn:IsActive()) then
            ui_btn.onClick:Invoke()
        end
    end)
end

---注册UI返回按钮
---@param ui_btn any UI.Button UI返回键
function ControllerMgr.RegistBtnBack(ui_btn)
    ControllerMgr.RegistBtn(ControllerMgr.EButton.back, ui_btn, false)
end

return ControllerMgr