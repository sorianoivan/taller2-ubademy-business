FROM node:16

WORKDIR /app

COPY package* /app/

COPY tsconfig.json /app/

RUN npm i

EXPOSE 8002

ENV PORT=8002

COPY src /app/src

COPY test /app/test

COPY newrelic.js /app/

CMD npm start
