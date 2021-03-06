// ==UserScript==
// @name          Ponychan X
// @namespace     milky
// @description   Adds various bloat.
// @author        milky
// @contributor   Storm Vision
// @contributor   onekopaka
// @include       http://www.ponychan.net/chan/*
// @include       *lunachan.net/*
// @exclude       http://www.ponychan.net/chan/
// @exclude       http://www.ponychan.net/chan/board.php
// @exclude       http://www.ponychan.net/chan/?p=*
// @exclude       *lunachan.net/
// @exclude       *lunachan.net/board.php
// @version       0.19
// @icon          http://i.imgur.com/12a0D.jpg
// @updateURL     https://github.com/milkytiptoe/ponychan-x/raw/master/pchanx.user.js
// @homepage      http://www.ponychan.net/chan/meta/res/115168.html
// ==/UserScript==

function ponychanx() {
	$jq = jQuery.noConflict();
	var durl = document.URL.split("#")[0];
	var us = durl.split("/");
	var purl = us[2].indexOf("ponychan") > 1 ? us[2]+"/chan" : us[2];
	var rto = document.URL.split("#i")[1];
	
	var Main = {
		version: 19,
		bid: null,
		tid: null,
		init: function() {
			if ($jq("h1").length > 0 && $jq("h1").html() == "404 Not Found") {
				if (durl.indexOf("+50") > -1)
					return window.location = durl.replace("+50", "");
				return;
			}
			Main.tid = $jq("#postform :input[name='replythread']").val();
			Main.bid = $jq("#postform :input[name='board']").val();
			Html.init();
			Css.init();
			if (Main.tid != "0" && $jq("#postform").length > 0) {
				if (Settings.gets("Enable autoupdate")=="true") Updater.init();	
				if (Settings.gets("Show autoupdate countdown dialog")=="true" && Settings.gets("Enable autoupdate")=="true") Dialog.init();
			}
			if (Settings.gets("Enable quick reply")=="true") QR.init();
			if (Settings.gets("Show new post count in title")=="true") Notifier.init();
			Posts.init();
			if (Settings.gets("Enable filter")=="true") Filter.init();
			if (Settings.gets("Autoupdate watched threads list")=="true")
				setTimeout(function() { Updater.getwatched(); }, 10000);
			Main.update();
		},
		update: function() {
			var d = new Date().getTime();
			var lu = Settings.get("x.update.lastcheck");
			var lv = Settings.get("x.update.latestversion");
			if (lu == null) {
				lu = d;
				Settings.set("x.update.lastcheck", lu);
			}
			if (lv == null) lv = Main.version;
			if (d > parseInt(lu)+172800000 && lv == Main.version) {
				var xhr = new XMLHttpRequest();
				xhr.open("GET", "http://nassign.heliohost.org/s/latest.php");
				xhr.send();
				xhr.onreadystatechange = function() {
					if (xhr.readyState == 4) {
						if (xhr.status == 200) {
							lv = parseInt(xhr.responseText);
							Settings.set("x.update.latestversion", lv);
						}
					}
				}
				Settings.set("x.update.lastcheck", d);
			}
			if (lv > Main.version) {
				$jq("#pxbtn").append(" (Update)");
				$jq("#pxoptions").prepend("<strong>Update</strong><br />A new update for Ponchan X is available.<br />\
				Update applies on your next refresh.<br />\
				<a href='javascript:;' onclick='window.location = \"https://github.com/milkytiptoe/ponychan-x/raw/master/pchanx.user.js\"'>Click here to install the update</a>.<br /><br />");
			}
		}
	};
	
	Updater = {
		tmr: 10000,
		last: "",
		init: function() {
			var stmr = Settings.get("x.updatetimer");
			if (stmr != null) Updater.tmr = parseInt(stmr)*1000;
			setTimeout(function() { Updater.get(); }, Updater.tmr);
		},
		get: function() {
			var xhr = new XMLHttpRequest();
			xhr.open("GET", durl+(durl.indexOf("lunachan") > -1 ? "" : "?"+new Date().getTime()));
			xhr.setRequestHeader("If-Modified-Since", Updater.last);
			xhr.setRequestHeader("Accept", "*/*");
			xhr.send();
			xhr.onreadystatechange = function() {
				if (xhr.readyState == 4) {
					setTimeout(function() { Updater.get(); }, Updater.tmr);
					if (Settings.gets("Show autoupdate countdown dialog") == "true") { Dialog.countdown(); }
					switch (xhr.status) {
						case 200:
							Updater.last = xhr.getResponseHeader("Last-Modified");
							var f, l;
							if ($jq("#delform div[id]:first table").length == 0) {
								l = -1;
								f = true;
							} else {
								l = parseInt($jq($jq("table:not(.postform):not(.userdelete) > tbody > tr > td[id] > a[name]").get().reverse())[0].name);
								f = false;
							}
							var sat = (parseInt($jq(window).scrollTop()) + parseInt($jq(window).height()) > parseInt($jq(document).height()) - 100);
							$jq("table:not(.postform):not(.userdelete)", xhr.responseText).each(function() {
								var fne = $jq("tbody tr td[id] a[name]", this)[0];
								if (!f && fne != null && parseInt(fne.name) > l)
									f = true;
								if (f) {
									var tal = $jq("#delform div[id]:first table:last");
									if (tal.length > 0)
										tal.after(this);
									else
										$jq(".thread .op").after(this);
									Posts.newhandle(this);
									Posts.fixhover(this);
									Posts.newpostupdate(this);
									Notifier.newhandle(this);
									Filter.newhandle(this);
									if (sat && Settings.gets("Scroll on new post") == "true")
										window.scrollTo(0, document.body.scrollHeight);
								}
							});
						break;
						case 404:
							document.title = "(404) " + Html.title;
							QR.settitle("(404)");
						break;
						case 503:
							QR.settitle("(503) <a href='javascript:;' onclick='javascript:location.reload(true);'>Refresh manually?</a>");
						break;
					}
				}
			}
		},
		getwatched: function() {
			if (getCookie("showwatchedthreads") == "1") {
				getwatchedthreads("0", Main.bid);
				setTimeout(function() { Updater.getwatched(); }, 30000);
			}
		}
	};
	
	var QR = {
		cooldown: 15,
		init: function() {
			Html.hidepostform();
			if (Settings.get("x.show")=="true") QR.show();
			if (rto != null) QR.quote(rto);
			if (Settings.gets("Quick reply key shortcuts")=="true") QR.keys();
		},
		quote: function(h) {
			QR.show();
			var qs = "";
			if (Settings.gets("Quote selected text on quick reply") == "true") {
				var s = $jq.trim(window.getSelection().toString());
				if (s.trim() != "")
					qs = ">"+s+"\n";
			}
			h = ">>" + h + "\n" + qs;
			var ta = $jq("#qr textarea")[0];
			var cp = ta.selectionStart;
			ta.value = ta.value.slice(0, cp) + h + ta.value.slice(ta.selectionEnd);
			ta.focus();
			var r = cp + h.length;
			ta.setSelectionRange(r, r);
		},
		settitle: function(t) {
			$jq(".qrtop span").html(t);
		},
		show: function() {
			Settings.set("x.show", "true");
			$jq("#qr").css("display", "block");
			if ($jq("#qr").length) return;
			var qr = document.createElement("div");
			qr.setAttribute("id", "qr");
			qr.innerHTML = '<div class="qrtop"><span></span></div><div class="top"><a href="#" title="Top">\u25b2</a><a href="javascript:;" onclick="javascript:window.scrollTo(0, document.body.scrollHeight);" title="Bottom">&#9660;</a></div><div class="close"><a href="javascript:;" title="Close">X</a></div>\
			<input type="text" name="name" placeholder="Name" size="28" maxlength="75" accesskey="n">\
			<input type="text" name="em" placeholder="Email" size="28" maxlength="75" accesskey="e">\
			<input type="text" name="subject" placeholder="Subject" size="35" maxlength="75" accesskey="s">\
			<div class="embedwrap"><input type="text" name="embed" id="embed" placeholder="Embed" size="28" maxlength="75" accesskey="e">\
			<select name="embedtype"><option value="youtube">Youtube</option><option value="google">Google</option></select></div>\
			<textarea name="message" id="msg" placeholder="Message" cols="48" rows="6" accesskey="m"></textarea>\
			<input type="file" id="imgfile" name="imagefile" size="35" multiple="" accept="image/*" accesskey="f">\
			<input type="button" value="Reply" accesskey="z">\
			<div class="postopts"><input type="checkbox" name="spoiler" /> Spoiler <label>Auto <input type="checkbox" name="auto" /></label></div>\
			<div id="imagelist"></div>';
			if (QR.checkmod()) {
				qr.innerHTML += '<div id="modpanel">\
				<input name="modpassword" placeholder="Mod Password" value="'+getCookie("modpassword")+'" size="28" maxlength="75" type="text" /> \
				<label title="Lock"><input name="lockonpost" type="checkbox" /> Lock Thread</label> \
				<label title="Sticky"><input name="stickyonpost" type="checkbox" /> Sticky</label> \
				<label title="Raw HTML"><input name="rawhtml" type="checkbox" /> Raw HTML</label> \
				<label title="Name"><input name="usestaffname" type="checkbox" /> Name</label> \
				</div>';
			}
			$jq("#qr .close a").live("click", function() { QR.hide(); });
			$jq("body").append(qr);
			$jq(window).resize(function() {
				if ($jq("#qr").position().left+410 > document.documentElement.clientWidth) {
					$jq("#qr").css("left", document.documentElement.clientWidth-410);
					Settings.set("x.qrpos_x", $jq("#qr").css("left"));
				}
			});
			if (Settings.gets("Hide quick reply when top button clicked") == "true")
				$jq("#qr .top a:first").on("click", function() { QR.hide(); });
			var btn = $jq("#qr > input[type='button']");
			if (Main.tid == "0") {
				btn.val("Thread"); 
				$jq("#qr .postopts label").css("display", "none");
			}
			if (Settings.gets("Sync original post form and quick reply")=="true") {
				$jq("#qr > input[name], #qr textarea").on("keyup change", function() {
					$jq("#postform").find("[name='"+this.name+"']").val(this.value);
				});
				$jq("#postform input[name], #postform textarea").on("keyup change", function() {
					$jq("#qr").find("[name='"+this.name+"']").val(this.value);
				});
			}
			btn.live("click", function() { QR.send(); } );
			if (Main.bid == "test" || Main.bid == "show" || Main.bid == "media" || Main.bid == "collab" || Main.bid == "phoenix" || Main.bid == "vinyl")
				$jq("#qr .embedwrap").css("display", "block");
			QR.loadfields();
			document.getElementById("imgfile").onchange = function() { QR.thumb(); };
			var x = Settings.get("x.qrpos_x");
			var y = Settings.get("x.qrpos_y");
			if (x!=null) $jq("#qr").css("left", x);
			if (y!=null) $jq("#qr").css("top", y);
			$jq("#qr .qrtop").mousedown(function(e) {
				e.originalEvent.preventDefault();
				$jq("#qr").css("opacity", "0.8");
				$jq(window).bind("mousemove", function(e) {
					$jq("#qr").css("top", e.clientY-10);
					$jq("#qr").css("left", e.clientX-200);
				}).bind('mouseup', function(e) {
					$jq(this).unbind("mousemove");
					$jq(this).unbind("mouseup");
					$jq("#qr").css("opacity", "1");
					$jq("#qr").css("top", e.clientY-10);
					$jq("#qr").css("left", e.clientX-200);
					if (e.clientY < 33) $jq("#qr").css("top", "33px");
					Settings.set("x.qrpos_x", $jq("#qr").css("left"));
					Settings.set("x.qrpos_y", $jq("#qr").css("top"));
				});
			});
		},
		hide: function() {
			Settings.set("x.show", "false");
			$jq("#qr").css("display", "none");
		},
		send: function() {
			if (!$jq("#qr").length) return;
			$jq("#qr > input[type='button']").val("...");
			var n = $jq("#qr :input[name='name']").val();
			var e = $jq("#qr :input[name='em']").val();
			var s = $jq("#qr :input[name='subject']").val();
			var m = $jq("#qr :input[name='message']").val();
			var sp = $jq("#qr .postopts :input[name='spoiler']").is(":checked");
			var pp = $jq("#postform :input[name='postpassword']").val();
			var qri = $jq("#postform :input[name='quickreply']").val();
			var hmpcyh = $jq("#postform :input[name='how_much_pony_can_you_handle']").val();
			var fid = parseInt($jq("#thumbselected").attr("name"));
			var i = document.getElementById("imgfile").files[fid];
			var d = new FormData();
			d.append("board", Main.bid);
			d.append("replythread", Main.tid);
			d.append("quickreply", qri);
			d.append("name", n);
			d.append("em", e);
			d.append("subject", s);
			d.append("postpassword", pp);
			d.append("how_much_pony_can_you_handle", hmpcyh);
			d.append("stats_referrer", "");
			if (QR.checkmod()) {
				var mp = $jq("#qr #modpanel :input[name='modpassword']").val();
				var lop = $jq("#qr #modpanel :input[name='lockonpost']").is(":checked");
				var sop = $jq("#qr #modpanel :input[name='stickyonpost']").is(":checked");
				var rh = $jq("#qr #modpanel :input[name='rawhtml']").is(":checked");
				var usn = $jq("#qr #modpanel :input[name='usestaffname']").is(":checked");
				d.append("modpassword", mp);
				d.append("lockonpost", lop);
				d.append("stickyonpost", sop);
				d.append("rawhtml", rh);
				d.append("usestaffname", usn);
			}
			if (Main.bid == "test" || Main.bid == "show" || Main.bid == "media" || Main.bid == "collab" || Main.bid == "phoenix" || Main.bid == "vinyl") {
				var em = $jq("#qr :input[name='embed']").val();
				var emt = $jq("#qr select").val();
				d.append("embed", em);
				d.append("embedtype", emt);
			}
			if (sp) d.append("spoiler", sp);
			d.append("message", m);
			d.append("imagefile", i);			
			var xhr = new XMLHttpRequest();
			xhr.upload.addEventListener("progress", function(evt) {
				if (evt.lengthComputable) {
					var percentComplete = Math.round(evt.loaded * 100 / evt.total);
					$jq("#qr > input[type='button']").val(percentComplete.toString() + '%');
				}
			}, false);
			xhr.open("POST", "http://" + purl + "/board.php");  
			xhr.send(d);
			xhr.onreadystatechange = function() {
				if (xhr.readyState == 4) {
					if (xhr.status == 200) {
						Notifier._me = true;
						if (xhr.responseText.indexOf("<title>Ponychan</title>") > -1) {
							QR.settitle(xhr.responseText.match(/.*<h2.*>([\s\S]*)<\/h2>.*/)[1]);
							$jq("#qr > input[type='button']").val("Retry");
						} else {
							if (Main.tid == "0" && $jq("#postform :input[name='quickreply']").val() == "")
								location.reload(true);
							QR.clear(fid);
						}
					} else {
						QR.settitle("An error occured while posting.");
						$jq("#qr > input[type='button']").val("Error");
					}
				}
			}
			QR.storefields();
		},
		cooldowntimer: function() {
			$jq("#qr > input[type='button']").attr("disabled", "disabled").val(QR.cooldown);
			if (QR.cooldown > 0) {
				setTimeout(function() { QR.cooldowntimer(); }, 1000);
				var a = $jq("#qr .postopts :input[name='auto']")[0].checked ? "Auto " : "";
				$jq("#qr > input[type='button']").val(a+QR.cooldown);
				QR.cooldown--;
			} else {
				$jq("#qr > input[type='button']").removeAttr("disabled").val(Main.tid == "0" ? "Thread" : "Reply");
				QR.cooldown = 15;
				if ($jq("#qr .postopts :input[name='auto']").is(":checked") && $jq(".listthumb").length > 0)
					QR.send();
			}
		},
		clear: function(fid) {
			$jq("#postform :input[name='quickreply']").val("");
			QR.settitle("");
			$jq(".listthumb[name='"+fid+"']").remove();
			QR.thumbreset();
			var ts = $jq("#thumbselected");
			var tsp = ts.length > 0 ? ts.attr("data-post") : "";
			$jq("#qr textarea").val(tsp);
			$jq("#qr :input[name='subject']").val("");
			$jq("#qr .embedwrap :input[name='embed']").val("");
			$jq("#qr .postopts :input[name='spoiler']")[0].checked = false;
			if (Settings.gets("Hide quick reply after posting")=="true" && $jq("#qr .postopts :input[name='auto']")[0].checked == false)
				QR.hide();
			QR.cooldowntimer();
		},
		thumbreset: function() {
			if ($jq("#thumbselected").length < 1) {
				if ($jq(".listthumb").length > 0) {
					$jq($jq(".listthumb")[0]).attr("id", "thumbselected");
					document.getElementById("imagelist").scrollTop = 0;
					$jq("#qr textarea").val($jq("#thumbselected").attr("data-post"));
				} else {
					$jq("#imagelist, .postopts").css("display", "none");
					$jq("#qr input[type='file']").val("");
					$jq("#qr .postopts :input[name='auto']")[0].checked = false
				}
			}
		},
		thumb: function() {
			var f = document.getElementById("imgfile").files;
			if (f[0] == null) {
				$jq("#imagelist, .postopts").css("display", "none");
				$jq("#imagelist").html("");
				return;
			}
			$jq("#imagelist").html("");
			var url = window.URL || window.webkitURL;
			for (var i = 0, len = f.length; i < len; i++)
			{
				var fU = url.createObjectURL(f[i]);
				var thumb = document.createElement("div");
				$jq("#imagelist").append(thumb);
				$jq(thumb).on("mousedown", function(e) {
					if (e.which == 1) {
						var upc = (Settings.gets("Unique post content per image")=="true");
						if (upc)
							$jq("#thumbselected").attr("data-post", $jq("#qr textarea").val());
						$jq("#thumbselected").removeAttr("id");
						this.id = "thumbselected";
						if (upc)
							$jq("#qr textarea").val(this.getAttribute("data-post"));;
					} else if (e.which == 2) {
						$jq(this).remove();
						QR.thumbreset();
						url.revokeObjectURL(fU);
					}
				});
				$jq(thumb).attr("class", "listthumb");
				$jq(thumb).attr("name", i);
				$jq(thumb).attr("title", f[i].name + " (middle click to remove)");
				if ($jq("#thumbselected").length < 1) $jq(thumb).attr("id", "thumbselected");
				$jq(thumb).css("background-image", "url(" + fU + ")");
			}
			$jq("#imagelist, .postopts").fadeIn("fast");
		},
		loadfields: function() {
			var ln = Settings.get("x.name");
			var le = Settings.get("x.email");
			if (ln == null && le == null) {
				$jq("#qr :input[name='name']").val($jq("#postform :input[name='name']").val());
				$jq("#qr :input[name='em']").val($jq("#postform :input[name='em']").val());
			} else {
				$jq("#qr :input[name='name']").val(ln);
				$jq("#qr :input[name='em']").val(le);
			}
		},
		storefields: function() {
			Settings.set("x.name", $jq("#qr :input[name='name']").val());
			var emailUsed = $jq("#qr :input[name='em']").val();
			if(emailUsed != "sage" && emailUsed != "\u4E0B\u3052")
				Settings.set("x.email", emailUsed);
		},
		keys: function() {
			$jq(document).bind("keydown", function (e) {
				if (e.ctrlKey) {
					var t = null;
					switch (e.which) {
						case 83: t = "?"; break;
						case 66: t = "b"; break;
						case 73: t = "i"; break;
						case 85: t = "u"; break;
						case 82: t = "s"; break;
						case 81: $jq("#qr").css("display") == "block" ? QR.hide() : QR.show(); return false; break;
					}
					if (t != null) {
						var ins = "["+t+"][/"+t+"]";
						var ta = $jq("#qr textarea")[0];
						var cp = ta.selectionStart;
						ta.value = ta.value.slice(0, cp) + ins + ta.value.slice(ta.selectionEnd);
						ta.focus();
						var r = cp + ins.length - 4;
						ta.setSelectionRange(r, r);
						return e.preventDefault();
					}
				}
			});
		},
		checkmod: function() {
			if (durl.indexOf("ponychan") > -1)
				return checkMod();
			else
				return false;
		}
	};
	
	var Dialog = {
		left: 0,
		init: function() {
			Dialog.left = Updater.tmr/1000;
			$jq("body").append($jq("<div id='dialog'></div>"));
			Dialog.countdown();
		},
		countdown: function() {
			if (Dialog.left > -1) {
				$jq("#dialog").html("Autoupdate: " + Dialog.left);
				Dialog.left--;
				setTimeout(function() {	Dialog.countdown(); }, 1000);
			} else {
				Dialog.left = Updater.tmr/1000;
				$jq("#dialog").html("Autoupdate: ..");
			}
		}
	};
	
	var Posts = {
		init: function() {
			Posts.addhandles();
		},
		addhandles: function() {
			if (Main.tid != "0" && $jq("#postform").length > 0) {
				var oe = $jq(".thread").contents(":not(table,span:last)");
				var op = $jq("<div class='op'></div>");
				$jq(".thread").prepend(op);
				op.append(oe);
				var bs = $jq("<span class='extrabtns'></span>");
				$jq(".reflink:first").after(bs);
				Posts.newhandle(".op");
			}
			if (Main.tid == "0" && Settings.gets("Enable quick reply")=="true") {
				$jq(".postfooter > a[title='Quick Reply']").each(function() {
					var to = $jq(this).attr("onclick");
					to = to.replace("javascript:quickreply('", "");
					to = to.replace("');", "");
					$jq(this).attr("href", "javascript:;").removeAttr("onclick");
					$jq(this).on("click", function() {
						QR.show();
						$jq("#qr > input[type='button']").val("Reply");
						QR.settitle("Quick replying to >>"+to)
						$jq("#postform :input[name='quickreply']").val(to);
					});
				});
			}
			$jq("#delform table:not(.postform):not(.userdelete)").each(function() {
				Posts.newhandle(this);
			});			
		},
		hide: function(hp) {
			hp = $jq(hp);
			var c = hp.closest("table");
			if (hp.html() == "[ - ]") {
				hp.html("[ + ]");
				$jq(".reply", c).addClass("hidden");
			} else {
				hp.html("[ - ]");
				$jq(".reply", c).removeClass("hidden");
			}
		},
		getcrossthread: function(anc, pid) {
			var xhr = new XMLHttpRequest();
			xhr.open("GET", anc.href);
			xhr.setRequestHeader("Accept", "*/*");
			xhr.send();
			xhr.onreadystatechange = function() {
				if (xhr.readyState == 4) {
					if (xhr.status == 200) {
						var f = false;
						$jq("table:not(.postform):not(.userdelete)", xhr.responseText).each(function() {
							if (!f && $jq("tbody tr td.reply[id] a[name]", this)[0].name == pid)
								f = true;
							if (f) {
								var c = $jq("td.reply[id]", this).addClass("inline").insertAfter(anc);
								Posts.newhandle(c);
								Posts.newpostupdate(c);
								c.find("a[name], .postfooter").remove();
								c.find(".reflink a").removeAttr("onclick").unbind("click");
								c.find(".reflink a:not(:first)").removeAttr("href").css("cursor","not-allowed");
								return false;
							}
						});
						if (!f)
							$jq("<td class='reply inline'>Reply not found<br /><a target='_blank' style='font-family: \"Trebuchet MS\";' href='"+anc.href+"'>Open thread in new tab</a></td>").insertAfter(anc);
					} else {
						$jq("<td class='reply inline'>Reply not found ("+xhr.status+")</td>").insertAfter(anc);
					}
				}
			}
		},
		newhandle: function(p) {
			var eq = (Settings.gets("Enable quick reply") == "true");
			var eb = (Settings.gets("Enable backlinks") == "true");
			var ei = (Settings.gets("Enable inline replies") == "true");
			var eh = (Settings.gets("Enable hide post buttons") == "true");
			var bp = (Main.tid == "0");
			if (eh) {
				var dd = $jq(".doubledash", p);
				if (durl.indexOf("lunachan") > -1 && dd.length == 0) {
					dd = $jq("<td class='doubledash'></td>");
					$jq("tbody > tr:first", p).prepend(dd);
				}
				dd.html("").append($jq("<a>[ - ]</a>").attr("href","javascript:;").on("click", function() {
					Posts.hide(this);
				}));
			}
			var ql = $jq($jq(".reflink a", p)[1]);
			if (eq && !bp) {
				ql.attr("href", "javascript:;").removeAttr("onclick").on("click", function() { QR.quote(this.innerHTML); return false; } );
			}
			var from = ql.html();
			var im = $jq("a[href] span[id] img", p)[0];
			var ns;
			if (im != null) {
				var os = im.src;
				ns = im.src;
				ns = ns.replace("/thumb/", "/src/");
				ns = ns.replace("s.", ".");
				if (Settings.gets("Animate gif thumbnails") == "true" && im.src.indexOf("s.gif") > 0)
					im.src = ns;
				var fsa = $jq(".filesize", p).find("a");
				if (fsa.length > 0) {
					var imp = $jq(im).parent();
					fsa.attr("href", "javascript:;");
					fsa.removeAttr("onclick");
					fsa.on("click", function() { Posts.expandimg(imp, ns, os); });
				}
			}
			if (eb || ei || eq) {
				$jq("blockquote a[class]", p).each(function() {
					var tto, to, ffrom;
					if (this.className.substr(0, 4) == "ref|") {
						to = this.innerHTML.substr(8, this.innerHTML.length);
						try {
							tto = $jq("a[name='"+to+"']");
						} catch(e) { return true; }
						ffrom = $jq("a[name='"+from+"']");
					}
					if (!$jq(this).closest("td").hasClass("inline") && tto != null && eb) {
						var blcl = "ref|"+Main.bid+"|"+Main.tid+"|"+from;
						var blat = tto.parent().find(".extrabtns")[0];
						if ($jq("a[class='"+blcl+"']", blat).length == 0) {
							var bl = $jq("<a href='#"+from+"' onclick='return highlight("+from+", true);' class='"+blcl+"'>>>"+from+"</a> ")
							.on("mouseover", addreflinkpreview)
							.on("mouseout", delreflinkpreview);
							$jq(blat).append(bl);
						}
					}
					if (ei && tto != null) {
						$jq(this).removeAttr("onclick");
						$jq(this).on("click", function() {
							var n = $jq(this).next();
							if (n.hasClass("inline"))
								n.remove();
							else {
								var ca = this.className.split("|");
								if (($jq("a[name='"+ca[3]+"']").length < 1) && Settings.gets("Enable cross-thread inline replies")=="true") {
									Posts.getcrossthread(this, ca[3]);
								} else {
									var pc = tto.parent();
									if (pc[0].nodeName != "DIV" || Main.tid != "0") {
										var c = pc.clone().addClass("inline").removeAttr("id").insertAfter(this);
										$jq(c).find("a[name]").remove();
										Posts.fixhover(c);
										Posts.newhandle(c);
									} else {
										return;
									}
								}
							}
							return false;
						});
					}
				});
			}
			var rb = $jq(".postfooter > a", p);
			if (eq && !bp && rb[0] != null) {
				$jq(rb[0]).removeAttr("onclick");
				rb[0].onclick = function() { QR.quote(from); return false; };
			}
			if (im != null && Settings.gets("Add image shortcuts to posts") == "true") {
				if (rb[2] == null)
					$jq(".postfooter", p).append(unescape("&nbsp;%u2022&nbsp; <a target='_blank' href='http://www.google.com/searchbyimage?image_url="+im.src+"'>Google</a> "));
				if (rb[3] == null)
					$jq(".postfooter", p).append(unescape(" &nbsp;%u2022&nbsp; <a href='"+ns+"' target='_blank'>Download</a>"));
			}
		},
		fixhover: function(p) {
			$jq("blockquote a[class], .extrabtns a[class]", p).each(function() {
				if (this.className.substr(0, 4) == "ref|") {
					this.addEventListener("mouseover", addreflinkpreview, false);
					this.addEventListener("mouseout", delreflinkpreview, false);
				}
			});
		},
		newpostupdate: function(p) {
			var timezone = getCookie('timezone');
			timezone = timezone === '' ? -8 : parseInt(timezone, 10);
			var timeFormat = 'ddd, MMM d, yyyy ' + (getCookie('twelvehour') !== '0' ? 'h:mm tt' : 'H:mm');
			$jq(".posttime",p).html(Date.parse($jq(".posttime",p).text()).addHours(8 + timezone).toString(timeFormat)
				.replace(/([AP]M)$/, '<span style="font-size:0.75em">$1</span>'));
			var tc = $jq(".postertrip", p);
			var rd = $jq(".rd", tc);
			if (rd.length > 0)
				new Rainbow(rd[0],224,true,100,-20);
			else {
				if (tc.html() === "!!PinkiePie")
					tc.html('<img src="/chan/css/images/pinkie-cutie-sm.png" alt="!!" width=12 height=20 style="position:relative;top:3px"><span style="color:#e4a">PinkiePie</span>');
				if (tc.html() === "!!Rarity")
					tc.html('<img src="/chan/css/images/rock-sm.png" alt="!!" width=15 height=20 style="vertical-align:top">Rarity');
			}
			var pn = $jq(".postername", p);
			if ($jq(".mod, .admin", pn).length > 0) return;
			var hn = getCookie("hidenames");
			if (hn == "1") {
				pn.html("Anonpony");
				tc.html("");
			} else if (hn == "3") {
				var hnt = pn.html() + (tc.length > 0 ? tc.html() : "");
				pn.html("<a title='"+hnt+"'>Anonpony</a>");
				tc.html("");
			}
		},
		expandimg: function(imp, ns, os) {
			var img = $jq("img", imp)[0];
			var nns = img.src == os ? ns : os;
			var mw = document.documentElement.clientWidth-100+"px";
			imp.html("<img src='"+nns+"' class='thumb' style='max-width: "+mw+";' />");
		},
	}
	
	var Html = {
		title: document.title,
		init: function() {
			Html.addoptions();
			Html.catalog();
		},
		hidepostform: function() {
			if (Settings.gets("Hide original post form") == "true" && $jq("#postform").length > 0) {
				$jq("#postform").hide();
				var a = document.createElement("a");
				Main.tid == "0" ? a.innerHTML = "<h2>New Thread</h2>" : a.innerHTML = "<h2>Quick Reply</h2>";
				a.href = "javascript:;";
				a.onclick = function() { QR.show(); };
				var topf = document.createElement("a");
				topf.innerHTML = "<h5>Show/Hide Original Post Form</h5>";
				topf.href = "javascript:;";
				topf.onclick = function() { $jq("#postform").toggle(); };
				$jq(".postarea").prepend(topf);
				$jq(".postarea").prepend(a);
			}
		},
		addoptions: function() {
			$jq(".adminbar").prepend($jq('<a class="adminbaritem" id="pxbtn" href="javascript:;">Ponychan X</a>').bind("click", function() {
				$jq("#pxoptions").css("display") == "block" ? $jq("#pxoptions").css("display", "none") : $jq("#pxoptions").css("display", "block");
			}));
			var opt = $jq("<div id='pxoptions'><strong>Settings</strong><br /></div>");
			for (s in Settings.settings) {
				opt.append("<input name='"+s+"' type='checkbox' "+(Settings.gets(s) == "true" ? "checked" : "")+" /> "+s+"<br />");
			}
			$jq('#pxoptions input[type="checkbox"]').live("click", function() { Settings.sets($jq(this).attr("name"), String($jq(this).is(":checked"))); });
			var s = Settings.get("x.updatetimer");
			if (s == null) s = "10";
			opt.append("Update every <input type='text' id='updatetimer' value='"+s+"'> seconds<br />");
			$jq("#updatetimer").live("change", function() { if (isNaN(parseInt($jq(this).val()))) return; Settings.set("x.updatetimer", $jq(this).val()); });
			if (Settings.gets("Enable filter")=="true") {
				opt.append("<br /><strong>Filter</strong><br />Insert ; after each item<br />\
				Names<br /><input id='n' name='nlist' type='text' value='' style='width: 99%' />\
				Tripcodes<br /><input id='t' name='tlist' type='text' value='' style='width: 99%' />\
				Posts<br /><input id='p' name='plist' type='text' value='' style='width: 99%' />");
			}
			opt.append($jq("<br /><a href='javascript:;' style='text-decoration: underline;'>View quick reply key shortcuts</a>").on("click", function() {
				alert("Ctrl+Q - Show quick reply\nCtrl+S - [?][/?] - Spoiler tags\nCtrl+U - [u][/u] - Underline tags\nCtrl+B - [b][/b] - Bold tags\nCtrl+R - [s][/s] - Strikethrough tags\nCtrl+I - [i][/i] - Italic tags");
			}));
			opt.append("<br /><a href='javascript:;' onclick='location.reload(true);' style='text-decoration: underline;'>Apply changes</a> (refreshes the page)");
			opt.insertAfter(".adminbar");
			$jq('#pxoptions > input[id][name]').keyup(function() { Filter.save(); }).change(function() { Filter.save(); });
		},
		catalog: function() {
			if ($jq(".catalogtable").length > 0) {
				$jq("#SearchText").on("keyup", function(e) {
					if (e.keyCode == 13) Html.cataloglasts();
				});
				$jq("#SearchBtn").on("click", function() {
					Html.cataloglasts();
				});
			}
		},
		cataloglasts: function() {
			var rt = $jq(".catalogtable").next();
			$jq("div a[href]", rt).each(function() {
				var h = this.href.replace(".html", "+50.html");
				var at = $jq("<a href='"+h+"' style='margin-left: 6px;'>[+50]</a>");
				$jq(this).after(at);
			});
		}
	};
	
	var Notifier = {
		_new: 0,
		_focus: true,
		_me: false,
		init: function() {
			$jq(window).bind("focus", function() {
				Notifier._new = 0;
				Notifier._focus = true;
				setTimeout(function() {
					document.title = ".";
					document.title = Html.title;
				}, 1000);
			});
			$jq(window).bind("blur", function() {
				Notifier._focus = false;
			});
		},
		newhandle: function(e) {
			if (Notifier._me) { Notifier._me = false; return; }
			if (Notifier._focus) return;
			++Notifier._new;
			document.title = "("+Notifier._new+") "+ Html.title;
		},
	}
	
	var Css = {
		init: function() {
			var s = document.createElement('style');
			s.innerHTML = "#dialog { position: fixed; bottom: 10px; right: 10px; }\
			#embed { width: 314px !important; }\
			#qr .embedwrap select { padding: 3px 0 2px 0; }\
			#qr .embedwrap { display: none; }\
			#qr .top a { height: 19px; float: left; color: white; background-color: black; padding: 0 0 1px 1px; }\
			.postarea a h2 { padding-bottom: 4px; }\
			.reply.inline { border: 1px solid rgba(0, 0, 0, 0.3) !important; }\
			.hidden { height: 10px; opacity: 0.1; } #updatetimer { width: 30px; }\
			#pxoptions { box-shadow: 3px 3px 8px #666; display: none; font-size: 13px; padding: 10px; position: absolute; background-color: gray; top: 32px; right: 185px; border: 1px solid black; }\
			#qr * { margin: 0; padding: 0; }\
			.postopts { clear: both; display: none; font-size: small; margin-left: 2px !important; }\
			.postopts label { float: right; margin: 1px 2px 0 0 !important; }\
			#thumbselected { opacity: 1 !important; border: 1px solid black; }\
			.listthumb { opacity: 0.6; display: inline-block; margin-right: 2px !important; border: 1px solid darkgray; width: 71px; height: 71px; background-size: cover; }\
			#imagelist { height: 73px; overflow-y: scroll; margin: 2px; display: none; background-size: cover; }\
			#qr .close a { font-weight: bold; width: 16px; height: 19px; padding: 1px 0 0 5px; color: white; float: right; background-color: black; border-radius: 0 4px 0 0; }\
			#qr .qrtop { float: left; width: 340px; font-size: small; color: white; padding-left: 5px; background-color: #000; height: 20px; cursor: move; border-radius: 4px 0 0 0; }\
			#qr input[type='button'] { width: 90px; height: 23px; float: right; }\
			#qr { padding: 2px; padding-top: 2px; padding-left: 2px; display: block; position: fixed; top: 46px; right: 10px; width: 400px; background: #e2e2e2; border-radius: 4px; border: 1px solid #000; }\
			#qr input[type='text'] { padding: 2px 0 2px 4px; height: 20px; width: 394px; border: 1px solid gray; margin: 1px 0; }\
			#qr textarea { width: 394px; padding: 2px 0 2px 4px; font-family: sans-serif; height: 98px; font-size: small; }\
			.extrabtns { vertical-align: top; }\
			#pxbtn { margin-right: -4px; }\
			.postarea a h5 { margin: 0 0 12px 0; }\
			#modpanel { clear: both; font-size: small; }\
			#modpanel label input { position: relative; top: 2px; }";
			if (Settings.gets("Enable hide post buttons")=="true") s.innerHTML += " td.reply { margin-left: 25px; } .doubledash { white-space: nowrap; display: block !important; }";
			document.body.appendChild(s);
		}
	};
	
	var Settings = {
		init: function() {
		
		},
		set: function(n, v) {
			localStorage.setItem(n, v);
		},
		get: function(n) {
			return localStorage.getItem(n);
		},
		sets: function(n, v) {
			localStorage.setItem("x.opt."+n, v);
		},
		gets: function(n) {
			var v = Settings.get("x.opt."+n);
			if (v != null) return v;
			return Settings.settings[n].def;
		},
		settings: {
			"Enable quick reply": {def: "true" },
			"Enable backlinks": {def: "true" },
			"Enable autoupdate": { def: "true" },
			"Show new post count in title": { def: "true" },
			"Enable filter": { def: "false" },
			"Enable inline replies": { def: "true" },
			"Quick reply key shortcuts": { def: "false" },
			"Hide quick reply after posting": { def: "true" },
			"Enable hide post buttons": { def: "true" },
			"Enable cross-thread inline replies": { def: "true" },
			"Animate gif thumbnails": { def: "true" },
			"Add image shortcuts to posts": { def: "true" },
			"Quote selected text on quick reply": { def: "false" },
			"Hide original post form": { def: "true" },
			"Show autoupdate countdown dialog": { def: "true" },
			"Sync original post form and quick reply": { def: "false" },
			"Hide quick reply when top button clicked": { def: "false" },
			"Scroll on new post": { def: "false" },
			"Unique post content per image": { def: "false" },
			"Autoupdate watched threads list": { def: "false" }
		}
	};
	
	var Filter = {
		nlist: "",
		tlist: "",
		plist: "",
		init: function() {
			Filter.load();
			Filter.addhandles();
		},
		addhandles: function() {
			$jq("table:not(.postform):not(.userdelete)").each(function() {
				Filter.newhandle($jq(this));
			});
		},
		load: function() {
			var n = Settings.get("x.filter.nlist");
			if (n != null && n != "undefined") {
				Filter.nlist = n;
				$jq('#pxoptions input[type="text"][name="nlist"]').val(n);
			}
			var t = Settings.get("x.filter.tlist");
			if (t != null && t != "undefined") {
				Filter.tlist = t;
				$jq('#pxoptions input[type="text"][name="tlist"]').val(t);
			}
			var p = Settings.get("x.filter.plist");
			if (p != null && p != "undefined") {
				Filter.plist = p;
				$jq('#pxoptions input[type="text"][name="plist"]').val(p);
			}
		},
		save: function() {
			Filter.nlist = $jq('#pxoptions input[name="nlist"]').val();
			Settings.set("x.filter.nlist", Filter.nlist);
			Filter.tlist = $jq('#pxoptions > input[name="tlist"]').val();
			Settings.set("x.filter.tlist", Filter.tlist);
			Filter.plist = $jq('#pxoptions > input[name="plist"]').val();
			Settings.set("x.filter.plist", Filter.plist);
		},
		filter: function(p) {
			$jq(p).css("display", "none");
		},
		newhandle: function(p) {
			if (Settings.gets("Enable filter") != "true" || $jq("span.mod", p).length > 0) return;
			if (Filter.filtered(0, $jq.trim($jq("span.postername", p).text()))) {
				Filter.filter(p);
				return;
			}
			if (Filter.filtered(0, $jq.trim($jq("span.postername a", p).text()))) {
				Filter.filter(p);
				return;
			}
			if (Filter.filtered(1, $jq("span.postertrip", p).text())) {
				Filter.filter(p);
				return;
			}
			if (Filter.filtered(2, $jq("blockquote", p).html())) {
				Filter.filter(p);
				return;
			}
		},
		filtered: function(t, s) {
			if (s == "") return false;
			switch (t) {
				case 0:
					if (Filter.nlist.indexOf(s+";") > -1) return true;
				break;
				case 1:
					if (Filter.tlist.indexOf(s+";") > -1) return true;
				break;
				case 2:
					if (Filter.plist.length <= 1) return false;
					var sp = Filter.plist.split(";");
					if (sp.length-1 == 0) return false;
					for (var i = 0, len = sp.length -1; i < len; i++) {
						if (s.indexOf(sp[i]) > -1)
							return true;
					}
				break;
			}
			return false;
		}
	};
	
	Main.init();
}

function loadjQ(s)
{
	var script = document.createElement("script");
	script.setAttribute("src", "http://ajax.googleapis.com/ajax/libs/jquery/1.7.2/jquery.min.js");
	script.addEventListener('load', function() {
	var script = document.createElement("script");
	script.textContent = "(" + s.toString() + ")();";
	document.body.appendChild(script);
	}, false);
	document.body.appendChild(script);
}

loadjQ(ponychanx);