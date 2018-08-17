const fs = require("fs");
const path = require("path");
const expandHomeDir = require("expand-home-dir");

let game_folder;
let log_folder;

if (process.platform == "darwin") {
	game_folder = expandHomeDir("~/Library/Application Support/com.dragonfoundry.novablitz");
} else if (process.platform === "win32") {
	// windows game files location
}

fs.readdirSync(game_folder).forEach(folder => {
	if (/^[A-Z0-9]{16}$/.test(folder)) {
		log_folder = folder;
	} 
});

function populateChart() {
	$("tbody").empty();
	fs.readFile(path.join(game_folder, log_folder, "game_log_file.json"), (err, logs) => {
		var logs = JSON.parse(logs);

		logs.reverse().forEach(game => {
			var won = game["IsPlayerWinner"] ? 'Yes' : 'No';
			$("tbody").append(`<tr>
									<td>` + game["Format"] + `
						   			<td>` + game["OpponentPlayerData"]["displayName"] + `</td>
						   			<td><time class="timeago" datetime="` + game["LogElements"][game["LogElements"].length - 1]["LogTime"] + `">` + game["StartTime"] + `</time>
						   			<td>` + won + `</td>
						   			<td>` + game["LogElements"][game["LogElements"].length - 1]["Turn"] + `</td>
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
        	  <th scope="col">Against</th>
        	  <th scope="col">Time</th>
        	  <th scope="col">Won</th>
        	  <th scope="col">Turns</th>
        	</tr>
      		</thead>
      		<tbody>
      		</tbody>
       </table>`);

	fs.watchFile(path.join(game_folder, log_folder, "game_log_file.json"), (curr, prev) => {
		populateChart();
	});

	populateChart();
}

function chartPage() {
	$(".container-fluid").empty();

	$(".active").removeClass("active");
	$("a:contains(Charts)").parent().addClass("active");
}

$("a:contains(Games)").click(gamePage);
$("a:contains(Charts)").click(chartPage);

gamePage();
