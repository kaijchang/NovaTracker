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

	var logs = JSON.parse(fs.readFileSync(path.join(game_folder, log_folder, "game_log_file.json")));
	
	logs.reverse().forEach(game => {
		var won = game["IsPlayerWinner"] ? 'Yes' : 'No';
		$("tbody").append(`<tr>
								<td>` + game["Format"] + `
						   		<td>` + game["OpponentPlayerData"]["displayName"] + `</td>
						   		<td><time class="timeago" datetime="` + game["StartTime"] + `">` + game["StartTime"] + `</time>
						   		<td>` + won + `</td>
						   		<td>` + game["LogElements"][game["LogElements"].length - 1]["Turn"] + `</td>
						   </tr>`);
	});
	
	$("time.timeago").timeago();
}

fs.watchFile(path.join(game_folder, log_folder, "game_log_file.json"), (curr, prev) => {
	populateChart();
});

populateChart();
