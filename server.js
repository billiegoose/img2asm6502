var connect = require('connect');
connect.createServer(
    connect.static('./http')
).listen(9778);