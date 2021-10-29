
function keys_function1() {
    var ec = new elliptic.ec('secp256k1');
    var keys_internal;
    
    
    function new_keys_watch(x) {
	return ec.keyFromPublic(x);
    }
    function new_keys_entropy(x) {
        return ec.genKeyPair({entropy: hash(serialize([x]))});
    }
	function passphrase(x) {
		keys_internal = new_keys_entropy(x);
	}
    function new_keys() {
        return ec.genKeyPair();
    }
    function pubkey_64() {
        var pubPoint = keys_internal.getPublic("hex");
        return btoa(fromHex(pubPoint));
    }
    function powrem(x, e, p) {
        if (e == 0) {
            return 1;
        } else if (e == 1) {
            return x;
        } else if ((e % 2) == 0) {
            return powrem(((x * x) % p),
                          (e / 2),
                          p);
        } else {
            return (x * powrem(x, e - 1, p)) % p;
        }
    };
    /*
    function decompress_pub(pub) {
        //unused, and does not work.
        //pub = "AhEuaxBNwXiTpEMTZI2gExMGpxCwAapTyFrgWMu5n4cI";
        //var p = 115792089237316195423570985008687907853269984665640564039457584007908834671663n;
        var p = 0;
        var b = atob(pub);
        var a = string_to_array(b);
        var s = BigInt(a[0] - 2);
        var x = big_array_to_int(a.slice(1, 33));
        //var y2 = (((((x * x) % p) * x) + 7n) % p);
        var y2 = (((((x * x) % p) * x) + 7) % p);
        //var y = powrem(y2, ((p+1n) / 4n), p);
        var y = powrem(y2, ((p+1) / 4), p);
        //if (!(s == (y % 2n))) {
        if (!(s == (y % 2))) {
            y = ((p - y) % p);
        }
        pub = [4].concat(big_integer_to_array(x, 32)).concat(big_integer_to_array(y, 32));
        return btoa(array_to_string(pub));
    }
    */
    function compress_pub(p) {
        //unused and might not work.
        var b = atob(p);
        var a = string_to_array(b);
        var x = a.slice(1, 33);
        var s = a[64];
        var f;
        if ((s % 2) == 0) {
            f = 2;
        } else {
            f = 3;
        }
        return btoa(array_to_string([f].concat(x)))
    }
    function raw_sign(x) {
        //x should be a list of bytes.
        var h = hash(x);
        var sig = keys_internal.sign(h);
        var sig2 = sig.toDER();
        return btoa(array_to_string(sig2));
    }
    function sign_tx(tx) {
        var sig;
        var stx;
	if (tx[0] == "signed") {
	    sig = btoa(array_to_string(sign(tx[1], keys_internal)));
	    stx = tx;

	} else {
            sig = btoa(array_to_string(sign(tx, keys_internal)));
            stx = ["signed", tx, [-6], [-6]];
	}
	var pub = pubkey_64();
	if ((stx[1][0] == -7) || (pub == stx[1][1])) {
	    stx[2] = sig;
	} else if (pub == stx[1][2]) {
	    stx[3] = sig;
	} else {
	    console.log(JSON.stringify(tx));
	    throw("sign error");
	}
        return stx;
    }
    function update_pubkey() {
        var pub = pubkey_64();
    }
    function watch_only_func() {
	var v = watch_only_pubkey.value;
	keys_internal = new_keys_watch(string_to_array(atob(v)));
	update_pubkey();
    }
    
    async function check_balance(Callback) {
        var trie_key = pubkey_64();
        return await merkle.arequest_proof("accounts", trie_key);
    }
    var update_balance_callback = function(){
        return(0);
    };
  
    function encrypt(val, to) {
        return encryption_object.send(val, to, keys_internal);
    }
    function decrypt(val) {
	return encryption_object.get(val, keys_internal);
    }
    return {make: new_keys,
            pub: pubkey_64,
            raw_sign: raw_sign,
            sign: sign_tx,
            ec: (function() { return ec; }),
            encrypt: encrypt,
            decrypt: decrypt,
            check_balance: check_balance,
            keys_internal: (function() {return keys_internal;}),
			passphrase: passphrase,
			forget: function() {keys_internal = undefined}
           };
}
var keys = keys_function1();
