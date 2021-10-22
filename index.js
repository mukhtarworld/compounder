require('dotenv').config()

const cron = require('node-cron')
const model = require('./model')
const threeCommasAPI = require('3commas-api-node')
 
const api = new threeCommasAPI({
  apiKey: process.env.API_KEY,
  apiSecret: process.env.API_SECRET,
  appMode: "paper"
  // url: 'https://api.3commas.io' // this is optional in case of defining other endpoint
})

//user input
const botIds = [6362860]//[6115959, 6117435, 6107349, 6242171, 6254325, 6286865] //array of bots eligible for compunding
const percentProfit = 1 //percent of profit to compound from 0.0 to 1.0

function roundDown(number, decimals) {
    decimals = decimals || 0;
    return ( Math.floor( number * Math.pow(10, decimals) ) / Math.pow(10, decimals) );
}

//To do...will try to compound the profit by comparing completed deals since the last time api checked
function getCurrentTime() {
    var today = new Date();
    var date = today.getFullYear() + '-' + (today.getMonth() + 1) + '-' + today.getDate();
    var time = today.getHours() + ":" + today.getMinutes() + ":" + today.getSeconds();
    var dateTime = date + ' ' + time;
    return dateTime;
}
//get or save last run time
const lastTime = { time: new Date() }
var startTime = getCurrentTime()

//start the compounding process
const compound = async () => {
    for (const x of botIds) {    

        //get the completed deals for current bot
        const deals = await api.getDeals({scope: 'finished', bot_id: x}) 

        //loop through the deals synchronously to carry out next steps
        var profitSum = 0
        var dealArray = []
        var compoundedDealsCount = 0
        for (const i of deals) {
            
            // check if deal has already been compounded
            const dealId = i.id
            let deal
            if (api.appMode == "paper") {
                deal = await model.paperCollection.find({ dealId })
            }
            else if(api.appMode == "real")  {
                deal = await model.realCollection.find({ dealId })
            }
            else {
                deal = await model.bothCollection.find({ dealId })
            }
            //const deal = await model.find({ dealId })
            //const closedTime = i['closed_at']

            // if deal hasn't been registered yet, we're good to start our compounding magic
            //get total profit from all completed deals
            if (deal.length === 0) {

                const profit = parseFloat(i['final_profit'])
                compoundedDealsCount += 1
                profitSum += profit
                dealArray.push(' deal ' + dealId + ': $' + roundDown(profit, 2) )
            }
        }


        // get the bot attached to the deal and continue if some profit has been made
        if (profitSum != 0) {            
            const bot_id = x
            const bot = await api.botShow(bot_id)
            const baseOrderVolume = bot['base_order_volume']
            const safetyOrderVolume = bot['safety_order_volume']     
            const safetyVolumeScale = bot['martingale_volume_coefficient']
            const maxActiveDeals = bot['max_active_deals']
            const pairs = bot['pairs']
            const name = bot['name']
            const safetyOrderStepPercentage = bot['safety_order_step_percentage']
            const safetyOrderMaxSize = bot['max_safety_orders']
            const factor = safetyOrderVolume / baseOrderVolume

            //get divisor to split the profit into base order and safety order, it depends on safety volume scale and ratio of safety volume to base volume
            var divisor = 1
            if (safetyVolumeScale == 1) {
                divisor = safetyOrderMaxSize * factor + 1
            }
            else {
                divisor = ((1 - Math.pow(safetyVolumeScale, safetyOrderMaxSize)) / (1 - safetyVolumeScale)) * factor + 1
            }

            //divide profit to base and safety splits
            const compoundedProfit = profitSum * percentProfit
            const baseProfitSplit = roundDown((parseFloat(compoundedProfit / divisor))/maxActiveDeals, 2)
            const safetyProfitSplit = roundDown(baseProfitSplit * factor, 2)

            // compound the profits from the deal to the bot's base volume and safety volume        
            const newBaseOrderVolume = parseFloat(baseOrderVolume) + baseProfitSplit       
            const newSafetyOrderVolume = parseFloat(safetyOrderVolume) + safetyProfitSplit

            // update bot with compounded values            
            let pairList=""
            for (const i of pairs){
                pairList +=i + ","
            }            
            // (the following keys are there because they are mandatory... a 3commas thing)
            const updateParam = {
                name : bot['name'],
                pairs : pairList,
                max_active_deals: bot['max_active_deals'],
                base_order_volume: newBaseOrderVolume, // this is what we're interested in
                take_profit: bot['take_profit'],
                safety_order_volume: newSafetyOrderVolume, // and this               
                martingale_volume_coefficient: bot['martingale_volume_coefficient'],
                martingale_step_coefficient: bot['martingale_step_coefficient'],
                max_safety_orders: safetyOrderMaxSize,
                active_safety_orders_count: bot['active_safety_orders_count'],
                safety_order_step_percentage: safetyOrderStepPercentage,
                take_profit_type: bot['take_profit_type'],
                strategy_list: bot['strategy_list'],
                bot_id: bot['id']
            }

            if (bot['base_order_volume_type'] !== 'percent') {

                const update = await api.botUpdate(updateParam)                
                const plural = dealArray.length == 1 ? "" : "s"

                const log = (error) => {
                    // log
                    const time = getCurrentTime()
                    //console.log("=====================")
                    const logMessage = "=====================\n" + 'At ' + time + ', service ' + 'compounded ' + name + '"' + ' with ' + 
                    percentProfit*100 + '%' + ' of $' + roundDown(profitSum, 2) + 
                    ' total profit from ' + compoundedDealsCount + ' deal' + plural + ": \n" + dealArray + '\n\n' +
                    'Base order size increased from $' + baseOrderVolume + ' to $' + newBaseOrderVolume +'\n' +
                    'Safety order size increased from $' + safetyOrderVolume + ' to $' + newSafetyOrderVolume + '\n' +
                    "=====================\n"

                    const errorMessage = update.error
                    const message = error ? errorMessage : logMessage
                   /* const prefix = error ? 'There was an error compounding bot ' : 'At ' + time + ', service ' + 'compounded '
                    const percent = percentProfit*100 + '%'
                    console.log(prefix + '"' + name + '"' + ' with ' + percent + ' of $' + roundDown(profitSum, 2) + 
                    ' total profit from ' + compoundedDealsCount + ' deal' + plural + ": " )
                    console.log(dealArray + '\n')
                    console.log('Base order size increased from $' + baseOrderVolume + ' to $' + newBaseOrderVolume)
                    console.log('Safety order size increased from $' + safetyOrderVolume + ' to $' + newSafetyOrderVolume)
                    //console.log('Deal - ' + dealId)

                    /*console.log(updateParam)
                    console.log('Base Profit - $' + baseProfit)
                    console.log('Profit Split - $' + profitSplit)
                    console.log('Old Base Price -  $' + baseOrderPrice)
                    console.log('New Base Price -  $' + newBasePrice)
    
                    console.log('Old Safety Price -  $' + safetyOrderPrice)
                    console.log('New Safety Price -  $' + newSafetyOrderPrice.toFixed(2))
                    console.log('Pairs - ', pairs)

                    console.log("=====================\n")*/
                    console.log(message)
                }

                if (update.error) {
                    log(true)
                } else {
                    log()
                    // save deals to database so that they won't be compounded again
                    deals.map(async (deal) => {
                        const dealId = deal.id
                        let dealData
                        if (api.appMode == "paper") {
                            dealData = await model.paperCollection.find({ dealId })

                            if (dealData.length === 0) {
                                const compoundedDeal = new model.paperCollection({ dealId })
    
                                await compoundedDeal.save()
                            }

                        }
                        else if (api.appMode == "real")  {
                            dealData = await model.realCollection.find({ dealId })

                            if (dealData.length === 0) {
                                const compoundedDeal = new model.realCollection({ dealId })
    
                                await compoundedDeal.save()
                            }
                        }
                        else {
                            dealData = await model.realCollection.find({ dealId })
                            if (dealData.length === 0) {
                                const compoundedDeal = new model.bothCollection({ dealId })

                                await compoundedDeal.save()
                            }
                        }
                        
                    })

                }
            }
        }

    }
}

cron.schedule('30 * * * * *', () => compound(), {})

