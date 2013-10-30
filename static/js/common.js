function PayController(){
    var render = function(){};
    var calculate = function(){};
    var dbSize = 5 * 1024 * 1024; // 5MB
    var db = openDatabase("PayTool", "1.0", "Payment Manager", dbSize);
    var that = this;
    db.transaction(function(tx) {
        tx.executeSql("CREATE TABLE IF NOT EXISTS exchange(ID INTEGER PRIMARY KEY ASC, sender TEXT, recipient TEXT, value NUM, description TEXT)", []);
    });

    var errorHandler = function(tx, e) {
        alert("There has been an error: " + e.message);
    };
    var successHandler = function(redraw){
        return function(tx, r) {
            that.list(redraw);
        }
    };

    this.add = function(to, from, value, description){
        to = to.toUpperCase();
        from = from.toUpperCase();
        db.transaction(function(tx){
            tx.executeSql("INSERT INTO exchange(sender, recipient, value, description) VALUES (?,?,?,?)",
            [to, from, value, description],
            successHandler(true),
            errorHandler);
        });
    };

    this.remove = function(id){
        db.transaction(function(tx){
            tx.executeSql("DELETE FROM exchange WHERE ID=?", [id],
            successHandler(true),
            errorHandler);
        });
    };

    this.purge = function(id){
        db.transaction(function(tx){
            tx.executeSql("DELETE FROM exchange", [],
            successHandler(true),
            errorHandler);
        });
    };

    this.update = function(id, to, from, value, description){
        to = to.toUpperCase();
        from = from.toUpperCase();
        db.transaction(function(tx){
            tx.executeSql("UPDATE exchange SET sender = ?, recipient = ?, value = ?, description = ? WHERE id = ?", [to, from, value, description, id],
            successHandler(false),
            errorHandler);
        });
    };

    this.list = function(redraw){
        db.transaction(function(tx) {
            tx.executeSql("SELECT * FROM exchange", [], function(tx, rs) {
                var out = [];
                for (var i=0; i < rs.rows.length; i++) {
                    out.push(rs.rows.item(i));
                }
                if(redraw){
                    render(out);
                }
                calculate(out);
            },
            errorHandler);
        });
    };

    this.attach = function(redrawCallback, calculateCallback){
        render = redrawCallback;
        calculate = calculateCallback;
    };
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
                            if(a < b){
                                arr[sorted[i]][sorted[j]] += a; // new c
                                arr[sorted[i]][sorted[k]] = 0; // new a
                                arr[sorted[k]][sorted[j]] = b-a; // new b
                            }else{
                                arr[sorted[i]][sorted[j]] += b; // new c
                                arr[sorted[i]][sorted[k]] = a-b; // new a
                                arr[sorted[k]][sorted[j]] = 0; // new b
                            }
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