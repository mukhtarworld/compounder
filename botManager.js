require('dotenv').config()

const cron = require('node-cron')
const model = require('./model')
const threeCommasAPI = require('3commas-api-node')
const { parse } = require('dotenv')


//user inputs
const botIds = process.env.BOT_IDS.split(',') //[7212186]
const percentProfits =process.env.PERCENT_PROFITS.split(',') //[1]
const appModes = ["paper","real"]
const updateActiveDeals = process.env.UPDATE_ACTIVE_DEALS
const minimumFundForActiveDeals = process.env.MINIMUM_FUND_FOR_ACTIVE_DEALS
const interval = process.env.RUN_INTERVAL_IN_MINUTES


//adds fund to active deals
async function addFund(apiObject, bot, fundToAdd, minimumFund, fundCurrency){
    let message=''
    //get active deals for the bot
    const activeDeals = await apiObject.getDeals({scope: 'active', bot_id: bot['id']})
    
    if (activeDeals.length != 0) {
        //for now, only add for long bots
        if (activeDeals[0]['type'] != "Deal::ShortDeal"){
            //divide fund to the number of active deals
            const fundPerDeal = parseFloat(fundToAdd)/activeDeals.length
            let successAdded=[], fundAdded=0, log = '', prefix = '', suffix = ''
            //add fund to active deals if fundPerdeal is greater than minimumFund
            if (fundPerDeal >= minimumFund){
                for (const i of activeDeals) {
                    const currentPrice =parseFloat(i['current_price']) 
                    const quantity = fundPerDeal/currentPrice
                    const updateParam = {
                        quantity : quantity,
                        is_market : true,
                        rate: 0,
                        deal_id: i.id                
                    }
                    //add fund to the deal
                    const update = await apiObject.dealAddFunds(updateParam)
                    if (!update.error){
                        successAdded.push (i.id)
                        fundAdded += fundPerDeal
                    }
                    else {
                        log +='deal: ' + i.id + ' - ' + update.error + '\n'
                    }
                }

                //prepare output message
                if (successAdded.length == 0){
                    prefix = "\nUnable to add fund to any of the active deals. Following error was encountered:\n"
                    suffix = ''
                }
                else if (successAdded.length != activeDeals.length){
                    prefix = "\nUnable to add fund to one or more active deals. Following error was encountered:\n"
                    suffix = fundCurrency + roundDown(fundPerDeal,2) + ' was successfully added to each of these active deals:\n' + successAdded +'\n'
                }
                else {
                    prefix ='\n' + fundCurrency + roundDown(fundPerDeal,2) + ' was successfully added to each of these active deals:\n' + successAdded
                    log = ''
                    suffix = '\n'
                }
                message = prefix + log + suffix
            }
            else {
                message = '\nUnable to add fund to any active deals. ' + fundCurrency + roundDown(fundPerDeal,2) + ' is less' + 
            ' than minimum fund of ' + fundCurrency + minimumFund + '\n'
            }
        }
        else {
            message = "No fund added, it's a short deal"
            return message
        }
    }
    else {
        message = '\nNo active deals found for "' + bot['name'] + '"\n'
    }
    return message
}

//compound and update bot
async function compoundBot(apiObject, bot, totalProfit, profitCurrency, applicablePercent, dealArray) {
    
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
    const profitToCompound = totalProfit * applicablePercent       
    const baseProfitSplit = (parseFloat(profitToCompound / divisor))/maxActiveDeals
    const safetyProfitSplit = baseProfitSplit * factor

    // compound the profits from the deal to the bot's base volume and safety volume        
    const newBaseOrderVolume = parseFloat(baseOrderVolume) + baseProfitSplit       
    const newSafetyOrderVolume = parseFloat(safetyOrderVolume) + safetyProfitSplit

    // update bot with compounded values            
    let pairList=""
    for (const i of pairs){
        pairList +=i + ","
    }            
    //the following keys are there because they are mandatory... a 3commas thing
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
    const updateResult = await apiObject.botUpdate(updateParam) 
    let output, botMessage
    if (updateResult.error){
        botMessage = 'Error encountered updating "' + name + '": ' + updateResult.error
        output = {updateResult, botMessage}
    }
    else {
        const time = getCurrentTime()
        const plural = dealArray.length == 1 ? "" : "s"  
        botMessage = 'At ' + time + ', service ' + 'compounded "' + name + '"' + ' with ' + 
        applicablePercent*100 + '%' + ' of ' + profitCurrency + roundDown(totalProfit, 2) + 
        ' total profit from ' + dealArray.length + ' deal' + plural + ": \n" + dealArray + '\n\n' +
        'Base order size increased from ' + profitCurrency + baseOrderVolume + ' to ' + profitCurrency + newBaseOrderVolume +'\n' +
        'Safety order size increased from ' + profitCurrency + safetyOrderVolume + ' to ' + profitCurrency + newSafetyOrderVolume + '\n'
        
        output = {updateResult, botMessage}
    } 
    return output
}

//high level function to perform compounding
async function startCompounding (appModes, percentProfits, botIds, updateActiveDeals, minimumFundForActiveDeals) {   
    console.log('starting')
    
    //get percent profit and check if it's array matches bot id array
    let percentProfit
    if (percentProfits.length == 1){
        percentProfit = percentProfits[0]
    }
    else if (botIds.length != percentProfits.length){
        console.log("Array of bots and profit percents do not match in length, function will exit")
        return
    }
    
    //loop through each appModes for all bots
    for (const y of appModes){

        //get instance of api object to be using
        let api = new threeCommasAPI({
            apiKey: process.env.API_KEY,
            apiSecret: process.env.API_SECRET,
            appMode: y,            
          })
        
        let count = 0
        //loop the the bots
        for (const x of botIds) {    
            
            //get the bot info
            const bot = await api.botShow(x)
            //console.log("Tracking " + bot['name'] + ' with id: ' + x + ' for percent profit ' + percentProfits[count])
            const baseCurrency = bot['base_order_volume_type']
            const profitCurrency = bot['profit_currency']
            const currency = profitCurrency=='quote_currency' ? '$' :''

            //bot will be updated if it meets these conditions
            if (bot['base_order_volume_type'] !== 'percent' && baseCurrency == profitCurrency) {
                //get the completed deals for current bot
                const deals = await api.getDeals({scope: 'finished', bot_id: x}) 
                
                //loop through the deals synchronously to carry out next steps
                var profitSum = 0
                var dealArray = []
                var compoundedDealsCount = 0
                for (const i of deals) {

                    if (i['localized_status'] == 'Completed' || i['localized_status'] == 'Closed at Market Price') {
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
                        
                        // if deal hasn't been registered yet, we're good to start our compounding magic
                        //get total profit from all completed deals
                        if (deal.length === 0) {
            
                            const profit = profitCurrency == 'quote_currency' ? parseFloat(i['final_profit']) : parseFloat(i['reserved_second_coin'])*(-1) 
                        
                            compoundedDealsCount += 1
                            profitSum += profit
                            dealArray.push(' deal ' + dealId + ': ' + currency + roundDown(profit, 2) )
                        }
                    }
        
                    
                }
        
                //compound the total profit
                if (profitSum != 0) {  
                    //get actual profit to compound per percent specification
                    if (percentProfits.length != 1){
                        percentProfit = percentProfits[count]
                    }     

                    //update the bot
                    let {updateResult, botMessage} = await compoundBot(api, bot, profitSum, currency, percentProfit, dealArray) 

                    if (updateResult.error) {   
                        console.log(botMessage)                      
                    } 
                    else {
                        //if bot was updated successfully, addfund to it's active deals if requested, and provided it is a long bot
                        let dealsMessage=''
                        if (updateActiveDeals=='true'){ 
                            const compoundedProfit = profitSum * percentProfit     
                            dealsMessage = await addFund(api, bot, compoundedProfit, minimumFundForActiveDeals, currency)
                        } 
                        
                        //prepare output
                        const startEndLine =  "=====================\n"                         
                        const logMessage = startEndLine + botMessage + dealsMessage + startEndLine
                        console.log(logMessage)                   

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
                //increment count for the next bot
                count+=1  
                // wait for 1 secs after finishing one bot to prevent 3commas rate limit issue     
                await sleep(1000)
            }
        }
    }    
}

/*const compound = async () => { 
    startCompounding(appModes, percentProfits, botIds, updateActiveDeals, minimumFundForActiveDeals)
}*/

function compound(){
    startCompounding(appModes, percentProfits, botIds, updateActiveDeals, minimumFundForActiveDeals)
}

function sleep(ms) {
    return new Promise((resolve) => {
      setTimeout(resolve, ms);
    });
}

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

//cron.schedule('30 * * * * *', () => compound(), {})

async function main() {
    let {error, result} = await getCRONstring(interval)
    if (error == 'true') {
        console.log(result);
        process.exit()        
    }
    else{
        cron.schedule(result, () => compound(), {})
    }
}
  
if (require.main === module) {
    main();
}

async function getCRONstring (compoundingInterval) {
    let minute = parseInt(compoundingInterval)
    let output, error ='',result=''
    if (minute > 10080){
        result = 'Compounding interval cannot be greater than 10,080 minutes or 7 days. Exiting the process...'
        error = 'true'
    }
    else {
        const day = Math.floor(minute/(60*24))
        let remMinute = minute % (60*24)
        let hour = Math.floor(remMinute/60)
        let localMinute = remMinute % 60

        let dayString='', hourString='', minuteString=''
        if (day == 0) {
            dayString = '*'
            if (hour == 0) {
                hourString = '*'
                if (localMinute == 0) {
                    minuteString = '*'
                }
                else {
                    minuteString = '*/' + localMinute
                }   
            }
            else {
                hourString = '*/' + hour
                minuteString = localMinute
            }
        }
        else {
            dayString = '*/' + day
            hourString = hour
            minuteString = localMinute
        }
        
        result = '0 ' + minuteString + ' ' + hourString + ' ' + dayString + ' * *'
        error = 'false'
    }
    output = {error, result}
    return output
}



