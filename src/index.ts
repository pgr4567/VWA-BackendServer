import express, { Response, Request } from "express";
import mysql from "mysql";
import crypto from "crypto";
import fs from "fs";
import bcrypt from "bcryptjs";

const app = express();
const port = 3001;
const success = "SUCCESS";
const try_buy_error = "ERROR: USERNAME DOES NOT EXIST OR NOT ENOUGH BALANCE";
const username_not_exist = "ERROR: USERNAME DOES NOT EXIST";
const session_update_error = "ERROR: SESSION TOKEN COULD NOT BE UPDATED";
const session_time_invalid = "ERROR: SESSION TIME IS INVALID";
const unexpected_error = "UNEXPECTED ERROR";
const rg_username_exist = "ERROR: USERNAME EXISTS";
const lg_error = "ERROR: USERNAME OR PASSWORD INCORRECT";
const invalid_username_password = "ERROR: INVALID USERNAME OR PASSWORD";
const max_session_time_in_hours = 24;
const saltRounds = 10;

let connParams = JSON.parse(fs.readFileSync("./conn.json").toString());
let con = mysql.createConnection({
	host: connParams.host,
	user: connParams.user,
	password: connParams.password,
	database: connParams.database,
});

function checkQuery(req: Request, res: Response, next: Function) {
	if (req.query === undefined) {
		res.status(500).send(unexpected_error);
		return;
	}
	next();
}

app.use(checkQuery);

app.get("/tryBuy", function (req, res) {
	let username = req.query.username;
	let item = req.query.item;
	let price = parseInt(req.query.price as string);

	if (username == undefined || item == undefined || price == undefined) {
		res.status(400).send(unexpected_error);
		return;
	}

	item += ";";

	con.query(
		"UPDATE players SET money = money - ?, items = CONCAT(IFNULL(items, ''), ?) WHERE username = ? AND money >= ?",
		[price, item, username, price],
		function (err, result) {
			if (err) {
				console.log(err);
				res.status(500).send(unexpected_error);
				return;
			}
			if (result.affectedRows == 0) {
				res.status(500).send(try_buy_error);
				return;
			}
			res.status(200).send(success);
			return;
		}
	);
});

app.get("/removeItem", function (req, res) {
	let username = req.query.username;
	let item = req.query.item;

	if (username == undefined || item == undefined) {
		res.status(400).send(unexpected_error);
		return;
	}

	con.query(
		"SELECT * FROM players WHERE username = ?",
		[username],
		function (err, result) {
			if (err) {
				console.log(err);
				res.status(500).send(unexpected_error);
				return;
			}
			if (Object.keys(result).length == 0) {
				res.status(404).send(username_not_exist);
				return;
			}
			Object.keys(result).forEach(function (key) {
				var row = result[key];
				let items = [];
				let old = row.items.split(";");
				for (let i = 0; i < old.length; i++) {
					if (old[i] == item) {
						continue;
					}
					items.push(old[i]);
				}
				let newItems = items.join(";");
				con.query(
					"UPDATE players SET items = ? WHERE username = ?",
					[newItems, username],
					function (err, result) {
						if (err) {
							console.log(err);
							res.status(500).send(unexpected_error);
							return;
						}
						if (result.affectedRows == 0) {
							res.status(404).send(username_not_exist);
							return;
						}
						res.status(200).send(success);
						return;
					}
				);
			});
		}
	);
});

app.get("/removeAllItems", function (req, res) {
	let username = req.query.username;

	if (username == undefined) {
		res.status(400).send(unexpected_error);
		return;
	}

	con.query(
		"UPDATE players SET items = '' WHERE username = ?",
		[username],
		function (err, result) {
			if (err) {
				console.log(err);
				res.status(500).send(unexpected_error);
				return;
			}
			if (result.affectedRows == 0) {
				res.status(404).send(username_not_exist);
				return;
			}
			res.status(200).send(success);
			return;
		}
	);
});

app.get("/addMoney", function (req, res) {
	let username = req.query.username;
	let amount = req.query.amount;

	if (username == undefined || amount == undefined) {
		res.status(400).send(unexpected_error);
		return;
	}

	con.query(
		"UPDATE players SET money = money + ? WHERE username = ?",
		[amount, username],
		function (err, result) {
			if (err) {
				console.log(err);
				res.status(500).send(unexpected_error);
				return;
			}
			if (result.affectedRows == 0) {
				res.status(404).send(username_not_exist);
				return;
			}
			res.status(200).send(success);
			return;
		}
	);
});

app.get("/getInventory", function (req, res) {
	let username = req.query.username;

	if (username == undefined) {
		res.status(400).send(unexpected_error);
		return;
	}

	con.query(
		"SELECT * FROM players WHERE username = ?",
		[username],
		function (err, result) {
			if (err) {
				console.log(err);
				res.status(500).send(unexpected_error);
				return;
			}
			if (Object.keys(result).length == 0) {
				res.status(404).send(username_not_exist);
				return;
			}
			Object.keys(result).forEach(function (key) {
				var row = result[key];
				res.status(200).send(row.items);
				return;
			});
		}
	);
});

app.get("/getMoney", function (req, res) {
	let username = req.query.username;

	if (username == undefined) {
		res.status(400).send(unexpected_error);
		return;
	}

	con.query(
		"SELECT * FROM players WHERE username = ?",
		[username],
		function (err, result) {
			if (err) {
				console.log(err);
				res.status(500).send(unexpected_error);
				return;
			}
			if (Object.keys(result).length == 0) {
				res.status(404).send(username_not_exist);
				return;
			}
			Object.keys(result).forEach(function (key) {
				var row = result[key];
				res.status(200).send("$" + row.money);
				return;
			});
		}
	);
});

app.get("/getSessionToken", function (req, res) {
	let username = req.query.username;

	if (username == undefined) {
		res.status(400).send(unexpected_error);
		return;
	}

	con.query(
		"SELECT * FROM players WHERE username = ?",
		[username],
		function (err, result) {
			if (err) {
				console.log(err);
				res.status(500).send(unexpected_error);
				return;
			}
			if (Object.keys(result).length == 0) {
				res.status(404).send(username_not_exist);
				return;
			}
			Object.keys(result).forEach(function (key) {
				var row = result[key];
				if (isValidSessionTime(row.session_time)) {
					res.status(200).send(row.session);
					return;
				} else {
					res.status(403).send(session_time_invalid);
					return;
				}
			});
		}
	);
});

app.get("/getSessionTokenTime", function (req, res) {
	let username = req.query.username;

	if (username == undefined) {
		res.status(400).send(unexpected_error);
		return;
	}

	con.query(
		"SELECT * FROM players WHERE username = ?",
		[username],
		function (err, result) {
			if (err) {
				console.log(err);
				res.status(500).send(unexpected_error);
				return;
			}
			if (Object.keys(result).length == 0) {
				res.status(404).send(username_not_exist);
				return;
			}
			Object.keys(result).forEach(function (key) {
				var row = result[key];
				res.status(200).send(row.session_time);
				return;
			});
		}
	);
});

app.get("/generateSessionToken", function (req, res) {
	let username = req.query.username;

	if (username == undefined) {
		res.status(400).send(unexpected_error);
		return;
	}

	let sessionToken = generateSessionToken();
	con.query(
		"UPDATE players SET session = ?, session_time = NOW() WHERE username = ?",
		[sessionToken, username],
		function (err, result) {
			if (err) {
				console.log(err);
				res.status(500).send(unexpected_error);
				return;
			}
			if (result.affectedRows == 0) {
				res.status(500).send(session_update_error);
				return;
			}
			res.status(200).send(success);
			return;
		}
	);
});

app.get("/getRank", function (req, res) {
	let username = req.query.username;

	if (username == undefined) {
		res.status(400).send(unexpected_error);
		return;
	}

	con.query(
		"SELECT * FROM players WHERE username = ?",
		[username],
		function (err, result) {
			if (err) {
				console.log(err);
				res.status(500).send(unexpected_error);
				return;
			}
			if (Object.keys(result).length == 0) {
				res.status(404).send(username_not_exist);
				return;
			}
			Object.keys(result).forEach(function (key) {
				var row = result[key];
				res.status(200).send("R" + row.rank);
				return;
			});
		}
	);
});

app.get("/setRank", function (req, res) {
	let username = req.query.username;
	let rank = req.query.rank;

	if (username == undefined || rank == undefined) {
		res.status(400).send(unexpected_error);
		return;
	}

	con.query(
		"UPDATE players SET rank = ? WHERE username = ?",
		[rank, username],
		function (err, result) {
			if (err) {
				console.log(err);
				res.status(500).send(unexpected_error);
				return;
			}
			if (result.affectedRows == 0) {
				res.status(404).send(username_not_exist);
				return;
			}
			res.status(200).send(success);
			return;
		}
	);
});

app.get("/getFriends", function (req, res) {
	let username = req.query.username;

	if (username == undefined) {
		res.status(400).send(unexpected_error);
		return;
	}

	con.query(
		"SELECT * FROM players WHERE username = ?",
		[username],
		function (err, result) {
			if (err) {
				console.log(err);
				res.status(500).send(unexpected_error);
				return;
			}
			if (Object.keys(result).length == 0) {
				res.status(404).send(username_not_exist);
				return;
			}
			Object.keys(result).forEach(function (key) {
				var row = result[key];
				res.status(200).send(row.friends);
				return;
			});
		}
	);
});

app.get("/addFriendRequest", function (req, res) {
	let username = req.query.username;
	let friend = req.query.friend;

	if (username == undefined || friend == undefined) {
		res.status(400).send(unexpected_error);
		return;
	}

	con.query("SELECT * FROM players WHERE username = ?", [username], function (err, result) {
		if (err) {
			console.log(err);
			res.status(500).send(unexpected_error);
			return;
		}
		if (result.affectedRows == 0) {
			res.status(404).send(username_not_exist);
			return;
		}
		Object.keys(result).forEach(function (key) {
			var row = result[key];
			for (let f in row.sent_friend_requests) {
				if (f === friend) {
					res.status(500).send(unexpected_error);
					return;
				}
			}

			let tempUsername = username + ";";
			con.query(
				"UPDATE players SET friend_requests = CONCAT(IFNULL(friend_requests, ''), ?) WHERE username = ?",
				[tempUsername, friend],
				function (err, result) {
					if (err) {
						console.log(err);
						res.status(500).send(unexpected_error);
						return;
					}
					if (result.affectedRows == 0) {
						res.status(404).send(username_not_exist);
						return;
					}
					friend += ";";
					con.query(
						"UPDATE players SET sent_friend_requests = CONCAT(IFNULL(sent_friend_requests, ''), ?) WHERE username = ?",
						[friend, username],
						function (err, result) {
							if (err) {
								console.log(err);
								res.status(500).send(unexpected_error);
								return;
							}
							if (result.affectedRows == 0) {
								res.status(404).send(username_not_exist);
								return;
							}
							res.status(200).send(success);
							return;
						}
					);
				}
			);
		});
	});
});

app.get("/removeFriendRequest", function (req, res) {
	let username = req.query.username;
	let friend = req.query.friend;

	if (username == undefined || friend == undefined) {
		res.status(400).send(unexpected_error);
		return;
	}

	con.query(
		"SELECT * FROM players WHERE username = ?",
		[friend],
		function (err, result) {
			if (err) {
				console.log(err);
				res.status(500).send(unexpected_error);
				return;
			}
			if (Object.keys(result).length == 0) {
				res.status(404).send(username_not_exist);
				return;
			}
			Object.keys(result).forEach(function (key) {
				var row = result[key];
				let friend_requests = [];
				let old = row.friend_requests.split(";");
				for (let i = 0; i < old.length; i++) {
					if (old[i] == username) {
						continue;
					}
					friend_requests.push(old[i]);
				}
				let newFriends = friend_requests.join(";");
				con.query(
					"UPDATE players SET friend_requests = ? WHERE username = ?",
					[newFriends, friend],
					function (err, result) {
						if (err) {
							console.log(err);
							res.status(500).send(unexpected_error);
							return;
						}
						if (result.affectedRows == 0) {
							res.status(404).send(username_not_exist);
							return;
						}
						con.query(
							"SELECT * FROM players WHERE username = ?",
							[username],
							function (err, result) {
								if (err) {
									console.log(err);
									res.status(500).send(unexpected_error);
									return;
								}
								if (Object.keys(result).length == 0) {
									res.status(404).send(username_not_exist);
									return;
								}
								Object.keys(result).forEach(function (key) {
									var row = result[key];
									let friends = [];
									let old = row.sent_friend_requests.split(";");
									for (let i = 0; i < old.length; i++) {
										if (old[i] == friend) {
											continue;
										}
										friends.push(old[i]);
									}
									let newFriends = friends.join(";");
									con.query(
										"UPDATE players SET sent_friend_requests = ? WHERE username = ?",
										[newFriends, username],
										function (err, result) {
											if (err) {
												console.log(err);
												res.status(500).send(unexpected_error);
												return;
											}
											if (result.affectedRows == 0) {
												res.status(404).send(username_not_exist);
												return;
											}
											res.status(200).send(success);
											return;
										}
									);
								});
							}
						);
					}
				);
			});
		}
	);
});

app.get("/acceptFriendRequest", function (req, res) {
	let username = req.query.username as string;
	let friend = req.query.friend as string;

	if (username == undefined || friend == undefined) {
		res.status(400).send(unexpected_error);
		return;
	}

	con.query(
		"SELECT * FROM players WHERE username = ?",
		[username],
		function (err, result) {
			if (err) {
				console.log(err);
				res.status(500).send(unexpected_error);
				return;
			}
			if (Object.keys(result).length == 0) {
				res.status(404).send(username_not_exist);
				return;
			}
			Object.keys(result).forEach(function (key) {
				var row = result[key];
				let friends = [];
				let old = row.friend_requests.split(";");
				for (let i = 0; i < old.length; i++) {
					if (old[i] == friend) {
						continue;
					}
					friends.push(old[i]);
				}
				let newFriends = friends.join(";");
				let tempfriend = friend + ";";
				con.query(
					"UPDATE players SET friend_requests = ?, friends = CONCAT(IFNULL(friends, ''), ?) WHERE username = ?",
					[newFriends, tempfriend, username],
					function (err, result) {
						if (err) {
							console.log(err);
							res.status(500).send(unexpected_error);
							return;
						}
						if (result.affectedRows == 0) {
							res.status(404).send(username_not_exist);
							return;
						}
						con.query(
							"SELECT * FROM players WHERE username = ?",
							[friend],
							function (err, result) {
								if (err) {
									console.log(err);
									res.status(500).send(unexpected_error);
									return;
								}
								if (Object.keys(result).length == 0) {
									res.status(404).send(username_not_exist);
									return;
								}
								friend = friend.replace(";", "");
								Object.keys(result).forEach(function (key) {
									var row = result[key];
									let friends = [];
									let old = row.sent_friend_requests.split(";");
									for (let i = 0; i < old.length; i++) {
										if (old[i] == username) {
											continue;
										}
										friends.push(old[i]);
									}
									let newFriends = friends.join(";");
									con.query(
										"UPDATE players SET friends = CONCAT(IFNULL(friends, ''), ?), sent_friend_requests = ? WHERE username = ?",
										[username, newFriends, friend],
										function (err, result) {
											if (err) {
												console.log(err);
												res.status(500).send(unexpected_error);
												return;
											}
											if (result.affectedRows == 0) {
												res.status(404).send(username_not_exist);
												return;
											}
											res.status(200).send(success);
											return;
										}
									);
								});
							}
						);
					}
				);
			});
		}
	);
});

app.get("/declineFriendRequest", function (req, res) {
	let username = req.query.username as string;
	let friend = req.query.friend as string;

	if (username == undefined || friend == undefined) {
		res.status(400).send(unexpected_error);
		return;
	}

	con.query(
		"SELECT * FROM players WHERE username = ?",
		[username],
		function (err, result) {
			if (err) {
				console.log(err);
				res.status(500).send(unexpected_error);
				return;
			}
			if (Object.keys(result).length == 0) {
				res.status(404).send(username_not_exist);
				return;
			}
			Object.keys(result).forEach(function (key) {
				var row = result[key];
				let friend_requests = [];
				let old = row.friend_requests.split(";");
				for (let i = 0; i < old.length; i++) {
					if (old[i] == friend) {
						continue;
					}
					friend_requests.push(old[i]);
				}
				let newFriends = friend_requests.join(";");
				con.query(
					"UPDATE players SET friend_requests = ? WHERE username = ?",
					[newFriends, username],
					function (err, result) {
						if (err) {
							console.log(err);
							res.status(500).send(unexpected_error);
							return;
						}
						if (result.affectedRows == 0) {
							res.status(404).send(username_not_exist);
							return;
						}
						con.query(
							"SELECT * FROM players WHERE username = ?",
							[friend],
							function (err, result) {
								if (err) {
									console.log(err);
									res.status(500).send(unexpected_error);
									return;
								}
								if (Object.keys(result).length == 0) {
									res.status(404).send(username_not_exist);
									return;
								}
								friend = friend.replace(";", "");
								Object.keys(result).forEach(function (key) {
									var row = result[key];
									let friends = [];
									let old = row.sent_friend_requests.split(";");
									for (let i = 0; i < old.length; i++) {
										if (old[i] == username) {
											continue;
										}
										friends.push(old[i]);
									}
									let newFriends = friends.join(";");
									con.query(
										"UPDATE players SET sent_friend_requests = ? WHERE username = ?",
										[newFriends, friend],
										function (err, result) {
											if (err) {
												console.log(err);
												res.status(500).send(unexpected_error);
												return;
											}
											if (result.affectedRows == 0) {
												res.status(404).send(username_not_exist);
												return;
											}
											res.status(200).send(success);
											return;
										}
									);
								});
							}
						);
					}
				);
			});
		}
	);
});

app.get("/getFriendRequests", function (req, res) {
	let username = req.query.username;

	if (username == undefined) {
		res.status(400).send(unexpected_error);
		return;
	}

	con.query(
		"SELECT * FROM players WHERE username = ?",
		[username],
		function (err, result) {
			if (err) {
				console.log(err);
				res.status(500).send(unexpected_error);
				return;
			}
			if (Object.keys(result).length == 0) {
				res.status(404).send(username_not_exist);
				return;
			}
			Object.keys(result).forEach(function (key) {
				var row = result[key];
				res.status(200).send(row.friend_requests);
				return;
			});
		}
	);
});

app.get("/getSentFriendRequests", function (req, res) {
	let username = req.query.username;

	if (username == undefined) {
		res.status(400).send(unexpected_error);
		return;
	}
	con.query(
		"SELECT * FROM players WHERE username = ?",
		[username],
		function (err, result) {
			if (err) {
				console.log(err);
				res.status(500).send(unexpected_error);
				return;
			}
			if (Object.keys(result).length == 0) {
				res.status(404).send(username_not_exist);
				return;
			}
			Object.keys(result).forEach(function (key) {
				var row = result[key];
				res.status(200).send(row.sent_friend_requests);
				return;
			});
		}
	);
});

app.get("/removeFriend", function (req, res) {
	let username = req.query.username;
	let friend = req.query.friend;

	if (username == undefined || friend == undefined) {
		res.status(400).send(unexpected_error);
		return;
	}

	con.query(
		"SELECT * FROM players WHERE username = ?",
		[username],
		function (err, result) {
			if (err) {
				console.log(err);
				res.status(500).send(unexpected_error);
				return;
			}
			if (Object.keys(result).length == 0) {
				res.status(404).send(username_not_exist);
				return;
			}
			Object.keys(result).forEach(function (key) {
				var row = result[key];
				let friend_requests = [];
				let old = row.friend_requests.split(";");
				for (let i = 0; i < old.length; i++) {
					if (old[i] == friend) {
						continue;
					}
					friend_requests.push(old[i]);
				}
				let newFriends = friend_requests.join(";");
				con.query(
					"UPDATE players SET friends = ? WHERE username = ?",
					[newFriends, username],
					function (err, result) {
						if (err) {
							console.log(err);
							res.status(500).send(unexpected_error);
							return;
						}
						if (result.affectedRows == 0) {
							res.status(404).send(username_not_exist);
							return;
						}
						con.query(
							"SELECT * FROM players WHERE username = ?",
							[friend],
							function (err, result) {
								if (err) {
									console.log(err);
									res.status(500).send(unexpected_error);
									return;
								}
								if (Object.keys(result).length == 0) {
									res.status(404).send(username_not_exist);
									return;
								}
								Object.keys(result).forEach(function (key) {
									var row = result[key];
									let friend_requests = [];
									let old = row.friend_requests.split(";");
									for (let i = 0; i < old.length; i++) {
										if (old[i] == username) {
											continue;
										}
										friend_requests.push(old[i]);
									}
									let newFriends = friend_requests.join(";");
									con.query(
										"UPDATE players SET friends = ? WHERE username = ?",
										[newFriends, friend],
										function (err, result) {
											if (err) {
												console.log(err);
												res.status(500).send(unexpected_error);
												return;
											}
											if (result.affectedRows == 0) {
												res.status(404).send(username_not_exist);
												return;
											}
											res.status(200).send(success);
											return;
										}
									);
								});
							}
						);
					}
				);
			});
		}
	);
});

app.get("/addRank", function (req, res) {
	let name = req.query.name;
	let permissions = req.query.permissions;

	if (name == undefined) {
		res.status(400).send(unexpected_error);
		return;
	}
	if (permissions == undefined || permissions == null) {
		permissions = "";
	}

	con.query(
		"INSERT INTO ranks (name, permissions) VALUES (?, ?)",
		[name, permissions],
		function (err) {
			if (err) {
				console.log(err);
				res.status(500).send(unexpected_error);
				return;
			}
			res.status(200).send(success);
			return;
		}
	);
});

app.get("/changeRank", function (req, res) {
	let id = req.query.id;
	let name = req.query.name;
	let permissions = req.query.permissions;

	if (id == undefined || name == undefined || permissions == undefined) {
		res.status(400).send(unexpected_error);
		return;
	}

	con.query(
		"UPDATE ranks SET name = ?, permissions = ? WHERE id = ?",
		[name, permissions, id],
		function (err) {
			if (err) {
				console.log(err);
				res.status(500).send(unexpected_error);
				return;
			}
			res.status(200).send(success);
			return;
		}
	);
});

app.get("/removeRank", function (req, res) {
	let id = req.query.id;

	if (id == undefined) {
		res.status(400).send(unexpected_error);
		return;
	}

	con.query(
		"DELETE FROM ranks WHERE id = ?",
		[id],
		function (err) {
			if (err) {
				console.log(err);
				res.status(500).send(unexpected_error);
				return;
			}
			res.status(200).send(success);
			return;
		}
	);
});

app.get("/getRankInfo", function (req, res) {
	let id = req.query.id;

	if (id == undefined) {
		res.status(400).send(unexpected_error);
		return;
	}

	con.query(
		"SELECT * FROM ranks WHERE id = ?",
		[id],
		function (err, result) {
			if (err) {
				console.log(err);
				res.status(500).send(unexpected_error);
				return;
			}
			if (Object.keys(result).length == 0) {
				res.status(500).send(unexpected_error);
				return;
			}
			Object.keys(result).forEach(function (key) {
				var row = result[key];
				res.status(200).send(row.id + "|" + row.name + "|" + row.permissions);
				return;
			});
		}
	);
});

app.get("/register", function (req, res) {
	let username = req.query.username as string;
	let password = req.query.password as string;

	if (username == undefined || password == undefined) {
		res.status(400).send(unexpected_error);
		return;
	}
	if (username.trim() == "" || password.trim() == "" || username.length < 2 || password.length < 4 || username == "Server") {
		res.status(400).send(invalid_username_password);
		return;
	}

	con.query("SELECT * FROM players WHERE username = ?", [username], function (
		err,
		result
	) {
		if (err) {
			console.log(err);
			res.status(500).send(unexpected_error);
			return;
		}
		if (Object.keys(result).length > 0) {
			res.status(400).send(rg_username_exist);
			return;
		}
		bcrypt.hash(password, saltRounds, function (err, hash) {
			if (err) {
				console.log(err);
				res.status(500).send(unexpected_error);
				return;
			}
			con.query(
				"INSERT INTO players (username, password) VALUES (?, ?)",
				[username, hash],
				function (err) {
					if (err) {
						console.log(err);
						res.status(500).send(unexpected_error);
						return;
					}
					res.status(200).send(success);
					return;
				}
			);
		});
	});
});

app.get("/login", function (req, res) {
	let username = req.query.username as string;
	let password = req.query.password as string;

	if (username == undefined || password == undefined) {
		res.status(400).send(unexpected_error);
		return;
	}

	con.query("SELECT * FROM players WHERE username = ?", [username], function (
		err,
		result
	) {
		if (err) {
			console.log(err);
			res.status(500).send(unexpected_error);
			return;
		}
		if (Object.keys(result).length == 0) {
			res.status(404).send(lg_error);
			return;
		}
		Object.keys(result).forEach(function (key) {
			var row = result[key];
			bcrypt.compare(password, row.password, function (err, result) {
				if (err) {
					console.log(err);
					res.status(500).send(unexpected_error);
					return;
				}
				if (result) {
					res.status(200).send(success);
					return;
				} else {
					res.status(403).send(lg_error);
					return;
				}
			});
		});
	});
});

app.listen(port, "0.0.0.0", () => {
	console.log(`BackendServer listening on port ${port}.`);
});

function generateSessionToken() {
	return crypto.randomBytes(24).toString("base64");
}

function isValidSessionTime(date: any) {
	const time = 1000 * 60 * 60 * max_session_time_in_hours;
	const lastTime = Date.now() - time;

	return date > lastTime;
}