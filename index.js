require('dotenv').config()

//const api = require('./api')
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
const botIds = [/*6115959, 6117435, 6107349, 6242171,*/ 6254325, 6286865] //array of bots eligible for compunding [6107349]
const percentProfit = 1 //percent of profit to compound
const timeInterval = 25 //time interval to compound in minutes

function roundDown(number, decimals) {
    decimals = decimals || 0;
    return ( Math.floor( number * Math.pow(10, decimals) ) / Math.pow(10, decimals) );
}

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

const compound = async () => {
    for (const x of botIds) {    

        const deals = await api.getDeals({scope: 'completed', bot_id: x}) /*await api.payload('GET', '/public/api/ver1/deals?', {
            scope: 'completed', bot_id: x
        })*/

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
            const closedTime = i['closed_at']

            // if deal hasn't been registered yet, we're good to start our compounding magic
            if (deal.length === 0) {

                //check if deal has recently completed

                const profit = parseFloat(i['final_profit'])
                compoundedDealsCount += 1
                profitSum += profit
                dealArray.push(' deal ' + dealId + ': $' + roundDown(profit, 2) )
            }
        }


        // get the bot attached to the deal and continue if some profit has been made
        if (profitSum != 0) {            
            const bot_id = x
            const bot = await api.botShow(bot_id) //await api.payload('GET', `/public/api/ver1/bots/${bot_id}/show?`, { bot_id })
            const baseOrderVolume = bot['base_order_volume']
            const safetyOrderVolume = bot['safety_order_volume']     
            const safetyVolumeScale = bot['martingale_volume_coefficient']
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
            const baseProfitSplit = roundDown(parseFloat(compoundedProfit / divisor), 2)
            const safetyProfitSplit = roundDown(baseProfitSplit * factor, 2)

            // compound the profits from the deal to the bot's base volume and safety volume        
            const newBaseOrderVolume = parseFloat(baseOrderVolume) + baseProfitSplit       
            const newSafetyOrderVolume = parseFloat(safetyOrderVolume) + safetyProfitSplit

            // update bot with compounded values
            // (the following keys are there because they are mandatory... a 3commas thing)
            let pairList=""
            for (const i of pairs){
                pairList +=i + ","
            }
            //pairList.substr(0,(pairList.length-2))
            const updateParam = {
                name : bot['name'],
                pairs : pairList,
                base_order_volume: newBaseOrderVolume, // this is what we're interested in, compound 1/3 of if to the base
                take_profit: bot['take_profit'],
                safety_order_volume: newSafetyOrderVolume, // compound the remaining 2/3 to the safety order
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

                // If you want to preview the data before its saved and updated on your account, comment out this line
                const update = await api.botUpdate(updateParam) //await api.payload('PATCH', `/public/api/ver1/bots/${bot_id}/update?`, updateParam)

                // and use this one instead
                //const update = { error: true }

                const log = (error) => {
                    // log
                    const time = getCurrentTime()
                    console.log("=====================")
                    const prefix = error ? 'here was an error compounding bot ' : 'At ' + time + ', service ' + 'compounded '
                    const percent = percentProfit*100 + '%'
                    console.log(prefix + '"' + name + '"' + ' with ' + percent + ' of $' + roundDown(profitSum, 2) + ' total profit from ' + compoundedDealsCount + ' deals: ')
                    console.log(dealArray + '\n')
                    console.log('Base order size increased from $' + baseOrderVolume + ' to $' + newBaseOrderVolume)
                    console.log('Safety order size increased from $' + safetyOrderVolume + ' to $' + newSafetyOrderVolume + '\n')
                    //console.log('Deal - ' + dealId)

                    console.log(updateParam)
                    /*console.log('Base Profit - $' + baseProfit)
                    console.log('Profit Split - $' + profitSplit)
                    console.log('Old Base Price -  $' + baseOrderPrice)
                    console.log('New Base Price -  $' + newBasePrice)
    
                    console.log('Old Safety Price -  $' + safetyOrderPrice)
                    console.log('New Safety Price -  $' + newSafetyOrderPrice.toFixed(2))
                    console.log('Pairs - ', pairs)*/
                    console.log("=====================\n")
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
// compound()
