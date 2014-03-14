var ajaxHelper = function(method, url, params, success){
    if(method=="DELETE"){
        url += "?" + $.param(params);
        params = {}
    }
    $.ajax({
        type: method,
        url: url,
        data: params,
        success: function(r){
            if(r.error !== undefined){
                alert("An error has occurred!");
                console.error(method, url, params, r.error);
                return;
            }
            if(success){
                success(r);
            }
        },
        error: function(r){
            alert("A server error has occurred!");
            console.error(r.statusText);
        }
    });
};

var graphEdges, graphEdgesFinal, graphNodes;

function PayController(){
    var render = function(){};
    var calculate = function(){};
    var that = this;

    var errorHandler = function(tx, e) {
        alert("There has been an error: " + e.message);
    };
    var successHandler = function(redraw){
        return function(tx, r) {
            that.list(redraw);
        }
    };
    
    var ajax = function(method, url, params, redraw, success){
        params.sheet_id = sheet_id;
        if(method=="DELETE"){
            url += "?" + $.param(params);
            params = {}
        }
        $.ajax({
            type: method,
            url: url,
            data: params,
            success: function(r){
                if(r.error !== undefined){
                    alert("An error has occurred!");
                    console.error(method, url, params, r.error);
                    return;
                }
                if(success){
                    success(r);
                }else{
                    that.list(redraw);
                }
            },
            error: function(r){
                alert("A server error has occurred!");
                console.error(r.statusText);
            }
        });
    }
    
    this.add = function(from, to, value, description){
        to = to.toUpperCase();
        from = from.toUpperCase();
        if(to === from){
            return;
        }
        ajax("POST", "/api/item", {to: to, from: from, value: value, description: description}, true);
    };

    this.remove = function(id){
        ajax("DELETE", "/api/item", {id: id}, true);
    };

    this.purge = function(id){
        $.ajax({
            type: "DELETE",
            url: "/api/sheet?purge=1&id="+sheet_id,
            success: function(r){
                that.list(true);
            },
            error: function(r){
                alert("A server error has occurred!");
                console.error(r.statusText);
            }
        });
    };

    this.update = function(id, from, to, value, description){
        to = to.toUpperCase();
        from = from.toUpperCase();
        ajax("PUT", "/api/item", {id: id, to: to, from: from, value: value, description: description}, false);
    };

    this.list = function(redraw){
        ajax("GET", "/api/item", {}, false, function(r){
            if(redraw){
                render(r);
            }
            calculate(r);
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
    graphNodes = sorted;
    graphEdges = edges;
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
                    out.push([sorted[i], sorted[j], c]);
                }
            }
        }
    }
    graphEdgesFinal = out;
    out = out.sort(function(a,b){
        return b[2] - a[2];
    });
    var rows = {};
    for(var i in out){
        
        var from = out[i][0];
        var to = out[i][1];
        var value = out[i][2];
        if(!rows[from]){
            rows[from] = {
                value: 0.0,
                items: []
            };
        }
        if(!rows[to]){
            rows[to] = {
                value: 0.0,
                items: []
            };
        }
        rows[from].value -= value;
        rows[to].value += value;
        rows[from].items.push({to:to, value:value});
    }
    return rows;
}
