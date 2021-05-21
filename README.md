# Wallfair. Playmoney V1 Server-Side
### server-side


# Api-Endpoints

### Auth
Header:
"Authorization: Bearer jwtToken"

### POST http://localhost:8000/api/user/login
Req:
{
"phone":"+49123123123"
}
Res:
{
"phone": "+49123123123",
"smsStatus": "pending"
}

### POST http://localhost:8000/api/user/verifyLogin
Req:
{
"phone":"+49123123123",
"smsToken":"013416"
}

Res:
{
"userId": "608ae87f8e78eb0224ad3e28",
"phone": "+49123123123",
"name*":"Max"
"email*":"max@max.de"
"session": "jwtToken"
}

*Optional only if provided

### GET http://localhost:8000/api/event/get/ID
Res:
{
"_id": "6091c24cae92745024088c74",
"title": "test",
"liveMode": true,
"liveStreamUrl": "https://www.google.de/",
"endDate": "1999-12-31T23:00:00.000Z",
"date": "2021-05-04T21:53:16.734Z",
"__v": 0
}

### GET http://localhost:8000/api/event/list
[
{
"bets": [
{
"_id": "60a7ff5364dee4f956660797",
"marketQuestion": "Wer gewinnt Redbull",
"hot": true,
"betOne": "Jonas",
"betTwo": "Jörn",
"event": "60a7f9bdc0a1a7f8913b4a23",
"creator": "60a35b31bbb1f700155f2066",
"date": "2021-05-21T18:43:31.908Z",
"__v": 0
},
{
"_id": "60a7ffb464dee4f956660799",
"marketQuestion": "Wer gewinnt Redbull2",
"hot": true,
"betOne": "Jonas",
"betTwo": "Jörn",
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
],

### POST http://localhost:8000/api/event/create
Req: {
"name":"Redbull",
"tags":[{"name":"jo"}, {"name":"joooo"}],
"streamUrl":"https://google.com",
"previewImageUrl":"https://previewImageUrl.asd"
}

Res:
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


### POST http://localhost:8000/api/event/bet/create
Req:
{
"eventId":"60a7f9bdc0a1a7f8913b4a23",
"marketQuestion":"Wer gewinnt Redbull",
"hot": true,
"betOne": "Jonas",
"betTwo": "Jörn",
"endDate":"1621622318001"
}

Res:
{
"bets": [
{
"_id": "60a7ff5364dee4f956660797",
"marketQuestion": "Wer gewinnt Redbull",
"hot": true,
"betOne": "Jonas",
"betTwo": "Jörn",
"event": "60a7f9bdc0a1a7f8913b4a23",
"creator": "60a35b31bbb1f700155f2066",
"date": "2021-05-21T18:43:31.908Z",
"__v": 0
},
{
"_id": "60a7ffb464dee4f956660799",
"marketQuestion": "Wer gewinnt Redbull2",
"hot": true,
"betOne": "Jonas",
"betTwo": "Jörn",
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