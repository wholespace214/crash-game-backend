FROM node:14

WORKDIR /usr/src/app

ARG GOOGLE_RECAPTCHA_CLIENT_SECRET

COPY . .
RUN npm rebuild bcrypt --build-from-source
EXPOSE 80
CMD [ "node", "index.js" ]