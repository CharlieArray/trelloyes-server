require("dotenv").config();
const express = require("express");
const morgan = require("morgan");
const cors = require("cors");
const helmet = require("helmet");
const { NODE_ENV } = require("./config");
const { v4: uuid } = require('uuid');
const winston = require("winston");
const cardRouter = express.Router()
const bodyParser = express.json();


const app = express();

const cards = [
  {
    id: 1,
    title: "Card One",
    content: "Contents of Card One",
  },
];

const lists = [
  {
    id: 1,
    header: "List One",
    cardIds: [1],
  },
];

// set up winston
const logger = winston.createLogger({
  level: "info",
  format: winston.format.json(),
  transports: [new winston.transports.File({ filename: "info.log" })],
});

const morganOption = NODE_ENV === "production" ? "tiny" : "common";

app.use(morgan(morganOption));
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(cardRouter)

app.use(function validateBearerToken(req, res, next) {
  const apiToken = process.env.API_TOKEN;
  const authToken = req.get("Authorization");

  if (!authToken || authToken !== apiToken) {
    console.log(process.env.API_TOKEN, "this api token env");
    console.log(apiToken, "this is apiToken");
    logger.error(`Unauthorized request to path: ${req.path}`);
    return res.status(401).json({ error: "Unauthorized request" });
  }
  next();
});


cardRouter
  .route('/')
  .get((req, res) => {
  return res.send("Hello, world!")})

// Router for /card
cardRouter
  .route('/card')
  .get((req,res)=>{res.json(cards);})
  .post(bodyParser,(req,res)=>{
    const { title, content } = req.body;
    if (!title) {
      logger.error(`Title is required`);
      return res.status(400).send("Invalid data");
    }
  
    if (!content) {
      logger.error(`Content is required`);
      return res.status(400).send("Invalid data");
    }
  
    // get an id
    const id = uuid();
    const card = {
      id,
      title,
      content,
    };
  
    cards.push(card);
  
    logger.info(`Card with id ${id} created`);
  
    res.status(201).location(`http://localhost:8000/card/${id}`).json(card);
  })

// Router for /list
cardRouter
  .route('/list')
  .get((req,res)=>{res.json(lists)})
  .post(bodyParser,(req,res)=>{
    const { header, cardIds = [] } = req.body;

    if (!header) {
      logger.error(`Header is required`);
      return res
        .status(400)
        .send('Invalid data');
    }

    // check card IDs
    if (cardIds.length > 0) {
      let valid = true;
      cardIds.forEach(cid => {
        const card = cards.find(c => c.id == cid);
        if (!card) {
          logger.error(`Card with id ${cid} not found in cards array.`);
          valid = false;
        }
      });

      if (!valid) {
        return res
          .status(400)
          .send('Invalid data');
      }
    }

    // get an id
    const id = uuid();

    const list = {
      id,
      header,
      cardIds
    };

    lists.push(list);

    logger.info(`List with id ${id} created`);

    res
      .status(201)
      .location(`http://localhost:8000/list/${id}`)
      .json({id});
    })

// Router for /list/:id
cardRouter
  .route("/list/:id")
  .get((req, res) => {
// validate if specific card present
if (!list) {
  logger.error(`Could not find list with ${id} not found`);
  return res.status(404).send("List not found");
}
res.json(list);
  })
  .delete((req, res) => {
const { id } = req.params;

const listIndex = lists.findIndex(li => li.id == id);

if (listIndex === -1) {
  logger.error(`List with id ${id} not found.`);
  return res
    .status(404)
    .send('Not Found');
}

lists.splice(listIndex, 1);

logger.info(`List with id ${id} deleted.`);
res
  .status(204)
  .end();
  })

// Router for /card/:id
  cardRouter
  .route("/card/:id")
  .get((req, res) => {
  const { id } = req.params;
  const card = cards.find((c) => c.id == id);

  //validate we found card
  if (!card) {
    logger.error(`Card with id ${id} not found.`);
    return res.status(404).send("Card Not Found");
  }
  res.json(card);
  })
  .delete((req, res) => {
  const { id } = req.params;

  const cardIndex = cards.findIndex(c => c.id == id);

  if (cardIndex === -1) {
    logger.error(`Card with id ${id} not found.`);
    return res
      .status(404)
      .send('Not found');
  }

  //remove card from lists
  //assume cardIds are not duplicated in the cardIds array
  lists.forEach(list => {
    const cardIds = list.cardIds.filter(cid => cid !== id);
    list.cardIds = cardIds;
  });

  cards.splice(cardIndex, 1);

  logger.info(`Card with id ${id} deleted.`);

  res
    .status(204)
    .end();
  })

if (NODE_ENV !== "production") {
  logger.add(
    new winston.transports.Console({
      format: winston.format.simple(),
    })
  );
}

app.use(function errorHandler(error, req, res, next) {
  let response;
  if (NODE_ENV === "production") {
    response = { error: { message: "server error" } };
  } else {
    ~console.error(error);
    response = { message: error.message, error };
  }
  res.status(500).json(response);
});

module.exports = app;
