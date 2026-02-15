WordTree = {}
function WordTree:InitTree(contents)
    local o = { }
	setmetatable(o, self)
    self.__index = self
    -- body
    o.tree = {
        code = 0,
        str = '',
        isEnd = false,
        childs = {},
        id = 0
    }
    -- table.sort(contents,function(a,b)
    --     return Tools.GetStringLength(a.s) > Tools.GetStringLength(b.b)
    -- end)
    o.count = 0
    for i=1,#contents do
        o:AddWord({s = contents[i].s,id = contents[i].id})
    end
    return o
end

function WordTree:AddWord(word)
    local str = word.s
    if not str or str == '' then return end
    local root = self.tree
    for i=1,Tools.GetStringLength(str) do
        local _w = Tools.UTF8Sub(str,i,1)
        if not root.childs[_w] then
            local p ={}
            p = {}
            p.code = Tools.utf8ToNum(_w)
            p.str = Tools.UTF8Sub(str,1,i)
            p.isEnd = false
            p.childs = {}
            p.id = 0
            self.count = self.count + 1
            root.childs[_w] = p
        end
        root = root.childs[_w]
    end
    root.isEnd = true
    root.id = word.id
    -- self.tree = root
end

--动态增加屏蔽字，考虑到性能问题如果节点超过10w个就停止增加，返回false，需要人工再检查
function WordTree:AddExtraWord(str)
    if self:Test(str) then return true end
    if self.count > 100000 then return false end
    self:AddWord(str)
    return true
end

--动态删除屏蔽字，尽量不要删除基础的屏蔽字，因为有剪枝，基础的有些已经被过滤了
function WordTree:RemoveExtraWord(str)
    local root = self.tree
    for j=1,Tools.GetStringLength(str) do
        local _c = Tools.utf8ToNum(Tools.UTF8Sub(str,j,1))
        if root.childs[_c] then
            root = root.childs[_c]
        else
            return
        end
    end
    root.isEnd = false
end
-- 以子序列方式匹配
function WordTree:TestZixulie(str)
    local poss = {}
    table.insert(poss,self.tree)
    local in_map = {}
    for i=1,Tools.GetStringLength(str) do
        local c = Tools.UTF8Sub(str,i,1)
        local n = #poss
        for j=1,n do
            local node = poss[j]
            local father_in_dist = (node.str == '') or (in_map[node.str] + 13 >= i)
            if node.childs and node.childs[c] then
                local nd = node.childs[c]
                if father_in_dist then
                    if nd.isEnd then
                        return { s= nd.str,id = nd.id }
                    end
                    if not in_map[nd.str] then
                        table.insert(poss,nd)
                    end
                    in_map[nd.str] = i
                end
            end
        end
    end
    return nil
end
-- 以子串方式匹配
function WordTree:TestZichuan(str)
    local poss = {}
    table.insert(poss,self.tree)
    local m = 0
    for i=1,Tools.GetStringLength(str) do
        local c = Tools.UTF8Sub(str,i,1)
        local n = #poss
        local _poss = {}
        table.insert(_poss,self.tree)
        for j=1,n do
            local node = poss[j]
            m = m + 1
            if node.childs and node.childs[c] then
                local nd = node.childs[c]
                if nd.isEnd then
                    return { s= nd.str,id = nd.id }
                end
                table.insert(_poss,nd)
            end
        end
        poss = _poss
    end
    return nil
end

return WordTree