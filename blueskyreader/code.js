

function httpRequest (url, timeout, headers, callback) {
	timeout = (timeout === undefined) ? 30000 : timeout;
	var jxhr = $.ajax ({ 
		url: url,
		dataType: "text", 
		headers,
		timeout
		}) 
	.success (function (data, status) { 
		callback (undefined, data);
		}) 
	.error (function (status) { 
		var message;
		try { //9/18/21 by DW
			message = JSON.parse (status.responseText).message;
			}
		catch (err) {
			message = status.responseText;
			}
		var err = {
			code: status.status,
			message
			};
		callback (err);
		});
	}
function readFeed (feedUrl, callback) {
	var url = "http://feeder.scripting.com/returnjson?url=" + feedUrl;
	httpRequest (url, undefined, undefined, function (err, jsontext) {
		if (err) {
			callback (err);
			}
		else {
			try {
				var jstruct = JSON.parse (jsontext);
				callback (undefined, jstruct); 
				}
			catch (err) {
				callback (err);
				}
			}
		});
	}
function formatDateTime (d) {
	d = new Date (d);
	return (d.toLocaleDateString () + " at " + d.toLocaleTimeString ());
	}
function getFeedlandTimeString (when, flLongStrings=false) {
	const options = {
		flBriefYearDates: true,
		nowString: "now"
		};
	var s = getFacebookTimeString (when, flLongStrings, options);
	return (s);
	}
function getUpdateableTime (when, flTextAtEnd=".", flLongString=true, link) { //8/28/22 by DW
	var theWhen = $("<span class=\"spUpdateableTime\"></span>");
	function setWhen () {
		var whenstring = getFeedlandTimeString (when, flLongString) + flTextAtEnd;
		if (link !== undefined) { //9/1/22 by DW
			whenstring = "<a href=\"" + link + "\" target=\"_blank\">" + whenstring + "</a>";
			}
		if (theWhen.html () != whenstring) { //avoid flashing in the debugger, it's annoying
			theWhen.html (whenstring);
			}
		}
	setWhen ();
	theWhen.on ("update", setWhen);
	return (theWhen);
	}

function viewBlueskyFeed (feedUrl, theFeed, whereToAppend) {
	const divFeed = $("<div class=\"divBlueskyFeed\"></div>");
	
	const divFeedUrl = $("<div class=\"divBlueskyFeedUrl\"></div>");
	const divFeedUrlIcon = $("<a href=\"" + feedUrl + "\"><div class=\"divXmlIcon\">XML</div></a>");
	divFeedUrl.append (divFeedUrlIcon);
	divFeed.append (divFeedUrl);
	
	const divPubdate = $("<div class=\"divBlueskyFeedPubdate\">" + formatDateTime (theFeed.pubDate) + "</div>");
	const divTitle = $("<div class=\"divBlueskyFeedTitle\">" + theFeed.title + "</div>");
	const divDescription = $("<div class=\"divBlueskyFeedDescription\">" + theFeed.description + "</div>");
	divFeed.append (divPubdate);
	divFeed.append (divTitle);
	divFeed.append (divDescription);
	
	var ct = 0;
	const divItems = $("<div class=\"divBlueskyFeedItems\"></div>");
	theFeed.items.forEach (function (item) {
		if (++ct <= 5) {
			const divItem  = $("<div class=\"divBlueskyFeedItem\"></div>");
			
			function processDescription (theDescription) {
				const replaceTable1 = {
					"&#10;": "\n"
					};
				theDescription = multipleReplaceAll (theDescription, replaceTable1, false, "", "");
				
				const replaceTable2 = {
					"\n": "<br>"
					};
				theDescription = multipleReplaceAll (theDescription, replaceTable2, false, "", "");
				
				theDescription = decodeXml (theDescription);
				
				return (theDescription);
				}
			function getItemImage (imageUrl) {
				const theImage = $("<img src=\"" + imageUrl + "\">");
				return (theImage);
				}
			
			const divItemPubdate = $("<div class=\"divBlueskyFeedItemPubdate\"></div>");
			divItemPubdate.append (getUpdateableTime (item.pubDate));
			divItem.append (divItemPubdate);
			
			const divItemText = $("<div class=\"divBlueskyFeedItemText\">" + processDescription (item.description) + "</div>");
			divItem.append (divItemText);
			
			if (item.enclosure !== undefined) {
				if (beginsWith (item.enclosure.type, "image/")) {
					const divImage = $("<div class=\"divBlueskyFeedItemImage\"></div>");
					divImage.append (getItemImage (item.enclosure.url));
					divItem.append (divImage);
					}
				}
			
			divItems.append (divItem);
			}
		});
	divFeed.append (divItems);
	
	whereToAppend.append (divFeed);
	}

function everyMinute () {
	$(".spUpdateableTime").trigger ("update");
	}
function startup () {
	console.log ("startup");
	
	
	const allparams = getAllUrlParams ();
	const username = (allparams.username === undefined) ? "nyt.bsky.social" : allparams.username;
	const feedUrl = "https://rss.firesky.tv?filter=from%3A" + username;
	
	console.log ("startup: feedUrl == " + feedUrl);
	
	readFeed (feedUrl, function (err, theFeed) {
		if (err) {
			console.log (err.message);
			}
		else {
			viewBlueskyFeed (feedUrl, theFeed, $(".divPageBody"));
			}
		});
	runEveryMinute (everyMinute);
	hitCounter ();
	}
