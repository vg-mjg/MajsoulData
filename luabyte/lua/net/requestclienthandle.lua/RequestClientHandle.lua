require("ProtoMgr")
require("TimeMgr")
local pt = require("PrintTable")

-- rpc 等待回包
RequestWaitingEvent = {
    service = nil;
    method = nil;
    index = -1;
    requestTime = 0;
    callback = nil;
 }

function RequestWaitingEvent.New(o)
    return setmetatable(o or { }, { __index = RequestWaitingEvent });
end


RequestClientHandle = { }

function RequestClientHandle:New() 
    local o = setmetatable({}, {__index = RequestClientHandle});
    o:Init();
    return o;
end

function RequestClientHandle:Init()
    self.waitingData = {}    -- index为下标的map map<index, RequestWaitingEvent>
    self.delayLst = {}       -- 计算延迟队列 list<delay, timestamp>
    self.checkArray = {}     -- 等待队列，计算超时 list<timeout, index>
    self._delay = 0
    self.timerMgr = TimerMgr:Init()
    
    self.timerMgr:Loop(0.5, -1, function()
        self:Loop()
    end)
end

function RequestClientHandle:Clear()
    self.waiting_data = {}
    self.delayLst = {}
    self.checkArray = {}
    self.timerMgr:ClearAllTimers()
    self._delay = 0
    self.timerMgr:Loop(0.5, -1, function()
        self:Loop()
    end)
end

function RequestClientHandle:AddNewWaiting(service, method, index, callback)
    local waiting_data = RequestWaitingEvent.New()
    waiting_data.service = service;
    waiting_data.method = method
    waiting_data.index = index
    waiting_data.requestTime = UnityEngine.Time.time
    waiting_data.callback = callback
    self.waitingData[index] = waiting_data
    table.insert(self.checkArray, index)
end

function RequestClientHandle:ReceiveResponse(index, data)
    local waiting_data = self.waitingData[index]
    if not waiting_data then
        return
    end
    self.waitingData[index] = nil
    local now = UnityEngine.Time.time
    table.insert(self.delayLst, {
        delay = now - waiting_data.requestTime;
        timestamp = now;
    });
    local method_config = ProtoMgr.GetMethod(waiting_data.service, waiting_data.method);
    local _msg = ProtoMgr.CreateMsg(method_config.response)
    _msg:ParseFromString(data)
    LogTool.InfoNet("Response", '接收到业务请求返回, Service Name: ' .. waiting_data.service .. ', Method Name: ' .. waiting_data.method .. ', Msg: ' .. pt.block(_msg))
    waiting_data.callback(nil, _msg)
end
local json = require('cjson')

--观战消息的回调方法
function RequestClientHandle:ReceiveResponseOB(index, data)
    local waiting_data = self.waitingData[index]
    if not waiting_data then
        return
    end
    self.waitingData[index] = nil
    local now = UnityEngine.Time.time
    table.insert(self.delayLst, {
        delay = now - waiting_data.requestTime;
        timestamp = now;
    });
    waiting_data.callback(nil, data)
end

function RequestClientHandle:Loop() 
    local delay0 = self:CalcuPreResponseDelay();
    local delay1 = self:CheckWaitingResponse();
    local _delay = 0;
    local _count = 0;
    -- 两秒内的回包的延迟参考和等待回包的延迟参考的加权平均
    if delay0 >= 0 then
        _delay = _delay + delay0 * 0.3
        _count = _count + 0.3
    end
    if delay1 >= 0 then
        _delay = _delay + delay1
        _count = _count + 1
    end
    if _count > 0 then
        _delay = _delay / _count
        self._delay = _delay
    end
end

-- 计算近两秒内所有通信的平均延迟
function RequestClientHandle:CalcuPreResponseDelay()
    local now = UnityEngine.Time.time
    local delay_total = 0;
    local count = 0;
    local invalid_count = 0;
    for i = 1, #self.delayLst do
        local d = self.delayLst[i]
        if d.timestamp + 2 < now then
            invalid_count = invalid_count + 1
        else
            delay_total = delay_total + d.delay
            count = count + 1
        end
    end
    if invalid_count > 0 then
        for i = 1, invalid_count do
            table.remove(self.delayLst, 1)
        end
    end
    if count > 0 then
        return delay_total / count
    else
        return -1
    end
end

-- 计算等待中的回包延迟，触发超时事件
function RequestClientHandle:CheckWaitingResponse() 
    local now = UnityEngine.Time.time
    local count = 0
    local waiting_time = -1
    for i = 1, #self.checkArray do
        local index = self.checkArray[i]
        if not self.waitingData[index] then
            count = count + 1
        else
            local data = self.waitingData[index]
            if now < data.requestTime + 10 then
                -- 还没超时
                if waiting_time < 0 then
                    waiting_time = now - data.requestTime;
                end
                break;
            else 
                count = count + 1
                self.waitingData[index] = nil;
                waiting_time = 2;
                table.insert(self.delayLst, {
                    delay = 10;
                    timestamp = now;
                });
                if data.callback then
                    data.callback('TIMEOUT', nil);
                end
            end
        end
    end
    if count > 0 then
        for i = 1, count do
            table.remove(self.checkArray, 1)
        end
    end
    return waiting_time
end

return RequestClientHandle
