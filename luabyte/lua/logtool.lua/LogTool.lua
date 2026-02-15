LogTool = {}

local pt = require("PrintTable")
--- 该方法仅在开发环境使用，请勿提交到远端
--- @param tag string
--- @param msg string
--- @param ... any
function LogTool.Debug(tag, msg, ...)
    local str = ": [Debug] (" .. tag .. ") " .. msg
    for i = 1, select('#', ...) do
        local arg = select(i, ...)
        if arg then 
            str = str .. pt.block(arg)
        else
            str = str .. "nil"
        end
    end
    Debugger.Log(str)
end

--- @param tag string
--- @param msg string
--- @param ... any
function LogTool.InfoNet(tag, msg, ...)
    local str = ": [InfoNet] (" .. tag .. ") " .. msg
    for i = 1, select('#', ...) do
        local arg = select(i, ...)
        if arg then 
            str = str .. pt.block(arg)
        else
            str = str .. "nil"
        end
    end
    Debugger.Log(str)
end

--- @param tag string
--- @param msg string
--- @param ... any
function LogTool.Info(tag, msg, ...)
    local str = ": [Info] (" .. tag .. ") " .. msg
    for i = 1, select('#', ...) do
        local arg = select(i, ...)
        if arg then 
            str = str .. pt.block(arg)
        else
            str = str .. "nil"
        end
    end
    Debugger.Log(str)
end

--- @param tag string
--- @param msg string
--- @param ... any
function LogTool.Warning(tag, msg, ...)
    local str = ": [Warning] (" .. tag .. ") " .. msg
    for i = 1, select('#', ...) do
        local arg = select(i, ...)
        if arg then 
            str = str .. pt.block(arg)
        else
            str = str .. "nil"
        end
    end
    Debugger.LogWarning(str)
end

--- @param tag string
--- @param msg string
--- @param ... any
function LogTool.Error(tag, msg, ...)
    local stackInfo = debug.getinfo(2)
    local stackStr = "[" .. stackInfo.short_src .. "." .. stackInfo.what .. ":" .. stackInfo.currentline .. "]"
    local str = stackStr .. ": [Error] (" .. tag .. ") " .. msg
    for i = 1, select('#', ...) do
        local arg = select(i, ...)
        if arg then 
            str = str .. pt.block(arg)
        else
            str = str .. "nil"
        end
    end
    str = str .. "\n" .. debug.traceback()
    Debugger.LogError(str)
end

return LogTool
