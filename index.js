// Server-side
const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");
const ip = require('ip');
const io = require("socket.io")(server, {
    cors: {
        origin: [
            "http://localhost:3001",
            "http://localhost:3002",
            "http://"+ip.address()+":3001",
            "http://"+ip.address()+":3002"
        ], // Sokémon are on these ports
        methods: ["GET", "POST"]
    }
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
    messages: []
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

    var userPort = socket.handshake.headers.host.split(':')[1];

    // Listen for users logging on
    console.log('a user connected', userPort);

    // Send the cached messages
    io.emit('get chat cache', cache.messages);

    // Listen for users disconnecting
    socket.on('disconnect', () => {
        console.log('user disconnected', userPort);
    });

    // Chat messages
    socket.on('chat message', (msg) => {
        console.log('message: ' + msg);
        cache.messages.push(msg);
        io.emit('chat message', msg);
    });


    //////////////////////////////
    // Battle Management

    // Flush battle if arena refreshed
    if ( userPort == '9999')
    {
        battle.state = 'waiting';
        battle.players = [];
        battle.turn.pid = 0;
        battle.turn.name = '';

        console.log('battle:', battle);
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
                var msg = 'A contender has appeared: '+contender.name+'!';
                io.emit('new contender', contender);
                io.emit('chat message', msg);
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
            // Announce
            var msg = 'Contender '+contender.name+' has left the battle!';
            io.emit('chat message', msg);
            io.emit('remove contender', contender);
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

        io.emit('whose turn?', battle);
    });

    // BATTLE ACTIONS

    // // Please wait!!
    // socket.on('please wait', (ms) => {
    //     console.log('Please wait '+ms+'ms');
    //
    //     setTimeout(() => {  console.log("Wait over!"); }, ms);
    //
    // });

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

                // // Check if other player is dodging
                // // TODO: doding
                // if ( otherPlayer.dodging == true )
                // {
                //     // MISSSSS
                //     // TODO: Miss message?
                //     otherContender.dodging = false;
                //
                //     // Next player
                //     if ( battle.turn.contender === 2 )
                //         battle.turn.contender = 1;
                //     else
                //         battle.turn.contender = 2;
                //
                //     io.emit('whose turn?', battle);
                // }
                // else // ATTACK!!!
                // {
                    var otherCurrentHP = otherPlayer.sokemon.currentHP;
                    var otherHP = otherPlayer.sokemon.attributes.HP;

                    var activeConAtk = activePlayer.sokemon.attributes.Attack;
                    // TODO: Add random super effective
                    activeConAtk = activeConAtk / 5; // rough

                    // Calculate damage
                    otherCurrentHP = otherCurrentHP - activeConAtk;
                    if ( otherCurrentHP < 0 ) otherCurrentHP = 0;

                    // Update otherCurrentHPs
                    otherPlayer.sokemon.currentHP = otherCurrentHP;

                    // ATTACKK!!!
                    io.emit('hit', {
                        otherPlayer: otherPlayer,
                        currentHP: otherCurrentHP,
                        totalHP: otherHP
                    });

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
                        var msg = 'Player '+otherPlayer.name+' has left the battle!';
                        io.emit('chat message', msg);
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
                // }
            } // check if their turn
        } // check if battle active
    });

    // TODO: battle action: dodge
    socket.on('battle action: dodge', (contender) => {
        console.log('Contender wants to dodge: ' + contender.sokemon.name[0]);

        // Can only dodge if the game has started
        if ( battle.state == 'active' )
        {
            var activeContender = battle.contenders['contender'+battle.turn.contender];

            // Check if it's their turn
            if ( activeContender.name == contender.sokemon.name[0] )
            {
                // Set the dodging
                activeContender.dodging = true;

                // Next player
                if ( battle.turn.contender === 2 )
                    battle.turn.contender = 2;
                else
                    battle.turn.contender = 1;

                io.emit('whose turn?', battle);
            }
        } // check if game started
    });

  // socket.broadcast.emit('hi');
});
// io.emit('some event', { someProperty: 'some value', otherProperty: 'other value' }); // This will emit the event to all connected sockets


server.listen(9999, () => {
  console.log('listening on *:9999');
});
