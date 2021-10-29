var balanceDB = {};
var MODE = 0;
var ZERO = btoa(array_to_string(integer_to_array(0, 32)));


var sendSelection = {}
function updateSendSelection(name, id, type) {
	sendSelection.name = name;
	sendSelection.id = id;
	sendSelection.type = type;
	$('#sendSelection').val(sendSelection.name);
}
updateSendSelection('VEO', ZERO, 0);

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
		sub1C = sub1C[0] === 'sub_acc' ? sub1C[1] : 0;
		sub1U = sub1U[0] === 'sub_acc' ? sub1U[1] : 0;
		sub2C = sub2C[0] === 'sub_acc' ? sub2C[1] : 0;
		sub2U = sub2U[0] === 'sub_acc' ? sub2U[1] : 0;
		if ((sub1C!==0) || (sub1U!==0)) balanceDB[1+id] = [oracleText, 1, sub1C, sub1U];
		else delete balanceDB[1+id];
		if ((sub2C!==0) || (sub2U!==0)) balanceDB[2+id] = [oracleText, 2, sub2C, sub2U];
		else delete balanceDB[2+id];
	});
	
}

async function updateBalanceTable() {
	$('#balances').html('');
	var html = '';
	for (const sc in balanceDB) {
	var i = balanceDB[sc];
	var tr = '<tr id="'+sc+'" class="balanceRow">' +
			'<th scope="col" class="type">'+i[1]+'</th>' +
			'<th scope="col" class="oracle">'+i[0]+'</th>' +
			'<th scope="col">'+i[2]+'</th>' +
			'<th scope="col">'+i[3]+'</th>' +
		'</tr>';
		html += tr;
	}
	$('#balances').html(html);
	
	$('.balanceRow').click(function(e) {
		e.preventDefault();
		var type = parseInt(e.currentTarget.id[0]);
		var id = parseInt(e.currentTarget.id.substring(1));
		var name = $(this).children('th.type').text() + ' ' + $(this).children('th.oracle').text();
		updateSendSelection(name, id, type)
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

$('#sendButton').click(async function(e) {
	e.preventDefault();
	to = $('#recipient').val();
	amount = Math.floor(parseFloat($('#sendAmount').val()) * 1e8);
	if (isNaN(amount) || (amount <= 0)) {
		alertMessage('INVALID', '');
		return;
	}
	console.log(amount);
	var max = await spend_tx.max_send_amount(keys.pub(), to);
	var balance = await rpc.apost(["account", keys.pub()]);
	try {
		var tx = await spend_tx.amake_tx(to, keys.pub(), amount);
		if (amount > max) {
			alertMessage('INVALID', 'Max amount to send is ' + (max/1e8).toFixed(8));
			return;
		}
	}
	catch {
		alertMessage('INVALID', '');
		return;
	}
	confirmAction('Send ' + (amount/1e8).toFixed(8) + ' to ' + to.substring(0,20) + '...?', 'Send', async function() {
		var signed = [keys.sign(tx)];
		var res = await rpc.apost(["txs", [-6].concat(signed)], IP, PORT);
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

$('#createButton').click(function(e) {
	e.preventDefault();
	alertMessage('CREATE', '')
	
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
	$('.navbar-brand').text(keys.pub().substr(0,5) + ': ' + (balance/1e8).toFixed(8) + ' ' + (ubalance/1e8).toFixed(8));
}

function confirmAction(text, type, action) {
	$('#modalButton').unbind();
	$('#modalText').html(text);
	$('#modalButton').text(type);
	$('#modalButton').click(function() {
		action();
		$('.modal').modal('hide')
	})
	$('.modal').modal('show')
}

$(document).ready(function () {
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
	setInterval(updatePubDisplay, 10000);
	console.log('hello');
});