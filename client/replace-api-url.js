import * as glob from 'glob';
import fs from 'fs';

const files = glob.glob.sync('dist-test/**/*.{js,tsx}');

files.forEach(file => {
  fs.readFile(file, 'utf8', (err, data) => {
    if (err) {
      return console.log(err);
    }

    const result = data.replace(/http:\/\/localhost:3000/g, '');

    fs.writeFile(file, result, 'utf8', (err) => {
      if (err) return console.log(err);
    });
  });
});