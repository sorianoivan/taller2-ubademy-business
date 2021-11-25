FROM node:16

WORKDIR /app


COPY package.json /app/
COPY package-lock.json /app/
COPY package* /app/
COPY tsconfig.json /app/

RUN pwd
RUN ls


RUN npm i

EXPOSE 8002

ENV PORT=8002

# Real db
# ENV MONGODB_URL="mongodb+srv://ubademy-business:juNU5lALrtGcd9TH@ubademy.t7kej.mongodb.net/Ubademy?retryWrites=true&w=majority"
#Test db
ENV MONGODB_TEST_URL="mongodb+srv://ubademy:business@cluster0.w31lx.mongodb.net/Business?retryWrites=true&w=majority"
ENV MONGODB_URL="mongodb://mongodb_business:27017"

ENV BUSINESS_DATABASE="Business"
ENV PROFILES_TABLE="Profiles"

COPY src /app/src
COPY test /app/test
COPY newrelic.js /app/

CMD npm start
