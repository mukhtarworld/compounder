# 3Commas Compounding

This is a helper utility to take the profits from your completed deals and compound them to the bot's base order and safety order sizes. It determines the required profit part to split into both the base order and safety order sizes by taking into consideration the factor between base order size and safety order size, number of safety orders, and maximum active deals.

It also has the functionality to divide the same profit into other active deals of the bot in order to fully compounding the profit instead of waiting for the deals to close before using the profit through increased base order and safety.

This uses `mongoosedb` to store and save the deal ID into a database to keep track of deals already compounded. You can create a free mongodb atlas account to host your database.

To get started, copy `.env.example` to `.env` and fill in the fields. 
- **Note 1:** The `PERCENT_PROFITS` is the required percentage of the total profit you wish to be compounding. Value should be from 0.0 (zero percent of profit) to 1.0 (100 percent of profit).
- **Note 2:** Fill in the bot ids you wish to be compounding profit for as an array separated by just a comma with no space afterwards `e.g BOT_IDS=123456,654321,001122`. Also, fill the `PERCENT_PROFITS` as an array similar to `BOT_IDS` with each entry corresponding to the bot id to compound, `e.g PERCENT_PROFITS=1.0,1.0,0.5` will compound 100% of profit for `bot 123456`, 100% of profit for `bot 654321`, and 50% of profit for `bot 001122`. If `PERCENT_PROFITS` is filled with single entry `e.g PERCENT_PROFITS=0.7`, then 70% of profit will be used for all bots
- **Note 3:** Set `UPDATE_ACTIVE_DEALS` to `true or false` depending if you wish to add the same profit to other active deals instantly or not. For this to work, there is a minimum fund that can be added to an active deal and this depend on the exchange's requirement. By default, I set `MINIMUM_FUND_FOR_ACTIVE_DEALS` to `1.0` and it works for many pairs while this minimum fails for some other pairs. The `MINIMUM_FUND_FOR_ACTIVE_DEALS` can be set to any value greater than or equal to `1.0`
- **Note 4:** Set the `RUN_INTERVAL_IN_MINUTES` to any integer number between `1` and `10080`, `e.g RUN_INTERVAL_IN_MINUTES=2` will run the application every 2 minutes and `RUN_INTERVAL_IN_MINUTES=180` will run the application every 3 hours. The application currently has capability to use maximum of `10080` which is every `7 days` as the run interval 

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

## Changelog
**2021-12-09**
- in addition to updating base and safety orders for every profit, application can now add the same profit to other active
deals of the same bot
- added ability for user to specify preferred compounding interval in minutes instead of every minute by default

**2021-12-03**
- fixed bug related to running paper and real accounts together
- added ability for each bot to have separate entry for profit percent to compound

**2021-12-01**
- updated app to automatically handle paper and real accounts together without the need to specify option in the `env file`
- added ability for each bot to have separate entry for profit percent to compound

**2021-11-17**
- implemented correct compounding for short bots

**2021-10-28**
- fixed issues related to compounding small profits

**2021-10-24**
- fixed rate limit issue with multiple bots running at the same time

**2021-10-20**
- released first working version
