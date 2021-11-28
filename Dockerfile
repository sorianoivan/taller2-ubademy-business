FROM node:16

WORKDIR /app


COPY package.json /app/
COPY package-lock.json /app/
COPY package* /app/
COPY tsconfig.json /app/
COPY newrelic.js /app/
COPY src /app/src
COPY test /app/test

RUN pwd
RUN ls


RUN npm install --only=dev
RUN npm i -g

EXPOSE 8002

ENV PORT=8002

# Real db
# ENV MONGODB_URL="mongodb+srv://ubademy-business:juNU5lALrtGcd9TH@ubademy.t7kej.mongodb.net/Ubademy?retryWrites=true&w=majority"
#Test db
ENV MONGODB_TEST_URL="mongodb+srv://ubademy:business@cluster0.w31lx.mongodb.net/Business?retryWrites=true&w=majority"
ENV MONGODB_URL="mongodb://mongodb_business:27017"

ENV BUSINESS_DATABASE="Business"
ENV PROFILES_TABLE="Profiles"

ENV PAYMENTS_BACKEND_URL='http://backend_payments:8003'

CMD npm start
