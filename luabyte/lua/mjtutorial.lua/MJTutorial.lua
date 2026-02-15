local GameUtility = require("GameUtility")
local EMJ_Mode = GameUtility.EMJ_Mode
local E_Ming = GameUtility.E_Ming
local ECommonView = GameUtility.ECommonView

MJTutorial = {}

-- function MJTutorial:Init()
--     MJTutorial.Inst = self
--     -- dora	rival	init_score	ju	benchang	position	start_shoupai	start_ming	end_shoupai	end_ming	end_yaku	ura_dora	end_fu	hu_score	flow_score
--     self.tutorial_config = {}
--     -- dora	rival	init_score	chang	ju	benchang	position	start_shoupai	start_ming	end_shoupai	end_ming	end_yaku	ura_dora	end_fu	hu_score	flow_score
--     self.tutorial_actions = {}
--     self.action_timer = TimerMgr:Init()
-- end

-- function MJTutorial:Show(episode_id, after_close)
--     if UI_PiPeiYuYue.Inst.transform.gameObject.activeSelf then
--         UIMgr.Inst:Show_PopOutNoTitle(Tools.StrOfLocalization(204))
--         return
--     end
--     if self.locking then
--         return
--     end
--     self.locking = true

--     self.episode_id = episode_id
--     self.tutorial_config = ExcelMgr.GetData('tutorial', 'init', episode_id)
--     self.tutorial_actions = ExcelMgr.GetData('tutorial', 'step', episode_id)

--     self.main_hand_pais = Tools.Split(self.tutorial_config.start_shoupai, ',')
--     self.start_from_begining = self.tutorial_config.paihe == nil or self.tutorial_config.paihe == ''
--     self.show_fight_begin = self.tutorial_config.chang == 1 and self.tutorial_config.ju == 1
--     --TODO: 读paihe
--     self.paihe = {
--         { '3z', '3z', '3z', '4z', '4z', '4z', '7z', '7z', '7z' },
--         { '1m', '2m', '3m', '4m', '5m', '6m', '7m', '8m', '9m' },
--         { '1p', '2p', '3p', '4p', '5p', '6p', '7p', '8p', '9p' },
--         { '1s', '2s', '3s', '4s', '5s', '6s', '7s', '8s', '9s' } }
--     self.after_close = after_close
--     self.action_timer:ClearAllTimers()

--     UIMgr.Inst:ResetRootUI('root_lobby')
--     UIMgr.Inst:ResetRootUI('root_bothui')
--     UIMgr.Inst:ResetRootUI('root_common')
--     UIMgr.Inst:Show_Loading('enter_mj')
--     UIMgr.Inst:BuildMJ(function()
--         UnityEngine.Resources.UnloadUnusedAssets()
--         AudioMgr.StopMusic(1)
--         Scene_MJ.Inst:_loadMainScene()
--         UI_Loading.Inst:SetProgress(1)
--         GameMgr.Inst:EnterMJ()
--         TimeMgr.Delay(1, function()
--             if self.show_fight_begin then
--                 UIMgr.Inst:Show_FightBegin(function()
--                     UIMgr.Inst:Hide_Loading()
--                     self.locking = false
--                 end)
--             else
--                 TimeMgr.Delay(3, function()
--                     UIMgr.Inst:Hide_Loading()
--                     self.locking = false
--                 end)
--             end
--             TimeMgr.Delay(3, function()
--                 local delay = UIMgr.Inst:Hide_FightBegin()
--                 TimeMgr.Delay(delay + 0.2, function()
--                     self:DoNewGame()
--                 end)
--             end)
--         end)
--     end)
--     Scene_MJ.Inst.desktop.gameObject:SetActive(true)
--     Scene_MJ.Inst.desktop_hand.gameObject:SetActive(true)

--     local players = {}
--     local char_ids = Tools.Split(self.tutorial_config.rival, ',')
--     for i = 1, #char_ids do
--         local player_data = {}
--         local char_id = tonumber(char_ids[i])
--         local skin_id = ExcelMgr.GetData('item_definition', 'character', char_id).init_skin
--         player_data.avatar_id = skin_id
--         player_data.character = { skin = skin_id, charid = char_id, level = 0, is_upgraded = false, views = {} }
--         player_data.account_id = 0
--         player_data.nickname = GameUtility.get_item_view(char_id).name
--         player_data.seat = i - 1
--         player_data.level = { id = 10101 }
--         --TODO: position
--         table.insert(players, player_data)
--     end

--     local game_config = {}
--     game_config.category = 1
--     game_config.mode = {}
--     game_config.mode.mode = 1
--     game_config.mode.detail_rule = {}
--     game_config.mode.detail_rule.HasField = function()
--         return false
--     end
--     game_config.meta = {}
--     game_config.meta.mode_id = 1
--     game_config.HasField = function()
--         return false
--     end

--     DesktopMgr.Inst:InitRoom(game_config, players, GameMgr.Inst.account_id, EMJ_Mode.tutorial, function() end)
-- end

-- --#region 教程流程控制

-- --TODO: get action
-- function MJTutorial:PlayAction()

-- end

-- --#endregion

-- --#region 播放伪对局action
-- function MJTutorial:DoNewGame()
--     UI_Config.Inst.page_concenter.mj_bgm_list:PlayBgm()
--     DesktopMgr.Inst:ClearOperationShow()
--     DesktopMgr.Inst.gameing = true
--     DesktopMgr.Inst.index_chang = self.tutorial_config.chang
--     DesktopMgr.Inst.index_ju = self.tutorial_config.ju
--     DesktopMgr.Inst.index_ben = self.tutorial_config.ben
--     DesktopMgr.Inst.index_player = self.tutorial_config.ju
--     DesktopMgr.Inst.waiting_lingshang_deal_tile = false
--     DesktopMgr.Inst.tingpais = { {}, {}, {}, {} }
--     UI_TingPai.Inst:Reset()
--     DesktopMgr.Inst:_setChangJuShow(DesktopMgr.Inst.index_chang, DesktopMgr.Inst.index_ju)
--     --TODO: 读init_score
--     DesktopMgr.Inst.players[1]:OnInitRoom(1)
--     DesktopMgr.Inst.players[1]:SetScore(25000, 25000)
--     DesktopMgr.Inst.players[1].trans_ind.gameObject:SetActive(true)
--     for i = 2, 4 do
--         DesktopMgr.Inst.players[i]:OnInitRoom(i)
--         DesktopMgr.Inst.players[i]:SetScore(25000, 25000)
--     end
--     local _main_hand_pais = {}
--     for i = 1, #self.main_hand_pais do
--         table.insert(_main_hand_pais, MJPai:Init(self.main_hand_pais[i]))
--     end
--     DesktopMgr.Inst.mainrole:_NewGame(_main_hand_pais, {}, {}, not self.start_from_begining)
--     for i = 2, 4 do
--         local seat = DesktopMgr.Inst:localPosition2Seat(i)
--         if seat ~= 0 then
--             local modifier = 0
--             if seat == DesktopMgr.Inst.index_ju then
--                 modifier = 1
--             end
--             DesktopMgr.Inst.players[i]:_NewGame(13 + modifier, {}, {}, not self.start_from_begining)
--         end
--     end

--     --刷新头像框
--     UI_DesktopInfo.Inst:RefreshSeat(1)
--     --TODO: 牌河
--     --TODO: 计算剩余牌
--     DesktopMgr.Inst:_setLeftPaiShow(64)
--     -- dora
--     local indicator = MJPai:Init(self.tutorial_config.dora)
--     DesktopMgr.Inst.dora = { indicator }
--     UI_DesktopInfo.Inst:SetDora(1, indicator)
--     --TODO: start play action
--     self.index = 1
-- end

-- -- doras: {1m, ...}
-- function MJTutorial:DoDiscard(seat, tile, liqi, moqie, zhenting, doras)
--     local player = DesktopMgr.Inst.players[DesktopMgr.Inst:seat2LocalPosition(seat)]
--     local pai = MJPai:Init(tile)
--     player:AddQiPai(pai, liqi, moqie, true)
--     if seat == DesktopMgr.Inst.seat then
--         --Viewplayer Me
--         DesktopMgr.Inst.mainrole:_OnDiscardTile(pai, false, false, moqie)
--     else
--         --Viewplayer Other
--         player:_OnDiscardTile(moqie, pai, false, false)
--     end
--     self:SetZhenting(zhenting)
--     DesktopMgr.Inst:WhenDoras(doras)
-- end

-- function MJTutorial:DoDeal(seat, tile)
--     --TODO: left count 要读表吗
--     DesktopMgr.Inst.left_tile_count = DesktopMgr.Inst.left_tile_count - 1
--     DesktopMgr.Inst.players[DesktopMgr.Inst:seat2LocalPosition(seat)]:_TakePai(MJPai:Init(tile), false)
--     DesktopMgr.Inst.index_player = seat
--     DesktopMgr.Inst:RefreshPaiLeft()
--     DesktopMgr.Inst:RefreshPlayerIndicator()
-- end

-- -- froms: { seat, ... } seat从0开始
-- function MJTutorial:DoChiPengGang(seat, tiles, type, froms, zhenting)
--     local player = DesktopMgr.Inst.players[DesktopMgr.Inst:seat2LocalPosition(seat)]
--     local pais = {}
--     for i = 1, #tiles do
--         table.insert(pais, MJPai:Init(tiles[i]))
--     end
--     local ming = MJMing:Init(type, froms, pais)

--     self.action_timer:Delay(0.6, function()
--         DesktopMgr.Inst.players[DesktopMgr.Inst:seat2LocalPosition(DesktopMgr.Inst.lastqipai_seat)]:QiPaiNoPass()
--         player:_AddMing(ming, {}, true)
--     end)

--     if seat == DesktopMgr.Inst.seat and (ming.type == E_Ming.gang_an or ming.type == E_Ming.gang_ming) then
--         DesktopMgr.Inst.last_gang = UnityEngine.Time.time
--     end

--     DesktopMgr.Inst.index_player = seat
--     DesktopMgr.Inst:RefreshPlayerIndicator()

--     local sound = ''
--     if ming.type == E_Ming.shunzi then
--         sound = 'act_chi'
--     elseif ming.type == E_Ming.gang_ming or ming.type == E_Ming.gang_an then
--         sound = 'act_kan'
--     elseif ming.type == E_Ming.kezi then
--         sound = 'act_pon'
--     end
--     player:PlaySound(sound)
--     --TODO: 听牌数据要有吗？
--     -- if seat == DesktopMgr.Inst.seat and ming.type ~= E_Ming.gang_ming and ming.type ~= E_Ming.gang_an then
--     --     UI_TingPai.Inst:SetTingPaiDiscardData(data)
--     -- end
--     self:SetZhenting(zhenting)
-- end

-- function MJTutorial:DoLiqi(seat)
--     DesktopMgr.Inst.players[DesktopMgr.Inst:seat2LocalPosition(seat)]:ShowLiqi(true)
--     --TODO: 点棒 分数 要读表吗？
--     DesktopMgr.Inst.players[DesktopMgr.Inst:seat2LocalPosition(seat)]:SetScore(DesktopMgr.Inst.mainrole.score - 1000,
--         DesktopMgr.Inst.mainrole.score - 1000)
--     UI_DesktopInfo.Inst:SetLiqibang(1)
-- end

-- local hule_info = {
--     -- 读表
--     hand = { '2m', '2m', '2m', '2m', '2m', '2m', '2m', '2m', '2m', '2m', '2m', '2m', '1z' },
--     hu_tile = '1z',
--     seat = 0,
--     dadian = 1000,
--     --TODO: ming
--     doras = { '3m' },
--     fans = { { val = 1, id = 12 } },
--     fu = 30,
--     zimo = true,
--     -- 本地算
--     qinjia = true,
--     count = 1,
--     lines = { 10 },
--     -- 写死
--     liqi = false,
--     yiman = false,
--     title_id = 0,
--     baopai = 0,
--     -- 不需要
--     point_zimo_qin = 0,
--     point_zimo_xian = 0,
--     point_rong = 0,
--     point_sum = 0,
-- }

-- --TODO: hule_info
-- function MJTutorial:GetHuleInfo()
    
-- end

-- function MJTutorial:DoHupai(seat, _hule_info)
--     local seats = { seat }
--     DesktopMgr.Inst.gameing = false
--     AudioMgr.StopMusic()
--     AudioMgr.StopMindVoice()
--     local sort1 = function(a, b)
--         local val_a = a:NumValue() * 100 + Tools.bool2int(not a.dora)
--         local val_b = b:NumValue() * 100 + Tools.bool2int(not b.dora)
--         if a.open then
--             val_a = val_a + 10
--         end
--         if b.open then
--             val_b = val_b + 10
--         end
--         return val_a < val_b
--     end
--     self.action_timer:Delay(0.1, function()
--         local infos = { hule_info }
--         local current_time = 0
--         if infos[1].zimo then
--             local seat = seats[1]
--             local handpais = {}
--             local ron_delay = 0
--             for i = 1, #infos[1].hand do
--                 table.insert(handpais, MJPai:Init(infos[1].hand[i]))
--             end
--             if seat == DesktopMgr.Inst.seat then
--                 table.sort(handpais, sort1)
--             end
--             UIMgr.Inst:Show_HuleShow_ZiMo(DesktopMgr.Inst:seat2LocalPosition(seat))
--             current_time = current_time + 1.4
--             local show_anim = true
--             if (infos[1].title and infos[1].title ~= '') or infos[1].title_id ~= 0 then
--                 if show_anim then
--                     self.action_timer:Delay(current_time, function()
--                         UIMgr.Inst:Show_CutIn(DesktopMgr.Inst.player_datas[seat].character.skin)
--                     end)
--                     current_time = current_time + 2
--                 end
--             end

--             local yiman_type = nil
--             local has_yiman_anim = false
--             self.action_timer:Delay(current_time, function()
--                 if seat == DesktopMgr.Inst.seat then
--                     DesktopMgr.Inst.mainrole:_HulePrepare(handpais, MJPai:Init(infos[1].hu_tile), infos[1].zimo)
--                 end
--                 DesktopMgr.Inst.players[DesktopMgr.Inst:seat2LocalPosition(seat)]:_Hule(handpais,
--                     MJPai:Init(infos[1].hu_tile), infos[1].zimo, false, yiman_type, infos[1].ming)
--                 DesktopMgr.Inst.players[DesktopMgr.Inst:seat2LocalPosition(seat)]:_TuiHandPai(handpais, infos[1].zimo)
--             end)
--             if infos[1].yiman and show_anim and has_yiman_anim then
--                 current_time = current_time + 10
--             end
--             current_time = current_time + 2.8

--             local effect_hupai = 'prefab/effect_hupai/effect_hupai_default'
--             current_time = current_time + ron_delay
--             if seat == DesktopMgr.Inst.seat then
--                 UI_TingPai.Inst:Reset()
--                 UI_TingPai.Inst:SetZhenTing(false)
--             end
--         else
--             local hules = {}
--             for i = 1, #infos do
--                 table.insert(hules, DesktopMgr.Inst:seat2LocalPosition(seats[i]))
--             end
--             UIMgr.Inst:Show_HuleShow_Rong(hules)
--             current_time = current_time + 1.5
--             local show_anim = true
--             for i = 1, #infos do
--                 local seat = seats[i]
--                 if (infos[i].title and infos[i].title ~= '') or infos[i].title_id ~= 0 then
--                     if show_anim then
--                         self.action_timer:Delay(current_time, function()
--                             UIMgr.Inst:Show_CutIn(DesktopMgr.Inst.player_datas[seat].character.skin)
--                         end)
--                         current_time = current_time + 2
--                     end
--                 end
--             end

--             for i = 1, #infos do
--                 local seat = seats[i]
--                 if seat == DesktopMgr.Inst.seat then
--                     local handpais = {}
--                     for j = 1, #infos[i].hand do
--                         table.insert(handpais, MJPai:Init(infos[i].hand[j]))
--                     end
--                     table.sort(handpais, sort1)
--                     DesktopMgr.Inst.mainrole:_HulePrepare(handpais, MJPai:Init(infos[i].hu_tile), infos[i].zimo)
--                 end
--             end

--             local yiman_delay = 0
--             local ron_delay = 0
--             local effect_hupai = DesktopMgr.Inst.player_effects[seat].effect_hupai

--             self.action_timer:Delay(current_time, function()
--                 DesktopMgr.Inst:ShowHuleEffect({
--                     pos = DesktopMgr.Inst.lastqipai.model.position,
--                     seat = DesktopMgr.Inst:seat2LocalPosition(DesktopMgr.Inst.lastqipai_seat),
--                     model = DesktopMgr.Inst.lastqipai.model
--                 }, effect_hupai)

--                 local callback = function()
--                     for i = 1, #infos do
--                         local handpais = {}
--                         for j = 1, #infos[i].hand do
--                             table.insert(handpais, MJPai:Init(infos[i].hand[j]))
--                         end
--                         if seats[i] == DesktopMgr.Inst.seat then
--                             table.sort(handpais, sort1)
--                         end
--                         -- table.sort(handpais, sort)
--                         DesktopMgr.Inst.players[DesktopMgr.Inst:seat2LocalPosition(seats[i])]:_Hule(handpais,
--                             MJPai:Init(infos[i].hu_tile), infos[i].zimo, false)
--                         DesktopMgr.Inst.players[DesktopMgr.Inst:seat2LocalPosition(seats[i])]:_TuiHandPai(handpais,
--                             infos[i].zimo)
--                         if seats[i] == DesktopMgr.Inst.seat then
--                             UI_TingPai.Inst:Reset()
--                             UI_TingPai.Inst:SetZhenTing(false)
--                         end
--                     end
--                 end

--                 callback()
--             end)

--             current_time = current_time + 2 + yiman_delay + ron_delay
--         end

--         self.action_timer:Delay(current_time, function()
--             self:DoUIWin()
--         end)
--     end)
-- end

-- local win_data = {
--     hules = { hule_info },
--     -- 读表 计算
--     old_scores = { 25000, 25000, 25000, 25000 },
--     delta_scores = { 1000, -1000, 0, 0 },
--     scores = { 26000, 24000, 25000, 25000 },
--     -- 写死
--     baopai = 0
-- }

-- --TODO: win_data
-- function MJTutorial:GetWinData()
    
-- end

-- function MJTutorial:DoUIWin(_win_data)
--     UIMgr.Inst:Show_Win(win_data)
-- end

-- function MJTutorial:DoScoreChange()

-- end

-- local game_end_results = {}
-- game_end_results.players = {}
-- for i = 1, 4 do
--     local result = {}
--     result.seat = i
--     -- +-分
--     result.total_point = 0
--     -- 最终点数
--     result.part_point_1 = 25000
--     -- 没用
--     result.part_point_2 = 0
--     result.grading_score = 0
--     result.gold = 0
--     table.insert(game_end_results.players, result)
-- end

-- function MJTutorial:GetGameEndResult()
    
-- end

-- function MJTutorial:DoUIGameEnd()
--     UIMgr.Inst:Show_GameEnd(game_end_results)
-- end

-- function MJTutorial:SetZhenting(zhenting)
--     UI_TingPai.Inst:SetZhenTing(zhenting)
--     UI_DesktopInfo.Inst:SetZhenTing(zhenting)
-- end

-- function MJTutorial:SetTingpai(tiles)
--     local tingpai_infos = {}
--     for i = 1, #tiles do
--         local info = {
--             tile = tiles[i],
--             -- 写死
--             haveyi = true,
--             yiman = false,
--             count = 1,
--             fu = 1,
--             biao_dora_count = 1,
--             yiman_zimo = false,
--             count_zimo = 1,
--             fu_zimo = 1,
--         }
--         table.insert(tingpai_infos, info)
--     end
--     UI_TingPai.Inst:SetTingPaiData({ tingpais = tingpai_infos })
-- end

-- --#endregion

-- --#region 教程ui

-- -- 文本、图片、问题或操作指示
-- function MJTutorial:ShowHint()

-- end

-- function MJTutorial:HideHint()

-- end

-- --#endregion

-- function MJTutorial:Quit()
--     self:Reset()
--     Scene_MJ.Inst:_onQuit()
--     -- 打开预览前的ui后再关闭loading
--     GameMgr.Inst:EnterLobby_KeepLoading()
--     if self.after_close then
--         TimeMgr.Delay(2, function()
--             self.after_close()
--             self.after_close = nil
--         end)
--     end
--     TimeMgr.Delay(2.5, function()
--         UIMgr.Inst:Hide_Loading()
--     end)
-- end

-- function MJTutorial:Reset()

-- end
