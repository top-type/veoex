var balanceDB = {};
var MODE = 0;

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
	copyToClipboard('lol');
	alertMessage('COPIED', '')
});

$('#sendButton').click(function(e) {
	e.preventDefault();
	alertMessage('SEND', '')
	
});

$('#setButton').click(function(e) {
	e.preventDefault();
	$('.accountSet').show();
	$('.accountNotSet').hide();
	var passphrase = $('#passphrase').val();
	$('#passphrase').val('');
	var regExp = /^[a-z0-9]+$/i;
	if (regExp.test(passphrase)) {
		if (passphrase.length > 9) {
			keys.passphrase(passphrase);
			localStorage.setItem('passphrase', passphrase);
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
		$('.accountSet').show();
		$('.accountNotSet').hide();
		route('send');
	}
	else {
		$('.accountSet').hide();
		$('.accountNotSet').show();
		route('newAccount');
	}
	console.log('hello');
});