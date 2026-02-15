require "ExcelMgr"
require "WordTree"
Taboo = {}

function Taboo:Init(words,near_char_map)
    local o = { }
    setmetatable(o, self)
    self.__index = self
    self.Inst = o
    o:OnInit(words,near_char_map)
    return o
end

function Taboo:OnInit(words,near_char_map)
    self.near_char_map = near_char_map

    local words_zixulie = {}
    local words_zichuan = {}
    -- for i=1,#words do
    --     if words[i].near and words[i].near == 1 then
    --         words[i].s = self:NormalizeStr(words[i].s)
    --     else
    --         words[i].s = self:RemoveBiaodian(words[i].s)
    --     end

    --     if words[i].type and words[i].type == 1 then
    --         table.insert(words_zixulie,{s=words[i].s,id=i+3} )
    --     else
    --         table.insert(words_zichuan,{s=words[i].s,id=i+3} )
    --     end
    -- end
   
    -- self.tree_zixulie = WordTree:InitTree(words_zixulie)
    -- self.tree_zichuan = WordTree:InitTree(words_zichuan)

    local words_length = #words
    local max_frame_index = Mathf.Ceil(words_length / 1000)
    for i = 1, max_frame_index do
        TimeMgr.DelayFrame(i, function ()
            local start_index = (i - 1) * 1000 + 1
            local end_index = i * 1000
            for j = start_index, end_index do
                if end_index <= words_length then
                    if words[j].near and words[j].near == 1 then
                        words[j].s = self:NormalizeStr(words[j].s)
                    else
                        words[j].s = self:RemoveBiaodian(words[j].s)
                    end
            
                    if words[j].type and words[j].type == 1 then
                        table.insert(words_zixulie,{s=words[j].s,id=j+3} )
                    else
                        table.insert(words_zichuan,{s=words[j].s,id=j+3} )
                    end
                end
            end
            if i == max_frame_index then
                self.tree_zixulie = WordTree:InitTree(words_zixulie)
                self.tree_zichuan = WordTree:InitTree(words_zichuan)
            end
        end)
    end
end
--查找形近字
function Taboo:FindNearChar(char)
    return self.near_char_map[char] or char
end

-- function Taboo:BuildNearChar(near_char_list)
--     self.near_char_father = {}
--     for i=1,#near_char_list do
--         local lst = near_char_list[i]
--         for j=1,#lst do
--             local c = lst[j]
--             local fa = self:FindNearChar(c)
--             if j > 0 then
--                 self.near_char_father[fa] = self:FindNearChar(lst[1])
--             end
--         end
--     end
-- end

function Taboo:RemoveBiaodian(str)
    if GameMgr.Inst.client_language ~= 'chs_t' then return str end
    local code_0 = Tools.utf8ToNum('0')
    local code_a = Tools.utf8ToNum('a')
    str = string.lower(str)
    local _str = ''
    for i =1,Tools.GetStringLength(str) do
        local _code = Tools.utf8ToNum(Tools.UTF8Sub(str,i,1))
        if _code > 256 or (_code >= code_a and _code < code_a +26) or (_code >= code_0 and _code < code_0 + 10) then
            _str = _str .. Tools.UTF8Sub(str,i,1)
        end
    end
    return _str
end

--字符串标准化，都用小写，去除多余标点a
function Taboo:NormalizeStr(str)
    local code_0 = Tools.utf8ToNum('0')
    local code_a = Tools.utf8ToNum('a')
    str = string.lower(str)
    local _str = ''
    for i =1,Tools.GetStringLength(str) do
        local _code = Tools.utf8ToNum(Tools.UTF8Sub(str,i,1))
        if _code > 256 or (_code >= code_a and _code < code_a +26) or (_code >= code_0 and _code < code_0 + 10) then
            _str = _str .. self:FindNearChar(Tools.UTF8Sub(str,i,1))
        end
    end
    return _str
end

-- 动态增加屏蔽字，考虑到性能问题如果节点超过10w个就停止增加，返回false，需要人工再检查, type:1=子序列，其他=子串
function Taboo:AddExtraWord(word,type)
    word = self:NormalizeStr(word)
    if not self:Test(word) then return true end
    if type == 1 then
        return self.tree_zixulie:AddExtraWord(word)
    else
        return self.tree_zichuan:AddExtraWord(word)
    end
end

-- 动态删除屏蔽字，尽量不要删除基础的屏蔽字，因为有剪枝，基础的有些已经被过滤了, type:1=子序列，其他=子串
function Taboo:RemoveExtraWord(word,type)
    word = self:NormalizeStr(word)
    if not self:Test(word) then return true end
    if type == 1 then
        return self.tree_zixulie:RemoveExtraWord(word)
    else
        return self.tree_zichuan:RemoveExtraWord(word)
    end
end

-- 寻找屏蔽词
function Taboo:Test(str)
    str = self:RemoveBiaodian(str)
    local ret = self:_test(str)
    if ret then
        return ret
    end
    local str2 = self:NormalizeStr(str)
    if str2 ~= str then
        ret = self:_test(str2)
    end
    if ret then
        return ret
    end
    
    if LuaTools.GetCurrentPlatform() == 'AA32' 
    and GameVersion.Fit('2.5.0')
    and not UnityEngine.Application.isEditor then
        ret = LuaTools.TabooTest(str)
        if ret then
            return ret
        end
    end

    return ret
end

-- 屏蔽词尝试子串匹配和子序列匹配
function Taboo:_test(str)
    local ret = nil
    if self.tree_zichuan then
        ret = self.tree_zichuan:TestZichuan(str)
    end
    if ret then
        return ret
    end
    if self.tree_zixulie then
        ret = self.tree_zixulie:TestZixulie(str)
    end
    return ret
end

return Taboo