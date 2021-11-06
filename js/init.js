var MODE = 0;
var ZERO = btoa(array_to_string(integer_to_array(0, 32)));
var balanceDB = {};
var offerDB = JSON.parse(localStorage.getItem("offers")) || {};
var oracleDB = JSON.parse(localStorage.getItem("oracles")) || {};
oracleDB[ZERO] = "$VEO";

async function updateBalance(contractId, type) {
	if (!keys.keys_internal()) return false;
	var subKey = sub_accounts.normal_key(keys.pub(), contractId, type);
	try {
		var C = await merkle.arequest_proof("sub_accounts", subKey);
	}
	catch {
		return false;
	}
	if (C === 'empty') C = ['sub_acc', 0];
	try {
		var U = await rpc.apost(["sub_accounts", subKey]);
	}
	catch {
		return false;
	}
	if (!U) U = ['sub_acc', C[1]];
	var oracleText = oracleDB[contractId];
	if (!oracleText) {
			oracleText = await rpc.apost(["read", 3, contractId], CONTRACT_IP, CONTRACT_PORT);
			oracleText = oracleText ? atob(oracleText[1]) : undefined;
			if (oracleText) {
				oracleDB[id] = oracleText;
				localStorage.setItem("oracles", JSON.stringify(oracleDB));
			}
		}
	balanceDB[type + contractId] = {text: oracleText, type: type, confirmed: C[1], unconfirmed: U[1]};
}

async function updateBalances() {
	if (!keys.keys_internal()) return;
	var account = await rpc.apost(["account", keys.pub()], EXPLORER_IP, EXPLORER_PORT);
	var contractIds = account[1][3].slice(1);
	for (var i = 0; i < contractIds.length; i+=1) {
		var id = contractIds[i];
		await updateBalance(id, 1);
		await updateBalance(id, 2);
	};
}

function createCid(text, mp) {
		var contract = scalar_derivative.maker(text, mp);
		var CH = scalar_derivative.hash(contract);
		var cid = merkle.contract_id_maker(CH, 2);
		return cid;
}

function createOffer(text1, type1, text2, type2, amount1, amount2, mp1, mp2, expires) {
	var swap = {cid1: type1 === 0 ? ZERO : createCid(text1,mp1), cid2: type2 === 0 ? ZERO : createCid(text2,mp2),
				type1: type1, type2: type2, amount1: amount1, amount2: amount2, partial_match: false, 
				acc1: keys.pub(), end_limit: headers_object.top()[1] + expires};
	var so = swaps.pack(swap);
	var offer99 = swaps.offer_99(swap);
	var so99 = swaps.pack(offer99);
	return [so, so99];
}

async function updateOffers() {
	var markets = await rpc.apost(["markets"], CONTRACT_IP, CONTRACT_PORT);
	markets = markets.slice(1);
	seenIds = {}; //to know what to remove
	for (var i = 0; i < markets.length; i+=1) {
		m = markets[i];
		var text1 = oracleDB[m[3]];
		if (!text1) {
			var c1 = await rpc.apost(["read", 3, m[3]], CONTRACT_IP, CONTRACT_PORT);
			text1 = c1 ? atob(c1[1]) : undefined;
			if (text1) oracleDB[m[3]] = text1;
		}
		var text2 = oracleDB[m[5]];
		if (!text2) {
			var c2 = await rpc.apost(["read", 3, m[5]], CONTRACT_IP, CONTRACT_PORT);
			text2 = c2 ? atob(c2[1]) : undefined;
			if (text2) oracleDB[m[5]] = text2;
		}
		
		var offers = await rpc.apost(["read", m[2]], CONTRACT_IP, CONTRACT_PORT);
		offers = offers[1][7];
		offers = offers.slice(1);
		for (var j = 0; j < offers.length; j+=1) {
			var o = offers[j];
			seenIds[o[3]] = true;
			if (offerDB[o[3]]) continue;
			var offer = await rpc.apost(["read", 2, o[3]], CONTRACT_IP, CONTRACT_PORT);
			offerDB[o[3]] = {id: o[3], text1: text1, text2: text2, offer: offer};
		}
	}
	for (property in offerDB) {
		if (!seenIds[property]) delete offerDB[property];
	}
	localStorage.setItem("offers", JSON.stringify(offerDB));
	localStorage.setItem("oracles", JSON.stringify(oracleDB));
}

async function acceptOffer(offerObj) {
	var o = swaps.unpack(offerObj.offer);
	var offer99;
	if (o.type1 !== 0) {
		if (createCid(offerObj.text1, 1) !== o.cid1) return false;
		var contract1 = await merkle.arequest_proof("contracts", o.cid1);
		if (contract1 === "empty") return false; //dont allow this for now
	}
	if (o.type2 !== 0) {
		if (createCid(offerObj.text2, 1) !== o.cid2) return false;
		var b = balanceDB[o.type2+o.cid2];
		if (!b) b = 0;
		else b = b[3]
		var missingAmount = o.amount2 - b;
		var mintTx;
		if (missingAmount > 0) {
			mintTx = ["contract_use_tx", 0, 0, 0, o.cid2, missingAmount, 2, ZERO, 0];
			offer99 = swaps.offer_99(o);
			offer99.type1 = 3 - o.type2;
			offer99.amount1 = missingAmount;
			
		}
		var contract2 = await merkle.arequest_proof("contracts", o.cid2);
		var contractTx;
		if (contract2 === "empty") {
			var contract = scalar_derivative.maker(offerObj.text2, 1);
			var CH = scalar_derivative.hash(contract);
			contractTx = ["contract_new_tx", keys.pub(), CH, 0, 2, ZERO, 0];
		}
	}
	var swapTx = ["swap_tx2", keys.pub(), 0, 0, offerObj.offer, 1];
	var txs = [];
	if (contractTx) txs.push(contractTx);
	if (mintTx) txs.push(mintTx);
	txs.push(swapTx);
	var multiTx = await multi_tx.amake(txs);
	var signed = [keys.sign(multiTx)];
	var res1 = await rpc.apost(["txs", [-6].concat(signed)]);
	console.log(offer99);
	var res2 = offer99 ? await rpc.apost(["add", swaps.pack(offer99), 0], CONTRACT_IP, CONTRACT_PORT) : undefined;
	return [res1, res2];
}

async function cleanup() {
	var txs = [];
	var ids = {};
	for (property in balanceDB) { 
		var id = property.substring(1);
		var balance = balanceDB[property][3];
		if (ids[id]) ids[id] = [Math.min(balance, ids[id][0]), true]
		else ids[id] = [balance, false]
	}
	for (property in ids) { 
		item = ids[property];
		if (!item[1]) continue;
		if (item[0] === 0) continue;
		var tx = ["contract_use_tx", 0,0,0,
			property, -item[0], 2,
			ZERO, 0];
		txs.push(tx);
	}
	var multiTx = await multi_tx.amake(txs);
	var signed = [keys.sign(multiTx)];
	return await rpc.apost(["txs", [-6].concat(signed)]);
}