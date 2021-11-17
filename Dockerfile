FROM node:16

WORKDIR /app

COPY package* /app/

COPY tsconfig.json /app/

RUN npm i

EXPOSE 8002

ENV PORT=8002
# ENV MONGODB_URL="mongodb+srv://ubademy-business:juNU5lALrtGcd9TH@ubademy.t7kej.mongodb.net/Ubademy?retryWrites=true&w=majority"
ENV MONGODB_URL="mongodb://127.0.0.1:27017"
ENV BUSINESS_DATABASE="Business"
ENV PROFILES_TABLE="Profiles"

COPY src /app/src

COPY test /app/test

COPY newrelic.js /app/

CMD mongo
CMD npm start
