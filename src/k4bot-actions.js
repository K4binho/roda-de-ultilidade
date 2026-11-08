const path=require('node:path');
const command=path.join(process.env.WINDIR||'C:\\Windows','System32','cmd.exe');
const actions={
 'k4bot-start':{target:path.join('E:\\projetos\\K4Bot','iniciar-bot.bat')},
 'k4bot-stop':{target:path.join('E:\\projetos\\K4Bot','fechar-bot.bat')}
};
function isTrustedK4BotAction(item){
 const action=actions[item.id];
 return !!action&&item.type==='command'&&item.target.toLowerCase()===command.toLowerCase()&&
  JSON.stringify(item.args)===JSON.stringify(['/d','/c','call',action.target]);
}
function isK4BotActionId(id){return Object.hasOwn(actions,id);}
module.exports={isTrustedK4BotAction,isK4BotActionId};
