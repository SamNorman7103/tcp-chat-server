const net = require("net");

const socket = net.createConnection({port: 3000}, (err) => {
  if (err) throw err;
  console.log('connected')
});


socket.on('data', data => {
  console.log(data.toString())
})
socket.on('end', () => {
  socket.end()
})

process.stdin.pipe(socket);



