const fs = require("fs");
const path = require("path");
const open = require("open");
const homedir = require('os').homedir();

let game_folder;
let log_folder;
let card_file;


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
					if (move["SourceControllerId"] == playerId && !playerAspects.includes(card["Aspect"]) && card["Subtype"] != "Curse" && card["Name"] != "Bomb" && card["Name"] != "Cyclops") {
						playerAspects.push(card["Aspect"]);
					} else if (move["SourceControllerId"] == opponentId && !opponentAspects.includes(card["Aspect"]) && card["Subtype"] != "Curse" && card["Name"] != "Bomb" && card["Name"] != "Cyclops") {
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


// Element generators

function populateTable() {
	$("tbody").empty();
	fs.readFile(path.join(game_folder, log_folder, "game_log_file.json"), (err, logs) => {
		var logs = JSON.parse(logs);

		logs.reverse().forEach(game => {
			var won = game["IsPlayerWinner"] ? "✓" : "✗";
			var aspects = deckAspects(game);
			opponentAspects = aspects["opponentAspects"].map(aspect => '<img src="images/' + aspect + '.png" height="20" width="20">');
			playerAspects = aspects["playerAspects"].map(aspect => '<img src="images/' + aspect + '.png" height="20" width="20">');

			$("tbody").append(`<tr>
									<td>` + game["Format"] + `
									<td>` + playerAspects.join("") + `
						   			<td>` + opponentAspects.join("") + " " + game["OpponentPlayerData"]["displayName"] + `</td>
						   			<td><time class="timeago" datetime="` + game["LogElements"][game["LogElements"].length - 1]["LogTime"] + `">` + game["StartTime"] + `</time>
						   			<td>` + won + `</td>
						   	   </tr>`);
		});

		$("time.timeago").timeago();
	});
}

function populateStats() {
	var wonGames = [];
	var lostGames = [];

	fs.readFile(path.join(game_folder, log_folder, "game_log_file.json"), (err, logs) => {
		var logs = JSON.parse(logs);

		logs.forEach(game => {
			var aspects = deckAspects(game);
			if (game["IsPlayerWinner"]) {
				wonGames.push({
					"playerAspects": aspects["playerAspects"],
					"opponent": aspects["opponentAspects"],
				});
			} else {
				lostGames.push({
					"playerAspects": aspects["playerAspects"],
					"opponent": aspects["opponentAspects"],
				});
			}
		});

		new Chart(document.getElementById("overallWinRate").getContext("2d"), {
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
					fontSize: 22
				},
				responsive: false,
				maintainAspectRatio: false
			}
		});
	
		var divineRecord = {"wins": wonGames.filter(game => game["playerAspects"].includes("D")).length, "losses": lostGames.filter(game => game["playerAspects"].includes("D")).length};
		var chaosRecord = {"wins": wonGames.filter(game => game["playerAspects"].includes("C")).length, "losses": lostGames.filter(game => game["playerAspects"].includes("C")).length};
		var arcaneRecord = {"wins": wonGames.filter(game => game["playerAspects"].includes("A")).length, "losses": lostGames.filter(game => game["playerAspects"].includes("A")).length};
		var natureRecord = {"wins": wonGames.filter(game => game["playerAspects"].includes("N")).length, "losses": lostGames.filter(game => game["playerAspects"].includes("N")).length};
		var techRecord = {"wins": wonGames.filter(game => game["playerAspects"].includes("T")).length, "losses": lostGames.filter(game => game["playerAspects"].includes("T")).length};
	
		new Chart(document.getElementById("winRateByAspect").getContext("2d"), {
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
					fontSize: 22
				},
				responsive: false,
				maintainAspectRatio: false
			}
		});

		var gameLengths = logs.map(game => game["LogElements"][game["LogElements"].length - 1]["Turn"]);
		var averageLength = gameLengths.reduce(function(sum, a) {return sum + Number(a)}, 0) / gameLengths.length;

		$(".list-group").append(`<li class="list-group-item bg-dark">~` + averageLength.toFixed(2) + ` Turns per Game</li>`);

		var gameLengths = logs.map(game => ((new Date(game["LogElements"][game["LogElements"].length - 1]["LogTime"]) - new Date(game["StartTime"])) / 1000) / 60);
		var averageLength = gameLengths.reduce(function(sum, a) {return sum + Number(a)}, 0) / gameLengths.length;

		$(".list-group").append(`<li class="list-group-item bg-dark">~` + averageLength.toFixed(2) + ` Minutes per Game</li>`);

		var cardsPerGame = logs.map(game => game["LogElements"].filter(move => move["EventType"] == "ResolveEvent").length);
		var averageCardsPerGame = cardsPerGame.reduce(function(sum, a) {return sum + Number(a)}, 0) / cardsPerGame.length;

		$(".list-group").append(`<li class="list-group-item bg-dark">~` + averageCardsPerGame + ` Cards Played per Game</li>`);
	});
}

// Page changers

function gamePage() {
	$(".container-fluid").empty();

	$(".active").removeClass("active");
	$("a:contains(Games)").addClass("active");

	$(".container-fluid").append(`<table class="table table-dark table-striped table-hover mt-3">
       			<thead>
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

	fs.watchFile(path.join(game_folder, log_folder, "game_log_file.json"), (curr, prev) => {
		populateTable();
	});

	populateTable();
}

function chartPage() {
	$(".container-fluid").empty();

	$(".active").removeClass("active");
	$("a:contains(Charts)").addClass("active");

	$(".container-fluid").append(`<div class="card mt-3 text-white bg-dark float-right" style="width: 18rem;">
									  <div class="card-header">
									    Quick Stats
									  </div>
									  <ul class="list-group list-group-flush">
									  </ul>
								  </div>
								  <canvas id="overallWinRate" width="250" height="250""></canvas>
								  <canvas id="winRateByAspect" width="250" height="250""></canvas>`);

	fs.watchFile(path.join(game_folder, log_folder, "game_log_file.json"), (curr, prev) => {
		populateStats();
	});

	populateStats();
}


// Listeners

$("a:contains(Games)").click(gamePage);
$("a:contains(Charts)").click(chartPage);


$("a[href!='#']").click(function(e) {
	e.preventDefault();

	open($(this).attr("href"));
});

// Switch to Game Page

gamePage();
