# This is an image for development purpose
FROM node:8

COPY . /zilliqa-wallet

WORKDIR /zilliqa-wallet

RUN npm install -g @angular/cli && npm install
