const fs = require("fs");
const path = require("path");
const open = require("open");
const homedir = require("os").homedir();
const moment = require("moment");

var game_folder;
var log_folder;
var card_file;

var overallWinRate;
var winRateByAspect;


// Finding file locations

if (process.platform == "darwin") {
    game_folder = path.join(homedir, "Library/Application Support/com.dragonfoundry.novablitz");
} else if (process.platform === "win32") {
    game_folder = path.join(homedir, "AppData\\LocalLow\\Dragon Foundry\\NovaBlitz");
}

fs.readdirSync(game_folder).forEach(file => {
    if (/^[A-Z0-9]{16}$/.test(file)) {
        log_folder = file;
    } else if (/^[0-9]-[0-9]{2}-[0-9]_client_card_[a-z0-9]{8}-[a-z0-9]{4}-[a-z0-9]{4}-[a-z0-9]{4}-[a-z0-9]{12}$/.test(file)) {
        card_file = file;
    }
});

// Processors

function deckAspects(game) {
    var playerAspects = [];
    var opponentAspects = [];

    var cards = JSON.parse(fs.readFileSync(path.join(game_folder, card_file)))["Cards"];

    var playerId = game["LogElements"][0]["SelfId"];
    var opponentId = game["LogElements"][0]["OppId"];

    game["LogElements"].forEach(move => {
        if (move["EventType"] == "ResolveEvent") {
            cards.forEach(card => {
                if (card["CardId"] == move["SourceCardId"]) {
                    if (move["SourceControllerId"] == playerId && !playerAspects.includes(card["Aspect"]) && card["Subtype"] != "Curse" && card["Name"] != "Bomb!" && card["Name"] != "Cyclops") {
                        playerAspects.push(card["Aspect"]);
                    } else if (move["SourceControllerId"] == opponentId && !opponentAspects.includes(card["Aspect"]) && card["Subtype"] != "Curse" && card["Name"] != "Bomb!" && card["Name"] != "Cyclops") {
                        opponentAspects.push(card["Aspect"]);
                    }
                }
            });
        }
    });

    while (playerAspects.length < 2) {
        playerAspects.push("U");
    }

    while (opponentAspects.length < 2) {
        opponentAspects.push("U");
    }

    return {
        "playerAspects": playerAspects,
        "opponentAspects": opponentAspects
    }
}

function winTally() {
    var wonGames = [];
    var lostGames = [];

    var logs = JSON.parse(fs.readFileSync(path.join(game_folder, log_folder, "game_log_file.json")));

    logs.forEach(game => {
        var aspects = deckAspects(game);
        if (game["IsPlayerWinner"]) {
            wonGames.push({
                "playerAspects": aspects["playerAspects"],
                "opponentAspects": aspects["opponentAspects"],
            });
        } else {
            lostGames.push({
                "playerAspects": aspects["playerAspects"],
                "opponentAspects": aspects["opponentAspects"],
            });
        }
    });

    return {
        "wonGames": wonGames,
        "lostGames": lostGames
    }
}


// Element generators

function populateTable() {
    $("tbody").empty();

    fs.readFile(path.join(game_folder, log_folder, "game_log_file.json"), (err, logs) => {
        var logs = JSON.parse(logs);
        logs.reverse().forEach(game => {
            var aspects = deckAspects(game);
            if (!$("img.disabled.playerFilter").toArray().map(image => /[ACDTNU]/.exec($(image).attr("src"))[0]).some(aspect => aspects["playerAspects"].includes(aspect)) && !$("img.disabled.opponentFilter").toArray().map(image => /[ACDTNU]/.exec($(image).attr("src"))[0]).some(aspect => aspects["opponentAspects"].includes(aspect)) && $("#formatFilter").find("option:selected").attr("value").split(",").includes(game["Format"]) && moment(game["LogElements"][game["LogElements"].length - 1]["LogTime"]) > moment().subtract(parseInt($("#timeFilter").find("option:selected").attr("value")), "days")) {
                var won = game["IsPlayerWinner"] ? "✓" : "✗";

                opponentAspects = aspects["opponentAspects"].map(aspect => '<img src="images/' + aspect + '.png" height="20" width="20">');
                playerAspects = aspects["playerAspects"].map(aspect => '<img src="images/' + aspect + '.png" height="20" width="20">');

                $(`<tr>
                        <td>` + game["Format"] + `
                        <td>` + playerAspects.join("") + `
                        <td>` + opponentAspects.join("") + " " + game["OpponentPlayerData"]["displayName"] + `</td>
                        <td><time class="timeago" datetime="` + game["LogElements"][game["LogElements"].length - 1]["LogTime"] + `">` + game["StartTime"] + `</time>
                        <td>` + won + `</td>
                    </tr>`).hide().appendTo("tbody").show("normal");
            }
        });

        $("time.timeago").timeago();
    });
}

function updateStats() {
    $(".list-group").empty();
    $("tbody").empty();

    fs.readFile(path.join(game_folder, log_folder, "game_log_file.json"), (err, logs) => {
        var logs = JSON.parse(logs);

        var gameRecords = winTally();

        var wonGames = gameRecords["wonGames"];
        var lostGames = gameRecords["lostGames"];

        overallWinRate.data.datasets[0].data = [wonGames.length, lostGames.length];
        overallWinRate.update();

        var divineRecord = {
            "wins": wonGames.filter(game => game["playerAspects"].includes("D")).length,
            "losses": lostGames.filter(game => game["playerAspects"].includes("D")).length
        };
        var chaosRecord = {
            "wins": wonGames.filter(game => game["playerAspects"].includes("C")).length,
            "losses": lostGames.filter(game => game["playerAspects"].includes("C")).length
        };
        var arcaneRecord = {
            "wins": wonGames.filter(game => game["playerAspects"].includes("A")).length,
            "losses": lostGames.filter(game => game["playerAspects"].includes("A")).length
        };
        var natureRecord = {
            "wins": wonGames.filter(game => game["playerAspects"].includes("N")).length,
            "losses": lostGames.filter(game => game["playerAspects"].includes("N")).length
        };
        var techRecord = {
            "wins": wonGames.filter(game => game["playerAspects"].includes("T")).length,
            "losses": lostGames.filter(game => game["playerAspects"].includes("T")).length
        };

        winRateByAspect.data.datasets[0].data = [+(wonGames.length / (wonGames.length + lostGames.length) * 100).toFixed(2), +(divineRecord["wins"] / (divineRecord["wins"] + divineRecord["losses"]) * 100).toFixed(2), +(chaosRecord["wins"] / (chaosRecord["wins"] + chaosRecord["losses"]) * 100).toFixed(2), +(arcaneRecord["wins"] / (arcaneRecord["wins"] + arcaneRecord["losses"]) * 100).toFixed(2), +(natureRecord["wins"] / (natureRecord["wins"] + natureRecord["losses"]) * 100).toFixed(2), +(techRecord["wins"] / (techRecord["wins"] + techRecord["losses"]) * 100).toFixed(2)];
        winRateByAspect.update();

        var gameLengths = logs.map(game => game["LogElements"][game["LogElements"].length - 1]["Turn"]);
        var averageLength = gameLengths.reduce(function(sum, a) {
            return sum + Number(a)
        }, 0) / gameLengths.length;

        $('<li class="list-group-item bg-dark">~' + averageLength.toFixed(2) + ' Turns per Game</li>')
            .hide()
            .appendTo(".list-group")
            .show("normal");

        var gameLengths = logs.map(game => moment.duration(moment(game["LogElements"][game["LogElements"].length - 1]["LogTime"]).diff(moment(game["StartTime"]))).asMinutes());
    
        var averageLength = gameLengths.reduce(function(sum, a) {
            return sum + Number(a)
        }, 0) / gameLengths.length;

        $('<li class="list-group-item bg-dark">~' + averageLength.toFixed(2) + ' Minutes per Game</li>')
            .hide()
            .appendTo(".list-group")
            .show("normal");

        var aspectPairings = [];

        logs.forEach(game => {
            var aspects = deckAspects(game);
            aspectPairings.push(aspects["playerAspects"].sort().join(","));
            aspectPairings.push(aspects["opponentAspects"].sort().join(","));
        });

        var mode = aspectPairings.reduce((mode, aspect) => {
            if (mode[0].includes(aspect)) {mode[1][mode[0].indexOf(aspect)]++} else {mode[0].push(aspect); mode[1].push(1)}; return mode;
        }, [[], []]);

        var topPairings = {};

        while (Object.keys(topPairings).length < 10 && mode[0][0] !== undefined) {
            var max = Math.max(...mode[1]);
            topPairings[mode[0][mode[1].indexOf(max)]] = max;
            mode[0].splice(mode[1].indexOf(max), 1);
            mode[1].splice(mode[1].indexOf(max), 1);
        }

        console.log(topPairings);

        Object.keys(topPairings).forEach(pairing => {
            $(`<tr>
                   <td>` + (Object.keys(topPairings).indexOf(pairing) + 1) + `</td>
                   <td>
                       <div class="progress">
                           <div class="progress-bar" role="progressbar" aria-valuenow="` + topPairings[pairing] + `" aria-valuemin="0" aria-valuemax="` + Math.max(...Object.values(topPairings)) + `" style="width: ` + Math.round(topPairings[pairing] / Math.max(...Object.values(topPairings)) * 100) + `%"></div>
                       </div>
                   </td>
                   <td>` + pairing.split(",").map(aspect => '<img src="images/' + aspect + '.png" height="30" width="30">').join("") + `</td>
               </tr>`).hide().appendTo("tbody").show("normal");
        });
    });
}

// Page changers

function gamePage() {
    fs.unwatchFile(path.join(game_folder, log_folder, "game_log_file.json"));

    $(".container-fluid").empty();

    $(".active").removeClass("active");
    $("a:contains(Games)").addClass("active");

    $(".container-fluid").append(`<table class="table table-dark table-striped table-hover">
                <thead>
                    <tr>
                        <th scope="col">                                    
                            <select class="custom-select mb-1 bg-dark text-white" style="width: 8rem;" id="formatFilter">
                                <option value="Casual,Draft" selected>All Modes</option>
                                <option value="Casual">Casual</option>
                                <option value="Draft">Draft</option>
                            </select>
                        </th>
                        <th scope="col">
                            <img class=" mt-2 mb-2 playerFilter" src="images/A.png" height="25" width="25"><img class="mt-2 mb-2 playerFilter" src="images/C.png" height="25" width="25"><img class="mt-2 mb-2 playerFilter" src="images/D.png" height="25" width="25"><img class="mt-2 mb-2 playerFilter" src="images/T.png" height="25" width="25"><img class="mt-2 mb-2 playerFilter" src="images/N.png" height="25" width="25"><img class="mt-2 mb-2 playerFilter" src="images/U.png" height="25" width="25">
                        </th>
                        <th scope="col">
                            <img class="mt-2 mb-2 opponentFilter" src="images/A.png" height="25" width="25"><img class="mt-2 mb-2 opponentFilter" src="images/C.png" height="25" width="25"><img class="mt-2 mb-2 opponentFilter" src="images/D.png" height="25" width="25"><img class="mt-2 mb-2 opponentFilter" src="images/T.png" height="25" width="25"><img class="mt-2 mb-2 opponentFilter" src="images/N.png" height="25" width="25"><img class="mt-2 mb-2 opponentFilter" src="images/U.png" height="25" width="25">
                        </th>
                        <th scope="col">
                            <select class="custom-select bg-dark text-white mb-1" style="width: 8rem;" id="timeFilter">
                              <option value="730000" selected>All Time</option>
                              <option value="1">Past Day</option>
                              <option value="7">Past Week</option>
                              <option value="31">Past Month</option>
                              <option value="365">Past Year</option>
                            </select>
                        </th>
                        <th scope="col">
                        </th>
                    </tr>
                    <tr>
                      <th scope="col">Type</th>
                      <th scope="col">Deck Aspect</th>
                      <th scope="col">Against</th>
                      <th scope="col">Time</th>
                      <th scope="col">Won</th>
                    </tr>
                </thead>
                <tbody>
                </tbody>
            </table>`);

    fs.watchFile(path.join(game_folder, log_folder, "game_log_file.json"), populateTable);

    populateTable();

    $(".playerFilter, .opponentFilter").click(function(e) {
        if ($(this).hasClass("disabled")) {
            $(this).removeClass("disabled");
        } else {
            $(this).addClass("disabled");
        }

        populateTable();
    });

    $("select").change(function(e) {
        populateTable();
    });
}

function statsPage() {
    fs.unwatchFile(path.join(game_folder, log_folder, "game_log_file.json"));

    $(".container-fluid").empty();

    $(".active").removeClass("active");
    $("a:contains(Stats)").addClass("active");

    $(".container-fluid").append(`<table class="table table-dark table-striped table-hover float-right" style="width: 40rem;">
                                    <thead>
                                        <tr>
                                            <th>#</th>
                                            <th>Rank</th>
                                            <th>Pairing</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                    </tbody>
                                  </table>
                                  <div class="card mt-3 bg-dark text-white" style="width: 18rem;">
                                      <div class="card-header">
                                        Quick Stats
                                      </div>
                                      <ul class="list-group list-group-flush">
                                      </ul>
                                  </div>
                                  <canvas id="overallWinRate" width="250" height="250""></canvas>
                                  <canvas id="winRateByAspect" width="250" height="250""></canvas>`);

    var gameRecords = winTally();

    var wonGames = gameRecords["wonGames"];
    var lostGames = gameRecords["lostGames"];


    overallWinRate = new Chart(document.getElementById("overallWinRate").getContext("2d"), {
        type: "pie",
        data: {
            labels: ["Wins", "Losses"],
            datasets: [{
                label: "# of Games",
                data: [wonGames.length, lostGames.length],
                backgroundColor: [
                    "rgba(54, 162, 235, 0.2)",
                    "rgba(255, 99, 132, 0.2)"
                ],
                borderColor: [
                    "rgba(54, 162, 235, 1)",
                    "rgba(255,99,132, 1)"
                ],
                borderWidth: 1
            }]
        },
        options: {
            title: {
                display: true,
                text: "Overall Winrate",
                fontSize: 18
            },
            responsive: false,
            maintainAspectRatio: false
        }
    });

    var divineRecord = {
        "wins": wonGames.filter(game => game["playerAspects"].includes("D")).length,
        "losses": lostGames.filter(game => game["playerAspects"].includes("D")).length
    };
    var chaosRecord = {
        "wins": wonGames.filter(game => game["playerAspects"].includes("C")).length,
        "losses": lostGames.filter(game => game["playerAspects"].includes("C")).length
    };
    var arcaneRecord = {
        "wins": wonGames.filter(game => game["playerAspects"].includes("A")).length,
        "losses": lostGames.filter(game => game["playerAspects"].includes("A")).length
    };
    var natureRecord = {
        "wins": wonGames.filter(game => game["playerAspects"].includes("N")).length,
        "losses": lostGames.filter(game => game["playerAspects"].includes("N")).length
    };
    var techRecord = {
        "wins": wonGames.filter(game => game["playerAspects"].includes("T")).length,
        "losses": lostGames.filter(game => game["playerAspects"].includes("T")).length
    };

    winRateByAspect = new Chart(document.getElementById("winRateByAspect").getContext("2d"), {
        type: "horizontalBar",
        data: {
            labels: ["Overall", "Divine", "Chaos", "Arcane", "Nature", "Tech"],
            datasets: [{
                label: "% of Wins",
                data: [+(wonGames.length / (wonGames.length + lostGames.length) * 100).toFixed(2), +(divineRecord["wins"] / (divineRecord["wins"] + divineRecord["losses"]) * 100).toFixed(2), +(chaosRecord["wins"] / (chaosRecord["wins"] + chaosRecord["losses"]) * 100).toFixed(2), +(arcaneRecord["wins"] / (arcaneRecord["wins"] + arcaneRecord["losses"]) * 100).toFixed(2), +(natureRecord["wins"] / (natureRecord["wins"] + natureRecord["losses"]) * 100).toFixed(2), +(techRecord["wins"] / (techRecord["wins"] + techRecord["losses"]) * 100).toFixed(2)],
                backgroundColor: [
                    "rgba(128, 128, 128, 0.2)",
                    "rgba(255, 255, 0, 0.2)",
                    "rgba(255, 0, 0, 0.2)",
                    "rgba(255, 0, 255, 0.2)",
                    "rgba(0, 255, 0, 0.2)",
                    "rgba(192, 192, 192, 0.2)"
                ],
                borderColor: [
                    "rgba(128, 128, 128, 1)",
                    "rgba(255, 255, 0, 1)",
                    "rgba(255, 0, 0, 1)",
                    "rgba(255, 0, 255, 1)",
                    "rgba(0, 255, 0, 1)",
                    "rgba(192, 192, 192, 1)"
                ],
                borderWidth: 1
            }]
        },
        options: {
            title: {
                display: true,
                text: "Winrate By Aspect",
                fontSize: 18
            },
            responsive: false,
            maintainAspectRatio: false
        }
    });

    fs.watchFile(path.join(game_folder, log_folder, "game_log_file.json"), updateStats);

    updateStats();
}


// Listeners

$("a:contains(Games)").click(gamePage);
$("a:contains(Stats)").click(statsPage);


$("a[href!='#']").click(() => {
    e.preventDefault();

    open($(this).attr("href"));
});

// Switch to Game Page

gamePage();
