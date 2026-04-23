import { Bot, Intent, command, name, describe, message } from '@argon-sdk/core'


if(!process.env.BOT_TOKEN){
    console.log("please enter BOT_TOKEN in .env")
    process.exit(1)
}
 const bot = new Bot(process.env.BOT_TOKEN, {
  intents: Intent.Messages | Intent.Commands,
})
 
export  function getInstanceArgonbot(){
    return bot
}