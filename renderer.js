const fs = require("fs");
const path = require("path");
const expandHomeDir = require("expand-home-dir");
const open = require("open");

let game_folder;
let log_folder;
let card_file;


// Finding file locations

if (process.platform == "darwin") {
	game_folder = expandHomeDir("~/Library/Application Support/com.dragonfoundry.novablitz");
} else if (process.platform === "win32") {
	// windows game files location
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
					if (move["SourceControllerId"] == playerId && !playerAspects.includes(card["Aspect"]) && card["Subtype"] != "Curse") {
						playerAspects.push(card["Aspect"]);
					} else if (move["SourceControllerId"] == opponentId && !opponentAspects.includes(card["Aspect"]) && card["Subtype"] != "Curse") {
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
	var wins = 0;
	var losses = 0;

	var logs = JSON.parse(fs.readFileSync(path.join(game_folder, log_folder, "game_log_file.json")));


	logs.forEach(game => {
		if (game["IsPlayerWinner"]) {
			wins++;
		} else {
			losses++;
		}
	});

	return {
		"wins": wins,
		"losses": losses
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

function winRateChart() {
	var ctx = document.getElementById("winRate").getContext('2d');

	var winRecord = winTally();

	var winRate = new Chart(ctx, {
		type: 'pie',
		data: {
			labels: ["Wins", "Losses"],
			datasets: [{
				label: '# of Games',
				data: [winRecord["wins"], winRecord["losses"]],
				backgroundColor: [
					'rgba(54, 162, 235, 0.2)',
					'rgba(255, 99, 132, 0.2)'
				],
				borderColor: [
					'rgba(54, 162, 235, 1)',
					'rgba(255,99,132, 1)'
				],
				borderWidth: 1
			}]
		},
		options: {
			title: {
				display: true,
				text: 'Winrate',
				fontSize: 22
			},
			maintainAspectRatio: false
		}
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

	$(".container-fluid").append(`<canvas id="winRate" width="300" height="300""></canvas>`);

	winRateChart();
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
