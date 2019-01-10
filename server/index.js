const keys = require('./keys');

//Express App Setup

const express = require('express');
const bodyParser =  require('body-parser');
const cors = require('cors');


const app = express();
app.use(cors());
app.use(bodyParser.json());

// Postgres Clinet Setup
const { Pool } = require('pg');
const pgClient = new Pool({
    user: keys.pgUser,
    host: keys.pgHost,
    database: keys.pgDatabase,
    password: keys.pgPassword,
    port: keys.pgPort
});

pgClient.on('error',()=> console.log('Lost PG connection'));

pgClient
    .query('CREATE TABLE IF NOT EXISTS values(number INT)')
    .catch(err => console.log(err));

// Redis Clinet Setup

const redis = require('redis');
const redisClinet = redis.createClient({
    host: keys.redisHost,
    port: keys.redisPort,
    retry_strategy: () => 1000

});
const redisPublisher = redisClinet.duplicate();

// Express route Handlers

app.get('/', (req,res) => {
    res.send('Hi');
});

app.get('/values/all', async(req, res) => {
    const values = await pgClient.query('SELECT *  from values');

    res.send(values.rows);

});

app.get('/values/current', async(req,res) => {
  redisClinet.hgetall('values', (err, values) =>{
      res.send(values);
  });
});

app.post('/values', async(req, res)=>{
    const index = req.body.index;

    if(parseInt(index) > 40 ){
        return res.status(422).send('Index too High')
    }
    redisClinet.hset('values', index, 'Nothing yet!');
    redisPublisher.publish('insert', index);
    pgClient.query('INSERT INTO values(number) VALUES($1)',[index]);

    res.send({woking: true});

});
app.listen(5000, err =>{
    console.log('listening');
});
