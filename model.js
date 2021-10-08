require('dotenv').config()

const mongoose = require('mongoose')

mongoose.connect(
    `${process.env.DB_URL}/${process.env.DB_TABLE}`,
    {
        useNewUrlParser: true,
        useUnifiedTopology: true
    }
)
    .then(() => console.log('MongoDB connected...\n'))
    .catch(err => console.log(err))

const compoundSchema = new mongoose.Schema({
    dealId: String
})

const timeSchema = new mongoose.Schema({
    time: Date
})

const paperCompoundSchema = new mongoose.Schema({
    dealId: String
})

mongoose.set('useFindAndModify', false)

const realCollection = mongoose.model(process.env.DB_REALCOLLECTION, compoundSchema)
const paperCollection = mongoose.model(process.env.DB_PAPERCOLLECTION, compoundSchema)
const bothCollection = mongoose.model(process.env.DB_COLLECTION, compoundSchema)
module.exports = {realCollection, paperCollection, bothCollection}
//module.exports = mongoose.model(process.env.DB_COLLECTION, paperCompoundSchema)
//module.exports = mongoose.papermodel(process.env.DB_COLLECTION, paperCompoundSchema)