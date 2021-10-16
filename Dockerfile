FROM node:16

WORKDIR /app

COPY package* /app/

COPY tsconfig.json /app/

RUN npm i

EXPOSE 3000

ENV PORT=3000

COPY src /app/src

COPY test /app/test

COPY newrelic.js /app/

CMD npm start
