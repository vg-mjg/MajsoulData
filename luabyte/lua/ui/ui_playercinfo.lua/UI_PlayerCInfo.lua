require "UI.UI_PlayerTitle"
require "UI.UI_Name"
require "UI.UI_RankIcon"
UI_PlayerCInfo = {}
local pt = require("PrintTable")
local json = require("cjson")
local GameMode = GameUtility.EMjCategory
local EMjMode = GameUtility.EGameCategory

UI_PlayerCInfo.color = {{96/255,132/255,176/255},{73/255,105/255,144/255}}
function UI_PlayerCInfo:Init(root)
    local o = {}
    setmetatable(o,self)
    self.__index = self
    o:Build(root)
    -- self.target_id = account_id
    return o
end

function UI_PlayerCInfo:Build(root)
    self.root = root
    self.timer = TimerMgr:Init()
    self.page_controller = {}
    self.account_data = {}
    self.target_id = 0
    self.inititems = {}
    self:_Init()

    --todo:之后拉一个典型来换成getstringwidth
    if GameMgr.Inst.prefer_language == 'en' then
        self.slash_width = 28
    else
        self.slash_width = 20
    end
end

function UI_PlayerCInfo:InitInfoData(res,target_id,account_data,game_mode,type_mode,name_service_type)
    self.statistic_data = res.statistic_data
    self.detail_data = res.detail_data
    self.target_id = target_id
    game_mode = game_mode or GameMode.Liqi4
    if account_data or target_id ~= GameMgr.Inst.account_id then
        self.account_data = account_data
    else
        self.account_data = GameMgr.Inst.account_data
    end
    self:SetTopInfo(name_service_type)
    type_mode = type_mode or 1
    self:SetInfo(game_mode,EMjMode.matching,type_mode)
    self:SetDetailInfo(game_mode,EMjMode.matching,type_mode)
end

function UI_PlayerCInfo:Show()
    self.root.transform.gameObject:SetActive(true)
end

function UI_PlayerCInfo:SetTopInfo(name_service_type)
    -- rank
    local levelid = {}
    if self.game_mode == GameMode.Liqi4 then
        if not self.account_data.level.id or  self.account_data.level.id == 0 then
            levelid = 10101
        else
            levelid = self.account_data.level.id
        end
        self.root.txt_expvalue.text = self.account_data.level.score
    else
        if not self.account_data.level3.id or self.account_data.level3.id == 0 then
            levelid = 20101
        else
            levelid = self.account_data.level3.id
        end
        self.root.txt_expvalue.text = self.account_data.level3.score
    end
    if name_service_type then
        self.root.container_name.name_service_type = name_service_type
    end

    self.root.container_name:SetName(self.account_data.nickname,
        self.account_data.account_id,
        self.account_data.verified,
        self.account_data.avatar_id)

    
    local data = {}
    local path= 'pic/' .. ExcelMgr.GetData('level_definition', 'level_definition', levelid).primary_icon
    local index = string.find(path, "%.") - 1
    path = string.sub(path, 1, index)
    data=ExcelMgr.GetData('level_definition', 'level_definition', levelid).secondary_level
    self.rank = UI_RankIcon:Init(self.root.rank)
    if self.game_mode == GameMode.Liqi4 then
        self.rank:Show(self.account_data.level)
    else
        self.rank:Show(self.account_data.level3)
    end
    self.root.txt_expmax.text=ExcelMgr.GetData('level_definition', 'level_definition', levelid).end_point
    self.root.expbar.transform:SetRectPos((1-self.root.txt_expvalue.text/self.root.txt_expmax.text)*(-155),0)
    if Tools.IsCelestial(levelid) then
        self.root.exp.transform.gameObject:SetActive(false)
    else
        self.root.exp.transform.gameObject:SetActive(levelid ~= 10601 and levelid ~= 20601 )
    end
    -- self.rank:SetValue(self.root.txt_expvalue.text)
    --self.root.expbar.fillAmount = self.root.txt_expvalue.text/self.root.txt_expmax.text/2
    -- title
    local title = UI_PlayerTitle:Init(self.root.title)
    title:SetId(Tools.TitleLocalization(self.account_data.account_id, self.account_data.title))
end
--mj_category: 2 三麻 1 四麻
--game_category： 2 匹配 1 友人
--type: 100 活动
function UI_PlayerCInfo:RefreshData(mj_category,game_category,type)
    type = type or 1
    self:SetInfo(mj_category,game_category,type)
    self:SetDetailInfo(mj_category,game_category,type)
end

function UI_PlayerCInfo:SetInfo(mj_category,game_category,type)
    self:StopAnim()
    -- dahe/title
    self.game_mode = mj_category
    self:SetTopInfo()
    local data = {}
    
    if self.statistic_data then
        for i=1,#self.statistic_data do
            local d = self.statistic_data[i]
            if mj_category == d.mahjong_category and game_category == d.game_category and type == d.game_type then
                data = d.statistic
            end
        end
    end
    local data_str = data.title
    -- dahe/hand
    if not data.highest_hu or data.highest_hu.hupai=="" then
        self.root.container_hand.gameObject:SetActive(false)
        self.root.label_noinfo.gameObject:SetActive(true)
        self.root.container_title.transform.gameObject:SetActive(false)
        self.root.container_title_en.transform.gameObject:SetActive(false)
    else
        self.root.container_hand.gameObject:SetActive(true)
        self.root.label_noinfo.gameObject:SetActive(false)
        local nodeindex=0
        local pos=nil
        local t=nil
        -- 初始化
        for i=0,self.root.container_hand.childCount-1 do
            t=self.root.container_hand:GetChild(i)
            t.gameObject:SetActive(false)
        end
        self.root.container_hand:SetLocalScale(0.65,0.65,1)
        self:ShowHand(data.highest_hu)
        self:SetTitle(data.highest_hu)
    end
    -- fengge  攻 速 防 运
    local fengge={0,0,0,0}
    local data_feng =data.recent_20_hu_summary
    if data_feng and data_feng.total_count>0 then
        local v = 0
        if self.game_mode == GameMode.Liqi4 then
            v=(data_feng.average_hu_point-3000)/5000*100
        else
            v=(data_feng.average_hu_point-4000)/8000*100
        end
        if(v<0)then
            v=0
        elseif v>100 then
            v=100
        end
        fengge[1]=math.floor( v )
    end
    data_feng= data.recent_round
    if data_feng and data_feng.total_count>0 then
        if(data_feng.rong_count+data_feng.zimo_count==0)then
            fengge[2]=0
        else
            fengge[2]=((data_feng.rong_count+data_feng.zimo_count)/data_feng.total_count-0.1)/0.3*100
            fengge[2]=math.floor(fengge[2])
            if(fengge[2]<0)then
                fengge[2]=0
            elseif fengge[2]>100 then
                fengge[2]=100
            end
        end
        local v=(1.12-(data_feng.fangchong_count/data_feng.total_count*3.4))*100
        if(v<0)then
            v=0
        elseif v>100 then
            v=100
        end
        fengge[3]=math.floor( v )
    end
    data_feng=data.recent_10_hu_summary
    if(data_feng and data_feng.total_fanshu>0)then
        local v=data_feng.total_xuanshang/data_feng.total_fanshu*1.5*100
        if(v<0)then
            v=0
        elseif v>100 then
            v=100
        end
        fengge[4]=math.floor( v )
    end
    self:ChangePoint(self.root.txt_gong,fengge[1])
    self:ChangePoint(self.root.txt_su,fengge[2])
    self:ChangePoint(self.root.txt_fang,fengge[3])
    self:ChangePoint(self.root.txt_yun,fengge[4])
    -- todo 雷达
    if self.radar==nil then
        self.radar=UIMgr.Inst:CreateUI('UI_Radar', self.root.radarpos)
        self.radar.transform.gameObject:SetActive(true)
        local per=self.root.radarpos.sizeDelta.x/self.radar.transform.sizeDelta.x
        self.radar.transform:SetLocalScale(per, per, 1)
    end
    self.radar:SetRadar(fengge[1]/100*5,fengge[4]/100*5,fengge[3]/100*5,fengge[2]/100*5)
    -- zoushi
    local nodeindex=0
    local pos=nil
    local t=nil
    local line=nil
    for i=0,self.root.points.childCount-1 do
        t=self.root.points:GetChild(i)
        t.gameObject:SetActive(false)
    end
    for i=0,self.root.lines.childCount-1 do
        t=self.root.lines:GetChild(i)
        t.gameObject:SetActive(false)
    end
    self.nodelist = {}
    self.linelist = {}
    self.root.line4.transform.gameObject:SetActive(self.game_mode == GameMode.Liqi4)
    self.root.lb4.transform.gameObject:SetActive(self.game_mode == GameMode.Liqi4)
    if data.recent_10_game_result then
        for i=1,#data.recent_10_game_result do
            t=self.root.points:GetChild(nodeindex)
            table.insert(self.nodelist,t)
            local highpoint = false
            if self.game_mode == GameMode.Liqi4 then
                if data.recent_10_game_result[i].rank == 1 and data.recent_10_game_result[i].final_point >= 50000 then
                    highpoint = true
                end
            else
                if data.recent_10_game_result[i].rank == 1 and data.recent_10_game_result[i].final_point >= 70000 then
                    highpoint = true
                end
            end
            if highpoint == true then
                LuaTools.SetImageTexture(t:GetComponent(typeof(UnityEngine.UI.Image)),'pic/myres/point_high')
            else
                LuaTools.SetImageTexture(t:GetComponent(typeof(UnityEngine.UI.Image)),'pic/myres/point')
            end
            t:GetComponent(typeof(UnityEngine.UI.Image)):SetNativeSize()
            pos=t.localPosition
            pos.y=self.zoushipos[data.recent_10_game_result[i].rank]
            t.localPosition = pos;
            if(i>=2)then
                line=self.root.lines:GetChild(nodeindex-1)
                table.insert(self.linelist,line.transform:GetComponent(typeof(UnityEngine.UI.Image)))
                line.localPosition=pos
                local x=t.localPosition.x-self.root.points:GetChild(nodeindex-1).localPosition.x
                local y=t.localPosition.y-self.root.points:GetChild(nodeindex-1).localPosition.y
                line:SetSize(math.sqrt(x * x + y * y),line.sizeDelta.y)
                line.localRotation = Quaternion.Euler(0, 0, 180+math.atan(y / x) * 180 / math.pi)
            end
            nodeindex=nodeindex+1
        end
    end
    self:ShowZoushi()
end
function UI_PlayerCInfo:InitFanTemp(i, is_guyi, is_end)
    is_guyi = is_guyi or false
    local t = {}
    local t = self.yi_pool[1]
    table.remove(self.yi_pool, 1)
    table.insert(self.inititems, t)
    if is_guyi then
        t.transform:SetParent(self.root.fandetail_guyi)
    else
        t.transform:SetParent(self.root.fandetail)
    end
    t.transform:SetPos(0, self.cached_yi_height * (1 - i))
    t.transform.gameObject:SetActive(true)
    if is_guyi then
        self.root.fandetail_guyi:SetSize(self.root.fandetail_guyi.sizeDelta.x, t.transform.sizeDelta.y * i)
    else
        self.root.fandetail:SetSize(self.root.fandetail.sizeDelta.x, t.transform.sizeDelta.y * i)
    end
    return t
end
function UI_PlayerCInfo:SetDetailInfo(mj_category,game_category,type)
    for i=1,#self.inititems do
        table.insert(self.yi_pool, self.inititems[i])
        self.inititems[i].transform.gameObject:SetActive(false)
    end
    self.inititems = {}
    
    if self.detail_data then
        local detail_data=nil
        if type == 100 then
            -- detail_data = self.detail_data.activity_match_statistic

            --合并四种活动场数据
            -- local detail_statistic = {
            --     game_mode = {},
            --     fan = {},
            --     liujumanguan = 0,
            --     fan_achieved = {}
            -- }

            local _activity_match_statistic = self.detail_data.activity_match_statistic
            local _season_statistic = self.detail_data.challenge_match_statistic.all_season
            local _ab_match_statistic = self.detail_data.ab_match_statistic
            local _leisure_match_statistic = self.detail_data.leisure_match_statistic

            local mixed = {
                _activity_match_statistic,
                _season_statistic,
                _ab_match_statistic,
                _leisure_match_statistic
            }

            detail_data = self:MixData(mixed)
        else
            if(game_category==1)then
                detail_data = self.detail_data.friend_room_statistic --友人
            elseif game_category==2 then
                detail_data = self.detail_data.rank_statistic.total_statistic.all_level_statistic
            elseif game_category == 3 then
                detail_data = self.detail_data.activity_match_statistic
            end
        end
        for modei=1,2 do
            local mode
            if detail_data then
                if mj_category == GameMode.Liqi4 then
                    if modei == 1 then
                        mode = 1
                    elseif modei == 2 then
                        mode = 2
                    end
                    self.container_modes[modei].pos4.transform.gameObject:SetActive(true)
                    self.container_modes[modei].knockout.transform:SetRectPos(self.container_modes[modei].pos2.transform.anchoredPosition.x,-66.5)
                elseif mj_category == GameMode.Liqi3 then
                    if modei == 1 then
                        mode = 11
                    elseif modei == 2 then
                        mode = 12
                    end
                    self.container_modes[modei].pos4.transform.gameObject:SetActive(false)
                    self.container_modes[modei].knockout.transform:SetRectPos(self.container_modes[modei].pos2.transform.anchoredPosition.x,-23.5)
                end
                local container_mode=self.container_modes[modei]
                container_mode.pos1.text= '--/--'
                container_mode.pos2.text= '--/--'
                container_mode.pos3.text= '--/--'
                container_mode.pos4.text= '--/--'
                container_mode.knockout.text= '--/--'
                container_mode.changci.text= '--/--'
                container_mode.shunwei.text= '--/--'
                container_mode.hupai.text 		= '--/--'
                container_mode.fangchong.text 	= '--/--'
                container_mode.fulu.text 		= '--/--'
                container_mode.liqi.text 		= '--/--'
                container_mode.dadian.text = '--/--'
                container_mode.zimo.text	= '--/--'
                container_mode.hule.text = '--/--'
                container_mode.lianzhuang.text = '--/--'
                for i=1,#detail_data.game_mode do
                    local __data=detail_data.game_mode[i]
                    if(__data.mode == mode)then
                        local game_count_sum=__data.game_count_sum
                        if(game_count_sum>0)then
                            container_mode.pos1.text= string.format( "%.2f",(__data.game_final_position[1] / game_count_sum * 100) ) .. '%';
                            container_mode.pos2.text= string.format( "%.2f",(__data.game_final_position[2] / game_count_sum * 100) ) .. '%';
                            container_mode.pos3.text= string.format( "%.2f",(__data.game_final_position[3] / game_count_sum * 100) ) .. '%';
                            container_mode.pos4.text= string.format( "%.2f",(__data.game_final_position[4] / game_count_sum * 100) ) .. '%';
                            container_mode.knockout.text= string.format( "%.2f",(__data.fly_count / game_count_sum * 100) ) .. '%';
                            container_mode.changci.text= game_count_sum
                            local shunwei=0
                            for j=1,4 do
                                shunwei = shunwei+j * __data.game_final_position[j];
                            end
                            container_mode.shunwei.text= string.format( "%.2f",(shunwei / game_count_sum) ) ;
                        else
                            container_mode.pos1.text= '--/--';
                            container_mode.pos2.text= '--/--';
                            container_mode.pos3.text= '--/--';
                            container_mode.pos4.text= '--/--';
                            container_mode.knockout.text= '--/--';
                            container_mode.changci.text= game_count_sum;
                            container_mode.shunwei.text= '--/--';
                        end
                        local count_ju= 0;
                        local count_hu= 0;
                        local count_zimo= 0;
                        local count_fangchong= 0;
                        if (__data.round_end) then
                            for j= 1,#__data.round_end do
                                count_ju =count_ju+ __data.round_end[j].sum;
                                local __type = __data.round_end[j].type;
                                if (__type == 2)then--mjcore.E_Round_Result.zimo2
                                    count_zimo =count_zimo+ __data.round_end[j].sum;
                                end
                                if (__type == 3 or  __type == 2) then  --mjcore.E_Round_Result.rong3  mjcore.E_Round_Result.zimo2
                                    count_hu =count_hu+ __data.round_end[j].sum;
                                elseif (__type == 4) then--mjcore.E_Round_Result.fangchong 4
                                    count_fangchong =count_fangchong+ __data.round_end[j].sum;
                                end
                            end
                        end
                        if (count_ju > 0) then
                            container_mode.hupai.text 		= string.format( "%.2f", (count_hu / count_ju * 100)) .. '%';
                            container_mode.fangchong.text 	= string.format( "%.2f", (count_fangchong / count_ju * 100)) .. '%';
                            container_mode.fulu.text 		= string.format( "%.2f", (__data.ming_count_sum / count_ju * 100)) .. '%';
                            container_mode.liqi.text 		= string.format( "%.2f", (__data.liqi_count_sum / count_ju * 100)) .. '%';

                        else
                            container_mode.hupai.text 		= '--/--';
                            container_mode.fangchong.text 	= '--/--';
                            container_mode.fulu.text 		= '--/--';
                            container_mode.liqi.text 		= '--/--';
                        end
                        if (count_hu > 0) then
                            container_mode.dadian.text = math.floor(__data.dadian_sum / count_hu + 0.5)
                            container_mode.zimo.text	= string.format( "%.2f",(count_zimo / count_hu * 100) ) .. '%';
                            container_mode.hule.text = string.format( "%.2f", (__data.xun_count_sum / count_hu))
                        else
                            container_mode.dadian.text = '--/--';
                            container_mode.zimo.text	= '--/--';
                            container_mode.hule.text = '--/--';
                        end
                        if __data.highest_lianzhuang then
                            container_mode.lianzhuang.text = __data.highest_lianzhuang;
                        else
                            container_mode.lianzhuang.text = '--/--';
                        end
                    end
                end
            end
        end
        
        self:InitFan(detail_data,mj_category,game_category,type,false)
        self:InitFan(detail_data,mj_category,game_category,type,true)
        
        local is_duanwei = type ~= 100 and game_category == 2
        self.root.fan_guyi.gameObject:SetActive(not is_duanwei) -- 段位场不显示古役
    end
    self:RefreshContentPos(type == 100,mj_category == GameMode.Liqi4)
end

function UI_PlayerCInfo:InitGameModeData(mode)
    local game_mode = {}

    game_mode.mode = mode
    game_mode.game_count_sum = 0
    game_mode.game_final_position = {}
    game_mode.fly_count = 0
    game_mode.gold_earn_sum = 0
    game_mode.round_count_sum = 0
    game_mode.dadian_sum = 0
    game_mode.round_end = {}
    game_mode.ming_count_sum = 0
    game_mode.liqi_count_sum = 0
    game_mode.xun_count_sum = 0
    game_mode.highest_lianzhuang = 0
    game_mode.score_earn_sum = 0
    game_mode.rank_score = {}

    return game_mode
end

function UI_PlayerCInfo:MixData(datas)
    
    local fan_achieved = {}
    table.insert(fan_achieved, {
        mahjong_category = 1,
        fan = {},
        liujumanguan = 0
    })
    table.insert(fan_achieved, {
        mahjong_category = 2,
        fan = {},
        liujumanguan = 0
    })
    
    local detail_statistic = {
        game_mode = {},
        fan = {},
        liujumanguan = 0,
        fan_achieved = fan_achieved
    }


    local game_mode_map = {}

    --重新拼msg结构:AccountStatisticByGameMode
    for i=1,#datas do
        --region
        if datas[i].game_mode then
            for gm_index = 1,#datas[i].game_mode do
                local _src_data = datas[i].game_mode[gm_index]

                local _dst_data = {}
                if not game_mode_map[_src_data.mode] then
                    _dst_data = self:InitGameModeData(_src_data.mode)
                    game_mode_map[_src_data.mode] = _dst_data
                    table.insert(detail_statistic.game_mode,_dst_data)
                else
                    _dst_data = game_mode_map[_src_data.mode]
                end

                
                local game_count_sum = 0
                if _src_data.game_count_sum then
                    game_count_sum = _src_data.game_count_sum
                end
                _dst_data.game_count_sum = _dst_data.game_count_sum + game_count_sum

                local fly_count = 0
                if _src_data.fly_count then
                    fly_count = _src_data.fly_count
                end
                _dst_data.fly_count = _dst_data.fly_count + fly_count

                local gold_earn_sum = 0
                if _src_data.gold_earn_sum then
                    gold_earn_sum = _src_data.gold_earn_sum
                end
                _dst_data.gold_earn_sum = _dst_data.gold_earn_sum + gold_earn_sum

                local round_count_sum = 0
                if _src_data.round_count_sum then
                    round_count_sum = _src_data.round_count_sum
                end
                _dst_data.round_count_sum = _dst_data.round_count_sum + round_count_sum

                local dadian_sum = 0
                if _src_data.dadian_sum then
                    dadian_sum = _src_data.dadian_sum
                end
                _dst_data.dadian_sum = _dst_data.dadian_sum + dadian_sum

                local ming_count_sum = 0
                if _src_data.ming_count_sum then
                    ming_count_sum = _src_data.ming_count_sum
                end
                _dst_data.ming_count_sum = _dst_data.ming_count_sum + ming_count_sum

                local liqi_count_sum = 0
                if _src_data.liqi_count_sum then
                    liqi_count_sum = _src_data.liqi_count_sum
                end
                _dst_data.liqi_count_sum = _dst_data.liqi_count_sum + liqi_count_sum

                local xun_count_sum = 0
                if _src_data.xun_count_sum then
                    xun_count_sum = _src_data.xun_count_sum
                end
                _dst_data.xun_count_sum = _dst_data.xun_count_sum + xun_count_sum

                local highest_lianzhuang = 0
                if _src_data.highest_lianzhuang then
                    highest_lianzhuang = _src_data.highest_lianzhuang
                end
                _dst_data.highest_lianzhuang = _dst_data.highest_lianzhuang + highest_lianzhuang

                local score_earn_sum = 0
                if _src_data.score_earn_sum then
                    score_earn_sum = _src_data.score_earn_sum
                end
                _dst_data.score_earn_sum = _dst_data.score_earn_sum + score_earn_sum

                if _src_data.game_final_position then
                    for j=1,#_src_data.game_final_position do
                        if not _dst_data.game_final_position[j] then
                            _dst_data.game_final_position[j] = 0
                        end
                        local final_position = _src_data.game_final_position[j] or 0
                        _dst_data.game_final_position[j] = _dst_data.game_final_position[j] + final_position
                    end
                end

                if _src_data.round_end then
                    for j=1,#_src_data.round_end do
                        local new_data = true
                        for count = 1,#_dst_data.round_end do
                            if _dst_data.round_end[count].type == _src_data.round_end[j].type then
                                _dst_data.round_end[count].sum = _dst_data.round_end[count].sum + _src_data.round_end[j].sum
                                new_data = false
                            end
                        end
                        if new_data then
                            local d ={
                                type = _src_data.round_end[j].type,
                                sum = _src_data.round_end[j].sum
                            }
                            table.insert(_dst_data.round_end,d)
                        end
                    end
                end

                if _src_data.rank_score then
                    for j=1,#_src_data.rank_score do
                        local new_data = true
                        for count = 1,#_dst_data.rank_score do
                            if _dst_data.rank_score[count].rank == _src_data.rank_score[j].rank then
                                _dst_data.rank_score[count].count = _dst_data.rank_score[count].count + _src_data.rank_score[j].count
                                _dst_data.rank_score[count].score_sum = _dst_data.rank_score[count].score_sum + _src_data.rank_score[j].score_sum
                                new_data = false
                            end
                        end
                        if new_data then
                            local d ={
                                rank = _src_data.rank_score[j].rank,
                                count = _src_data.rank_score[j].count,
                                score_sum =  _src_data.rank_score[j].score_sum
                            }
                            table.insert(_dst_data.rank_score,d)
                        end
                    end
                end
            end
        end
        --endregion

        if datas[i].fan then
            for j=1,#datas[i].fan do
                local new_data = true
                for k=1,#detail_statistic.fan do
                    if detail_statistic.fan[k].fan_id == datas[i].fan[j].fan_id then
                        local sum = datas[i].fan[j].sum or 0
                        detail_statistic.fan[k].sum = detail_statistic.fan[k].sum + sum
                        new_data = false
                    end
                end
                if new_data then
                    table.insert( detail_statistic.fan,{
                        fan_id = datas[i].fan[j].fan_id,
                        sum = datas[i].fan[j].sum
                    })
                end
            end
        end

        local _liujumanguan = 0
        if datas[i].liujumanguan then
            _liujumanguan = datas[i].liujumanguan
        end

        detail_statistic.liujumanguan = detail_statistic.liujumanguan + _liujumanguan

        --判断是否有番种达成记录
        if datas[i].fan_achieved then
            --遍历番种达成记录
            for j=1,#datas[i].fan_achieved do
                --遍历已有达成记录里面的番种达成记录
                for k=1,#detail_statistic.fan_achieved do
                    --判断是否同属于四人或三人麻将
                    if detail_statistic.fan_achieved[k].mahjong_category == datas[i].fan_achieved[j].mahjong_category then
                        --加上流局满贯的达成数量
                        detail_statistic.fan_achieved[k].liujumanguan = detail_statistic.fan_achieved[k].liujumanguan + datas[i].fan_achieved[j].liujumanguan

                        --遍历番种达成记录里面的番
                        for q = 1, #datas[i].fan_achieved[j].fan do
                            local already_have = false
                            --遍历已有番种达成记录里面的番
                            for p=1,#detail_statistic.fan_achieved[k].fan do
                                if datas[i].fan_achieved[j].fan[q].fan_id == detail_statistic.fan_achieved[k].fan[p].fan_id then
                                    already_have = true

                                    local sum = datas[i].fan_achieved[j].fan[q].sum or 0
                                    detail_statistic.fan_achieved[k].fan[p].sum = detail_statistic.fan_achieved[k].fan[p].sum + sum
                                end
                            end

                            if not already_have then
                                local _fan = {
                                    fan_id = datas[i].fan_achieved[j].fan[q].fan_id,
                                    sum = datas[i].fan_achieved[j].fan[q].sum
                                }
                                table.insert(detail_statistic.fan_achieved[k].fan, _fan)
                            end
                        end
                    end
                end
            end
        end
    end
    

    return detail_statistic

end

--mj_category: 2 三麻 1 四麻
--game_category： 2 匹配 1 友人
--type: 100 活动
function UI_PlayerCInfo:InitFan(detail_data,mj_category,game_category,type,is_guyi)
    
    local fantable = ExcelMgr.GetTable('fan','fan')
    local skip = false
    local items = {}
    local type_range2 = GameUtility.EPlayerInfoType.matching -- 默认段位
    if type == 100 then
        type_range2 = GameUtility.EPlayerInfoType.activity -- 活动
    else
        if game_category == 2 then
            type_range2 = GameUtility.EPlayerInfoType.matching -- 段位
        else
            type_range2 = GameUtility.EPlayerInfoType.friend_room -- 友人
        end
    end


    for key,value in pairs(fantable) do
        -- skip = false
        -- if value.is_guyi == 2 then skip = true end
        -- if (value.is_guyi == 1 and not is_guyi) then skip = true end
        -- if (value.is_guyi ~= 1 and is_guyi) then skip = true end
        -- if (value.id == 46) then skip = true end
        -- if (value.id == 801) and (game_category == 2 and type ~= 100) then skip = true end
        -- if (value.id == 802) and (game_category == 2 and type ~= 100) then skip = true end
        -- if value.id == 34 and mj_category == GameMode.Liqi4 then skip = true end
        -- if (value.id == 17 and mj_category == GameMode.Liqi3) then skip = true end
        -- if(value.id == 62 and mj_category == GameMode.Liqi3) then skip = true end
        -- -- 人和满贯 合并到 人和 59 天和前插入，

        skip = Tools.check_fan_skip(value,mj_category,is_guyi,type_range2)
        if not skip then
            local txt
            if value.id == 35 then -- 特殊：流局满贯,借用天和的数据，在天和前插入
                local _t = self:InitFanTemp(#items+1,is_guyi)
                table.insert(items,{trans = _t,id = -1,count = 0})
                _t.transform.gameObject:SetActive(true)
                _t.fan.text=Tools.StrOfLocalization(2154)
                _t.count.text = 0

                local width1 = LuaTools.GetStringWidth(_t.fan,Tools.StrOfLocalization(2154))
                local str = ''
                txt = _t.node
                for i=1,50 do
                    local width2 = i * self.slash_width
                    if width1 + width2 <= 750 then
                        str = str .. '-'
                    end
                end
                txt.text = str
                -- kr字体大小不一致 换成SimHei
                if GameMgr.Inst.prefer_language == 'kr' then
                    txt.font = LuaTools.LoadFont(Tools.FontOfLocalization('SimHei'))
                end
            end
            local t = self:InitFanTemp(#items+1,is_guyi)
            table.insert(items,{trans = t,id = value.id,count = 0})
            t.transform.gameObject:SetActive(true)
            t.fan.text=value['name_'..GameMgr.Inst.prefer_language]
            local width1 = LuaTools.GetStringWidth(t.fan, value['name_'..GameMgr.Inst.prefer_language])
            local str = ''
            txt = t.node
            for i=1,50 do
                local width2 = i * self.slash_width
                if width1 + width2 <= 750 then
                    str = str .. '-'
                end
            end
            txt.text = str
            t.count.text = 0
            -- kr字体大小不一致 换成SimHei
            if GameMgr.Inst.prefer_language == 'kr' then
                txt.font = LuaTools.LoadFont(Tools.FontOfLocalization('SimHei'))
            end
        end
    end
    local dd = {}
    for i = 1,#detail_data.fan_achieved do
        if detail_data.fan_achieved[i].mahjong_category == mj_category then
            dd = detail_data.fan_achieved[i]
        end
    end
    if dd then
        if(dd.fan)then
            for i=1,#dd.fan do
                local skip = false
                for j = 1,#items do
                    if not skip then
                        if items[j].id == dd.fan[i].fan_id then
                            local t = items[j].trans
                            t.count.text = dd.fan[i].sum
                            skip = true
                        end
                    end
                end
            end
            if dd.liujumanguan ~= nil then
                for j = 1,#items do
                    if items[j].id == -1 then
                        local t = items[j].trans
                        t.count.text = dd.liujumanguan
                    end
                end
            end
            -- 合并 人和 fan id 59 65
            local renhe_sum = 0
            local merge_map = {}
            local sum_map = {}

            for i = 1, #dd.fan do
                local fan_data = dd.fan[i]
                local fan_tbl = ExcelMgr.GetData('fan','fan',fan_data.fan_id)
                local merge_id = fan_tbl.merge_id
                if merge_id and merge_id > 0 then
                    if not merge_map[merge_id] then
                        merge_map[merge_id] = 0
                    end
                    merge_map[merge_id] = merge_map[merge_id] + fan_data.sum
                end
                sum_map[fan_data.fan_id] = fan_data.sum
            end
            for i = 1, #items do
                local fan_item = items[i]
                local ori_sum = sum_map[fan_item.id] or 0
                if merge_map[fan_item.id] then
                    fan_item.trans.count.text = ori_sum + merge_map[fan_item.id]
                end
            end
        end
    end
end
function UI_PlayerCInfo:ShowHand(info)
    local mjp_path = GameMgr.Inst:get_mjp_view()
    local span = self.mjp_width * 0.5
    --显示手牌

    local sort = function(a, b)
        local pai_a = MJPai:Init(a)
        local pai_b = MJPai:Init(b)
        local val_a = pai_a:NumValue() * 10 + Tools.bool2int(not pai_a.dora)
        local val_b = pai_b:NumValue() * 10 + Tools.bool2int(not pai_b.dora)
        return val_a < val_b
    end

    table.sort(info.hands, sort)

    for i = 1, #self.handpais do
        self.handpais[i].gameObject:SetActive(false)
    end
    local current_index = 1
    local current_x = 0
    for i=1,#info.hands do
        local p = info.hands[i]
        Tools.set_ui_mj_material(self.handpais[current_index], string.gsub(p,'[t]',''), mjp_path)
        self.handpais[current_index].transform:SetRectPos(current_x, 0)
        current_x = current_x + self.mjp_width
        self.handpais[current_index].gameObject:SetActive(true)
        current_index = current_index + 1
    end
    if info.ming and #info.ming > 0 then
        current_x = current_x + span
        for i = 1, #info.ming do
            local str_ming = info.ming[i]
            if string.sub(str_ming, -1, -1) ~= ')' then
                --旧版牌谱鸣牌记录
                local _m = Tools.Split(str_ming, '|')
                if #_m == 1 then
                    local s_type = string.sub(_m[1], 2, 2)
                    local s_index = string.sub(_m[1], 1, 1)
                    if s_index == '0' then s_index = '5' end
                    for j = 1, 4 do
                        local skin = ''
                        if j == 1 or j == 4 then
                            skin = 'back'
                        else
                            if j == 2 and s_index =='5' and s_type ~= 'z' then
                                skin = '0'..s_type
                            else
                                skin = s_index..s_type
                            end
                        end
                        Tools.set_ui_mj_material(self.handpais[current_index], skin, mjp_path)
                        self.handpais[current_index].transform:SetRectPos(current_x, 0)
                        current_x = current_x + self.mjp_width
                        self.handpais[current_index].gameObject:SetActive(true)
                        current_index = current_index + 1
                    end
                else
                    for j = 1, #_m do
                        local skin = _m[j]
                        Tools.set_ui_mj_material(self.handpais[current_index], string.gsub(skin,'[t]',''), mjp_path)
                        self.handpais[current_index].transform:SetRectPos(current_x, 0)
                        current_x = current_x + self.mjp_width
                        self.handpais[current_index].gameObject:SetActive(true)
                        current_index = current_index + 1
                    end
                end
            else
                --新版牌谱鸣牌记录
                local s_category = ''
                local _m = ''
                local strLength = Tools.GetStringLength(str_ming)
                for j = 1, strLength do
                    if string.sub(str_ming, j, j) == '(' then
                        s_category = string.sub(str_ming, 1, j - 1)
                        _m = Tools.Split(string.sub(str_ming, j + 1, -2), ',')
                    end
                end
                if s_category == 'angang' then
                    local s_index = string.sub(_m[1], 1, 1)
                    local s_type = string.sub(_m[1], 2, 2)
                    local dora_count = 0
                    for j = 1, #_m do
                        if string.sub(_m[j], 1, 1) == '0' then dora_count = dora_count + 1 end
                    end
                    if dora_count > 0 then s_index = '5' end
                    for j = 1, #_m do
                        local skin = ''
                        if j == 1 or j == 4 then
                            skin = 'back'
                        else
                            if j - 1 <= dora_count then
                                skin = '0'..s_type
                            else
                                skin = s_index .. s_type
                            end
                        end
                        Tools.set_ui_mj_material(self.handpais[current_index], string.gsub(skin,'[t]',''), mjp_path)
                        self.handpais[current_index].transform:SetRectPos(current_x, 0)
                        current_x = current_x + self.mjp_width
                        self.handpais[current_index].gameObject:SetActive(true)
                        current_index = current_index + 1
                    end
                else
                    for j = 1, #_m do
                        local skin = _m[j]
                        Tools.set_ui_mj_material(self.handpais[current_index], string.gsub(skin,'[t]',''), mjp_path)
                        self.handpais[current_index].transform:SetRectPos(current_x, 0)
                        current_x = current_x + self.mjp_width
                        self.handpais[current_index].gameObject:SetActive(true)
                        current_index = current_index + 1
                    end
                end
            end
        end
    end
    --显示胡的牌
    if info.mode ~= 2 then
        current_x = current_x + span
        Tools.set_ui_mj_material(self.handpais[current_index], string.gsub(info.hupai,'[t]',''), mjp_path)
        self.handpais[current_index].transform:SetRectPos(current_x, 0)
        current_x = current_x + self.mjp_width
        self.handpais[current_index].gameObject:SetActive(true)
        current_index = current_index + 1
    end
    --计算缩放比例
    local scale = (0.72 - 0.92) * (current_index - 1 - 14) / (18 - 14) + 0.92
    self.root.container_hand:SetLocalScale(scale*0.65, scale*0.65 , 1)
end

function UI_PlayerCInfo:ShowZoushi()
    for i=1,#self.linelist do
        self.linelist[i].fillAmount=0
        self.linelist[i].transform.gameObject:SetActive(true)
    end
    self:DoDotAnim(1)
end

function UI_PlayerCInfo:SortHand(info)
    local temp = {}
    for i = 1, #info.handpais do
        if string.match(info.handpais[i], '^[0-9][a-z]$') then
            table.insert(temp, info.handpais[i])
        end
    end
    info.handpais = temp
    table.sort(info.handpais, function(a, b) 
        local mjA = MJPai:Init(a)
        local mjB = MJPai:Init(b)
        local dis = MJPai.Distance(mjA, mjB)
        if dis ~= 0 then return dis < 0 end
        return mjA.index < mjB.index
    end)

end
function UI_PlayerCInfo:DoLineAnim(index)
    if self.linelist[index] then
        self.timer:LoopFrame(1,-1,function()
            self.linelist[index].fillAmount = self.linelist[index].fillAmount + 0.2
            if self.linelist[index].fillAmount >= 1 then
                self.timer:ClearAllTimers()
                self:DoDotAnim(index+1)
            end
        end)
    else
        self.timer:ClearAllTimers()
        return
    end
end

function UI_PlayerCInfo:DoDotAnim(index)
    if self.nodelist[index] then
        self.nodelist[index].transform.gameObject:SetActive(true)
        self:DoLineAnim(index)
    else
        self.timer:ClearAllTimers()
        return
    end
end

function UI_PlayerCInfo:StopAnim()
    self.timer:ClearAllTimers()
end
function UI_PlayerCInfo:SetTitle(info)
    local data = {}
    if info.title and info.title ~= '' then
        data.title = info.title
        if data.title == '满贯' then
            data.title_id = GameUtility.E_Dadian_Title.manguan
        elseif data.title == '跳满' then
            data.title_id = GameUtility.E_Dadian_Title.tiaoman
        elseif data.title == '倍满' then
            data.title_id = GameUtility.E_Dadian_Title.beiman
        elseif data.title == '三倍满' then
            data.title_id = GameUtility.E_Dadian_Title.sanbeiman
        elseif data.title == '累积役满' then
            data.title_id = GameUtility.E_Dadian_Title.leijiyiman
        elseif data.title == '役满' then
            data.title_id = GameUtility.E_Dadian_Title.yiman
        elseif data.title == '两倍役满' then
            data.title_id = GameUtility.E_Dadian_Title.yiman2
        elseif data.title == '三倍役满' then
            data.title_id = GameUtility.E_Dadian_Title.yiman3
        elseif data.title == '四倍役满' then
            data.title_id = GameUtility.E_Dadian_Title.yiman4
        elseif data.title == '五倍役满' then
            data.title_id = GameUtility.E_Dadian_Title.yiman5
        elseif data.title == '六倍役满' then
            data.title_id = GameUtility.E_Dadian_Title.yiman6
        end
    end
    if info.title_id and info.title_id ~= 0 then
        data.title_id = info.title_id
        if data.title_id == GameUtility.E_Dadian_Title.manguan then
            data.title = '满贯'
        elseif data.title_id == GameUtility.E_Dadian_Title.tiaoman then
            data.title = '跳满'
        elseif data.title_id == GameUtility.E_Dadian_Title.beiman then
            data.title = '倍满'
        elseif data.title_id == GameUtility.E_Dadian_Title.sanbeiman then
            data.title = '三倍满'
        elseif data.title_id == GameUtility.E_Dadian_Title.leijiyiman then
            data.title = '累积役满'
        elseif data.title_id == GameUtility.E_Dadian_Title.yiman then
            data.title = '役满'
        elseif data.title_id == GameUtility.E_Dadian_Title.yiman2 then
            data.title = '两倍役满'
        elseif data.title_id == GameUtility.E_Dadian_Title.yiman3 then
            data.title = '三倍役满'
        elseif data.title_id == GameUtility.E_Dadian_Title.yiman4 then
            data.title = '四倍役满'
        elseif data.title_id == GameUtility.E_Dadian_Title.yiman5 then
            data.title = '五倍役满'
        elseif data.title_id == GameUtility.E_Dadian_Title.yiman6 then
            data.title = '六倍役满'
        end
    end
    local list = {}
    if data.title and data.title ~= '' then
        self:_SetTitle(data.title)
    else
        self:_SetTitle()
    end
    
end

function UI_PlayerCInfo:_Init()
    self.handpais = {}
    self.notePgs = {}
    for i=1,self.root.container_hand.transform.childCount do
        table.insert(self.handpais,self.root.container_hand:GetChild(i-1).transform:GetComponent(typeof(UnityEngine.UI.RawImage)))
    end
    self.mjp_width = self.handpais[1].rectTransform.rect.width


    self.statistic_data={}
    self.detail_data={}
    self.words={}
    self.wordtopinyin={}
    self.shoupai_spacing = 14
    self.animtime=0.1
    self.animdoing=false
    self.ismode0open=false
    self.ismode1open=false
    self.ismode2open=false
    self.isfanopen=false
    self.isguyifanopen=false
    self.fanmaxindex=50
    self.game_mode = GameMode.Liqi4

        self.words[1]=self.root.img_title0
    self.words[2]=self.root.img_title1
    self.words[3]=self.root.img_title2
    self.words[4]=self.root.img_title3
    self.img_title_en=self.root.img_title_en
    self.wordtopinyin['倍'] = "bei";
    self.wordtopinyin['贯'] = "guan";
    self.wordtopinyin['计'] = "ji";
    self.wordtopinyin['累'] = "lei";
    self.wordtopinyin['两'] = "liang";
    self.wordtopinyin['六'] = "liu";
    self.wordtopinyin['满'] = "man";
    self.wordtopinyin['三'] = "san";
    self.wordtopinyin['四'] = "si";
    self.wordtopinyin['跳'] = "tiao";
    self.wordtopinyin['五'] = "wu";
    self.wordtopinyin['役'] = "yi";
    self.zoushipos={-860.5759,-903.4226,-947.5876,-990.5396}
    self.root.notelist = {}
    for i=1,10 do
        local t =UnityEngine.GameObject.Instantiate(self.root.container_note.templete, self.root.container_note.note_content).transform
        local o = {}
        o.id = 0
        o.btn_checkinfo = t:Find('btn_checkinfo'):GetComponent(typeof(UnityEngine.UI.Button))
        o.head = UI_Head:Init(t:Find('head'):Find('node'):GetComponent(typeof(UnityEngine.UI.Image)))
        o.date = t:Find('date'):GetComponent(typeof(UnityEngine.UI.Text))
        o.time = t:Find('time'):GetComponent(typeof(UnityEngine.UI.Text))
        o.word = t:Find('word'):GetComponent(typeof(UnityEngine.UI.Text))
        o.emo = t:Find('emo'):GetComponent(typeof(UnityEngine.UI.Image))
        o.container_name = UI_Name:Init(t:Find('container_name'), GameUtility.ENameFilterServiceType.FRIEND)
        o.level = t:Find('level'):GetComponent(typeof(UnityEngine.UI.Text))
        o.btn_del = t:Find('btn_del'):GetComponent(typeof(UnityEngine.UI.Button))
        o.go = t
        local pos = t.localPosition
        pos.y = pos.y-t.sizeDelta.y*(i-1)
        t.localPosition = pos
        t.transform.gameObject:SetActive(false)
        table.insert(self.root.notelist,o)
    end
    self.root.templete.gameObject:SetActive(false)
    self.root.container_note.templete.gameObject:SetActive(false)
    self.root.fandetail:SetSize(self.root.fandetail.sizeDelta.x,self.root.fandetail.sizeDelta.y-self.root.templete.sizeDelta.y)

    local yi_templete = self.root.fandetail:GetChild(0)
    self.cached_yi_height = yi_templete:GetComponent(typeof(UnityEngine.RectTransform)).sizeDelta.y
    self.yi_pool = {}
    for i = 1, 200 do
        local clone = UnityEngine.GameObject.Instantiate(yi_templete, self.root.fandetail):GetComponent(typeof(UnityEngine.RectTransform))
        clone.transform.gameObject:SetActive(false)
        table.insert(self.yi_pool, {
            transform = clone,
            count = clone:Find("count"):GetComponent(typeof(UnityEngine.UI.Text)),
            fan = clone:Find("fan"):GetComponent(typeof(UnityEngine.UI.Text)),
            node = clone:Find("node"):GetComponent(typeof(UnityEngine.UI.Text))
        })
    end
    self.container_modes = {}
    for i = 1, 2 do
        local container_mode = self.root.content:Find("mode"..i)
        local container_modes = {
            container = container_mode,
            pos1 = container_mode:Find("detail"):Find("pos1"):GetComponent(typeof(UnityEngine.UI.Text)),
            pos2 =  container_mode:Find("detail"):Find("pos2"):GetComponent(typeof(UnityEngine.UI.Text)),
            pos3 = container_mode:Find("detail"):Find("pos3"):GetComponent(typeof(UnityEngine.UI.Text)),
            pos4 = container_mode:Find("detail"):Find("pos4"):GetComponent(typeof(UnityEngine.UI.Text)),
            knockout = container_mode:Find("detail"):Find("knockout"):GetComponent(typeof(UnityEngine.UI.Text)),
            changci = container_mode:Find("detail"):Find("changci"):GetComponent(typeof(UnityEngine.UI.Text)),
            shunwei = container_mode:Find("detail"):Find("shunwei"):GetComponent(typeof(UnityEngine.UI.Text)),
            hupai = container_mode:Find("detail"):Find("hupai"):GetComponent(typeof(UnityEngine.UI.Text)),
            fangchong = container_mode:Find("detail"):Find("fangchong"):GetComponent(typeof(UnityEngine.UI.Text)),
            fulu = container_mode:Find("detail"):Find("fulu"):GetComponent(typeof(UnityEngine.UI.Text)),
            liqi = container_mode:Find("detail"):Find("liqi"):GetComponent(typeof(UnityEngine.UI.Text)),
            dadian = container_mode:Find("detail"):Find("dadian"):GetComponent(typeof(UnityEngine.UI.Text)),
            zimo = container_mode:Find("detail"):Find("zimo"):GetComponent(typeof(UnityEngine.UI.Text)),
            hule = container_mode:Find("detail"):Find("hule"):GetComponent(typeof(UnityEngine.UI.Text)),
            lianzhuang = container_mode:Find("detail"):Find("lianzhuang"):GetComponent(typeof(UnityEngine.UI.Text)),

        }
        table.insert(self.container_modes, container_modes)
    end

    self.btn_pipei = self:InitBtn(self.root.btn_pipei)
    self.btn_shilian = self:InitBtn(self.root.btn_shilian)
    self.btn_friend = self:InitBtn(self.root.btn_friend)
    self.infoscroll = self.root.container_info.transform:Find('data'):Find('ScrollData'):GetComponent(typeof(UnityEngine.UI.ScrollRect))

    LuaTools.LoadSprite("pic/myres/bothui/tab2_choosed", nil, nil, function(spr)
        self.chooseSprite_ = spr
    end)
    LuaTools.LoadSprite("pic/myres/bothui/tab2_unchoose", nil, nil, function(spr)
        self.unchooseSprite_ = spr
    end)

    --region 记录位置
    self.dahe_container_origin_pos_x = self.root.dahe_container.transform.anchoredPosition.x
    self.dahe_container_origin_pos_y = self.root.dahe_container.transform.anchoredPosition.y

    self.fengge_container_origin_pos_x = self.root.fengge_container.transform.anchoredPosition.x
    self.fengge_container_origin_pos_y = self.root.fengge_container.transform.anchoredPosition.y

    self.zoushi_container_origin_pos_x = self.root.zoushi_container.transform.anchoredPosition.x
    self.zoushi_container_origin_pos_y = self.root.zoushi_container.transform.anchoredPosition.y

    self.blank0_origin_pos_x = self.root.blank0.transform.anchoredPosition.x
    self.blank0_origin_pos_y = self.root.blank0.transform.anchoredPosition.y

    self.mode1_origin_pos_x = self.root.mode1.transform.anchoredPosition.x
    self.mode1_origin_pos_y = self.root.mode1.transform.anchoredPosition.y

    self.mode2_origin_pos_x = self.root.mode2.transform.anchoredPosition.x
    self.mode2_origin_pos_y = self.root.mode2.transform.anchoredPosition.y

    self.fan_origin_pos_x = self.root.fan.transform.anchoredPosition.x
    self.fan_origin_pos_y = self.root.fan.transform.anchoredPosition.y

    self.fan_guyi_origin_pos_x = self.root.fan_guyi.transform.anchoredPosition.x
    self.fan_guyi_origin_pos_y = self.root.fan_guyi.transform.anchoredPosition.y

    self.blank_origin_pos_x = self.root.blank.transform.anchoredPosition.x
    self.blank_origin_pos_y = self.root.blank.transform.anchoredPosition.y

    self.content_origin_height = self.root.content.transform.rect.height

    --endregion
end

function UI_PlayerCInfo:_SetTitle(title)
    local list = {}
    if GameMgr.Inst.prefer_language == 'chs'
    or GameMgr.Inst.prefer_language == 'chs_t'  then
        if title == '满贯' then
            list = {'', '', 'man', 'guan'}
        elseif title == '跳满' then
            list = {'', '', 'tiao', 'man'}
        elseif title == '倍满' then
            list = {'', '', 'bei', 'man'}
        elseif title == '三倍满' then
            list = {'', 'san', 'bei', 'man'}
        elseif title == '累积役满' then
            list = {'lei', 'ji', 'yi', 'man'}
        elseif title == '役满' then
            list = {'', '', 'yi', 'man'}
        elseif title == '两倍役满' then
            list = {'liang', 'bei', 'yi', 'man'}
        elseif title == '三倍役满' then
            list = {'san', 'bei', 'yi', 'man'}
        elseif title == '四倍役满' then
            list = {'si', 'bei', 'yi', 'man'}
        elseif title == '五倍役满' then
            list = {'wu', 'bei', 'yi', 'man'}
        elseif title == '六倍役满' then
            list = {'liu', 'bei', 'yi', 'man'}
        else
            list = {'','','',''}
        end
        for i = 1, #self.words do
            self.words[i].gameObject:SetActive(false)
            if list[i] ~= '' then
                self.words[i].gameObject:SetActive(true)
                self.words[i]:SetTexture('pic/myres/word_'..list[i])
            end
        end
        self.root.container_title.transform.gameObject:SetActive(true)
    elseif GameMgr.Inst.prefer_language == 'jp' then
        if title == '满贯' then
            list = {'', '', 'man', 'guan'}
        elseif title == '跳满' then
            list = {'', '', 'tiao', 'man'}
        elseif title == '倍满' then
            list = {'', '', 'bei', 'man'}
        elseif title == '三倍满' then
            list = {'', 'san', 'bei', 'man'}
        elseif title == '累积役满' then
            list = {'shu', 'ji', 'yi', 'man'}
        elseif title == '役满' then
            list = {'', '', 'yi', 'man'}
        elseif title == '两倍役满' then
            list = {'er', 'bei', 'yi', 'man'}
        elseif title == '三倍役满' then
            list = {'san', 'bei', 'yi', 'man'}
        elseif title == '四倍役满' then
            list = {'si', 'bei', 'yi', 'man'}
        elseif title == '五倍役满' then
            list = {'wu', 'bei', 'yi', 'man'}
        elseif title == '六倍役满' then
            list = {'liu', 'bei', 'yi', 'man'}
        else
            list = {'','','',''}
        end
        for i = 1, #self.words do
            self.words[i].gameObject:SetActive(false)
            if list[i] ~= '' then
                self.words[i].gameObject:SetActive(true)
                self.words[i]:SetTexture('pic/myres/word_'..list[i])
            end
            self.img_title_en.gameObject:SetActive(false)
        end
        self.root.container_title.transform.gameObject:SetActive(true)
    elseif GameMgr.Inst.prefer_language == 'kr' then
        local name = ''
        if title == '满贯' then
            name = 'Mangan'
        elseif title == '跳满' then
            name = 'Haneman'
        elseif title == '倍满' then
            name = 'Baiman'
        elseif title == '三倍满' then
            name = 'Sanbaiman'
        elseif title == '累积役满' then
            name = 'Kazoe Yakuman'
        elseif title == '役满' then
            name = 'Yakuman'
        elseif title == '两倍役满' then
            name = 'Double Yakuman'
        elseif title == '三倍役满' then
            name = 'Triple Yakuman'
        elseif title == '四倍役满' then
            name = 'Quadruple Yakuman'
        elseif title == '五倍役满' then
            name = 'Quintuple Yakuman'
        elseif title == '六倍役满' then
            name = 'Sextuple Yakuman'
        else
            name = ''
        end
        for i = 1, #self.words do
            self.words[i].gameObject:SetActive(false)
        end
        self.img_title_en.gameObject:SetActive(true)
        if name ~= '' then
            Tools.ImgOfLocalization('myres/'..name .. '.png', self.img_title_en, true)
        else
            self.img_title_en.gameObject:SetActive(false)
        end
        self.root.container_title_en.transform.gameObject:SetActive(true)
    elseif GameMgr.Inst.prefer_language == 'en' then
        local name = ''
        if title == '满贯' then
            name = 'Mangan'
        elseif title == '跳满' then
            name = 'Haneman'
        elseif title == '倍满' then
            name = 'Baiman'
        elseif title == '三倍满' then
            name = 'Sanbaiman'
        elseif title == '累积役满' then
            name = 'Yakuman'
        elseif title == '役满' then
            name = 'Yakuman'
        elseif title == '两倍役满' then
            name = 'Double Yakuman'
        elseif title == '三倍役满' then
            name = 'Triple Yakuman'
        elseif title == '四倍役满' then
            name = 'Quadruple Yakuman'
        elseif title == '五倍役满' then
            name = 'Quintuple Yakuman'
        elseif title == '六倍役满' then
            name = 'Sextuple Yakuman'
        else
            name = ''
        end
        for i = 1, #self.words do
            self.words[i].gameObject:SetActive(false)
        end
        self.img_title_en.gameObject:SetActive(true)
        if name ~= '' then
            Tools.ImgOfLocalization('myres/'..name .. '.png', self.img_title_en, true)
        else
            self.img_title_en.gameObject:SetActive(false)
        end
        self.root.container_title_en.transform.gameObject:SetActive(true)
    end
end

function UI_PlayerCInfo:ContentControl(value)
    self.root.content.localPosition = Vector3(0, (1-value) * (self.root.content.transform.sizeDelta.y-self.root.viewport.transform.sizeDelta.y), 0);
end

function UI_PlayerCInfo:SetSeasonRank(res)
    self.root.label_norank.transform.gameObject:SetActive(#res.season_info <= 0)
    if #res.season_info <= 0 then
        self.root.rank_container.transform.gameObject:SetActive(false)
    end
    self.season_info = res.season_info
    for i=1,3 do
        self.root['season'..i].transform.gameObject:SetActive(res.season_info[i] ~= nil)
        if res.season_info[i] then
            local season = ExcelMgr.GetData('season','season',res.season_info[i].season)
            self.root['season'..i].label_season.text = season['desc_'..GameMgr.Inst.prefer_language]
            if not res.season_info[i].rank or res.season_info[i].rank == 0 then
                self.root['season'..i].rank.transform.gameObject:SetActive(false)
                self.root['season'..i].label_rank.text = 'Tools.StrOfLocalization(未入榜)'
            else
                self:SetRankIcon(self.root['season'..i],res.season_info[i].level)
                self.root['season'..i].rank.transform.gameObject:SetActive(true)
                if res.season_info[i].rank >= 10000 then
                    self.root['season'..i].label_rank.text = Tools.StrOfLocalization(3251,'9999+')
                else
                    self.root['season'..i].label_rank.text = Tools.StrOfLocalization(3251,res.season_info[i].rank)
                end
            end
        end
    end
    -- self:RefreshContentPos()
end

function UI_PlayerCInfo:RefreshContentPos(is_huodong,is_liqi4)
    local delta = 0
    if not is_huodong or #self.season_info <= 0 or not is_liqi4 then
        self.root.rank_container.transform.gameObject:SetActive(false)
    else
        self.root.rank_container.transform.gameObject:SetActive(true)
        delta = 205
    end
    self.root.dahe_container.transform:SetRectPos(self.dahe_container_origin_pos_x,self.dahe_container_origin_pos_y - delta)
    self.root.fengge_container.transform:SetRectPos(self.fengge_container_origin_pos_x,self.fengge_container_origin_pos_y - delta)
    self.root.zoushi_container.transform:SetRectPos(self.zoushi_container_origin_pos_x,self.zoushi_container_origin_pos_y - delta)
    self.root.blank0.transform:SetRectPos(self.blank0_origin_pos_x,self.blank0_origin_pos_y - delta)
    self.root.mode1.transform:SetRectPos(self.mode1_origin_pos_x,self.mode1_origin_pos_y - delta)
    self.root.mode2.transform:SetRectPos(self.mode2_origin_pos_x,self.mode2_origin_pos_y - delta)
    self.root.fan.transform:SetRectPos(self.fan_origin_pos_x,self.fan_origin_pos_y - delta)
    self.root.fan_guyi.transform:SetRectPos(self.fan_guyi_origin_pos_x,self.fan_guyi_origin_pos_y - delta)
    self.root.blank.transform:SetRectPos(self.blank_origin_pos_x,self.blank_origin_pos_y - delta)
    self.root.content.transform.sizeDelta = Vector2(self.root.content.transform.rect.width,self.content_origin_height + delta)
end


function UI_PlayerCInfo:SetRankIcon(go,level)
    local level_info = Tools.GetLevelInfo(level)
    Tools.ImgOfLocalization('myres/rank'..level_info.trail_icon,go.rankimg,true)
    if level_info.trail_fire >= 0 then
        go.level_container.transform.gameObject:SetActive(true)
        for i=1,3 do
            go['exp'..i].gameObject:SetActive(i <= level_info.trail_fire)
        end
    else
        go.level_container.transform.gameObject:SetActive(false)
    end
end
function UI_PlayerCInfo:ChangePoint(txt,value)
    if value == 0 then
        txt.text = 0
        return
    end
    local nowrate = 0
    local detal =  value/10

    txt.text = 0
    for i = 1, 10 do
        TimeMgr.Delay(0.03 * i, function()
            -- nowrate = nowrate + 1
            -- local rate = nowrate / 33
            if txt.text + detal < value then
                txt.text = math.ceil(txt.text + detal)
            else
                txt.text = value
            end
        end)
    end
end


function UI_PlayerCInfo:ResetInfoview()
    self:SortBtn()
    self:ResetMode()
end

function UI_PlayerCInfo:ResetMode()
    self.infoscroll.verticalNormalizedPosition  = 1
    if(self.ismode0open)then
        self:CloseImmediately(self.root.mode0)
        self.ismode0open=false
    end
    if(self.ismode1open)then
        self:CloseImmediately(self.root.mode1)
        self.ismode1open=false
    end
    if(self.ismode2open)then
        self:CloseImmediately(self.root.mode2)
        self.ismode2open=false
    end
    if(self.isfanopen)then
        self:CloseImmediately(self.root.fan)
        self.isfanopen=false
    end
    
    if(self.isguyifanopen)then
        self:CloseImmediately(self.root.fan_guyi)
        self.isguyifanopen=false
    end
end

function UI_PlayerCInfo:CloseImmediately(trans)
    local index
    if(trans.name=="mode0")then
        index=0
    elseif trans.name=="mode1" then
        index=1
    elseif trans.name=="mode2" then
        index=2
    elseif trans.name=="fan" then
        index=3
    elseif trans.name=="fan_guyi" then
        index=4
    end
    local deltaheigh=trans:Find("detail").sizeDelta.y
    self.root.content.sizeDelta=Vector2(self.root.content.sizeDelta.x,self.root.content.sizeDelta.y-deltaheigh)
    local pos={}
    pos[1]=trans.parent:Find("mode1").localPosition
    pos[2]=trans.parent:Find("mode2").localPosition
    pos[3]=trans.parent:Find("fan").localPosition
    pos[4]=trans.parent:Find("fan_guyi").localPosition

    trans:Find("detail").gameObject:SetActive(false)
    local   per=1
    trans:Find("btn"):Find("arrow").localRotation=Quaternion.Euler(0, 0, 180-per*180)
    if(index<1)then
        trans.parent:Find("mode1").localPosition=Vector3(pos[1].x,pos[1].y+deltaheigh*per,pos[1].z)
    end
    if(index<2)then
        trans.parent:Find("mode2").localPosition=Vector3(pos[2].x,pos[2].y+deltaheigh*per,pos[2].z)
    end
    if(index<3)then
        trans.parent:Find("fan").localPosition=Vector3(pos[3].x,pos[3].y+deltaheigh*per,pos[3].z)
    end
    if(index<4)then
        trans.parent:Find("fan_guyi").localPosition=Vector3(pos[4].x,pos[4].y+deltaheigh*per,pos[4].z)
    end
end

function UI_PlayerCInfo:SortBtn()
    self.btn_shilian.btn.transform:SetAsLastSibling()
    self.btn_friend.btn.transform:SetAsLastSibling()
    self.btn_pipei.btn.transform:SetAsLastSibling()
end

function UI_PlayerCInfo:SwtichMode(index)
    self:SortBtn()
    self.btn_pipei.SetActive(index == 2)
    self.btn_friend.SetActive(index == 1)
    self.btn_shilian.SetActive(index == 3)
end

function UI_PlayerCInfo:ModeChange(trans,open)
    local index
    if(trans.name=="mode0")then
        index=0
    elseif trans.name=="mode1" then
        index=1
    elseif trans.name=="mode2" then
        index=2
    elseif trans.name=="fan" then
        index=3
    elseif trans.name=="fan_guyi" then
        index=4
    end
    local deltaheigh = trans:Find("detail").sizeDelta.y
    if not open then
        deltaheigh = -deltaheigh
    end
    self.root.content.sizeDelta=Vector2(self.root.content.sizeDelta.x,self.root.content.sizeDelta.y+deltaheigh)
    -- self.root.bg.sizeDelta=Vector2(self.root.bg.sizeDelta.x,self.root.bg.sizeDelta.y+deltaheigh)
    local pos={}
    pos[1]=trans.parent:Find("mode1").localPosition
    pos[2]=trans.parent:Find("mode2").localPosition
    pos[3]=trans.parent:Find("fan").localPosition
    pos[4]=trans.parent:Find("fan_guyi").localPosition

    if open then
        trans:Find("detail").gameObject:SetActive(true)
    else
        trans:Find("detail").gameObject:SetActive(false)
    end

    self.starttime = UnityEngine.Time.time;
    self.animdoing=true

    self.timer:LoopFrame(1,-1,function()
        local t = UnityEngine.Time.time;
        local per=(t - self.starttime)/self.animtime
        if(per>1)then
            per=1
        end
        if open then
            trans:Find("btn"):Find("arrow").localRotation = Quaternion.Euler(0, 0, per*180)
        else
            trans:Find("btn"):Find("arrow").localRotation=Quaternion.Euler(0, 0, 180-per*180)
        end
        if(index<1)then
            trans.parent:Find("mode1").localPosition=Vector3(pos[1].x,pos[1].y-deltaheigh*per,pos[1].z)
        end
        if(index<2)then
            trans.parent:Find("mode2").localPosition=Vector3(pos[2].x,pos[2].y-deltaheigh*per,pos[2].z)
        end
        if(index<3)then
            trans.parent:Find("fan").localPosition=Vector3(pos[3].x,pos[3].y-deltaheigh*per,pos[3].z)
        end
        if(index<4)then
            trans.parent:Find("fan_guyi").localPosition=Vector3(pos[4].x,pos[4].y-deltaheigh*per,pos[4].z)
        end
    end)

    TimeMgr.Delay(self.animtime,function()
        self.timer:ClearAllTimers()
        self.animdoing=false
        local   per=1
        if open then
            trans:Find("btn"):Find("arrow").localRotation = Quaternion.Euler(0, 0, per*180)
        else
            trans:Find("btn"):Find("arrow").localRotation=Quaternion.Euler(0, 0, 180-per*180)
        end
        if(index<1)then
            trans.parent:Find("mode1").localPosition=Vector3(pos[1].x,pos[1].y-deltaheigh*per,pos[1].z)
        end
        if(index<2)then
            trans.parent:Find("mode2").localPosition=Vector3(pos[2].x,pos[2].y-deltaheigh*per,pos[2].z)
        end
        if(index<3)then
            trans.parent:Find("fan").localPosition=Vector3(pos[3].x,pos[3].y-deltaheigh*per,pos[3].z)
        end
        if(index<4)then
            trans.parent:Find("fan_guyi").localPosition=Vector3(pos[4].x,pos[4].y-deltaheigh*per,pos[4].z)
        end
    end)
end

function UI_PlayerCInfo:InitBtn(root)
    local o = {}
    o.btn = root.transform:GetComponent(typeof(UnityEngine.UI.Button))
    o.img = root.transform:GetComponent(typeof(UnityEngine.UI.Image))
    o.label = root.transform:Find("node"):GetComponent(typeof(UnityEngine.UI.Text))
    o.SetActive = function(active)
        if active then
            o.btn.transform:SetAsLastSibling()
            o.img.sprite = self.chooseSprite_
            o.label:SetColor(UI_PlayerCInfo.color[1][1],UI_PlayerCInfo.color[1][2],UI_PlayerCInfo.color[1][3],1)
        else
            o.label:SetColor(UI_PlayerCInfo.color[2][1],UI_PlayerCInfo.color[2][2],UI_PlayerCInfo.color[2][3],1)
            o.img.sprite = self.unchooseSprite_
        end
    end
    return o
end

return UI_PlayerCInfo