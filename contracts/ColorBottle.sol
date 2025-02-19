// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

contract ColorBottle {
    enum ColorSet {
        blue,
        yellow,
        orange,
        black,
        white
    }

    struct Player {
        uint8 attemptRemaining;
        uint8[5] colorSet;
        bool isWin;
    }

    mapping(address => Player) public players;
    mapping(address => uint8) public scores;

    error alreadyWon();
    error noAttemptsRemaining();

    function startNewGame() public {
        Player storage player = players[msg.sender];
        player.attemptRemaining = 5;
        uint8[] memory shuffledColors = shuffleColorSet();
        for (uint8 i = 0; i < 5; i++) {
            player.colorSet[i] = shuffledColors[i];
        }
    }

    function guessColor(uint8[5] memory colorSet) public returns(uint8) {
        if(players[msg.sender].isWin) revert alreadyWon();
        Player storage player = players[msg.sender];
        if(player.attemptRemaining < 1) revert  noAttemptsRemaining();
        player.attemptRemaining--;
        uint8 correctColorCount = 0;
        for (uint8 i = 0; i < 5; i++) {
            if (player.colorSet[i] == colorSet[i]) {
                correctColorCount++;
            }
        }
        if(correctColorCount == 5) {
            player.isWin = true;
            scores[msg.sender] += 1;
        }
        return correctColorCount;
    }

    function getAttemptRemaining() public view returns(uint8) {
        return players[msg.sender].attemptRemaining;
    }

    function getScores() public view returns(uint8){
        return scores[msg.sender];
    }

    function shuffleColorSet() internal view returns(uint8[] memory) {
        uint8[] memory colorSet = new uint8[](5);
        for (uint8 i = 0; i < 5; i++) {
            colorSet[i] = uint8(ColorSet(uint256(keccak256(abi.encodePacked(block.timestamp, block.prevrandao, i))) % 5));
        }
        return colorSet;
    }
}
