require "UI.UIBase"
require "UI.UIBlock"

---@class UI.UI_Activity_Moments_Old:UI.UI_Activity_Moments_Old_Inst
UI.UI_Activity_Moments_Old = UIBase:Inherit()


-- ================= funcs ==================

function UI.UI_Activity_Moments_Old:OnCreate()
	---@type UI.UI_Activity_Moments_Old
    UI.UI_Activity_Moments_Old.Inst = self
end

return UI.UI_Activity_Moments_Old
