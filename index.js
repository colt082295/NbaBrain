import fs from 'fs';
import axios from 'axios';
import brain from 'brain.js';
let dataset = null;

function addOutputs(playerId) {
    return new Promise((resolve, reject) => {
        axios.get(`http://stats.nba.com/stats/playergamelog?PlayerID=${playerId}&Season=2017-18&SeasonType=Regular%20Season`)
        .then(res => {
            console.log("Got player data!");
            let data = res.data;

            let playerGameContent = data.resultSets[0].rowSet.map((game, index) => {
                let teams = game[4].split(" ");
                return {
                    etc: {
                        gameId: game[2],
                        seasonId: game[0],
                        playerId: game[1],
                        gameDate: game[3],
                        matchup: game[4],
                        winLoss: game[5],
                        playerTeam: teams[0],
                        opponentTeam: teams[2],
                },
                output: {
                minutes: game[6]/100,
                fieldGoalMakes: game[7]/100,
                fieldGoalAttempts: game[8]/100,
                fieldGoalPercent: game[9],
                fieldGoal3Makes: game[10/100],
                fieldGoal3Attempts: game[11]/100,
                fieldGoal3Percent: game[12],
                freeThrowsMade: game[13]/100,
                freeThrowsAttempts: game[14]/100,
                freeThrowPercent: game[15],
                offensiveRebounds: game[16]/100,
                defensiveRebounds: game[17]/100,
                rebounds: game[18]/100,
                assists: game[19]/100,
                steals: game[20]/100,
                blocks: game[21]/100,
                turnovers: game[22]/100,
                pF: game[23]/100,
                points: game[24]/100,
                plusMinus: game[25]/100,
                }}
            });

            fs.readFile('./player.json', 'utf8', function readFileCallback(err, data){
                if (err){
                    console.log(err);
                } else {
                dataset = playerGameContent;
                var json = JSON.stringify(playerGameContent);
                fs.writeFile('./player.json', json, 'utf8');
                console.log("Finished saving player output!");
                resolve("Finished saving player output!");
            }});
        })
        .catch(err => {
            console.log("Error:", err);
            reject("Error adding outputs:", err);
        });
    });
}

function addInputs() {
    console.log(`${Object.keys(dataset).length} games in dataset. Getting inputs now!`);

    return new Promise((resolve, reject) => {

    for (let i=1; i<Object.keys(dataset).length+1; i++) {
        setTimeout( function timer(){
           
            let url = `https://stats.nba.com/stats/boxscoreadvancedv2?EndPeriod=10&EndRange=28800&GameID=${dataset[i-1].etc.gameId}&RangeType=0&Season=2017-18&SeasonType=Regular+Season&StartPeriod=1&StartRange=0`;
    
                // console.log("Url:", url);
                    
    
                    axios.get(url)
                    .then(res => {
                        let data = res.data;
    
                        let rating = data.resultSets[1].rowSet[0][7]/1000;
                        // console.log("Rating:",rating);
    
                        dataset[i-1].input = {
                            defensiveRating: rating,
                        }
    
                        fs.readFile('./player.json', 'utf8', function readFileCallback(err, data){
                                if (err){
                                    console.log(err);
                                } else {
                                var json = JSON.stringify(dataset);
                                fs.writeFile('./player.json', json, 'utf8');
                                if(i === Object.keys(dataset).length) {
                                    console.log("Done saving player inputs!");
                                    resolve(dataset);
                                }
                            }});
                        })
                        .catch(err => {
                            console.log("Axios error:", err);
                            reject("Axios error:", err);
                        })
    
    
    
        }, i*5000 ); // We wait some time after each call so the api doesn't cut us off. You can probably lower the #, but it's safe here.
    }

    });

}

function brainFunc() {
    const net = new brain.NeuralNetwork({
      activation: 'sigmoid', // activation function
      iterations: 1500,
    });
    
    net.train(dataset);
    var output = net.run([{"defensiveRating": 0.098}]);
    for (const key in output) {
      if (output.hasOwnProperty(key)) {
        output[key] = (output[key]*100).toFixed(2);
        
      }
    }
    return output;
  }

addOutputs(202694) // Player id. This is Marcus Morris.
    .then(val => {
        addInputs()
            .then(val => {
                console.log("Running brain!");
                console.log(brainFunc()); // Run brain.js
            });
    });