var balanceDB = {};
var MODE = 0;
var ZERO = btoa(array_to_string(integer_to_array(0, 32)));
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

async function updateBalances() {
	var account = await rpc.apost(["account", keys.pub()], EXPLORER_IP, EXPLORER_PORT);
	var contractIds = account[1][3].slice(1);
	console.log(account);
	contractIds.forEach(async function(id) {
		var type1 = await sub_accounts.normal_key(keys.pub(), id, 1);
		var sub1C = await merkle.arequest_proof("sub_accounts", type1);
		var sub1U = await rpc.apost(["sub_accounts", type1]);
		var type2 = await sub_accounts.normal_key(keys.pub(), id, 2);
		var sub2C = await merkle.arequest_proof("sub_accounts", type2);
		var sub2U = await rpc.apost(["sub_accounts", type2]);
		var oracleText = await rpc.apost(["read", 3, id], CONTRACT_IP, CONTRACT_PORT);
		oracleText = oracleText ? atob(oracleText[1]) : undefined;
		sub1C = sub1C[0] === 'sub_acc' ? sub1C[1] : 'error';
		sub1U = sub1U[0] === 'sub_acc' ? sub1U[1] : sub1C;
		sub2C = sub2C[0] === 'sub_acc' ? sub2C[1] : 'error';
		sub2U = sub2U[0] === 'sub_acc' ? sub2U[1] : sub2C;
		if (sub1C !== 'error') {
			balanceDB[1+id] = [oracleText, 1, sub1C, sub1U];
		}
		if (sub2C !== 'error') {
			balanceDB[2+id] = [oracleText, 2, sub2C, sub2U];
		}
		else delete balanceDB[2+id];
	});
	
}

async function updateBalanceTable() {
	$('#balances').html('');
	var html = '';
	for (const sc in balanceDB) {
	var i = balanceDB[sc];
	if ((i[2] === 0) && (i[3] === 0)) continue;
	var type = i[1] === 1 ? ['text-primary', 'TRUE'] : ['text-warning', 'FALSE'];
	var U = i[3] - i[2];
	var sign = (U > 0) ? '+' : '';
	if (U === 0) U = '';
	else U = ' <span class="text-secondary">('+sign +(U/1e8).toFixed(8)+')</span>';
	
	var tr = '<tr id="'+sc+'" class="balanceRow">' +
			'<th scope="col" class="type"><span class="'+type[0]+'">'+type[1]+'</span></th>' +
			'<th scope="col" class="oracle">'+i[0]+'</th>' +
			'<th scope="col">'+(i[2]/1e8).toFixed(8)+U+'</th>' +
		'</tr>';
		html += tr;
	}
	$('#balances').html(html);
	$('.balanceRow').click(function(e) {
		e.preventDefault();
		var type = parseInt(e.currentTarget.id[0]);
		var id = e.currentTarget.id.substring(1);
		var name = $(this).children('th.oracle').text();
		updateSendSelection(name, id, type)
	});
};

function createOffer(text1, type1, text2, type2, amount1, amount2, mp1, mp2, expires) {
	function createCid(text, mp) {
		var contract = scalar_derivative.maker(text, mp);
		var CH = scalar_derivative.hash(contract);
		var cid = merkle.contract_id_maker(CH, 2);
		return cid;
	}
	var swap = {cid1: type1 === 0 ? ZERO : createCid(text1,mp1), cid2: type2 === 0 ? ZERO : createCid(text2,mp2),
				type1: type1, type2: type2, amount1: amount1, amount2: amount2, partial_match: false, 
				acc1: keys.pub(), end_limit: headers_object.top()[1] + expires};
	var so = swaps.pack(swap);
	var offer99 = swaps.offer_99(swap);
	var so99 = swaps.pack(offer99);
	return [so, so99];
	
}

async function getOffers() {
	var markets = await rpc.apost(["markets"], CONTRACT_IP, CONTRACT_PORT);
	markets = markets.slice(1);
	res = [];
	markets.forEach(async function(m) {
		//lol atob('JFZFTw==') -> $VEO
		var c1 = m[4] === 0 ? [0, 'JFZFTw=='] : await rpc.apost(["read", 3, m[3]], CONTRACT_IP, CONTRACT_PORT);
		var text1 = c1 ? atob(c1[1]) : undefined;
		var c2 = m[6] === 0 ? [0, 'JFZFTw=='] : await rpc.apost(["read", 3, m[5]], CONTRACT_IP, CONTRACT_PORT);
		var text2 = c2 ? atob(c2[1]) : undefined;
		var offers = await rpc.apost(["read", m[2]], CONTRACT_IP, CONTRACT_PORT);
		offers = offers[1][7];
		offers = offers.slice(1);
		offers.forEach(async function(o) {
			console.log(o);
			var offer = await rpc.apost(["read", 2, o[3]], CONTRACT_IP, CONTRACT_PORT);
			res.push({text1: text1, text2: text2, offer: offer})
		})
	});
	return res;
}

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
		var max = balanceDB[sendSelection.type + sendSelection.id][3];
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
		alertMessage('CREATE', '')
		$('.createInput').val('');
	});
});

$('#modeSelect').on('change', function (e) {
    e.preventDefault();
	alertMessage('SET', $('#modeSelect').val())
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
	localStorage.removeItem('passphrase')
	$('#pub').text('');
	$('.navbar-brand').text('VEOEX');
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
	
	await updateBalances();
	await updateBalanceTable();
	setInterval(updatePubDisplay, 10000);
	setInterval(updateBalances, 20000);
	setInterval(updateBalanceTable, 5000);
	console.log('hello');
});