const net = require("net");
const fs = require("fs");
const kickPass = "yeet";
//create storage for each connection and unique id's
let sockets = [];
let socketCount = 0;
const file = "./server-log.txt";

let server = net.createServer();

server.on("connection", (socket) => {
  //give socket initial name of address and port and assign id
  socket.name = socket.remoteAddress + ":" + socket.remotePort;
  socket.id = socketCount;
  socketCount += 1;
  socket.write(`Server: Welcome! Please type in /help to get a list of commands and server details`);
  //add socket to sockets array, send message to all that new user connected
  sockets.push(socket);
  console.log(`New user ${socket.name} has connected`);
  writeToLog(`New user ${socket.name} has connected`);
  console.log("");
  hello(socket);

  socket.on("data", (data) => {
    let userInput = data.toString();
    userInput.replace(/(\r\n|\n|\r)/gm, "");
    interpretCommand(userInput, socket);
  });

  socket.on("end", () => {
    leftChat(socket);
    sockets = sockets.filter((s) => s.id !== socket.id);
  });
});

server.listen(3000);
console.log("Listening on port 3000");

//takes user input and checks if the command is valid, if so run the corresponding function
function interpretCommand(data, socket) {
  let user = socket.name;
  let userInput = data.split(" ");
  let command = userInput[0].replace(/(\r\n|\n|\r|\s)/gm, "");

  //check if there are params after command or not, if params are missing send error, if it's not a command treat it as a message
  if (command !== "/clientlist" && command !== "/kick" && command !== "/username" && command !== "/w" && command !== "/help"){
    if (command[0] === "/"){
      socket.write(
        "You have either input an invalid command or are missing parameters. Try again"
      );
      writeToLog(`${socket.name} attempted to use ${data} as a command`);
    } else {
      sendMessage(socket, data);
    }
  }
  //clientlist check
  else if (command === "/clientlist") {
    clientList(socket);
  } 
  else if(command === "/kick"){
    let target = userInput[1];
    let password = userInput[2];
    kick(target, password, socket)
  }
  //whisper check
  else if (command === "/w") {
    let message = "";
    let recipient = userInput[1].replace(/(\r\n|\n|\r)/gm, "");
    for (let i = 2; i < userInput.length; i++) {
      message += userInput[i] + " ";
      message.replace(/(\r\n|\n|\r)/gm, "");
    }
    whisper(recipient, user, message);
  }
  //username check
  else if (command === "/username") {
    let newUsername = userInput[1];
    newUsername.replace(/(\r\n|\n|\r)/gm, "");
    changeUsername(newUsername, socket);
  } else if (command === "/help"){
    help(socket);
  }
}
//creates a time stamp and writes to the server-log file.
function writeToLog(data) {
  let d = new Date();
  let timestamp = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}:${d.getTime()}`;
  fs.appendFile(
    file,
    `${timestamp}: ${data.replace(/(\r\n|\n|\r)/gm, "")} \n`,
    (err) => {
      if (err) throw err;
    }
  );
}
//sends user server and command information
function help(user){
  user.write("If you send a message it must start with a character or number(no symbols or spaces)\n")
  user.write("Commands: /w 'user' - whisper user, /username 'name' - change username to name, /clientlist - list of online users, /kick 'user' 'password' - kick user from server\n")
}

function hello(user) {
  //send a message to all users that a new user connected
  sockets.forEach((socket) => {
    if (socket.id !== user.id) {
      socket.write(`${user.name} has joined the chat`);
    }
  });
}
//returns a list to the user of all other connected users
function clientList(user) {
  let names = [];
  console.log(sockets.length)
  sockets.forEach((s) => {
    if (s.name !== user.name) {
      names.push(s.name);
    }
  });
  user.write(`Current Users Online: ${names}`);
  writeToLog(`${user.name} ran clientList Function`)
}
//kicks user from the server
function kick(name, password, socket) {
  password = password.replace(/(\r\n|\n|\r|\s)/gm, "")
  //if name is not valid, send error
  let isNameValid = sockets.map((s) => s.name === name ? true : false);
  if (!isNameValid){
    socket.write(`${name} is not a valid target. Please try again`);
    writeToLog(`${socket.name} attempted to kick ${name}. User does not exist`)
    //if name is valid and pasword is not correct
  } else if (isNameValid && password !== kickPass) {
      socket.write(`${password} is not the correct password. Try again.`)
      writeToLog(`${socket.name} attempted to kick ${name} using the password ${password}`)
  } else if (isNameValid && password === kickPass){
      if(name === socket.name){
        socket.write('You cannot yeet yourself');
        writeToLog(`${name} attempted to self yeet`)
      } else {
        let target = sockets.filter((s) => s.name === name)[0];
        target.write("ADMIN: YAW YEEET!")
        writeToLog(`${name} has been yeeted from the server by ${socket.name}`);
        target.destroy();
        sockets = sockets.filter((s) => s !== target)
      }
      
  }
}
//takes user input and changes their username to that value
function changeUsername(name, user) {
  //send error message back if username change is the same
  if (name === user) {
    user.write(
      "ERROR: You cannot change your username to the same username. Try again."
    );
    writeToLog(`ERROR: ${user} attempted to change username to same name.`);
  }
  //send error back if the user is attempting to change to an already taken username
  else if (!sockets.map((s) => (s.name === name ? true : false))) {
    user.write("ERROR: Username is already taken. Please try again");
    writeToLog(
      `ERROR: ${user} attempted to change username to ${name} which was taken.`
    );
  }
  //send error back if username is blank
  else if (name.replace(/(\r\n|\n|\r|\s)/gm, "").length < 1) {
    user.write("ERROR: You cannot set your username to be blank");
    writeToLog(`ERROR: ${user} attempted to make their username blank.`);
  }
  //if all previous checks don't result in an error, send message to user of success and change name
  else {
    name = name.replace(/(\r\n|\n|\r|\s)/gm, "");
    writeToLog(`${user.name} changed their username to ${name}`);
    sendMessage(
      user,
      `The user ${user.name} changed their username to ${name}`
    );
    user.name = name.replace(/(\r\n|\n|\r)/gm, "");
    user.write(`Your new username is ${name}`);
  }
}
//sends direct message to specified username
function whisper(rec, send, msg) {
  //Send error message back if user is whispering themselves
  if (rec === send) {
    let recipient = sockets.filter((s) => s.name === send)[0];
    writeToLog(`ERROR: ${send} sent whisper to ${send}`);
    recipient.write(`ERROR: You cannot whisper yourself. Please try again`);
  }
  //send error message back if whisper target is invalid
  else if (!sockets.map((s) => (s.name === rec ? true : false))) {
    let recipient = sockets.filter((s) => s.name === send)[0];
    writeToLog(`ERROR: ${send} attempted to whisper an invalid user: ${rec}`);
    recipient.write(`ERROR: ${rec} is not a valid user. Try again`);
  }
  //send error message back if message does not start with a letter or number
  else if (!msg.match(/^[A-Z0-9]/i)) {
    let recipient = sockets.filter((s) => s.name === send)[0];
    writeToLog(
      `ERROR: ${send} attempted to whisper ${rec} with a message that doesn't start with a number or letter`
    );
    recipient.write(`ERROR: You cannot send an empty message. Try again.`);
  }
  //if all other checks result with no error, send whisper to target user
  else {
    writeToLog(`${send} sent message to ${rec}: ${msg}`);
    let recipient = sockets.filter((s) => s.name === rec)[0];
    recipient.write(`|| Whisper || ${send}: ${msg}`);
  }
}
//sends a message to all other users
function sendMessage(s, data) {
  if (!data.match(/^[A-Z0-9]/i)) {
    s.write(
      "ERROR: You cannot send a message that does not start with a letter or number"
    );
    writeToLog(`ERROR: ${s.name} sent an invalid message`);
  } else {
    writeToLog(`${s.name}: ${data.replace(/(\r\n|\n|\r)/gm, "")}`);
    sockets.forEach((socket) => {
      if (socket.id !== s.id) {
        socket.write(`${s.name}: ${data}`);
      }
    });
  }
}
//notifies server that someone was disconnected
function leftChat(user) {
  writeToLog(`${user.name} has left the chat`);
  sockets = sockets.filter((socket) => socket.id !== user.id);
  sockets.forEach((socket) => {
    socket.write(`${user.name} has left the chat`);
  });
}
