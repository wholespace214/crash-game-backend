# Wallfair. Playmoney V1 Server-Side

# Usage

Step 1: Download repo and install modules

```bash
git clone https://github.com/wallfair-organization/server-side
cd server-side
npm install
```

Step 2: Start the docker containers needed

```
docker-compose -f docker/docker-compose.yml up -d
```

Step 3: Create a `.env` file (see `.env.example`) and start the server with:

```
# copy .env file from email
npm run start
```

Step 4: Configure the mongo container for replication

```
docker exec -it mongodb-wall bash

mongo -u wallfair -p walfair

rs.initiate( {
   _id : "rs0",
   members: [
      { _id: 0, host: "localhost:27017" },
   ]
});
```

Step 5: Run the postgresql config

```
docker exec -it docker_postgres_1 bash
psql -U postgres testdb

CREATE TABLE IF NOT EXISTS token_transactions (ID SERIAL PRIMARY KEY, sender varchar(255) not null, receiver varchar(255) not null, amount bigint not null, symbol varchar(255) not null, trx_timestamp timestamp not null);
CREATE TABLE IF NOT EXISTS token_balances (owner varchar(255) not null, balance bigint not null, symbol varchar(255) not null, last_update timestamp not null, PRIMARY KEY(owner, symbol));
CREATE TABLE IF NOT EXISTS bet_reports (bet_id varchar(255) not null PRIMARY KEY, reporter varchar(255) not null, outcome smallint not null, report_timestamp timestamp not null);
CREATE TABLE IF NOT EXISTS amm_interactions (ID SERIAL PRIMARY KEY, buyer varchar(255) NOT NULL, bet varchar(255) NOT NULL, outcome smallint NOT NULL, direction varchar(10) NOT NULL, investmentAmount bigint NOT NULL, feeAmount bigint NOT NULL, outcomeTokensBought bigint NOT NULL, trx_timestamp timestamp NOT NULL);
```

# Api-Endpoints

### Auth

Header:
"Authorization: Bearer jwtToken"

## User Endpoints
### POST http://localhost:8000/api/user/login

Request:
```json
{
  "phone": "+49123123123"
}
```

Successful Result:
```json
{
  "phone": "+49123123123",
  "smsStatus": "pending"
}
```

### POST http://localhost:8000/api/user/verifyLogin

Request:
```json
{
  "phone": "+49123123123",
  "smsToken": "013416"
}
```

Successful Result:
```json
{
  "userId": "608ae87f8e78eb0224ad3e28",
  "phone": "+49123123123",
  "name*": "Max",
  "email*": "max@max.de",
  "session": "jwtToken"
}
```

*Optional only if provided


### GET http://localhost:8000/api/user/:userId

Successful Result:
```json
{
  "userId": "608ae87f8e78eb0224ad3e28",
  "name*": "Max",
  "profilePictureUrl*": "https://previewImageUrl.asd",
  "balance": 900
}
```

### GET http://localhost:8000/api/user/history

Successful Result:
```json
[
    {
        "id": 1,
        "buyer": "60cf4588bf102d5fc4c1b475",
        "bet": "60cf46a61ef95168648364ab",
        "outcome": "yes",
        "direction": "BUY",
        "investmentamount": "100000",
        "feeamount": "1000",
        "outcometokensbought": "197902",
        "trx_timestamp": "2021-06-20T13:47:38.937Z"
    },
    {
        "id": 2,
        "buyer": "60cf4588bf102d5fc4c1b475",
        "bet": "60cf46a61ef95168648364ab",
        "outcome": "yes",
        "direction": "SELL",
        "investmentamount": "49541",
        "feeamount": "1000",
        "outcometokensbought": "100000",
        "trx_timestamp": "2021-06-20T19:20:08.487Z"
    }
]
```


### GET http://localhost:8000/api/user/refList

Successful Result:
```json
{
  "userId": "60b50d820619b44617959d43",
  "refList": [
    {
      "id": "60b50d820619b44617959d43",
      "name": "Nicholas",
      "email": "nicholas@wallfair.io"
    }
  ]
}
```

*Optional only if provided


## Event Endpoints
### GET http://localhost:8000/api/event/get/ID

Successful Result:
```json
{
  "_id": "6091c24cae92745024088c74",
  "title": "test",
  "liveMode": true,
  "liveStreamUrl": "https://www.google.de/",
  "endDate": "1999-12-31T23:00:00.000Z",
  "date": "2021-05-04T21:53:16.734Z",
  "__v": 0
}
```

### GET http://localhost:8000/api/event/list

Successful Result:
```json
[
  {
    "bets": [
      {
        "_id": "60a7ff5364dee4f956660797",
        "marketQuestion": "Wer gewinnt Redbull",
        "hot": true,
        "outcomes": [
          {
            "index": 0, 
            "name": "Jonas"
          },
          {
            "index": 0, 
            "name": "Jörn"
          }
        ],
        "event": "60a7f9bdc0a1a7f8913b4a23",
        "creator": "60a35b31bbb1f700155f2066",
        "date": "2021-05-21T18:43:31.908Z",
        "__v": 0
      },
      {
        "_id": "60a7ffb464dee4f956660799",
        "marketQuestion": "Wer gewinnt Redbull2",
        "hot": true,
        "outcomes": [
          {
            "index": 0,
            "name": "Jonas"
          },
          {
            "index": 0,
            "name": "Jörn"
          }
        ],
        "event": "60a7f9bdc0a1a7f8913b4a23",
        "creator": "60a35b31bbb1f700155f2066",
        "date": "2021-05-21T18:45:08.324Z",
        "__v": 0
      }
    ],
    "_id": "60a7f9bdc0a1a7f8913b4a23",
    "name": "Redbull",
    "tags": [
      {
        "_id": "60a7f9bdc0a1a7f8913b4a24",
        "name": "jo"
      },
      {
        "_id": "60a7f9bdc0a1a7f8913b4a25",
        "name": "joooo"
      }
    ],
    "previewImageUrl": "https://previewImageUrl.asd",
    "streamUrl": "https://google.com",
    "date": "2021-05-21T18:19:41.671Z",
    "__v": 2
  }
]
```

### GET http://localhost:8000/api/event/list/:type/:category/:count/:page/:sortby/:searchQuery

* :type can be 'all', 'streamed', 'non-streamed', 'game'
* :category can be 'all', 'streamed-esports', 'streamed-shooter', 'streamed-mmorpg', 'streamed-other', 'sports', 'politics', 'crypto', 'celebrities', 'other'
* :searchQuery is optional
* :page is 1-based
* :sortby is an Event property to be used in mongoose syntax (ex: name (asc), -name (desc))

Successful Result:
```json
[
    {
        "_id": "6107e58bf0a40958ecaab7f3",
        "bets": [
            "6107e5c9f0a40958ecaab932",
            "6107e704f0a40958ecaac05a"
        ],
        "name": "FIFA Match CyrusTwo",
        "streamUrl": "...",
        "previewImageUrl": "...",
        "tags": [
            {
                "_id": "6107e58bf0a40958ecaab7f4",
                "name": "fifa"
            },
            {
                "_id": "6107e58bf0a40958ecaab7f5",
                "name": "soccer"
            }
        ],
        "date": "2021-08-02T22:00:00.000Z",
        "__v": 2,
        "category": "Esports",
        "type": "streamed"
    }
]
```

### POST http://localhost:8000/api/event/create

Request:
```json
{
  "name": "Redbull",
  "tags": [
    { "name": "jo" },
    { "name": "joooo" }
  ],
  "streamUrl": "https://google.com",
  "previewImageUrl": "https://previewImageUrl.asd"
}
```

Successful Result:
```json
{
  "_id": "60a7f9bdc0a1a7f8913b4a23",
  "name": "Redbull",
  "tags": [
    {
      "_id": "60a7f9bdc0a1a7f8913b4a24",
      "name": "jo"
    },
    {
      "_id": "60a7f9bdc0a1a7f8913b4a25",
      "name": "joooo"
    }
  ],
  "previewImageUrl": "https://previewImageUrl.asd",
  "streamUrl": "https://google.com",
  "bets": [],
  "date": "2021-05-21T18:19:41.671Z",
  "__v": 0
}
```

## Bet Endpoints
### POST http://localhost:8000/api/event/bet/create

Request:
```json
{
  "eventId": "60a7f9bdc0a1a7f8913b4a23",
  "marketQuestion": "Wer gewinnt Redbull",
  "hot": true,
  "outcomes": [
    {
      "index": 0,
      "name": "Jonas"
    },
    {
      "index": 0,
      "name": "Jörn"
    }
  ],
  "endDate": "1621622318001"
}
```

Successful Result:
```json
{
  "bets": [
    {
      "_id": "60a7ff5364dee4f956660797",
      "marketQuestion": "Wer gewinnt Redbull",
      "hot": true,
      "outcomes": [
        {
          "index": 0,
          "name": "Jonas"
        },
        {
          "index": 0,
          "name": "Jörn"
        }
      ],
      "event": "60a7f9bdc0a1a7f8913b4a23",
      "creator": "60a35b31bbb1f700155f2066",
      "date": "2021-05-21T18:43:31.908Z",
      "__v": 0
    },
    {
      "_id": "60a7ffb464dee4f956660799",
      "marketQuestion": "Wer gewinnt Redbull2",
      "hot": true,
      "outcomes": [
        {
          "index": 0,
          "name": "Jonas"
        },
        {
          "index": 0,
          "name": "Jörn"
        }
      ],
      "event": "60a7f9bdc0a1a7f8913b4a23",
      "creator": "60a35b31bbb1f700155f2066",
      "date": "2021-05-21T18:45:08.324Z",
      "__v": 0
    }
  ],
  "_id": "60a7f9bdc0a1a7f8913b4a23",
  "name": "Redbull",
  "tags": [
    {
      "_id": "60a7f9bdc0a1a7f8913b4a24",
      "name": "jo"
    },
    {
      "_id": "60a7f9bdc0a1a7f8913b4a25",
      "name": "joooo"
    }
  ],
  "previewImageUrl": "https://previewImageUrl.asd",
  "streamUrl": "https://google.com",
  "date": "2021-05-21T18:19:41.671Z",
  "__v": 2
}
```

### POST http://localhost:8000/api/event/bet/:id/place
Request:
```json
{
  "amount": 10,
  "outcome": 1,
  "minOutcomeTokens*": 400
}
```

*Optional

Successful Result:
```json
{
  "_id": "60a7ff5364dee4f956660797",
  "marketQuestion": "Wer gewinnt Redbull",
  "hot": true,
  "outcomes": [
    {
      "index": 0,
      "name": "Jonas"
    },
    {
      "index": 0,
      "name": "Jörn"
    }
  ],
  "event": "60a7f9bdc0a1a7f8913b4a23",
  "creator": "60a35b31bbb1f700155f2066",
  "date": "2021-05-21T18:43:31.908Z",
  "__v": 0
}
```

### POST http://localhost:8000/api/event/bet/:id/pullout
Request:
```json
{
  "amount": 10,
  "outcome": 1,
  "minReturnAmount*": 400
}
```

*Optional

Successful Result:
```json
{
  "_id": "60a7ff5364dee4f956660797",
  "marketQuestion": "Wer gewinnt Redbull",
  "hot": true,
  "outcomes": [
    {
      "index": 0,
      "name": "Jonas"
    },
    {
      "index": 0,
      "name": "Jörn"
    }
  ],
  "event": "60a7f9bdc0a1a7f8913b4a23",
  "creator": "60a35b31bbb1f700155f2066",
  "date": "2021-05-21T18:43:31.908Z",
  "__v": 0
}
```

### POST http://localhost:8000/api/event/bet/:id/outcomes/buy
Request:
```json
{
  "amount": 10
}
```
Der "amount" ist in EVNT andgegeben

Successful Result:
```json
[
  {
    "index": 0,
    "outcome": 9.10
  },
  {
    "index": 1,
    "outcome": 9.21
  }
]
```

### POST http://localhost:8000/api/event/bet/:id/outcomes/sell
Request:
```json
{
  "amount": 10
}
```
Der "amount" ist in Outcome-Token (Potential Winnings) andgegeben

Successful Result:
```json
[
  {
    "index": 0,
    "outcome": 9.10
  },
  {
    "index": 1,
    "outcome": 9.21
  }
]
```

### GET http://localhost:8000/api/event/bet/:id/payout

Successful Result:
```json
{
  "_id": "60a7ff5364dee4f956660797",
  "marketQuestion": "Wer gewinnt Redbull",
  "hot": true,
  "outcomes": [
    {
      "index": 0,
      "name": "Jonas"
    },
    {
      "index": 1,
      "name": "Jörn"
    }
  ],
  "event": "60a7f9bdc0a1a7f8913b4a23",
  "creator": "60a35b31bbb1f700155f2066",
  "date": "2021-05-21T18:43:31.908Z",
  "__v": 0
}
```


### GET http://localhost:8000/api/user/confirm-email/?userId=${userId}&code=${code}

Successful Result:
```json
{"status":"OK"}
```
Error Results:
```json
{
  "errors": [
    {
      "msg": "Invalid value",
      "param": "userId",
      "location": "body"
    },
    {
      "msg": "Invalid value",
      "param": "code",
      "location": "body"
    }
  ]
}
```
```json
{
  "error": "EMAIL_ALREADY_CONFIRMED",
  "message": "The email has already been confirmed!"
}
```
```json
{
  "error": "INVALID_EMAIL_CODE",
  "message": "The email code is invalid!"
}
```
### GET http://localhost:8000/api/user/resend-confirm/
Successful Result:
```json
{"status":"OK"}
```