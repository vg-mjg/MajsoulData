Live2D = { }

Live2D.model_instances = {}

function Live2D:Init(transform, skin_id, part_name)
    local o = {}
    setmetatable(o, self)
    self.__index = self
    o:Build(transform, skin_id, part_name)
    return o;
end

function Live2D:Build(transform, skin_id, part_name)
    self.container = UnityEngine.GameObject.New('Live2D_Container_'..skin_id..'_'..part_name).transform
    self.container:SetParent(transform)
    local pos = 9999 * (1 + #Live2D.model_instances)
    self.container:SetLocalPos(pos, pos, 1)
    self.camera = self.container.gameObject:AddComponent(typeof(UnityEngine.Camera))
    self.camera.orthographic = true
    self.model = LuaTools.LoadPrefab('prefab/live2d/xiaoniaoyou', self.container).transform
    self.model.gameObject:SetActive(true)
    self.model:SetLocalPos(0, 0, 1)
    if part_name == 'full' then
        self.model:SetLocalPos(0, 1, 1)
        self.model:SetLocalScale(8, 8, 8)
        self.render_tex = UnityEngine.RenderTexture.New(916, 1389, 0)
    elseif part_name == 'half' then
        self.model:SetLocalPos(0, -0.5, 1)
        self.model:SetLocalScale(15, 15, 15)
        self.render_tex = UnityEngine.RenderTexture.New(600, 400, 0)
    elseif part_name == 'waitingroom' then
        self.model:SetLocalPos(2, -1, 1)
        self.model:SetLocalScale(15, 15, 15)
        self.render_tex = UnityEngine.RenderTexture.New(305, 650, 0)
    end
    self.camera.targetTexture = self.render_tex
    local length = #Live2D.model_instances
    -- self.camera:SetCullingMask(0)
    -- self.camera:SetCullingMask(bit.lshift(1, 14))
    table.insert(Live2D.model_instances, self.container)
end

function Live2D:Destroy()
    for i = 1, #Live2D.model_instances do
        if Live2D.model_instances[i] == self.container then
            table.remove(Live2D.model_instances, i)
        end
    end
    UnityEngine.GameObject.Destroy(self.container.gameObject)
end

return Live2D