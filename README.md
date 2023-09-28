# FY23-PUX-BattleArena

Where sokémon come to battle.

## Install

- `cd` to the directory in the command line, e.g., Terminal
- run `npm install`

## Usage

- `cd` to the directory
- `node index` or `nodemon index`
- For the battle arena, go to http://localhost:9999 or https://battlearena.adaptable.app
  - If using Firefox, go to `about:config` and set `security.mixed_content.block_active_content` to `false`
  - If using music, make sure ttp://localhost:9999 is running locally and the songs are present in a `public/music` folder on the local machine
- For the chat, go to http://localhost:9999/chat or https://battlearena.adaptable.app/chat

## To-do:

[x] Set up Socket.IO, including shared local network
[x] Set up lobby for sokémon wanting to battle
[x] Check that sokémon can quit
[x] Read in sokémon data, inc. attributes, visuals, animations, voice ...
[x] Set up game interface: sokémon attributes, attacking ...
[x] Game logic: waiting for challengers, countdown to start, turns, attacking, getting hit, fainting
[x] Add game event messages to chat
[-] Advanced game logic: critical hits, randomness in ATK value, critical health state, winning animations ...
[x] Add battle music
[x] Set up spectator chat
[x] Set Battle Arena up on Adaptable.io
[x] Allow chat users to specify username

## Credits

- Ditto background by kawart (http://kawart.tumblr.com/post/87440108770/repeating-ditto-pattern-free-for-your-use-but)