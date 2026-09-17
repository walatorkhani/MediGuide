const PERMISSIONS = {
 patient:["profile:read","profile:write","facility:read","appointment:read","appointment:create","appointment:cancel","review:create","review:read"],
 professionnel:["profile:read","profile:write","facility:read","facility:write","appointment:read","appointment:update","availability:read","availability:write","review:read","product:read","product:write","demand:read","demand:write","consultation:read","consultation:write","notification:read"],
 administrateur:["user:read","user:write","facility:read","facility:write","review:read","review:moderate","stats:read"]
};
const getPermissions = role => PERMISSIONS[role] || [];
module.exports={PERMISSIONS,getPermissions};
