function exportNames(songList) {
  const songs = songList || repertoire;
  return songs.map((song) => song.title);
}

function loadRepertoireForCli() {
  const fs = require("fs");
  const vm = require("vm");
  const context = {};

  vm.createContext(context);
  vm.runInContext(fs.readFileSync("songs.js", "utf8"), context);

  return vm.runInContext("repertoire", context);
}

function runCli() {
  const command = process.argv[2];

  if (command === "exportNames") {
    console.log(exportNames(loadRepertoireForCli()).join("\n"));
    return;
  }

  console.error("Usage: node utilities.js exportNames");
  process.exitCode = 1;
}

if (typeof module !== "undefined" && require.main === module) {
  runCli();
}
