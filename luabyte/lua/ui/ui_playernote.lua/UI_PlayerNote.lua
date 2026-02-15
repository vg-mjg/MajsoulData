UI_PlayerNote = {}

function UI_PlayerNote:Init(root)
    local o = {}
    setmetatable(o,self)
    self.__index = self
    o:Build(root)
    return o
end

function UI_PlayerNote:Build(root)
    self.root = root
    self.page_controller = {}
    self.target_id = 0
end

function UI_PlayerNote:InitNoteData(target_id,_nonote,_redpoint)
    self.readed = true
    self.target_id = target_id
    self:Refresh()
    self.redpoint = _redpoint
    self.nonote = _nonote
end

function UI_PlayerNote:Refresh()
   local request = ProtoMgr.CreateRequest('Lobby', 'fetchCommentList')
   request.target_id = self.target_id
   if not self.target_id then return end
   LobbyNetMgr.SendRequest('Lobby', 'fetchCommentList',request,function(err,res)
        if err or res.error.code ~= 0 then
            UIMgr.Inst:Show_NetReqError('fetchCommentList',err,res)
        else
            self.comment_list = {}
            if res.comment_id_list then
                for i=1,#res.comment_id_list do
                   table.insert(self.comment_list, UI_PlayerNote.InitItem(res.comment_id_list[i]))
                end
            end
            self.root.nonote.transform.gameObject:SetActive(#self.comment_list == 0)
            self.root.page_controller.transform.gameObject:SetActive(#self.comment_list ~= 0)
            self.comment_allow = res.comment_allow
            self:ShowInfo(self.target_id,self.comment_allow)
            self.last_read_id = res.last_read_id
            if self.target_id == GameMgr.Inst.account_id and UI_SelfPlayerinfo.Inst.transform.gameObject.activeSelf then
                if self.redpoint then
                    if not GameMgr.Inst.in_limited_mode() then
                        self.redpoint.transform.gameObject:SetActive(#self.comment_list>0 and self.comment_list[1].id ~= self.last_read_id)
                    else
                        self.redpoint.transform.gameObject:SetActive(false)
                    end
                end
                self.totalPg = math.ceil(#self.comment_list/10)
                UI_SelfPlayerinfo.Inst:RefreshNotePg(self.totalPg)
                self:RenderPage(1)
            else
                self.totalPg = math.ceil(#self.comment_list/10)
                UI_OtherPlayerInfo.Inst:RefreshNotePg(self.totalPg)
                self:RenderPage(1)
            end
            LuaTools.SetRectTransformSize(self.root.content.transform,self.root.content.transform.rect.width,54*self.totalPg)
        end
   end)
end

function UI_PlayerNote:Show()
    self:Read()
end

function UI_PlayerNote.InitItem(id)
    local item = {}
    item.id = id
    item.loaded = false
    item.note = {}
    return item
end

function UI_PlayerNote.SetMsgInfo(res,msg)
    if res then
        res.timestamp = msg.timestamp
        res.commenter = msg.commenter
        res.content = msg.content
        res.loaded = true
    end
end

function UI_PlayerNote:ChangeSign()
    self.container_sign_input.transform.gameObject:SetActive(true)
    if GameMgr.Inst.account_data.signature and GameMgr.Inst.account_data.signature~= '' then
        self.signinput.text = GameMgr.Inst.account_data.signature
    end
end

function UI_PlayerNote:Read()
    if self.last_read_id == -1 then return end
    if #self.comment_list == 0 then return end
    if self.target_id ~= GameMgr.Inst.account_id then return end
    if self.last_read_id ~= self.comment_list[1].id then
        local request = ProtoMgr.CreateRequest('Lobby','updateReadComment')
        request.read_id = self.comment_list[1].id
        LobbyNetMgr.SendRequest('Lobby','updateReadComment',request,function(err,res) end)
    end
end

function UI_PlayerNote:RenderPage(index)
    if index == 1 then
        self.root.btn_right.transform.gameObject:SetActive(self.totalPg > 1)
        self.root.btn_left.transform.gameObject:SetActive(false)
    else
        self.root.btn_right.transform.gameObject:SetActive(index ~= self.totalPg)
        self.root.btn_left.transform.gameObject:SetActive(true)
    end
    if (index-1) *10 >= #self.comment_list and index-1 > 0 then
        self:RenderPage(index-1)
        return
    end
    if (index-1) *10 >= #self.comment_list then
        self.nonote.transform.gameObject:SetActive(true)
        self.root.page_controller.transform.gameObject:SetActive(false)
    end
    self.root.note_content.sizeDelta = Vector2(self.root.note_content.sizeDelta.x,0)
    self.page_controller.current_index = index - 1
    self.root.curPage.text = index
    self.root.current_index = index
    self:FetchCurrentPage()
end

function UI_PlayerNote:FetchCurrentPage()
    local fetch_list = {}
    for i=1,10 do
        local _index = (self.page_controller.current_index) * 10 + i
        if _index > #self.comment_list then
        else
            if not self.comment_list[_index].loaded then
                table.insert(fetch_list,self.comment_list[_index].id)
            end
        end
    end
    -- 列表中没有则获取
    if #fetch_list > 0 then
        local request = ProtoMgr.CreateRequest('Lobby','fetchCommentContent')
        request.target_id = self.target_id
        for i=1,#fetch_list do
            table.insert(request.comment_id_list,fetch_list[i] )
        end
        LobbyNetMgr.SendRequest('Lobby','fetchCommentContent',request,function(err,res)
            if err or res.error.code ~= 0 then
                UIMgr.Inst:Show_NetReqError('fetchCommentContent',err,res)
            else
                for i=1,#res.comments do
                    local d = res.comments[i]
                    for j=1,#self.comment_list do
                        if self.comment_list[j].id == d.comment_id then
                            UI_PlayerNote.SetMsgInfo(self.comment_list[j],d)
                        end
                    end
                end
                for index=1,10 do
                    local rIndex = (self.page_controller.current_index) * 10 + index
                    if self.target_id == GameMgr.Inst.account_id and UI_SelfPlayerinfo.Inst.transform.gameObject.activeSelf then
                        UI_SelfPlayerinfo.Render(self.comment_list[rIndex],index)
                    else
                        UI_OtherPlayerInfo.Render(self.comment_list[rIndex],index)
                    end
                end
            end
        end)
    else
        for index=1,10 do
            local rIndex = (self.page_controller.current_index) * 10 + index
            if self.target_id == GameMgr.Inst.account_id and UI_SelfPlayerinfo.Inst.transform.gameObject.activeSelf then
                UI_SelfPlayerinfo.Render(self.comment_list[rIndex],index)
            else
                UI_OtherPlayerInfo.Render(self.comment_list[rIndex],index)
            end
        end
    end
end

function UI_PlayerNote:DelItem(id)
    UIMgr.Inst:Show_SecondConfirm(Tools.StrOfLocalization(19),function()
        local index = -1
        for i=1,#self.comment_list do
            if self.comment_list[i] and self.comment_list[i].id == id then
                table.remove(self.comment_list,i)
            end
        end
        local request = ProtoMgr.CreateRequest('Lobby','deleteComment')
        request.target_id = self.target_id
        table.insert(request.delete_list,id)
        LobbyNetMgr.SendRequest('Lobby','deleteComment',request,function(err,res)
            if err or res.error.code ~= 0 then
                UIMgr.Inst:Show_NetReqError('deleteComment',err,res)
            else
                self:Read()
            end
        end)
        self:RenderPage(self.page_controller.current_index+1)
    end)
end

function UI_PlayerNote:SetSign(signature)
    if signature and signature ~= '' then
        self.root.sign_content.text = Tools.StrWithoutForbidden(signature)
        self.root.noinfo.transform.gameObject:SetActive(false)
        self.root.sign_content.transform.gameObject:SetActive(true)
    else
        self.root.noinfo.transform.gameObject:SetActive(true)
        self.root.sign_content.transform.gameObject:SetActive(false)
    end
end

function UI_PlayerNote:ShowInfo(target_id,comment_allow)
    self.comment_allow = comment_allow
    -- self.root.noteinfo.transform.gameObject:SetActive(false)
    local allowed = false
    if self.root.noteinfo then
        self.root.container_input.transform.gameObject:SetActive(false)
        -- LuaTools.SetImgGray(self.root.btn_send.transform,false)
        -- self.root.btn_send.interactable = false
        self.root.noteinfo.transform.gameObject:SetActive(false)
        if target_id == GameMgr.Inst.account_id then
            self.root.noteinfo.transform.gameObject:SetActive(true)
            self.root.noteinfo.text = Tools.StrOfLocalization(2155)
        else
            if GameMgr.Inst.ingame then
                self.root.noteinfo.transform.gameObject:SetActive(true)
                self.root.noteinfo.text = Tools.StrOfLocalization(20)
            elseif comment_allow == 2 then
                self.root.noteinfo.transform.gameObject:SetActive(true)
                self.root.noteinfo.text = Tools.StrOfLocalization(17)
            elseif comment_allow == 1 then
                if FriendMgr.Find(target_id) then
                    allowed = true
                else
                    self.root.noteinfo.transform.gameObject:SetActive(true)
                    self.root.noteinfo.text = Tools.StrOfLocalization(18)
                end
            else
                allowed = true
            end
        end

        if allowed then
            self.root.container_input.transform.gameObject:SetActive(true)
        end
    end
end

return UI_PlayerNote