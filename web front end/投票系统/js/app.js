document.write("<script src='js/sha256.js'></script>");
var app={
	chain:[],
	current_votes: [],
	nodes: [],
	socket:{},
	init:function(){
		var chain=this.read_chain()
		if(chain.length!=0){
			this.chain=chain
		}else{
			chain=[];
			chain.push({
			'index': 0,
			'timestamp': '100000000',
			'vote': [],
			'proof': 100,
			'previous_hash': '1'
			})
			this.chain=chain;
			this.save_chain(chain);
		}
		if(!this.valid_chain(this.chain)){//判断当前链条是否合法，不合法置空，等待其他节点广播链条
			localStorage.setItem("votechain",[]);
		}
		var that=this;
		this.socket=new WebSocket("ws://140.143.31.29:8001");
		this.socket.onopen =function(){
			var ownnode=localStorage.getItem("ownnode");
		if(!ownnode){
			ownnode=guid();//新建一个自己的node并广播至全网
			localStorage.setItem("ownnode",ownnode);
			
			that.socket.send(JSON.stringify({"node":ownnode}))
		}
			
		}
		this.socket.onmessage=function(data){
		if(typeof data.data=='string')
			data=JSON.parse(data.data);
			if(data['chain']){
				console.log(data['chain']);
				that.resolve_conflicts(data['chain'])
			}
			if(data['node']){
				that.nodes.push(data['node']);
				localStorage.setItem("nodes",that.nodes);
			}
			if(data['vote']){
				that.current_votes.push(data['vote']);
				that.save_vote();
			}
			if(data['block']){
				var block=data['block']
				if(typeof block=='string')
				block=JSON.parse(block);
				if(block['previous_hash'] == that.hash(that.last_block()) && that.valid_proof(that.last_block()['proof'],block['proof']))
				that.chain.push(block);
				that.save_chain(this.chain);
			}
			if(data['getchain']){
				that.socket.send(JSON.stringify({
					"chain":that.chain
				}))
			}
		}
	},
	read_chain:function(){
		//读取本地chain
		var chain=localStorage.getItem("votechain");
		if(!chain)
		chain=[]
		if(typeof chain=='string')
		chain=JSON.parse(chain);
		return chain;
	},
	save_chain:function(chain){
		if(chain){
		chain=JSON.stringify(chain);
		}
		else{
		chain=this.chain;
		chain=JSON.stringify(chain);
		}
		localStorage.setItem("votechain",chain);
	},
	new_block:function(proof){
		this.read_vote();
		var block={
			'index': this.chain.length,
			'timestamp': Date.parse(new Date()),
			'vote': this.current_votes,
			'proof': proof,
			'previous_hash': this.hash(this.chain[this.chain.length - 1])
		}
		this.current_votes=[];

		localStorage.setItem("vote",[]);
		//把这个block广播至全网
		this.socket.send(
			JSON.stringify({
				"block":block})
		)
	},
	hash: function(block) {
		return sha256_digest(JSON.stringify(block));
	},
	last_block: function() {
		return this.chain[this.chain.length - 1];
	},
	new_vote:function(voter,elector,num_vote){
		var vote={
				'voter':voter,
				'elector':elector,
				'num_vote':num_vote
		}
		var socket=this.socket
		
		socket.send(JSON.stringify({
			'vote':vote
		}))
	},
	read_vote:function(){
		var vote=localStorage.getItem("vote");
		if(!vote)
		vote=[]
		if(typeof vote=='string')
		vote=JSON.parse(vote);
		if(vote){
			this.current_votes=vote;
		}
	},
	save_vote:function(){
		//保存至本地
		var vote=this.current_votes;
		vote=JSON.stringify(vote);
		localStorage.setItem("vote",vote);

		
	},
	proof_of_work: function(last_proof) {
		var proof = 0
		while(this.valid_proof(last_proof, proof) == false)
			proof = proof + 1
		return proof
	},
	valid_proof: function(last_proof, proof) {
		var str = last_proof.toString() + proof.toString()
		var sha = sha256_digest(str)
		if(sha.substring(0, 6) == '000000') {
			console.log(sha)
			return true
		} else {
			return false
		}
	},
	 valid_chain:function(chain){//验证链条是否合法
        var last_block = chain[0]
        var current_index = 1
        while(current_index < chain.length){
            var block = chain[current_index]
            if (block['previous_hash'] != this.hash(last_block))
                return false;
            if (! this.valid_proof(last_block['proof'], block['proof']))
                return false;
            last_block = block;
            current_index += 1;
          }
        return true;
	 },
	 resolve_conflicts:function(chain){
	 	/*
        var neighbours = this.nodes
        var new_chain=undefined;
        var max_length = this.chain.length
        for(var node in neighbours){
           // response = requests.get(f'http://{node}/chain')
	    	//得到一个其他节点的chain
	    	var chain =this.chain//this.chain假装是从其他节点得到的chain
	    	if(chain.length>max_length && this.valid_chain(chain)){
	    		max_length=chain.length;
	    		new_chain=chain;
	    	}
        if(new_chain)
            this.chain = new_chain
            return true;
		}
        return false;
        */
       if (chain.length>this.chain.length && this.valid_chain(chain)){
       	this.chain=chain;
       	this.save_chain(chain);
       }
       
       },
    get_other_chain:function(){
    	var socket=this.socket;
    	socket.send(JSON.stringify({
    		"getchain":"1"
    	}))
    	
    }
};

function close(){
	app.socket.close();
}
function broad(){//广播自己的链条
	var socket=app.socket
	socket.send(JSON.stringify({"chain":
	app.chain}))
}
function S4() {
	return(((1 + Math.random()) * 0x10000) | 0).toString(16).substring(1);
}

function guid() {
	return(S4() + S4() + "-" + S4() + "-" + S4() + "-" + S4() + "-" + S4() + S4() + S4());
}