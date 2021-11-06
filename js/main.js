var sendSelection = {}
function updateSendSelection(name, id, type) {
	sendSelection.name = name;
	sendSelection.id = id;
	sendSelection.type = type;
	var t ='';
	if (type === 1) t = 'TRUE ';
	if (type === 2) t = 'FALSE ';
	$('#sendSelection').val(t+sendSelection.name);
}
updateSendSelection('$VEO', ZERO, 0);

function spin(id) {
	$('#'+id).html('<span class="spinner-border" role="status"></span>');
}

function updateBalanceTable() {
	$('#balances').html('');
	var html = '';
	for (const sc in balanceDB) {
	var i = balanceDB[sc];
	//if ((i.confirmed === 0) && (i.unconfirmed === 0)) continue;
	var type = i.type === 1 ? ['text-primary', 'TRUE'] : ['text-warning', 'FALSE'];
	var U = i.unconfirmed - i.confirmed;
	var sign = (U > 0) ? '+' : '';
	if (U === 0) U = '';
	else U = ' <span class="text-secondary">('+sign +(U/1e8).toFixed(8)+')</span>';
	
	var tr = '<tr id="'+sc+'" class="balanceRow">' +
			'<td scope="col" class="type"><span class="'+type[0]+'">'+type[1]+'</span></td>' +
			'<td scope="col" class="oracle">'+i.text+'</td>' +
			'<td scope="col">'+(i.confirmed/1e8).toFixed(8)+U+'</td>' +
		'</tr>';
		html += tr;
	}
	$('#balances').html(html);
	$('.balanceRow').click(function(e) {
		e.preventDefault();
		var type = parseInt(e.currentTarget.id[0]);
		var id = e.currentTarget.id.substring(1);
		var name = $(this).children('td.oracle').text();
		updateSendSelection(name, id, type)
	});
};

function updateOfferTable() {
	var html ='';
	var offers = Object.values(offerDB);
	tidLookup = {};
	offers.forEach(function(offerObj) {
		var offer = swaps.unpack(offerObj.offer);
		var veoHtml = '<span class="text-info">$VEO</span>';
		var falseHtml = '<span class="text-warning">FALSE</span> ';
		var trueHtml = '<span class="text-primary">TRUE</span> ';
		if (!offer) return; //invalid sig
		var t1, t2, ifText;
		if (offerObj.text1 === '$VEO') t1 = veoHtml;
		else t1 = offer.type1 === 1 ? trueHtml + offerObj.text1 :  falseHtml + offerObj.text1;
		if (offerObj.text2 === '$VEO') t2 = veoHtml;
		else {
			t2 = offer.type2 === 1 ? trueHtml + offerObj.text2 : falseHtml + offerObj.text2;
			ifText = offer.type2 === 1 ? falseHtml + offerObj.text2 : trueHtml + offerObj.text2
		}
		var visibility = (MODE === 0) && (offerObj.text1 !== '$VEO') ? 'none' : 'visible';
		var tr = '<tr id="'+offerObj.id+'" class="offerRow" style="display:'+visibility+'">' +
			'<td scope="col" class="accountCol" style="display:none">'+offer.acc1.substring(0,5)+'</td>' +
			'<td scope="col" class="startCol" style="display:none">'+offer.start_limit+'</td>' +
			'<td scope="col" class="endCol" style="display:none">'+offer.end_limit+'</td>' +
			'<td scope="col" class="cid1Col" style="display:none">'+offer.cid1+'</td>' +
			'<td scope="col" class="type1Col" style="display:none">'+offer.type1+'</td>' +
			'<td scope="col" class="text1Col" style="display:none">'+t1+'</td>' +
			'<td scope="col" class="amount1Col" style="display:none">'+(offer.amount1/1e8).toFixed(8)+'</td>' +
			'<td scope="col" class="riskCol" style="display:none">'+((offer.amount2-offer.amount1)/1e8).toFixed(8)+'</td>' +
			'<td scope="col" class="cid2Col" style="display:none">'+offer.cid2 +'</td>' +
			'<td scope="col" class="type2Col" style="display:none">'+offer.type2+'</td>' +
			'<td scope="col" class="text2Col" style="display:none">'+t2+'</td>' +
			'<td scope="col" class="amount2Col" style="display:none">'+(offer.amount2/1e8).toFixed(8)+'</td>' +
			'<td scope="col" class="toWinCol" style="display:none">'+(offer.amount1/1e8).toFixed(8)+'</td>' +
			'<td scope="col" class="ifCol" style="display:none">'+ifText+'</td>' +
			'<td scope="col" class="saltCol" style="display:none">'+offer.salt+'</td>' +
			'<td scope="col" class="nonceCol" style="display:none">'+offer.nonce+'</td>' +
			'<td scope="col" class="partsCol" style="display:none">'+offer.parts+'</td>' +
		'</tr>';
		html += tr;
	tidLookup[offerObj.id] = offerObj;
	});
	
	$('#offers').html(html);
	if (MODE === 0) {
		$('.riskCol').show();
		$('.toWinCol').show();
		$('.ifCol').show();
	}
	else {
		$('.text1Col').show();
		$('.text2Col').show();
		$('.amount1Col').show();
		$('.amount2Col').show();
	}
	$('.offerRow').click(async function(e) {
			e.preventDefault();
			var t = tidLookup[e.currentTarget.id];
			if (MODE === 0) {
				var riskAmount = $(this).children('.riskCol').html();
				var winAmount = $(this).children('.toWinCol').html();
				var ifText = $(this).children('.ifCol').html();
				var acceptText = 'Risk: ' + riskAmount + '<br> Win: ' + winAmount + '<br> If: ' + ifText;
			}
			else {
				var gainText = $(this).children('.amount1Col').html() + ' ' + $(this).children('.text1Col').html();
				var loseText = $(this).children('.amount2Col').html() + ' ' + $(this).children('.text2Col').html();
				var acceptText = 'Gain: ' + gainText + '<br> Lose: ' + loseText;
			}
			confirmAction(acceptText, 'Accept', async function () {
				res = await acceptOffer(t);
				alertMessage('Accept', res);
			});
			
		});
};

function route(r) {
	$('.route').hide();
	$('#'+r).show();
};

$('#newAccountLink').click(function(e) {
	e.preventDefault();
	route('newAccount');
});

$('#receiveLink').click(function(e) {
	e.preventDefault();
	route('receive');
});

$('#browseLink').click(function(e) {
	e.preventDefault();
	route('browse');
});

$('#sendLink').click(function(e) {
	e.preventDefault();
	route('send');
});

$('#createLink').click(function(e) {
	e.preventDefault();
	route('create');
});

$('#forgetLink').click(function(e) {
	e.preventDefault();
	$('.accountSet').hide();
	$('.accountNotSet').show();
	forget();
	alertMessage('FORGET', '');
	route('newAccount');
});

$('#settingsLink').click(function(e) {
	e.preventDefault();
	route('settings');
});

$('.navbar-nav>li>a').on('click', function(){
    $('.navbar-collapse').collapse('hide');
});

$('#copyButton').click(function(e) {
	e.preventDefault();
	var copyToClipboard = function(secretInfo) {
		var $body = document.getElementsByTagName('body')[0];
        var $tempInput = document.createElement('INPUT');
        $body.appendChild($tempInput);
        $tempInput.setAttribute('value', secretInfo)
        $tempInput.select();
        document.execCommand('copy');
        $body.removeChild($tempInput);
    }
	copyToClipboard(keys.pub());
	alertMessage('COPIED', '')
});

$('#maxButton').click(async function(e) {
	e.preventDefault();
	if (sendSelection.id === ZERO) {
		spin('maxButton');
		var to = $('#recipient').val();
		try {
			var max = await spend_tx.max_send_amount(keys.pub(), to);
			$('#sendAmount').val((max[0]/1e8).toFixed(8));
		}
		catch {
		}
		
		$('#maxButton').html('Max');
	}
	else {
		var max = balanceDB[sendSelection.type + sendSelection.id].unconfirmed;
		$('#sendAmount').val((max/1e8).toFixed(8));
	}
});

$('#sendButton').click(async function(e) {
	e.preventDefault();
	var to = $('#recipient').val();
	amount = Math.floor(parseFloat($('#sendAmount').val()) * 1e8);
	spin('sendButton');
	if (isNaN(amount) || (amount <= 0)) {
		alertMessage('INVALID', '');
		$('#sendButton').html('Send');
		return;
	}
	if (sendSelection.id === ZERO) {
		var max = await spend_tx.max_send_amount(keys.pub(), to);
		var text = '<em><span class="text-info">$VEO</span></em>';
		try {
			var tx = await spend_tx.amake_tx(to, keys.pub(), amount);
			if (amount > max) {
				alertMessage('INVALID', 'Max amount to send is ' + (max/1e8).toFixed(8));
				$('#sendButton').html('Send');
				return;
			}
		}
		catch {
			alertMessage('INVALID', '');
			$('#sendButton').html('Send');
			return;
		}
		
	}
	else {
		var sub = balanceDB[sendSelection.type+sendSelection.id];
		var max = sub[3];
		var s = sendSelection.type === 1 ?  ['text-primary', 'TRUE'] : ['text-warning', 'FALSE'];
		var text = '<em><span class="'+s[0]+'">'+s[1]+'</span> '+sendSelection.name+'</em>';
		if (amount > max) {
				alertMessage('INVALID', 'Max amount to send is ' + (max/1e8).toFixed(8));
				$('#sendButton').html('Send');
				return;
		}
		var a = await rpc.apost(["account", keys.pub()]);
		var Nonce = a[2] + 1;
        var fee = 152050;
		var tx = ["sub_spend_tx",
                      keys.pub(),
                      Nonce,
                      fee, to, amount,
                      sendSelection.id, sendSelection.type];
		
	}
	$('#sendButton').html('Send');
	confirmAction('Send ' + (amount/1e8).toFixed(8) + ' ' + text + ' to ' + to.substring(0,20) + '...?', 'Send', async function() {
		var signed = [keys.sign(tx)];
		var res = await rpc.apost(["txs", [-6].concat(signed)]);
		alertMessage('SEND', res);
		$('.sendInput').val('');
		
		updatePubDisplay();
	})
	
});

$('#setButton').click(function(e) {
	e.preventDefault();
	$('.accountSet').show();
	$('.accountNotSet').hide();
	var passphrase = $('#passphrase').val();
	$('#passphrase').val('');
	var regExp = /^[a-z0-9]+$/i;
	if (regExp.test(passphrase)) {
		if (passphrase.length > 0) {
			keys.passphrase(passphrase);
			localStorage.setItem('passphrase', passphrase);
			updatePubDisplay();
			alertMessage('SET', keys.pub().substring(0,20) + '...');
			route('send');
			return;
		}
	}
	alertMessage('INVALID', 'Only alphanumeric and length at least 10');
});

$('#createButton').click(async function(e) {
	e.preventDefault();
	spin('createButton');
	var statement = $('#statement').val();
	var type = $('#statementSelect').val() === 'True' ? 1 : 2; 
	var risk = Math.floor(parseFloat($('#amount1').val()) * 1e8);
	var toWin = Math.floor(parseFloat($('#amount2').val()) * 1e8);
	var expires = parseInt($('#expires').val());
	[risk, toWin, expires].forEach(function(i) {
		if (isNaN(i) || (i <= 0)) {
		alertMessage('INVALID', '');
		$('#createButton').html('Create');
		return;
		}
	})
	var offers = createOffer('VEO', 0, statement, type, risk,  risk + toWin, 1, 1, expires);
	if (!offers[0] || !offers[1]) {
		alertMessage('INVALID', '');
		$('#createButton').html('Create');
		return;
	}
	try {
		await rpc.apost(["add", 3, btoa(statement), 0, 1], CONTRACT_IP, CONTRACT_PORT);
	}
	catch {
		alertMessage('INVALID', '');
		$('#createButton').html('Create');
		return;
	}
	var style = type === 1 ? ['text-primary', 'TRUE'] : ['text-warning', 'FALSE'];
	var desc = 'Create offer risking ' + (risk/1e8).toFixed(8) + ' to win ' + (toWin/1e8).toFixed(8) +
	' if <span class="' + style[0] + '">'+style[1]+'</span> <em>' + statement + '</em>?'; 
	$('#createButton').html('Create');
	confirmAction(desc, 'Create', async function() {
		var res = await rpc.apost(["add", offers[0], offers[1]], CONTRACT_IP, CONTRACT_PORT);
		alertMessage('CREATE', res)
		$('.createInput').val('');
	});
});

$('#modeSelect').on('change', function (e) {
    e.preventDefault();
	var m = $('#modeSelect').val();
	if (m === 'Basic') MODE = 0;
	else MODE = 1;
	updateOfferTable();
	alertMessage('SET', m)
});

$('#nodeButton').click(function(e) {
	e.preventDefault();
	var ip = $('#nodeIp').val();
	var port = parseInt($('#nodePort').val())
	alertMessage('SET', ip + ':' + port);
});

$('#contractButton').click(function(e) {
	e.preventDefault();
	var ip = $('#contractIp').val();
	var port = parseInt($('#contractPort').val())
	alertMessage('SET', ip + ':' + port);
});

$('#exploreButton').click(function(e) {
	e.preventDefault();
	var ip = $('#exploreIp').val();
	var port = parseInt($('#explorePort').val())
	alertMessage('SET', ip + ':' + port);
});

$('#alertClose').click(function(e) {
	e.preventDefault();
	$('#alert').hide();
});

$('.navbar-brand').click(function(e) {
	e.preventDefault();
	updateSendSelection('$VEO', ZERO, 0);
	route('send');
});

function alertMessage(type, message) {
	$('#alertText').html('<strong>'+type+'</strong> ' + message);
	$('#alert').show();
}

function forget() {
	keys.forget();
	$('#pub').text('');
	$('.navbar-brand').text('VEOEX');
	localStorage.removeItem('passphrase')
	balanceDB = {};
	updateBalanceTable();
	
}

async function updatePubDisplay() {
	if (!keys.keys_internal()) return; 
	$('#pub').text(keys.pub());
	var balance = await merkle.arequest_proof("accounts", keys.pub());
	if (balance === 'empty') balance = 0;
	else balance = balance[1];
	var ubalance = await rpc.apost(["account", keys.pub()]);
	if (ubalance !== 0) ubalance = ubalance[1];
	else ubalance = balance;
	var U = ubalance - balance;
	var sign = (U > 0) ? '+' : '';
	if (U === 0) U = '';
	else U = '<span class="text-secondary">('+sign +(U/1e8).toFixed(8)+') </span>';
	if (U === 0) U = '';
	U +=  '<span class="text-info">$VEO</span>'
	$('.navbar-brand').html((balance/1e8).toFixed(8) + ' ' + U);
}

function confirmAction(text, type, action) {
	$('#modalButton').unbind();
	$('#modalText').html(text);
	$('#modalButton').text(type);
	$('#modalButton').click(async function() {
		spin('modalButton');
		await action();
		$('.modal').modal('hide')
	})
	$('.modal').modal('show')
}

$(document).ready(async function () {
	var pp = localStorage.getItem('passphrase')
	if (pp) {
		keys.passphrase(pp)
		updatePubDisplay()
		$('.accountSet').show();
		$('.accountNotSet').hide();
		route('send');
	}
	else {
		$('.accountSet').hide();
		$('.accountNotSet').show();
		route('newAccount');
	}
	updateOffers();
	updateBalances();
	setInterval(updatePubDisplay, 10000);
	setInterval(updateOffers, 30000);
	setInterval(updateOfferTable, 5000);
	setInterval(updateBalances, 20000);
	setInterval(updateBalanceTable, 5000);
	console.log('hello');
});