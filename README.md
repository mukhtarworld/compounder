# 3Commas Compounding

This is a helper utility to take the profits from your completed deals and compound them to the bot's base order and safety order sizes. It determines the required profit part to split into both the base order and safety order sizes by taking into consideration the factor between base order size and safety order size, number of safety orders, and maximum active deals.

Be aware that this will take your profit numbers and round them down. So `$0.147` will be calculated as `$0.14` and not `$0.15`.

This uses `mongoosedb` to store and save the deal ID into a database to keep track of deals already compounded. You can create a free mongodb atlas account to host your database.

To get started, copy `.env.example` to `.env` and fill in the fields. 
- Note 1: The `PERCENT_PROFITS` is the required percentage of the total profit you wish to be compounding. Value should be from 0.0 (zero percent of profit) to 1.0 (100 percent of profit).
- Note 2: Fill in the bot ids you wish to be compounding profit for as an array separated by just a comma with no space afterwards `e.g BOT_IDS=123456,654321,001122`. Also, fill the `PERCENT_PROFITS` as an array similar to `BOT_IDS` with each entry corresponding to the bot id to compound, `e.g PERCENT_PROFITS=1.0,1.0,0.5` will compound 100% of profit for `bot 123456`, 100% of profit for `bot 654321`, and 50% of profit for `bot 001122`. If `PERCENT_PROFITS` is filled with single entry `e.g PERCENT_PROFITS=0.7`, then 70% of profit will be used for all bots

 

## Dependencies
- [node](https://nodejs.org)
- [yarn](https://yarnpkg.com/) (if your not using npm which is installed by default when you install nodejs)
- [mongoDB](https://docs.atlas.mongodb.com/getting-started/) (to use mongoDB in the cloud using Atlas)

## Latest working branch
`updated_v3`

## 3Commas API
![create an API key in 3Commas](https://github.com/mukhtarworld/compounder/blob/updated_v3/img/step1.png?raw=true)
![create an API key in 3Commas](https://github.com/mukhtarworld/compounder/blob/updated_v3/img/step2.png?raw=true)
![create an API key in 3Commas](https://github.com/mukhtarworld/compounder/blob/updated_v3/img/step3.png?raw=true)

## MongoDB Atlas
![Get mongodb connection](https://github.com/mukhtarworld/compounder/blob/updated_v3/img/mongodb%20connect%204.png?raw=true)
![Get mongodb connection](https://github.com/mukhtarworld/compounder/blob/updated_v3/img/mongodb%20connect%201.png?raw=true)
![Get mongodb connection](https://github.com/mukhtarworld/compounder/blob/updated_v3/img/mongodb%20connect%202.png?raw=true)
![Get mongodb connection](https://github.com/mukhtarworld/compounder/blob/updated_v3/img/mongodb%20connect%203.png?raw=true)

Copy the connection link and replace username and password. Also, delete the `&w=majority` in the `.env` file.

## Install
`npm install` or `yarn install`

## Run
`node index.js`

this will run once every minute. In the console you'll get results like this:

![API output](https://github.com/mukhtarworld/compounder/blob/updated_v3/img/results.png?raw=true)

## Roadmap
- [ ] investigate ability to compound profit based on time of completion instead of storing completed deals in database
- [ ] develop app as standalone for users with no programming background
- [ ] investigate ability to send text message everytime compounding occurs with Twilio
- [ ] investigate option to use Telegram to get messages when something happens
