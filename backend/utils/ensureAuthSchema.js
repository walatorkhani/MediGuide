const sequelize=require("../config/database");
async function ensureAuthSchema(){const qi=sequelize.getQueryInterface();const table=await qi.describeTable("Users");if(!table.emailVerifie)await qi.addColumn("Users","emailVerifie",{type:"BOOLEAN",allowNull:false,defaultValue:true});if(!table.codeVerificationEmail)await qi.addColumn("Users","codeVerificationEmail",{type:"VARCHAR(255)",allowNull:true});if(!table.codeVerificationExpireAt)await qi.addColumn("Users","codeVerificationExpireAt",{type:"TIMESTAMP WITH TIME ZONE",allowNull:true});}
module.exports={ensureAuthSchema};
