# Zilliqa-Wallet

This project is experimental and still under development.

## Setup

- Nodejs and NPM must be installed on your system; run the following commands:
- `curl -sL https://deb.nodesource.com/setup_8.x | sudo -E bash -`
- `sudo apt-get install nodejs npm`
- Navigate to source code directory and run the following:
- `sudo npm install -g @angular/cli`
- `npm install`
- `ng serve`

## Running the Zilliqa Wallet

Run `ng serve` for a dev server.

To run the production server, first set the environment variable `export API_URL=http://localhost:4201` (default value: `"http://localhost:4201"`)

Then run `npm start`. Navigate to `http://localhost:4100/`. The app will automatically reload if you change any of the source files.

## Build

To build the production server, first set the environment variable `export API_URL=http://localhost:4201` (default value: `"http://localhost:4201"`)

Then run `npm build` to build the project. The build artifacts will be stored in the `dist/` directory.

The build artifacts will be stored in the `dist/` directory.

## Running unit tests

Run `ng test` to execute the unit tests via [Karma](https://karma-runner.github.io).

## Running end-to-end tests

Run `ng e2e` to execute the end-to-end tests via [Protractor](http://www.protractortest.org/).

## Licence 
You can view our [licence here](https://github.com/Zilliqa/Zilliqa-Wallet/blob/master/LICENSE).
