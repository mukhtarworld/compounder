# 3Commas Compounding

This is a helper utility to take the profits from your completed deals and compound them to the bots base order size.

Be aware that this will take your profit numbers and round them down. So `$0.147` will be calculated as `$0.14` and not `$0.15`.

To get started copy `.env.example` to `.env` and fill in the fields.

This uses `mongoosedb` to store and save the deal ID into a database to keep track of deals already compounded. 

## Dependencies
- [node](https://nodejs.org)
- [yarn](https://yarnpkg.com/) (if your not using npm which is installed by default when you install nodejs)

## 3Commas API
![create an API key in 3Commas](https://github.com/mukhtarworld/compounder/blob/updated_v3/img/step1.png?raw=true)
![create an API key in 3Commas](https://github.com/mukhtarworld/compounder/blob/updated_v3/img/step2.png?raw=true)
![create an API key in 3Commas](https://github.com/mukhtarworld/compounder/blob/updated_v3/img/step3.png?raw=true)

## MongoDB Atlas
![Get mongodb connection](https://github.com/mukhtarworld/compounder/blob/updated_v3/img/mongodb%20connect%204.png?raw=true)
![Get mongodb connection](https://github.com/mukhtarworld/compounder/blob/updated_v3/img/mongodb%20connect%201.png?raw=true)
![Get mongodb connection](https://github.com/mukhtarworld/compounder/blob/updated_v3/img/mongodb%20connect%202.png?raw=true)
![Get mongodb connection](https://github.com/mukhtarworld/compounder/blob/updated_v3/img/mongodb%20connect%203.png?raw=true)

## Install
`npm install` or `yarn install`

## Run
`node index.js`

this will run once every minute. In the console you'll get results like these:

![API output](https://github.com/mukhtarworld/compounder/blob/updated_v3/img/results.png?raw=true)

## Roadmap
- [ ] reformat to make code modular
- [ ] change data storage medium
- [ ] investigate ability to compound profit based on time of completion instead of storing completed deals in database
- [ ] add ability to compound grid bots
- [ ] send you a text message everytime compounding occurs with Twilio
- [ ] option to use Telegram to get messages when something happens
- [ ] and/or Slack messages
- [ ] provide guide on using AWS lambda functions to fire off the API
