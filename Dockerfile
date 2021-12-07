FROM node:16

WORKDIR /app

#Los RUN true estan porque al parecer si un COPY no cambia nada el siguiente falla.
COPY package.json /app/
RUN true
COPY package-lock.json /app/
RUN true
COPY package* /app/
RUN true
COPY tsconfig.json /app/
RUN true
COPY newrelic.js /app/
RUN true

RUN pwd
RUN ls


RUN npm install --only=dev
RUN npm i -g

COPY src /app/src
RUN true
COPY test /app/test


EXPOSE 8002

ENV PORT=8002
ENV MONGODB_URL="mongodb+srv://ubademy-business:juNU5lALrtGcd9TH@ubademy.t7kej.mongodb.net/Ubademy?retryWrites=true&w=majority"
ENV BUSINESS_DATABASE="Business"
ENV PROFILES_TABLE="Profiles"
ENV EXAMS_TABLE="Exams"

COPY src /app/src

# Real db
# ENV MONGODB_URL="mongodb+srv://ubademy-business:juNU5lALrtGcd9TH@ubademy.t7kej.mongodb.net/Ubademy?retryWrites=true&w=majority"
#Test db
ENV MONGODB_TEST_URL="mongodb+srv://ubademy:business@cluster0.w31lx.mongodb.net/Business?retryWrites=true&w=majority"
ENV MONGODB_URL="mongodb://mongodb_business:27017"

ENV BUSINESS_DATABASE="Business"
ENV PROFILES_TABLE="Profiles"

ENV PAYMENTS_BACKEND_URL='http://backend_payments:8003'

CMD npm start
