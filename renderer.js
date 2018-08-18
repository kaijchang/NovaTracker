const fs = require("fs");
const path = require("path");
const expandHomeDir = require("expand-home-dir");
const open = require("open");

let game_folder;
let log_folder;
let card_file;

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

function populateTable() {
	$("tbody").empty();
	fs.readFile(path.join(game_folder, log_folder, "game_log_file.json"), (err, logs) => {
		var logs = JSON.parse(logs);

		logs.reverse().forEach(game => {
			var won = game["IsPlayerWinner"] ? "Yes" : "No";
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

function gamePage() {
	$(".container-fluid").empty();

	$(".active").removeClass("active");
	$("a:contains(Games)").parent().addClass("active");

	$(".container-fluid").append(`<table class="table table-dark table-striped">
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
	$("a:contains(Charts)").parent().addClass("active");
}

$("a:contains(Games)").click(gamePage);
$("a:contains(Charts)").click(chartPage);


$("a[href!='#']").click(function(e) {
	e.preventDefault();

	open($(this).attr("href"));
});

gamePage();