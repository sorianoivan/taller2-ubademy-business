FROM node:16

WORKDIR /app

COPY package* /app/

COPY tsconfig.json /app/

RUN npm i

RUN npm install mongodb --save

EXPOSE 3000

ENV PORT=3000
ENV MONGODB_URL="mongodb+srv://ubademy-business:juNU5lALrtGcd9TH@ubademy.t7kej.mongodb.net/Ubademy?retryWrites=true&w=majority"
ENV BUSINESS_DATABASE="Business"
ENV PROFILES_TABLE="Profiles"

COPY src /app/src

COPY test /app/test

COPY newrelic.js /app/

CMD npm start
