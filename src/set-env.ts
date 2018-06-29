import { writeFile } from 'fs';

// dynamically generate API_URL environment variable 
const api_url = process.env.API_URL || 'http://localhost:4201';

const targetPath1 = `./src/environments/environment.prod.ts`;
const envConfigFile1 = `export const environment = {
  production: "true",
  envName: 'prod',
  API_URL: "${api_url}"
};
`;

const targetPath2 = `./src/environments/environment.ts`;
const envConfigFile2 = `export const environment = {
  production: "false",
  envName: 'dev',
  API_URL: "${api_url}"
};
`;

writeFile(targetPath1, envConfigFile1, function (err) {
  if (err) {
    console.log(err);
  }

  console.log(`Output generated at ${targetPath1}`);
});

writeFile(targetPath2, envConfigFile2, function (err) {
  if (err) {
    console.log(err);
  }

  console.log(`Output generated at ${targetPath2}`);
});