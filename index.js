// Server-side
const express = require('express');
const port = process.env.PORT || 3000;
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");
const ip = require('ip');
const io = require("socket.io")(server, {
    cors: {
        // origin: "https://battlearena.adaptable.app/",
        origin: [
            // "https://battlearena.adaptable.app/",
            // "http://localhost:9999",
            // "https://localhost:9999",
            "http://localhost:3001",
            "https://localhost:3001",
            "http://"+ip.address()+":3001",
            "https://"+ip.address()+":3001",
            "*"
        ],
        methods: ["GET", "POST"],
        allowedHeaders: ["sokemon"],
        credentials: true,
        methods: ["GET", "POST"]
    }
    //     origin: [
    //         "http://localhost:3001",
    //         "http://localhost:3002",
    //         "http://"+ip.address()+":3001",
    //         "http://"+ip.address()+":3002"
    //     ], // Sokémon are on these ports
    //     methods: ["GET", "POST"]
    // }
});

// Provide assets
app.use(express.static('public'));

app.get('/favicon.ico', (req, res) => {
    res.sendFile(__dirname + '/favicon.ico');
});

// Set up routers
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html');
});

app.get('/chat', (req, res) => {
    res.sendFile(__dirname + '/chat.html');
});

//////////////////////////////

// Cache
const cache = {
    messages: [] // array of arrays: who, msg
};

// Battle
let battle = {
    state: 'waiting', // waiting, start, active
    players: [],
    turn: {
        pid: 0,
        name: ''
    }
};

io.on('connection', (socket) => {

    //////////////////////////////
    // User Management

    // var user, userPort;
    var user;

    // if ( socket.handshake.headers.referer )
    //     userPort = socket.handshake.headers.referer.split(':')[2];
    // else
    //     userPort = socket.handshake.headers.origin.split(':')[2];
    // userPort = userPort.slice(0, userPort.length - 1);

    // Send the cached messages
    socket.on('request for chat cache', (userid) => {

        user = userid;

        // Listen for users logging on
        console.log('a user connected', user);

        console.log('request for chat cache by ' + user);

        io.emit('get chat cache', cache.messages);
    });

    // Listen for users disconnecting
    socket.on('disconnect', () => {

        if ( ! user )
            console.log('⚔️  battle arena disconnected');
        else
            console.log('user disconnected', user);
    });

    // Get chat messages
    // Format: [username, message]
    socket.on('send chat message', (msg) => {
        console.log('message received: ' + msg[0], msg[1]);

        cache.messages.push(msg);
        io.emit('get chat message', msg);
    });


    //////////////////////////////
    // Battle Management

    // Flush battle if arena refreshed
    if ( ! user )
    // if ( userPort == '9999')
    {
        console.log('⚔️  refresh the battle arena');
        battle.state = 'waiting';
        battle.players = [];
        battle.turn.pid = 0;
        battle.turn.name = '';

        // Send the cached messages
        io.emit('get chat cache', cache.messages);

        console.log('battle:', battle);
        console.log('chat cache:', cache);
    }

    // Join battle
    socket.on('join battle', (contender) => {
        console.log('new contender: ' + contender.name);
        // ip, port, name, sokemon

        var reg_status = 'already';

        // Check if there's room
        if ( battle.players.length <= 1 )
        {
            console.log('There\'s room! But are they already there?');

            // Then, check if the contender isn't already there
            var already = false;
            if ( ( typeof battle.players[0] !== 'undefined'
                        && battle.players[0].name == contender.name )
                    || ( typeof battle.players[1] !== 'undefined'
                        && battle.players[1].name == contender.name ) )
                already = true;

            if ( ! already )
            {
                console.log('Nope! Registering Contender '+contender.name);

                // Add to the contender
                battle.players.push(contender);

                // Announce the contender
                var msg = ['game', 'A contender has appeared: '+contender.name+'!'];
                io.emit('new contender', contender);
                io.emit('get chat message', msg);
                cache.messages.push(msg);

                reg_status = 'newly';
            }
        }
        console.log('Verdict? Contender is '+reg_status+ ' registered!');

        // Check if we start the battle
        if ( battle.state == 'waiting'
                && battle.players.length == 2 )
        {
            battle.state = 'start';
            battle.turn.pid = 1; // second player, last added
            battle.turn.name = contender.name;

            io.emit('start battle', battle);
        }
    });

    // Quit battle
    socket.on('quit battle', (contender) => {
        console.log('Contender wants to quit: ' + contender.name);
        // ip, port, name, sokemon

        // Remove from the battle, if in the battle
        var removed = false;

        if ( typeof battle.players[0] !== 'undefined'
                && battle.players[0].name == contender.name )
        {
            battle.players.splice(0, 1);
            removed = true;
        }
        else if ( typeof battle.players[1] !== 'undefined'
                && battle.players[1].name == contender.name )
        {
            battle.players.splice(1, 1);
            removed = true;
        }

        if ( removed )
        {
            // Remove from arena
            io.emit('remove contender', contender);

            // Announce
            var msg = ['game', 'Contender '+contender.name+' has left the battle!'];
            io.emit('get chat message', msg);
            cache.messages.push(msg);
        }
        else {
            console.log('But they weren\'t in the battle ...');
        }
        console.log(battle);
    });

    // Battle ready -> setup
    socket.on('battle ready', (msg) => {
        console.log('Battle '+msg+'! Now set up');

        battle.state = 'active';

        // Announce
        var msg = ['game', 'Battle START!'];
        io.emit('get chat message', msg);
        cache.messages.push(msg);

        // Continue
        io.emit('whose turn?', battle);
    });

    // BATTLE ACTIONS

    // battle action: attack
    socket.on('battle action: attack', (player) => {
        console.log(player.name+' wants to attack!');
        // ip, port, name, sokemon

        // Can only attack if the game has started
        if ( battle.state == 'active' )
        {
            var activePlayer = battle.players[battle.turn.pid];

            // Warning! Only let the current player attack
            if ( player.name == activePlayer.name )
            {
                // Let's pause so animations can run
                setTimeout(() => {  console.log("Wait over!"); }, 3000);

                console.log('- Attacker is '+activePlayer.name);

                var otherPlayer = battle.players[0];
                if ( battle.turn.pid === 0 )
                    otherPlayer = battle.players[1];

                console.log('- Target is '+otherPlayer.name);

                // Check if other player is dodging
                if ( typeof otherPlayer.dodging !== 'undefined'
                        && otherPlayer.dodging == true )
                {
                    // MISSSSS
                    io.emit('miss', battle);
                    io.emit('dodge', otherPlayer);

                    // Announce
                    var msg = ['game', activePlayer.name+' MISSES!'];
                    io.emit('get chat message', msg);
                    cache.messages.push(msg);

                    // Reset dodging state
                    otherPlayer.dodging = false;

                    // Next player
                    if ( battle.turn.pid === 1 )
                        battle.turn.pid = 0;
                    else
                        battle.turn.pid = 1;

                    setTimeout(() => {
                        io.emit('whose turn?', battle);
                    }, 3000 );
                }
                else // ATTACK!!!
                {
                    var otherCurrentHP = otherPlayer.sokemon.currentHP;
                    var otherHP = otherPlayer.sokemon.attributes.HP;

                    var activeConAtk = activePlayer.sokemon.attributes.Attack;

                    // TODO: Add random super effective
                    activeConAtk = activeConAtk / 5; // rough

                    // Add some randomness
                    activeConAtk += Math.floor(Math.random()*5);

                    // And sometimes CRITICALLLLLL !!!!!!
                    var criticalHit = '';

                    if (  Math.floor(Math.random()*5) == 4 )
                    {
                        criticalHit = ' It\s a critical hit!';
                        activeConAtk *= 1.5;
                    }

                    console.log('ATK:', activeConAtk);

                    // Calculate damage
                    otherCurrentHP = otherCurrentHP - activeConAtk;
                    if ( otherCurrentHP < 0 ) otherCurrentHP = 0;

                    // Update otherCurrentHPs
                    otherPlayer.sokemon.currentHP = otherCurrentHP;

                    // ATTACKK!!!
                    io.emit('hit', {
                        currentPlayer: player,
                        otherPlayer: otherPlayer,
                        currentHP: otherCurrentHP,
                        totalHP: otherHP
                    });

                    // Announce
                    var msg = ['game', activePlayer.name+' ATTACKS!'+criticalHit];
                    io.emit('get chat message', msg);
                    cache.messages.push(msg);

                    if ( otherCurrentHP === 0 )
                    {
                        // FAINTED
                        // Reset state
                        battle.state = 'waiting';

                        // Send winner message
                        setTimeout(() => {
                            io.emit('winner', activePlayer);
                        }, 3000 );

                        // Remove the player
                        if ( battle.players[0].name == otherPlayer.name )
                            battle.players.splice(0, 1);
                        else if ( battle.players[1].name == otherPlayer.name )
                            battle.players.splice(1, 1);

                        // Announce
                        var msg = ['game', 'Player '+otherPlayer.name+' has fainted! '+activePlayer.name+' WINS!'];
                        io.emit('get chat message', msg);
                        io.emit('remove contender', otherPlayer);
                        cache.messages.push(msg);
                    }
                    else // continue
                    {
                        // Next player
                        if ( battle.turn.pid === 1 )
                            battle.turn.pid = 0;
                        else
                            battle.turn.pid = 1;

                        setTimeout(() => {
                            io.emit('whose turn?', battle);
                        }, 3000 );
                    }
                } // check if dodging
            } // check if their turn
        } // check if battle active
    });

    // battle action: dodge
    socket.on('battle action: dodge', (player) => {
        console.log('Player wants to dodge: ' + player.sokemon.name[0]);

        // Can only dodge if the game has started
        if ( battle.state == 'active' )
        {
            var activePlayer = battle.players[battle.turn.pid];

            // Check if it's their turn
            if ( player.name == activePlayer.name )
            {
                // Set the dodging
                activePlayer.dodging = true;

                // DODGE!!!
                io.emit('dodge', activePlayer);

                // Announce
                var msg = ['game', activePlayer.name+' prepares to dodge!'];
                io.emit('get chat message', msg);
                cache.messages.push(msg);

                // Next player
                if ( battle.turn.pid === 1 )
                    battle.turn.pid = 0;
                else
                    battle.turn.pid = 1;

                setTimeout(() => {
                    io.emit('whose turn?', battle);
                }, 3000 );
            }
        } // check if game started
    });

  // socket.broadcast.emit('hi');
});
// io.emit('some event', { someProperty: 'some value', otherProperty: 'other value' }); // This will emit the event to all connected sockets


server.listen(port, () => {
  console.log('listening on *:'+port);
});
