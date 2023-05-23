var localPrefs = {
	lastSubscriberCursor: undefined
	};

function saveLocalPrefs () {
	localStorage.localPrefs = jsonStringify (localPrefs);
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
function markdownProcess (s) {
	var md = new Markdown.Converter ();
	return (md.makeHtml (s));
	}
function addToolTip (theObject, tipText, placement="right") { //8/24/22 by DW
	$(theObject).attr ("data-container", "body"); //10/23/22 by DW
	$(theObject).attr ("data-toggle", "tooltip");
	$(theObject).attr ("data-placement", placement);
	$(theObject).attr ("title", tipText);
	$(theObject).click (function () { //11/1/22 by DW
		$(theObject).tooltip ("hide");
		});
	theObject.tooltip (); //5/22/23 by DW
	return (theObject);
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
			var jstruct;
			try {
				jstruct = JSON.parse (jsontext);
				}
			catch (err) {
				callback (err);
				return;
				}
			callback (undefined, jstruct); 
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
function viewFeedForEarlyDemo (username) {
	const feedUrl = "https://rss.firesky.tv?filter=from%3A" + username;
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
	readFeed (feedUrl, function (err, theFeed) {
		if (err) {
			alertDialog (err.message);
			}
		else {
			viewBlueskyFeed (feedUrl, theFeed, $(".divPageBody"));
			}
		});
	}

function viewFeed (feedUrl, whereToAppend) { //this is the real one! 
	console.log ("viewFeed");
	whereToAppend.empty ();
	readFeed (feedUrl, function (err, theFeed) {
		if (err) {
			alertDialog (err.message);
			}
		else {
			const divFeedItems = $("<div class=\"divFeedItems\"></div>");
			
			if (theFeed.items.length == 0) {
				divFeedItems.html ("<div class=\"divFeedHasNoItems\">This <a href=\"" + feedUrl + "\" target=\"_blank\">feed</a> has no items.</div>");
				}
			else {
				theFeed.items.forEach (function (item) {
					const divFeedItem = $("<div class=\"divFeedItem\"></div>");
					function getFeedItemWhen () {
						const divFeedItemWhen = $("<div class=\"divFeedItemWhen\"></div>");
						divFeedItemWhen.append (getUpdateableTime (item.pubDate));
						return (divFeedItemWhen);
						}
					function getFeedItemTopline () {
						const divFeedItemTopline = $("<div class=\"divFeedItemTopline\"></div>");
						
						const spFeedTitle = $("<span class=\"spItemName\">" + theFeed.title + "</span>");
						divFeedItemTopline.append (spFeedTitle);
						addToolTip (spFeedTitle, theFeed.description);
						
						divFeedItemTopline.append ("<span class=\"spItemUsername\">" + item.author + "</span>");
						divFeedItemTopline.append ("<span class=\"spItemFeed\">(<a href=\"" + feedUrl + "\" target=\"_blank\">feed</a>)</span>");
						const spWhen = $("<span class=\"spItemWhen\"></span>");
						spWhen.append (getUpdateableTime (item.pubDate));
						divFeedItemTopline.append (spWhen);
						
						return (divFeedItemTopline);
						}
					function getFeedItemBottomline () {
						const divFeedItemBottomline = $("<div class=\"divFeedItemBottomline\"></div>");
						function getReplies () {
							const divFeedItemReplies = $("<span class=\"spFeedItemReplies\"></span>");
							divFeedItemReplies.html ("<i class=\"fa fa-comment\"></i> 0");
							return (divFeedItemReplies);
							}
						function getRTs () {
							const divFeedItemRTs = $("<span class=\"spFeedItemRTs\"></span>");
							divFeedItemRTs.html ("<i class=\"fa fa-retweet\"></i> 0");
							return (divFeedItemRTs);
							}
						function getFaves () {
							const divFeedItemFaves = $("<span class=\"spFeedItemFaves\"></span>");
							divFeedItemFaves.html ("<i class=\"fa fa-thumbs-up\"></i> 0");
							return (divFeedItemFaves);
							}
						function getMenu () {
							const divFeedItemMenu = $("<span class=\"spFeedItemMenu\">...</span>");
							return (divFeedItemMenu);
							}
						divFeedItemBottomline.append (getReplies ());
						divFeedItemBottomline.append (getRTs ());
						divFeedItemBottomline.append (getFaves ());
						divFeedItemBottomline.append (getMenu ());
						return (divFeedItemBottomline);
						}
					function getFeedItemText () {
						function decodeText (theText) {
							const replaceTable1 = {
								"&#10;": "\n"
								};
							theText = multipleReplaceAll (theText, replaceTable1, false, "", "");
							
							
							theText = decodeXml (theText);
							
							return (theText);
							}
						const divFeedItemText = $("<td class=\"divFeedItemText\"></td>");
						var theText = (item.markdowntext === undefined) ? item.description : item.markdowntext;
						
						if (theText === undefined) {
							console.log ("hello");
							}
						
						theText = decodeText (theText);
						
						theText = trimWhitespace (theText); //5/23/23 by DW 
						if (beginsWith (theText, "# ")) {
							theText = "##" + theText;
							}
						
						theText = markdownProcess (theText);
						divFeedItemText.html (theText);
						return (divFeedItemText);
						}
					divFeedItem.append (getFeedItemTopline ());
					divFeedItem.append (getFeedItemText ());
					divFeedItem.append (getFeedItemBottomline ());
					divFeedItems.append (divFeedItem);
					});
				}
			
			whereToAppend.append (divFeedItems);
			}
		});
	}

function viewSubscriptionList (username, whereToAppend) {
	console.log ("viewSubscriptionList");
	const urlOutline = "https://firesky.tv/lists/@" + username + "/follows.opml";
	readOutline (urlOutline, function (err, theOutline) {
		if (err) {
			alertDialog (err.message);
			}
		else {
			function removeJunkFromOutline () { //stuff i don't want in the outline
				theOutline.opml.body.subs.forEach (function (item) {
					const junk = "on Bluesky";
					if (stringContains (item.text, junk)) {
						item.text = replaceAll (item.text, junk, "");
						}
					if (beginsWith (item.text, "@")) {
						item.text = stringDelete (item.text, 1, 1);
						}
					});
				}
			function addAccountToList (username) {
				theOutline.opml.body.subs.unshift ({
					type: "rss",
					text: username,
					htmlUrl: "https://firesky.tv?filter=from%3A" + username,
					xmlUrl: "https://rss.firesky.tv?filter=from%3A" + username
					});
				}
			function sortSubscriptions () {
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
				
				
				
				
				
				var theText = item.text;
				if (stringContains (item.text, junk)) {
					theText = stringDelete (theText, 1, junk.length);
					}
				return (theText);
				}
			function getTopOfPageInfo () {
				const divTopOfPageInfo = $("<div class=\"divTopOfPageInfo\"></div>");
				const theHead = theOutline.opml.head;
				const urlOutlineForDisplay = "<sp class=\"spUrlSubscriptionListOpml\"><a href=\"" + urlOutline + "\" target=\"_blank\">" + urlOutline + "</a></span>";
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
			
			removeJunkFromOutline ();
			addAccountToList (username);
			sortSubscriptions ();
			
			const topLevelOutline = theOutline.opml.body.subs;
			const ixcursor = (localPrefs.lastSubscriberCursor !== undefined) ? localPrefs.lastSubscriberCursor : 0;
			topLevelOutline.forEach (function (item, ix) {
				const liFeedListItem = $("<li class=\"liFeedListItem\"></li>");
				
				liFeedListItem.html (getItemText (item));
				
				
				liFeedListItem.click (function () {
					$(".listCursorOn").removeClass ("listCursorOn");
					liFeedListItem.addClass ("listCursorOn");
					viewFeed (item.xmlUrl, divFeedViewer);
					localPrefs.lastSubscriberCursor = ix;
					saveLocalPrefs ();
					});
				
				if (ix == ixcursor) {
					liFeedListItem.addClass ("listCursorOn");
					}
				
				ulFeedList.append (liFeedListItem);
				});
			
			viewFeed (topLevelOutline [ixcursor].xmlUrl, divFeedViewer);
			
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
		const username = (allparams.username === undefined) ? "davew" : allparams.username;
		viewFeedForEarlyDemo (username);
		}
	
	runEveryMinute (everyMinute);
	hitCounter ();
	}
