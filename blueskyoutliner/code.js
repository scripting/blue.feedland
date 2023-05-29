var appConsts = {
	"productname": "blueskyoutliner",
	"productnameForDisplay": "blueskyoutliner",
	"version": "0.4.0"
	}
var appPrefs = {
	outlineFont: "Ubuntu", outlineFontSize: 16, outlineLineHeight: 24,
	authorName: "", authorEmail: "",
	};

var whenLastUserAction = new Date (0), whenLastKeystroke = new Date (0);

var localPrefs = { 
	savedOpmltext: undefined, 
	ctSaves: 0
	}
var flLocalPrefsChanged = false;

function saveLocalPrefs () {
	console.log ("saveLocalPrefs");
	localPrefs.ctSaves++;
	localPrefs.savedOpmltext = opOutlineToXml ();
	localStorage.localPrefsBlueskyOutliner = jsonStringify (localPrefs);
	}
function localPrefsChanged () {
	flLocalPrefsChanged = true;
	}
function getUserSubscriptionList (username, callback) {
	const url = "https://firesky.tv/lists/" + username + "/follows.opml";
	console.log ("getUserSubscriptionList: url == " + url);
	readHttpFileThruProxy (url, undefined, function (opmltext) {
		callback (undefined, opmltext);
		});
	}

function fixTextAtts () {
	$(".concord-text").each (function () {
		var theText = $(this).text ();
		if (beginsWith (theText, "@")) {
			theText = stringDelete (theText, 1, 1);
			theText = replaceAll (theText, " on Bluesky", "");
			$(this).text (theText)
			}
		});
	}
function viewOutline (opmltext) {
	setOutlinerPrefs ("#outliner", true, false);
	opSetFont (appPrefs.outlineFont, appPrefs.outlineFontSize, appPrefs.outlineLineHeight); 
	opXmlToOutline (opmltext);
	fixTextAtts ();
	localPrefsChanged ();
	}
function viewSubscriptionList (username, callback) {
	$("#outliner").empty ();
	getUserSubscriptionList (username, function (err, opmltext) {
		viewOutline (opmltext);
		if (callback !== undefined) {
			callback ();
			}
		});
	}

function expandCallback () {
	var username = opGetLineText ();
	console.log ("expandCallback: " + opGetAttsDisplayString ());
	getUserSubscriptionList (username, function (err, opmltext) {
		opDeleteSubs ();
		opInsertXml (opmltext, right); 
		fixTextAtts ();
		});
	}
function setOutlinerPrefs (id, flRenderMode, flReadonly) {
	$(id).concord ({
		prefs: {
			outlineFont: appPrefs.outlineFont, 
			outlineFontSize: appPrefs.outlineFontSize, 
			outlineLineHeight: appPrefs.outlineLineHeight,
			renderMode: flRenderMode,
			readonly: flReadonly,
			typeIcons: opTypeIcons
			},
		callbacks: {
			opInsert: opInsertCallback,
			opCursorMoved: function (op) {
				localPrefsChanged ();
				$("#idUsernameInput").val (opGetLineText ());
				},
			opExpand: function (op) {
				whenLastUserAction = new Date (); 
				expandCallback ();
				},
			opCollapse: function (op) {
				opDeleteSubs ();
				},
			opHover: function (op) {
				},
			opKeystroke: function (event) {
				var now = new Date ();
				whenLastKeystroke = now; 
				whenLastUserAction = now;
				}
			}
		});
	}

function setupPageBackground () {
	var s = "";
	for (var i = 0; i < 10000; i++) {
		s += "123 ";
		}
	$("#idPageBackground").html (s);
	}
function lookupButtonClick () {
	var username = $("#idUsernameInput").val ();
	viewSubscriptionList (username);
	}

function everySecond () {
	if (flLocalPrefsChanged || opHasChanged ()) {
		flLocalPrefsChanged = false;
		opClearChanged ();
		saveLocalPrefs ();
		}
	}
function startup () {
	console.log ("startup");
	if (localStorage.localPrefsBlueskyOutliner !== undefined) {
		try {
			localPrefs = JSON.parse (localStorage.localPrefsBlueskyOutliner);
			}
		catch (err) {
			console.log ("localStorage.localPrefs, err.message == " + err.message);
			}
		}
	$("#idVersionNumber").html ("v" + appConsts.version);
	$("#idUsernameInput").val ("scripting.com");
	
	if (localPrefs.savedOpmltext !== undefined) { //restore
		viewOutline (localPrefs.savedOpmltext);
		}
	else {
		viewSubscriptionList ("scripting.com"); //start over
		}
	
	self.setInterval (everySecond, 1000);
	hitCounter ();
	}
