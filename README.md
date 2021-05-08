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
[{"_id":"6091c24cae92745024088c74","title":"test","liveMode":true,"liveStreamUrl":"https://www.google.de/","endDate":"1999-12-31T23:00:00.000Z","date":"2021-05-04T21:53:16.734Z","__v":0}]


### POST http://localhost:8000/api/event/create
Req: {
"title":"test",
"liveMode":true,
"endDate":"0",
"liveStreamUrl":"https://www.google.de/"
}

Res:
"_id": "609456bca5780612c6238610",
"title": "tes12t",
"liveMode": true,
"liveStreamUrl": "https://www.google.de/",
"endDate": "1999-12-31T23:00:00.000Z",
"date": "2021-05-06T20:51:08.078Z",
"__v": 0
}
