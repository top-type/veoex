
var spend_tx = (function () {
    async function afee_lookup(to, callback){
        var acc = await rpc.apost(["account", to]);
        var tx_type = "spend";
        var gov_id = 15;
        if((acc === 0) || (acc === "empty")){
            tx_type = "create_acc_tx";
            gov_id = 14;
        };
	var gov_fee = await merkle.arequest_proof("governance", gov_id);
	var fee = tree_number_to_value(gov_fee[2]) + 50;
        return([fee, tx_type]);
    };
    async function amake_tx(to, from, amount){
        var from_acc = await rpc.apost(["account", from]);
        return(amake_tx2(from_acc, to, from, amount));
    };
    async function amake_tx2(from_acc, to, from, amount){
        var nonce = from_acc[2] + 1;
        var [fee, tx_type] = await afee_lookup(to);
        var tx = [tx_type, from, nonce, fee, to, amount];
        if(tx_type === "spend"){
            tx = tx.concat([0]);
        };
        return(tx);
    };
    async function max_send_amount(pub, to, callback){
        var acc = await rpc.apost(["account", pub]);
        var bal = acc[1];
        var [fee, tx_type] = await afee_lookup(to);
        callback(bal-fee-1, tx_type);
    };
    return({
        amake_tx: amake_tx,
        max_send_amount: max_send_amount
    });
})();

