
var localPrefs = {
	lastSubscriberCursor: undefined
	};


function saveLocalPrefs () {
	localStorage.localPrefs = jsonStringify (localPrefs);
	}
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
function viewFeed (username) {
	const feedUrl = "https://rss.firesky.tv?filter=from%3A" + username;
	readFeed (feedUrl, function (err, theFeed) {
		if (err) {
			alertDialog (err.message);
			}
		else {
			viewBlueskyFeed (feedUrl, theFeed, $(".divPageBody"));
			}
		});
	}
function readOutline (url, callback) {
	readHttpFileThruProxy (url, undefined, function (opmltext) {
		if (opmltext === undefined) {
			callback ({message: "There was an error reading the file."});
			}
		else {
			callback (undefined, opml.parse (opmltext));
			}
		});
	}


function realViewFeed (feedUrl, whereToAppend) { //this is the real one! 
	whereToAppend.empty ();
	readFeed (feedUrl, function (err, theFeed) {
		if (err) {
			alertDialog (err.message);
			}
		else {
			const divFeedItems = $("<div class=\"divFeedItems\"></div>");
			theFeed.items.forEach (function (item) {
				const divFeedItem = $("<div class=\"divFeedItem\"></div>");
				function getFeedItemWhen () {
					const divFeedItemWhen = $("<div class=\"divFeedItemWhen\"></div>");
					divFeedItemWhen.append (getUpdateableTime (item.pubDate));
					return (divFeedItemWhen);
					}
				function getFeedItemText () {
					const divFeedItemText = $("<td class=\"divFeedItemText\"></td>");
					divFeedItemText.text (item.markdowntext);
					return (divFeedItemText);
					
					}
				divFeedItem.append (getFeedItemText ());
				divFeedItem.append (getFeedItemWhen ());
				divFeedItems.append (divFeedItem);
				});
			whereToAppend.append (divFeedItems);
			}
		});
	}


function viewSubscriptionList (username, whereToAppend) {
	const urlOutline = "https://firesky.tv/lists/@" + username + "/follows.opml";
	readOutline (urlOutline, function (err, theOutline) {
		if (err) {
			alertDialog (err.message);
			}
		else {
			function sortSubscriptions (theOutline) {
				const options = {
					flReverseSort: false
					};
				theOutline.opml.body.subs.sort (function (a, b) {
					var alower = a.text.toLowerCase (), val;
					var blower = b.text.toLowerCase ();
					if (options.flReverseSort) { //7/11/22 by DW
						let tmp = alower;
						alower = blower;
						blower = tmp;
						}
					if (alower.length == 0) {
						return (1);
						}
					if (blower.length == 0) {
						return (-1);
						}
					if (alower == blower) {
						val = 0;
						}
					else {
						if (blower > alower) {
							val = -1;
							}
						else {
							val = 1;
							}
						}
					return (val);
					});
				}
			function getItemText (item) {
				const junk = "Bluesky posts: from:";
				var theText = stringDelete (item.text, 1, junk.length);
				return (theText);
				}
			function getTopOfPageInfo () {
				const divTopOfPageInfo = $("<div class=\"divTopOfPageInfo\"></div>");
				const theHead = theOutline.opml.head;
				const urlOutlineForDisplay = urlOutline;
				const divPubdate = $("<div class=\"divBlueskyFeedPubdate\">" + formatDateTime (theHead.dateModified) + ", " + urlOutlineForDisplay + "</div>");
				const divTitle = $("<div class=\"divBlueskyFeedTitle\">" + theHead.title + "</div>");
				const divDescription = $("<div class=\"divBlueskyFeedDescription\">" + theHead.description + "</div>");
				divTopOfPageInfo.append (divPubdate);
				divTopOfPageInfo.append (divTitle);
				divTopOfPageInfo.append (divDescription);
				return (divTopOfPageInfo);
				}
			const divFeedListContainer = $("<div class=\"divFeedListContainer\"></div>");
			
			divFeedListContainer.append (getTopOfPageInfo ());
			
			const divListViewer = $("<div class=\"divListViewer\"></div>");
			const ulFeedList = $("<ul class=\"ulFeedList\"></ul>");
			divListViewer.append (ulFeedList);
			divFeedListContainer.append (divListViewer);
			
			const divFeedViewer = $("<div class=\"divFeedViewer\"></div>");
			divFeedListContainer.append (divFeedViewer);
			
			sortSubscriptions (theOutline);
			
			const topLevelOutline = theOutline.opml.body.subs;
			const ixcursor = (localPrefs.lastSubscriberCursor !== undefined) ? localPrefs.lastSubscriberCursor : 0;
			topLevelOutline.forEach (function (item, ix) {
				const liFeedListItem = $("<li class=\"liFeedListItem\"></li>");
				liFeedListItem.html (getItemText (item));
				liFeedListItem.click (function () {
					console.log ("click: item == " + jsonStringify (item));
					$(".listCursorOn").removeClass ("listCursorOn");
					liFeedListItem.addClass ("listCursorOn");
					realViewFeed (item.xmlUrl, divFeedViewer);
					localPrefs.lastSubscriberCursor = ix;
					saveLocalPrefs ();
					});
				
				if (ix == ixcursor) {
					liFeedListItem.addClass ("listCursorOn");
					}
				
				ulFeedList.append (liFeedListItem);
				});
			
			realViewFeed (topLevelOutline [ixcursor].xmlUrl, divFeedViewer);
			
			whereToAppend.append (divFeedListContainer);
			}
		});
	}

function everyMinute () {
	$(".spUpdateableTime").trigger ("update");
	}
function startup () {
	console.log ("startup");
	if (localStorage.localPrefs !== undefined) {
		try {
			localPrefs = JSON.parse (localStorage.localPrefs);
			}
		catch (err) {
			}
		}
	const allparams = getAllUrlParams ();
	
	if (allparams.subs !== undefined) {
		viewSubscriptionList (allparams.subs, $(".divPageBody"));
		}
	else {
		if (allparams.username === undefined) {
			viewFeed ("davew");
			}
		else { //show one feed
			viewFeed (allparams.username);
			}
		}
	
	runEveryMinute (everyMinute);
	hitCounter ();
	}
