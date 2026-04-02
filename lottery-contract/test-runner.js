const Mocha = require("mocha");

const mocha = new Mocha({
  timeout: 10000,
});

mocha.addFile("test/Lottery.test.js");

mocha.run((failures) => {
  process.exitCode = failures ? 1 : 0;
});
