const {getPermissions}=require("../config/permissions");
module.exports=(...permissions)=>(req,res,next)=>{
 const current=req.user?.permissions?.length?req.user.permissions:getPermissions(req.user?.role);
 if(!permissions.every(p=>current.includes(p))) return res.status(403).json({message:"Permission insuffisante."});
 next();
};
