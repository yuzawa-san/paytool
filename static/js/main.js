function PayController(){
    var render = function(){};
    var dbSize = 5 * 1024 * 1024; // 5MB
    var db = openDatabase("PayTool", "1.0", "Payment Manager", dbSize);
    var that = this;
    db.transaction(function(tx) {
        tx.executeSql("CREATE TABLE IF NOT EXISTS exchange(ID INTEGER PRIMARY KEY ASC, sender TEXT, recipient TEXT, value NUM, description TEXT)", []);
    });

    var errorHandler = function(tx, e) {
        alert("There has been an error: " + e.message);
    };
    var successHandler = function(tx, r) {
        that.list();
    };

    this.add = function(to, from, value, description){
        db.transaction(function(tx){
            tx.executeSql("INSERT INTO exchange(sender, recipient, value, description) VALUES (?,?,?,?)",
            [to, from, value, description],
            successHandler,
            errorHandler);
        });
    };

    this.remove = function(id){
        db.transaction(function(tx){
            tx.executeSql("DELETE FROM exchange WHERE ID=?", [id],
            successHandler,
            errorHandler);
        });
    };
    
    this.purge = function(id){
        db.transaction(function(tx){
            tx.executeSql("DELETE FROM exchange", [],
            successHandler,
            errorHandler);
        });
    };

    this.update = function(id, to, from, value, description){
        console.log(id,to,from,value,description);
        db.transaction(function(tx){
            tx.executeSql("UPDATE exchange SET sender = ?, recipient = ?, value = ?, description = ? WHERE id = ?", [to, from, value, description, id],
            successHandler,
            errorHandler);
        });
    };

    this.list = function(){
        db.transaction(function(tx) {
            tx.executeSql("SELECT * FROM exchange", [], function(tx, rs) {
                var out = [];
                for (var i=0; i < rs.rows.length; i++) {
                    out.push(rs.rows.item(i));
                }
                render(out);
            },
            errorHandler);
        });
    };
    
    this.attach = function(callback){
        render = callback;
    };
}

function tsort(edges) {
  var nodes   = {}, // hash: stringified id of the node => { id: id, afters: lisf of ids }
      sorted  = [], // sorted list of IDs ( returned value )
      visited = {}; // hash: id of already visited node => true
  var Node = function(id) {
    this.id = id;
    this.afters = [];
  }
  // 1. build data structures
  edges.forEach(function(v) {
    var from = v[0], to = v[1];
    if (!nodes[from]) nodes[from] = new Node(from);
    if (!nodes[to]) nodes[to]     = new Node(to);
    nodes[from].afters.push(to);
  });

  // 2. topological sort
  Object.keys(nodes).forEach(function visit(idstr, ancestors) {
    var node = nodes[idstr],
        id   = node.id;

    // if already exists, do nothing
    if (visited[idstr]) return;

    if (!Array.isArray(ancestors)) ancestors = [];

    ancestors.push(id);

    visited[idstr] = true;

    node.afters.forEach(function(afterID) {
      if (ancestors.indexOf(afterID) >= 0)  // if already in ancestors, a closed chain exists.
        throw new Error('closed chain : ' +  afterID + ' is in ' + id);

      visit(afterID.toString(), ancestors.map(function(v) { return v })); // recursive call
    });

    sorted.unshift(id);
  });

  return sorted;
}

function run(edges){

    var tmp = {}
    edges.forEach(function(v) {
    	var from = v[0], to = v[1];
    	if(!tmp[from+"&&&&"+to]){
    		tmp[from+"&&&&"+to] = 0;
    	}
    	tmp[from+"&&&&"+to] += v[2];
    	tmp[to+"&&&&"+from] = -tmp[from+"&&&&"+to];
    });
    edges = [];
    for(var x in tmp){
    	if(tmp[x]>0){
    		var v = x.split('&&&&');
    		var from = v[0], to = v[1];
    		edges.push([from,to,tmp[x]]);
    	}
    }

    var sorted = tsort(edges);
    //sorted.reverse();
    var arr = new Array();
    for(var i in sorted){
        arr[sorted[i]] = new Array();
        for(var j in sorted){
            arr[sorted[i]][sorted[j]] = 0;
        }
    }
    for(var j in edges){
        arr[edges[j][0]][edges[j][1]] += edges[j][2];
    }
    var ct=0;
    for(var i in sorted){
        for(var j in sorted){
            if(i!=j){
                var c = arr[sorted[i]][sorted[j]];
                for(var k in sorted){
                    if(j!=k){
                        var a = arr[sorted[i]][sorted[k]];
                        var b = arr[sorted[k]][sorted[j]];
                        if(a && b){
                            //console.log(sorted[i],sorted[k],sorted[j]);
                            if(a < b){
                                arr[sorted[i]][sorted[j]] += a; // new c
                                arr[sorted[i]][sorted[k]] = 0; // new a
                                arr[sorted[k]][sorted[j]] = b-a; // new b
                            }else{
                                arr[sorted[i]][sorted[j]] += b; // new c
                                arr[sorted[i]][sorted[k]] = a-b; // new a
                                arr[sorted[k]][sorted[j]] = 0; // new b
                            }
                            //printGraph(ct++);
                        }
                    }
                }
            }
        }
    }
    var out = [];
    for(var i in sorted){
        for(var j in sorted){
            if(i!=j){
                var c = arr[sorted[i]][sorted[j]];
                if(c){
                    out.push([sorted[i], sorted[j], c.toFixed(2)]);
                }
            }
        }
    }
    return out;
}

$(document).ready(function(){
    var $list = $('#transactions tbody');
    var $out = $('#out tbody');
    pc = new PayController();
    pc.attach(function(a){
        var that = this;
        $list.empty();
        var out = [];
        for(var i in a){
            var $to = $("<input class='form-control' placeholder='to'>").val(a[i].recipient).change(function(){
                pc.update($(this).parent().parent().data("id"), a[i].sender, $(this).val(), a[i].value, a[i].description);
            });
            var $from = $("<input class='form-control' placeholder='from'>").val(a[i].sender).change(function(){
                pc.update($(this).parent().parent().data("id"), $(this).val(), a[i].recipient, a[i].value, a[i].description);
            });
            var $value = $("<input class='form-control' type='number' placeholder='amount'>").val(a[i].value).change(function(){
                pc.update($(this).parent().parent().data("id"), a[i].sender, a[i].recipient, $(this).val(), a[i].description);
            });
            var $description = $("<input class='form-control' placeholder='description'>").val(a[i].description).change(function(){
                pc.update($(this).parent().parent().data("id"), a[i].sender, a[i].recipient, a[i].value, $(this).val());
            });
            var $remove = $("<div class='btn btn-warning'>Remove</div>").click(function(){
                if(confirm("Are you sure? This is irreversible.")){
                    pc.remove($(this).parent().parent().data("id"));
                }
            });
            $to = $("<td>").append($to);
            $from = $("<td>").append($from);
            $value = $("<td>").append($value);
            $description = $("<td>").append($description);
            $remove = $("<td>").append($remove);
            var $row = $("<tr>").data("id", a[i].ID).append($from, $to, $value, $description, $remove);
            $list.append($row);
            out.push([a[i].sender, a[i].recipient, a[i].value]);
        }
        $out.empty();
        try {
            var results = run(out);
        } catch(e) {
            alert("Payment graph contains a cycle!\n"+e);
        }
        for(var i in results){
            $out.append("<tr><td>"+results[i][0]+"</td><td>"+results[i][1]+"</td><td>"+results[i][2]+"</td></tr>");
        }
    });
    pc.list();
    $("#new").submit(function(e){
        e.preventDefault();
        var $from = $("#new-from");
        var $to = $("#new-to");
        var $value = $("#new-value");
        var $description = $("#new-description");
        pc.add($from.val(), $to.val(), $value.val(), $description.val());
        $from.val('');
        $to.val('');
        $value.val('0');
        $description.val('');
        $from.focus();
    });
    $("#purge").click(function(){
        if(confirm("Are you sure? This is irreversible.")){
            pc.purge();
        }
    });
});